import { pathToFileURL } from 'node:url';
import { createApp } from './app.js';
import { parseEnv } from './config/env.js';
import { createDatabase } from './config/database.js';
import { createLogger } from './config/logger.js';

export async function startServer(
  config,
  logger = createLogger(config.LOG_LEVEL),
) {
  const [
    { createIdentity },
    { createCatalog },
    { createMedia },
    { createRecipes },
  ] = await Promise.all([
    import('./modules/auth/identity.js'),
    import('./modules/catalog.js'),
    import('./modules/media/index.js'),
    import('./modules/recipes/index.js'),
  ]);
  const database = createDatabase(config);
  let server, media, cleanupTimer;
  let stopping = false;
  let shutdownPromise;
  try {
    await database.connect();
    const identity = await createIdentity({
      connection: database.connection,
      config,
      logger,
    });
    const catalog = await createCatalog(database.connection, identity);
    media = await createMedia({
      connection: database.connection,
      identity,
      config,
      logger,
    });
    const recipes = await createRecipes({
      connection: database.connection,
      identity,
      catalog,
      media,
    });
    const app = createApp({
      recipes,
      media,
      config,
      catalog,
      identity,
      logger,
      isReady: () => !stopping && database.isReady(),
    });
    server = await new Promise((resolve, reject) => {
      const http = app.listen(config.PORT, config.HOST, () => resolve(http));
      http.once('error', reject);
    });
  } catch {
    await database.close();
    throw new Error(
      'Startup failed: check database availability and listen configuration',
    );
  }
  if (
    config.MEDIA_CLEANUP_ENABLED &&
    config.MEDIA_PROVIDER === 'fake' &&
    config.IMAGE_DELIVERY_POLICY === 'authenticated' &&
    config.NODE_ENV !== 'production'
  ) {
    cleanupTimer = setInterval(() => {
      media.cleanup
        .runOnce()
        .catch(() =>
          logger.error(
            { event: 'media_cleanup_failed' },
            'Media cleanup unavailable',
          ),
        );
    }, config.MEDIA_CLEANUP_INTERVAL_MS);
    cleanupTimer.unref();
  }
  logger.info(
    { event: 'listening', port: server.address().port },
    'server ready',
  );

  function shutdown() {
    if (shutdownPromise) return shutdownPromise;
    stopping = true;
    clearInterval(cleanupTimer);
    shutdownPromise = (async () => {
      const deadline = setTimeout(() => {
        logger.error(
          { event: 'shutdown_timeout' },
          'shutdown deadline exceeded',
        );
        server.closeAllConnections();
      }, config.SHUTDOWN_TIMEOUT_MS);
      try {
        await new Promise((resolve, reject) =>
          server.close((err) => (err ? reject(err) : resolve())),
        );
        await media.cleanup.stop();
        await database.close();
        logger.info({ event: 'shutdown_complete' }, 'server stopped');
      } finally {
        clearTimeout(deadline);
      }
    })();
    return shutdownPromise;
  }
  return { server, database, shutdown };
}

async function main() {
  let logger = createLogger();
  try {
    let config;
    try {
      config = parseEnv(process.env);
    } catch (error) {
      logger.error(
        { event: 'configuration_invalid', message: error.message },
        'environment validation failed',
      );
      process.exitCode = 1;
      return;
    }
    logger = createLogger(config.LOG_LEVEL);
    const runtime = await startServer(config, logger);
    const stop = () => {
      const deadline = setTimeout(
        () => process.exit(1),
        config.SHUTDOWN_TIMEOUT_MS + 1000,
      );
      runtime.shutdown().then(
        () => {
          clearTimeout(deadline);
          process.exitCode = 0;
        },
        () => {
          logger.error({ event: 'shutdown_failed' }, 'shutdown failed');
          process.exit(1);
        },
      );
    };
    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
  } catch {
    logger.error(
      { event: 'startup_failed' },
      'Invalid configuration or unavailable database/listen address',
    );
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  await main();

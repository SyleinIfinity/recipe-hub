import { pathToFileURL } from 'node:url';
import { parseEnv } from '../src/config/env.js';
import { createDatabase } from '../src/config/database.js';
import { createLogger } from '../src/config/logger.js';
import { createMediaAssetModel } from '../src/modules/media/media-asset.model.js';
import { createUserModel } from '../src/modules/users/user.model.js';
import { createRecipeModel } from '../src/modules/recipes/recipe.model.js';
import { createRecipeReferences } from '../src/modules/recipes/recipe-reference.js';
import { createMediaService } from '../src/modules/media/media.service.js';
import { createMediaLifecycle } from '../src/modules/media/media-lifecycle.service.js';
import { createMediaCleanup } from '../src/modules/media/media-cleanup.js';
import { createImageStorage } from '../src/integrations/image-storage/index.js';
export async function runCleanupCommand(
  config,
  { dryRun = true, logger = createLogger(config.LOG_LEVEL), signal } = {},
) {
  if (config.MEDIA_PROVIDER !== 'fake' || config.NODE_ENV === 'production')
    throw new Error('Live/production cleanup disabled');
  const db = createDatabase(config);
  let worker;
  const stop = () => {
    void worker?.stop();
  };
  try {
    await db.connect();
    const MediaAsset = createMediaAssetModel(db.connection);
    const storage = await createImageStorage(config);
    const service = createMediaService({ MediaAsset, storage, config });
    service.assertEnabled();
    const references = createRecipeReferences({
      Recipe: createRecipeModel(db.connection),
      User: createUserModel(db.connection),
    });
    const lifecycle = createMediaLifecycle({
      MediaAsset,
      service,
      references,
      config,
    });
    worker = createMediaCleanup({
      MediaAsset,
      storage,
      service,
      references,
      lifecycle,
      config,
      logger,
    });
    signal?.addEventListener('abort', stop, { once: true });
    if (signal?.aborted) await worker.stop();
    return await worker.runOnce({ dryRun });
  } finally {
    signal?.removeEventListener('abort', stop);
    await worker?.stop();
    await db.close();
  }
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const logger = createLogger();
  const controller = new AbortController();
  process.once('SIGINT', () => controller.abort());
  process.once('SIGTERM', () => controller.abort());
  try {
    const args = process.argv.slice(2);
    if (args.some((v) => !['--apply', '--dry-run'].includes(v)))
      throw new Error('Invalid arguments');
    const outcomes = await runCleanupCommand(parseEnv(process.env), {
      dryRun: !args.includes('--apply'),
      logger,
      signal: controller.signal,
    });
    logger.info(
      { event: 'media_cleanup_batch', processed: outcomes.length },
      'Media cleanup command completed',
    );
  } catch {
    logger.error(
      { event: 'media_cleanup_command_failed' },
      'Check configuration and database; live execution is disabled',
    );
    process.exitCode = 1;
  }
}

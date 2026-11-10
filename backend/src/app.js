import { mountDocs } from './openapi/docs.js';
import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { createLogger } from './config/logger.js';
import { requestContext, notFound, errorHandler } from './middleware/http.js';

export function createApp({
  config = {},
  identity,
  catalog,
  media,
  recipes,
  isReady = async () => false,
  logger = createLogger(),
} = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(requestContext(logger));
  app.use(helmet());
  app.use(express.json({ limit: '100kb' }));
  app.get('/health/live', (_req, res) =>
    res.json({ success: true, data: { status: 'alive' } }),
  );
  const readiness = async (req, res) => {
    let ready = false;
    try {
      ready = await isReady();
    } catch {
      /* An unavailable dependency is not ready. */
    }
    if (!ready)
      return res.status(503).json({
        success: false,
        error: { code: 'SERVICE_UNAVAILABLE', message: 'Service not ready' },
        requestId: req.requestId,
      });
    res.json({ success: true, data: { status: 'ready' } });
  };
  app.get('/health/ready', readiness);
  app.get('/api/v1/health', readiness);
  if (identity) {
    app.use(
      '/api/v1',
      cookieParser(),
      (_req, res, next) => {
        res.set('Cache-Control', 'no-store');
        next();
      },
      identity.security.protect,
    );
    app.use('/api/v1/auth', identity.authRouter);
    app.use('/api/v1', identity.userRouter);
    if (catalog) app.use('/api/v1', ...catalog.routers);
    if (media) app.use('/api/v1', media.router);
    if (recipes) {
      app.use('/api/v1', recipes.router);
      if (recipes.favoriteRouter) app.use('/api/v1', recipes.favoriteRouter);
      if (recipes.social) app.use('/api/v1', recipes.social.router);
    }
  }
  mountDocs(app, config, identity?.security.sessionCookie);
  app.use(notFound);
  app.use(errorHandler(logger));
  return app;
}

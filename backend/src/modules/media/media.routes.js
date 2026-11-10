import { validate } from '../../middleware/validate.js';
import { mediaParams, mediaQuery } from './media-lifecycle.validation.js';
import { Router } from 'express';
import { AppError } from '../../shared/errors.js';
import { multipart, mediaHeaders } from './media.validation.js';
export function mediaRoutes(
  controller,
  requireAuth,
  security,
  assertEnabled = () => {},
  uploadRateLimit = 30,
) {
  const router = Router();
  let active = 0;
  const capacity = (req, res, next) => {
    if (active >= 4)
      return next(
        new AppError(
          429,
          'MEDIA_BUSY',
          'Upload capacity reached; try again later',
        ),
      );
    active++;
    let released = false;
    const release = () => {
      if (!released) {
        active--;
        released = true;
      }
    };
    req.releaseUpload = release;
    const releaseIfIdle = () => {
      if (!req.processingImage) release();
    };
    res.once('finish', releaseIfIdle).once('close', releaseIfIdle);
    next();
  };
  router.post(
    '/media/images',
    requireAuth,
    security.limit(uploadRateLimit),
    (_req, _res, next) => {
      assertEnabled();
      next();
    },
    mediaHeaders,
    capacity,
    multipart,
    controller.upload,
  );
  router.get(
    '/me/media',
    requireAuth,
    validate(mediaQuery, 'query'),
    controller.list,
  );
  router.delete(
    '/media/images/:assetId',
    requireAuth,
    validate(mediaParams, 'params'),
    controller.remove,
  );
  return router;
}

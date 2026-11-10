import { AppError } from '../shared/errors.js';
import { randomUUID } from 'node:crypto';

export function requestContext(logger) {
  return (req, res, next) => {
    req.requestId = randomUUID();
    res.setHeader('X-Request-ID', req.requestId);
    const started = performance.now();
    res.on('finish', () => {
      // Only log matched route patterns; raw URLs, headers and bodies may contain secrets.
      logger.info(
        {
          requestId: req.requestId,
          method: req.method,
          route: req.route?.path ?? 'unmatched',
          status: res.statusCode,
          durationMs: Math.round(performance.now() - started),
        },
        'request completed',
      );
    });
    next();
  };
}

export function notFound(req, res) {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Route not found' },
    requestId: req.requestId,
  });
}

export function errorHandler(logger) {
  return (err, req, res, _next) => {
    if (res.headersSent) return _next(err);
    let status = 500;
    let code = 'INTERNAL_ERROR';
    let message = 'Internal server error';
    if (err instanceof AppError) {
      status = err.status;
      code = err.code;
      message = err.message;
    } else if (err.code === 'EBADCSRFTOKEN') {
      status = 403;
      code = 'CSRF_INVALID';
      message = 'Invalid CSRF token or origin';
    } else if (err.type === 'entity.parse.failed') {
      status = 400;
      code = 'INVALID_JSON';
      message = 'Invalid JSON body';
    } else if (err.type === 'entity.too.large') {
      status = 413;
      code = 'PAYLOAD_TOO_LARGE';
      message = 'Request body too large';
    } else if (err.status === 415) {
      status = 415;
      code = 'UNSUPPORTED_MEDIA_TYPE';
      message = 'Unsupported request encoding';
    }
    if (status === 500)
      logger.error({ requestId: req.requestId, code }, 'request failed');
    res.status(status).json({
      success: false,
      error: {
        code,
        message,
        ...(err instanceof AppError && err.details
          ? { details: err.details }
          : {}),
      },
      requestId: req.requestId,
    });
  };
}

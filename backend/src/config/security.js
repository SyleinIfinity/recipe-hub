import { randomBytes } from 'node:crypto';
import { doubleCsrf } from 'csrf-csrf';
import { rateLimit } from 'express-rate-limit';
import { AppError } from '../shared/errors.js';
export function createSecurity(config) {
  const secure = config.COOKIE_SECURE;
  const cookieOptions = { httpOnly: true, secure, sameSite: 'lax', path: '/' };
  const prefix = secure ? '__Host-' : '';
  const sessionCookie = `${prefix}recipe-hub-session`;
  const csrfCookie = `${prefix}recipe-hub-csrf`;
  const browserCookie = `${prefix}recipe-hub-browser`;
  const secret = config.CSRF_SECRET || randomBytes(32).toString('hex');
  const csrf = doubleCsrf({
    getSecret: () => secret,
    getSessionIdentifier: (req) =>
      req.cookies[sessionCookie] || req.cookies[browserCookie] || '',
    cookieName: csrfCookie,
    cookieOptions: { ...cookieOptions, maxAge: 3600000 },
  });
  return {
    csrfRateLimit: config.CSRF_RATE_LIMIT,
    socialRateLimit: config.SOCIAL_RATE_LIMIT,
    sessionCookie,
    cookieOptions,
    issueCsrf(req, res) {
      if (!req.cookies[browserCookie]) {
        req.cookies[browserCookie] = randomBytes(32).toString('base64url');
        res.cookie(browserCookie, req.cookies[browserCookie], {
          ...cookieOptions,
          maxAge: 3600000,
        });
      }
      return csrf.generateCsrfToken(req, res, { overwrite: true });
    },
    protect(req, res, next) {
      if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        const origin = req.get('origin');
        if (
          (origin && !config.APP_ORIGINS.includes(origin)) ||
          req.get('sec-fetch-site') === 'cross-site'
        )
          return next(
            new AppError(403, 'CSRF_INVALID', 'Invalid CSRF token or origin'),
          );
        if (!req.cookies[sessionCookie] && !req.cookies[browserCookie])
          return next(
            new AppError(403, 'CSRF_INVALID', 'Invalid CSRF token or origin'),
          );
      }
      return csrf.doubleCsrfProtection(req, res, next);
    },
    clearCookies(res) {
      res.clearCookie(sessionCookie, cookieOptions);
      res.clearCookie(csrfCookie, cookieOptions);
    },
    limit(max = config.AUTH_RATE_LIMIT) {
      return rateLimit({
        windowMs: config.AUTH_RATE_WINDOW_MS,
        limit: max,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        handler: (_req, _res, next) =>
          next(
            new AppError(
              429,
              'RATE_LIMITED',
              'Too many requests; try again later',
            ),
          ),
      });
    },
  };
}

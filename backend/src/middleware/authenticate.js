import { AppError } from '../shared/errors.js';
export function authenticate(sessions, cookieName) {
  return async (req, _res, next) => {
    req.actor = await sessions.authenticate(req.cookies[cookieName]);
    next();
  };
}
export function authorize(...roles) {
  return (req, _res, next) => {
    if (!req.actor || !roles.includes(req.actor.user.role))
      return next(new AppError(403, 'FORBIDDEN', 'Insufficient permissions'));
    next();
  };
}

import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  emailSchema,
  resetSchema,
  tokenSchema,
} from './auth.validation.js';
export function authRoutes(controller, authenticate, security) {
  const router = Router();
  const sensitive = security.limit();
  router.get('/csrf', security.limit(security.csrfRateLimit), controller.csrf);
  router.post(
    '/register',
    sensitive,
    validate(registerSchema),
    controller.register,
  );
  router.post('/login', sensitive, validate(loginSchema), controller.login);
  router.get('/me', authenticate, controller.me);
  router.post('/logout', authenticate, controller.logout);
  router.post(
    '/change-password',
    sensitive,
    authenticate,
    validate(changePasswordSchema),
    controller.changePassword,
  );
  router.post(
    '/forgot-password',
    sensitive,
    validate(emailSchema),
    controller.forgotPassword,
  );
  router.post(
    '/request-email-verification',
    sensitive,
    validate(emailSchema),
    controller.requestVerification,
  );
  router.post(
    '/reset-password',
    sensitive,
    validate(resetSchema),
    controller.resetPassword,
  );
  router.post(
    '/verify-email',
    sensitive,
    validate(tokenSchema),
    controller.verifyEmail,
  );
  return router;
}

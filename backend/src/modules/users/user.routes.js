import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { authorize } from '../../middleware/authenticate.js';
import { userParams } from '../auth/auth.validation.js';
import {
  profileSchema,
  preferencesSchema,
  listUsersSchema,
  statusSchema,
} from './user.validation.js';
export function userRoutes(controller, authenticate) {
  const router = Router();
  router.get(
    '/users/:userId',
    validate(userParams, 'params'),
    controller.publicProfile,
  );
  router.patch(
    '/me/profile',
    authenticate,
    validate(profileSchema),
    controller.updateProfile,
  );
  router.get('/me/preferences', authenticate, controller.preferences);
  router.patch(
    '/me/preferences',
    authenticate,
    validate(preferencesSchema),
    controller.updatePreferences,
  );
  router.get(
    '/admin/users',
    authenticate,
    authorize('admin'),
    validate(listUsersSchema, 'query'),
    controller.list,
  );
  router.patch(
    '/admin/users/:userId/status',
    authenticate,
    authorize('admin'),
    validate(userParams, 'params'),
    validate(statusSchema),
    controller.changeStatus,
  );
  return router;
}

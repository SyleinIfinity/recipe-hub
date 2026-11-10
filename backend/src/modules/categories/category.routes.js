import { Router } from 'express';
import { authorize } from '../../middleware/authenticate.js';
import { validate } from '../../middleware/validate.js';
import {
  createCategorySchema,
  updateCategorySchema,
  categoryParams,
  categoryQuery,
} from './category.validation.js';
export function categoryRoutes(controller, authenticate) {
  const router = Router();
  router.get('/categories', validate(categoryQuery, 'query'), controller.list);
  router.post(
    '/admin/categories',
    authenticate,
    authorize('admin'),
    validate(createCategorySchema),
    controller.create,
  );
  router.patch(
    '/admin/categories/:categoryId',
    authenticate,
    authorize('admin'),
    validate(categoryParams, 'params'),
    validate(updateCategorySchema),
    controller.update,
  );
  return router;
}

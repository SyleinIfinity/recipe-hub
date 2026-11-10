import { Router } from 'express';
import { authorize } from '../../middleware/authenticate.js';
import { validate } from '../../middleware/validate.js';
import {
  createIngredientSchema,
  updateIngredientSchema,
  ingredientParams,
  ingredientQuery,
} from './ingredient.validation.js';
export function ingredientRoutes(controller, authenticate) {
  const router = Router();
  router.get(
    '/ingredients',
    validate(ingredientQuery, 'query'),
    controller.search,
  );
  router.post(
    '/admin/ingredients',
    authenticate,
    authorize('admin'),
    validate(createIngredientSchema),
    controller.create,
  );
  router.patch(
    '/admin/ingredients/:ingredientId',
    authenticate,
    authorize('admin'),
    validate(ingredientParams, 'params'),
    validate(updateIngredientSchema),
    controller.update,
  );
  return router;
}

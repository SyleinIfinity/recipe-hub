import {
  transitionSchema,
  publicRecipeQuery,
  slugParams,
  recipeImageParams,
} from './publication.validation.js';
import { Router } from 'express';
import { userParams } from '../auth/auth.validation.js';
import { publicAuthorRecipesQuery } from './search.validation.js';
import { validate } from '../../middleware/validate.js';
import {
  createRecipeSchema,
  updateRecipeSchema,
  recipeParams,
  recipeQuery,
  createKeySchema,
} from './recipe.validation.js';
export function recipeRoutes(
  controller,
  requireAuth,
  optionalAuth = (_req, _res, next) => next(),
  searchLimit = (_req, _res, next) => next(),
) {
  const router = Router();
  router.post(
    '/recipes',
    requireAuth,
    validate(createKeySchema, 'headers'),
    validate(createRecipeSchema),
    controller.create,
  );
  router.get(
    '/me/recipes',
    requireAuth,
    validate(recipeQuery, 'query'),
    controller.list,
  );
  router.get(
    '/me/recipes/:recipeId',
    requireAuth,
    validate(recipeParams, 'params'),
    controller.get,
  );
  router.patch(
    '/recipes/:recipeId',
    requireAuth,
    validate(recipeParams, 'params'),
    validate(updateRecipeSchema),
    controller.update,
  );
  router.delete(
    '/recipes/:recipeId',
    requireAuth,
    validate(recipeParams, 'params'),
    controller.remove,
  );
  router.patch(
    '/recipes/:recipeId/published-content',
    requireAuth,
    validate(recipeParams, 'params'),
    validate(updateRecipeSchema),
    controller.updatePublished,
  );
  router.patch(
    '/recipes/:recipeId/publish',
    requireAuth,
    validate(recipeParams, 'params'),
    validate(transitionSchema),
    controller.publish,
  );
  router.patch(
    '/recipes/:recipeId/unpublish',
    requireAuth,
    validate(recipeParams, 'params'),
    validate(transitionSchema),
    controller.unpublish,
  );
  router.get(
    '/recipes/:recipeId/images/:assetId',
    optionalAuth,
    validate(recipeImageParams, 'params'),
    controller.image,
  );
  router.get(
    '/users/:userId/recipes',
    searchLimit,
    validate(userParams, 'params'),
    validate(publicAuthorRecipesQuery, 'query'),
    controller.publicAuthorList,
  );
  router.get(
    '/recipes',
    searchLimit,
    validate(publicRecipeQuery, 'query'),
    controller.publicList,
  );
  router.get(
    '/recipes/:slug',
    validate(slugParams, 'params'),
    controller.publicDetail,
  );
  return router;
}

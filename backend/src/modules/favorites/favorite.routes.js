import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import {
  favoriteParams,
  favoriteQuery,
  emptyFavoriteBody,
  emptyFavoriteQuery,
} from './favorite.validation.js';
export function mountRecipeRelation(
  router,
  path,
  controller,
  requireAuth,
  writeLimit,
) {
  router.get(
    path,
    requireAuth,
    validate(favoriteQuery, 'query'),
    controller.list,
  );
  for (const [method, handler] of [
    ['put', controller.add],
    ['delete', controller.remove],
  ])
    router[method](
      `${path}/:recipeId`,
      requireAuth,
      writeLimit,
      validate(favoriteParams, 'params'),
      validate(emptyFavoriteQuery, 'query'),
      validate(emptyFavoriteBody),
      handler,
    );
  return router;
}

export function favoriteRoutes(controller, requireAuth, writeLimit) {
  return mountRecipeRelation(
    Router(),
    '/me/favorites',
    controller,
    requireAuth,
    writeLimit,
  );
}

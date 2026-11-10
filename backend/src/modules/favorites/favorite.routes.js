import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import {
  favoriteParams,
  favoriteQuery,
  emptyFavoriteBody,
  emptyFavoriteQuery,
} from './favorite.validation.js';
export function favoriteRoutes(controller, requireAuth) {
  const router = Router();
  router.get(
    '/me/favorites',
    requireAuth,
    validate(favoriteQuery, 'query'),
    controller.list,
  );
  for (const [method, handler] of [
    ['put', controller.add],
    ['delete', controller.remove],
  ])
    router[method](
      '/me/favorites/:recipeId',
      requireAuth,
      validate(favoriteParams, 'params'),
      validate(emptyFavoriteQuery, 'query'),
      validate(emptyFavoriteBody),
      handler,
    );
  return router;
}

import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';
import { mountRecipeRelation } from '../favorites/favorite.routes.js';
import { socialId } from '../social/social.validation.js';

const membershipQuery = z.strictObject({
  recipeIds: z
    .string()
    .max(2499)
    .transform((csv) => csv.split(','))
    .pipe(z.array(socialId).min(1).max(100))
    .transform((ids) => [...new Set(ids)]),
});

export function bookmarkRoutes(
  controller,
  readMembership,
  requireAuth,
  writeLimit,
  readLimit,
) {
  const router = mountRecipeRelation(
    Router(),
    '/me/bookmarks',
    controller,
    requireAuth,
    writeLimit,
  );
  router.get(
    '/me/recipe-interactions',
    requireAuth,
    readLimit,
    validate(membershipQuery, 'query'),
    async (req, res) => {
      const data = await readMembership(
        req.actor,
        req.validated.query.recipeIds,
      );
      res
        .set('Cache-Control', 'private, no-store')
        .json({ success: true, data });
    },
  );
  return router;
}

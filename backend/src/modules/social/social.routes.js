import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { authorize } from '../../middleware/authenticate.js';
import {
  reviewBody,
  commentBody,
  commentPatch,
  reportBody,
  socialQuery,
  commentQuery,
  reportQuery,
  recipeParams,
  commentParams,
  reportParams,
  recipeModerationBody,
  commentModerationBody,
  resolutionBody,
  keyHeaders,
  noQuery,
  noBody,
} from './social.validation.js';
export function socialRoutes(controller, requireAuth, security) {
  const router = Router(),
    admin = [requireAuth, authorize('admin')],
    writeLimit = security.limit(security.socialRateLimit ?? 120);
  const params = (schema) => validate(schema, 'params'),
    query = (schema) => validate(schema, 'query'),
    body = (schema) => validate(schema),
    key = validate(keyHeaders, 'headers');
  router.get(
    '/recipes/:recipeId/reviews',
    params(recipeParams),
    query(socialQuery),
    controller.listReviews,
  );
  router.put(
    '/recipes/:recipeId/my-review',
    requireAuth,
    writeLimit,
    params(recipeParams),
    query(noQuery),
    body(reviewBody),
    controller.putReview,
  );
  router.delete(
    '/recipes/:recipeId/my-review',
    requireAuth,
    params(recipeParams),
    query(noQuery),
    body(noBody),
    controller.deleteReview,
  );
  router.get(
    '/recipes/:recipeId/comments',
    params(recipeParams),
    query(commentQuery),
    controller.listComments,
  );
  router.post(
    '/recipes/:recipeId/comments',
    requireAuth,
    writeLimit,
    params(recipeParams),
    query(noQuery),
    key,
    body(commentBody),
    controller.createComment,
  );
  router.patch(
    '/comments/:commentId',
    requireAuth,
    writeLimit,
    params(commentParams),
    query(noQuery),
    body(commentPatch),
    controller.patchComment,
  );
  router.delete(
    '/comments/:commentId',
    requireAuth,
    params(commentParams),
    query(noQuery),
    body(noBody),
    controller.deleteComment,
  );
  router.post(
    '/reports',
    requireAuth,
    writeLimit,
    query(noQuery),
    body(reportBody),
    controller.createReport,
  );
  router.get(
    '/admin/reports',
    ...admin,
    query(reportQuery),
    controller.listReports,
  );
  router.patch(
    '/admin/reports/:reportId/resolve',
    ...admin,
    params(reportParams),
    query(noQuery),
    key,
    body(resolutionBody),
    controller.resolveReport,
  );
  router.patch(
    '/admin/recipes/:recipeId/moderation',
    ...admin,
    params(recipeParams),
    query(noQuery),
    key,
    body(recipeModerationBody),
    controller.moderateRecipe,
  );
  router.patch(
    '/admin/comments/:commentId/moderation',
    ...admin,
    params(commentParams),
    query(noQuery),
    key,
    body(commentModerationBody),
    controller.moderateComment,
  );
  return router;
}

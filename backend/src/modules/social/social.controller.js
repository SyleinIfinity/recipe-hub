import {
  reviewDTO,
  commentDTO,
  reportDTO,
  adminReportDTO,
} from './social.dto.js';
export function createSocialController({
  reviews,
  comments,
  reports,
  moderation,
}) {
  const data = (res, value, status = 200) =>
    res.status(status).json({ success: true, data: value });
  return {
    async listReviews(req, res) {
      const result = await reviews.list(
        req.validated.params.recipeId,
        req.validated.query,
      );
      res.json({
        success: true,
        data: result.rows.map(reviewDTO),
        meta: result.meta,
        summary: result.summary,
      });
    },
    async putReview(req, res) {
      const result = await reviews.put(
        req.actor,
        req.validated.params.recipeId,
        req.validated.body,
      );
      data(res, reviewDTO(result.row), result.created ? 201 : 200);
    },
    async deleteReview(req, res) {
      await reviews.remove(req.actor, req.validated.params.recipeId);
      res.status(204).end();
    },
    async listComments(req, res) {
      const result = await comments.list(
        req.validated.params.recipeId,
        req.validated.query,
      );
      res.json({
        success: true,
        data: result.rows.map(commentDTO),
        meta: result.meta,
      });
    },
    async createComment(req, res) {
      data(
        res,
        commentDTO(
          await comments.create(
            req.actor,
            req.validated.params.recipeId,
            req.validated.body,
            req.validated.headers['idempotency-key'],
          ),
        ),
        201,
      );
    },
    async patchComment(req, res) {
      data(
        res,
        commentDTO(
          await comments.patch(
            req.actor,
            req.validated.params.commentId,
            req.validated.body,
          ),
        ),
      );
    },
    async deleteComment(req, res) {
      await comments.remove(req.actor, req.validated.params.commentId);
      res.status(204).end();
    },
    async createReport(req, res) {
      data(
        res,
        reportDTO(await reports.create(req.actor, req.validated.body)),
        201,
      );
    },
    async listReports(req, res) {
      const result = await reports.list(req.actor, req.validated.query);
      res.json({
        success: true,
        data: result.rows.map(adminReportDTO),
        meta: result.meta,
      });
    },
    async resolveReport(req, res) {
      data(
        res,
        await moderation.resolve(
          req.actor,
          req.validated.params.reportId,
          req.validated.body,
          req.validated.headers['idempotency-key'],
          req.requestId,
        ),
      );
    },
    async moderateRecipe(req, res) {
      data(
        res,
        await moderation.moderate(
          req.actor,
          'recipe',
          req.validated.params.recipeId,
          req.validated.body,
          req.validated.headers['idempotency-key'],
          req.requestId,
        ),
      );
    },
    async moderateComment(req, res) {
      data(
        res,
        await moderation.moderate(
          req.actor,
          'comment',
          req.validated.params.commentId,
          req.validated.body,
          req.validated.headers['idempotency-key'],
          req.requestId,
        ),
      );
    },
  };
}

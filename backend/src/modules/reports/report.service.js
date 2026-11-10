import { reportBody, reportQuery } from '../social/social.validation.js';
import {
  oid,
  activeActor,
  pageFacet,
  pageResult,
  fail,
} from '../social/social.policy.js';
import { boundedAggregate } from '../recipes/search.service.js';
export function createReportService({
  Report,
  Recipe,
  Comment,
  User,
  publication,
  comments,
}) {
  return {
    async create(actor, raw) {
      const reporterId = await activeActor(User, actor),
        input = reportBody.parse(raw);
      const target =
        input.targetType === 'recipe'
          ? await publication.isPublic(oid(input.targetId))
          : await comments.publicComment(input.targetId);
      if (!target) fail(404, 'TARGET_NOT_FOUND', 'Report target not found');
      try {
        return await Report.create({ reporterId, ...input });
      } catch (err) {
        if (err.code === 11000)
          fail(
            409,
            'REPORT_DUPLICATE',
            'A pending report already exists for this target',
          );
        throw err;
      }
    },
    async list(actor, raw) {
      await activeActor(User, actor, true);
      const query = reportQuery.parse(raw);
      const [result] = await boundedAggregate(Report, [
        { $match: { status: query.status } },
        ...pageFacet(query),
      ]);
      // One batched lookup per target collection, not one request per report.
      const recipeIds = result.rows
        .filter((r) => r.targetType === 'recipe')
        .map((r) => r.targetId);
      const commentIds = result.rows
        .filter((r) => r.targetType === 'comment')
        .map((r) => r.targetId);
      const commentRows = await Comment.find({ _id: { $in: commentIds } })
        .select('_id recipeId status deletedAt creationState version content')
        .maxTimeMS(3000)
        .lean();
      const recipeRows = await Recipe.find({
        _id: { $in: [...recipeIds, ...commentRows.map((r) => r.recipeId)] },
      })
        .select(
          '_id title status moderationStatus deletedAt creationState publishedAt version',
        )
        .maxTimeMS(3000)
        .lean();
      for (const row of result.rows) {
        const comment =
          row.targetType === 'comment'
            ? commentRows.find((c) => String(c._id) === String(row.targetId))
            : null;
        const recipe = recipeRows.find(
          (r) => String(r._id) === String(comment?.recipeId ?? row.targetId),
        );
        const target = comment ?? (row.targetType === 'recipe' ? recipe : null);
        if (target && recipe?.publishedAt) {
          const available =
            recipe.status === 'published' &&
            !recipe.deletedAt &&
            recipe.creationState === 'complete' &&
            (!comment ||
              (!comment.deletedAt && comment.creationState === 'complete'));
          row.targetContext = {
            version: target.version,
            status: comment ? comment.status : recipe.moderationStatus,
            recipeId: String(recipe._id),
            available,
            title: available && !comment ? recipe.title : null,
            content: available && comment ? comment.content : null,
          };
        }
      }
      return pageResult(result, query);
    },
  };
}

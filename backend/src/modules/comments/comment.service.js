import { createHash } from 'node:crypto';
import {
  commentBody,
  commentPatch,
  commentQuery,
} from '../social/social.validation.js';
import {
  oid,
  activeActor,
  commentVisibilityPipeline,
  publicInteractions,
  pageFacet,
  pageResult,
  fail,
} from '../social/social.policy.js';
import { boundedAggregate } from '../recipes/search.service.js';
const same = (a, b) => String(a ?? '') === String(b ?? '');
export function createCommentService({ Comment, Recipe, User, publication }) {
  async function publicComment(id, recipeId) {
    const [row] = await boundedAggregate(Comment, [
      ...commentVisibilityPipeline(User, {
        _id: oid(id),
        ...(recipeId ? { recipeId: oid(recipeId) } : {}),
      }),
      { $limit: 1 },
    ]);
    if (!row || !(await publication.isPublic(row.recipeId))) return null;
    return row;
  }
  async function finish(row) {
    if (row.deletedAt)
      fail(
        409,
        'COMMENT_CREATE_UNAVAILABLE',
        'Comment creation key belongs to deleted content',
      );
    if (row.creationState === 'complete') {
      if (row.parentId)
        await Comment.updateOne(
          { _id: row.parentId, replyIntent: row._id },
          { $set: { replyIntent: null } },
          { timestamps: false },
        );
      return row;
    }
    let parent = await Comment.findById(row.parentId).select('+replyIntent');
    if (!same(parent?.replyIntent, row._id)) {
      const claimed = await Comment.findOneAndUpdate(
        {
          _id: row.parentId,
          recipeId: row.recipeId,
          parentId: null,
          status: 'visible',
          deletedAt: null,
          creationState: 'complete',
          version: row.parentVersion,
          replyIntent: null,
          moderationIntent: null,
        },
        { $set: { replyIntent: row._id }, $inc: { version: 1 } },
        { returnDocument: 'after' },
      );
      if (!claimed) {
        parent = await Comment.findById(row.parentId).select('+replyIntent');
        if (!same(parent?.replyIntent, row._id)) {
          const fresh = await Comment.findById(row._id);
          if (fresh.creationState === 'complete' && !fresh.deletedAt)
            return fresh;
          await Comment.updateOne(
            { _id: row._id, creationState: 'pending' },
            { $set: { deletedAt: new Date(), creationState: 'complete' } },
          );
          fail(409, 'PARENT_CHANGED', 'Parent changed during reply creation');
        }
      }
    }
    const result = await Comment.findOneAndUpdate(
      { _id: row._id, creationState: 'pending', deletedAt: null },
      { $set: { creationState: 'complete' } },
      { returnDocument: 'after' },
    );
    await Comment.updateOne(
      { _id: row.parentId, replyIntent: row._id },
      { $set: { replyIntent: null } },
      { timestamps: false },
    );
    return result ?? Comment.findById(row._id);
  }
  async function finishSafely(row) {
    try {
      return await finish(row);
    } catch (err) {
      if (err.status === 409) throw err;
      fail(503, 'COMMENT_UNCERTAIN', 'Retry with the same Idempotency-Key');
    }
  }
  return {
    publicComment,
    async create(actor, recipeId, raw, key) {
      const authorId = await activeActor(User, actor),
        input = commentBody.parse(raw);
      const fingerprint = createHash('sha256')
        .update(JSON.stringify({ recipeId: String(recipeId), input }))
        .digest('hex');
      const existing = await Comment.findOne({
        authorId,
        creationKey: key,
      }).select('+creationFingerprint +parentVersion');
      if (existing) {
        if (existing.creationFingerprint !== fingerprint)
          fail(
            409,
            'IDEMPOTENCY_CONFLICT',
            'Key belongs to a different comment',
          );
        const row = await finishSafely(existing);
        const visible = await publicComment(row._id, recipeId);
        if (!visible)
          fail(404, 'COMMENT_NOT_FOUND', 'Comment is not publicly available');
        return visible;
      }
      if (!(await publication.isPublic(oid(recipeId))))
        fail(404, 'RECIPE_NOT_FOUND', 'Recipe not found');
      let parent;
      if (input.parentId) {
        parent = await publicComment(input.parentId, recipeId);
        if (!parent || parent.parentId)
          fail(
            422,
            'INVALID_PARENT',
            'Reply parent must be a visible root on this recipe',
          );
      }
      let row;
      try {
        row = await Comment.create({
          authorId,
          recipeId,
          ...input,
          creationKey: key,
          creationFingerprint: fingerprint,
          creationState: parent ? 'pending' : 'complete',
          ...(parent ? { parentVersion: parent.version } : {}),
        });
      } catch (err) {
        if (err.code !== 11000)
          fail(503, 'COMMENT_UNCERTAIN', 'Retry with the same Idempotency-Key');
        row = await Comment.findOne({ authorId, creationKey: key }).select(
          '+creationFingerprint +parentVersion',
        );
        if (!row || row.creationFingerprint !== fingerprint)
          fail(
            409,
            'IDEMPOTENCY_CONFLICT',
            'Key belongs to a different comment',
          );
      }
      const result = await finishSafely(row);
      const visible = await publicComment(result._id, recipeId);
      if (!visible)
        fail(404, 'COMMENT_NOT_FOUND', 'Comment is not publicly available');
      return visible;
    },
    async patch(actor, id, raw) {
      const authorId = await activeActor(User, actor),
        input = commentPatch.parse(raw);
      const row = await Comment.findOne({
        _id: id,
        authorId,
        deletedAt: null,
        creationState: 'complete',
      });
      if (!row || !(await publicComment(id, row.recipeId)))
        fail(404, 'COMMENT_NOT_FOUND', 'Comment not found');
      const result = await Comment.findOneAndUpdate(
        {
          _id: id,
          authorId,
          version: input.version,
          status: 'visible',
          deletedAt: null,
          creationState: 'complete',
          moderationIntent: null,
          replyIntent: null,
        },
        { $set: { content: input.content }, $inc: { version: 1 } },
        { returnDocument: 'after', runValidators: true },
      );
      if (!result) fail(409, 'VERSION_CONFLICT', 'Comment changed');
      return {
        ...result.toObject(),
        publicAuthor: actor.user,
      };
    },
    async remove(actor, id) {
      const authorId = await activeActor(User, actor),
        row = await Comment.findOne({
          _id: id,
          authorId,
          creationState: 'complete',
        });
      if (!row) fail(404, 'COMMENT_NOT_FOUND', 'Comment not found');
      if (row.deletedAt) return;
      const result = await Comment.updateOne(
        {
          _id: id,
          authorId,
          version: row.version,
          deletedAt: null,
          moderationIntent: null,
        },
        { $set: { deletedAt: new Date() }, $inc: { version: 1 } },
      );
      if (!result.modifiedCount)
        fail(409, 'VERSION_CONFLICT', 'Comment changed');
    },
    async list(id, raw) {
      const query = commentQuery.parse(raw);
      const filter = { recipeId: oid(id) };
      if (query.scope === 'roots') filter.parentId = null;
      if (query.scope === 'replies') filter.parentId = oid(query.parentId);
      // Count eligible replies only for the roots on this page.
      const replyCounts =
        query.scope === 'roots'
          ? [
              {
                $lookup: {
                  from: Comment.collection.name,
                  localField: '_id',
                  foreignField: 'parentId',
                  pipeline: [
                    ...commentVisibilityPipeline(User, { recipeId: oid(id) }),
                    { $count: 'total' },
                  ],
                  as: 'visibleReplies',
                },
              },
              {
                $set: {
                  replyCount: {
                    $ifNull: [{ $first: '$visibleReplies.total' }, 0],
                  },
                },
              },
              { $unset: 'visibleReplies' },
            ]
          : [];
      const result = await publicInteractions(
        { Recipe, User },
        id,
        Comment.collection.name,
        [
          ...commentVisibilityPipeline(User, filter),
          ...pageFacet(query, {}, replyCounts),
        ],
      );
      return pageResult(result, query);
    },
    async reconcile({ limit = 20, dryRun = false } = {}) {
      if (!Number.isInteger(limit) || limit < 1 || limit > 100)
        throw new Error('Invalid reconciliation batch');
      // Include completed replies with an uncleared parent marker after an uncertain response.
      const parents = await Comment.find({ replyIntent: { $type: 'objectId' } })
        .select('+replyIntent')
        .limit(limit)
        .maxTimeMS(3000);
      const rows = await Comment.find({
        $or: [
          { creationState: 'pending' },
          { _id: { $in: parents.map((p) => p.replyIntent) } },
        ],
      })
        .select('+parentVersion')
        .sort({ _id: 1 })
        .limit(limit)
        .maxTimeMS(3000);
      const result = {
        scanned: rows.length,
        completed: 0,
        conflicted: 0,
        uncertain: 0,
        dryRun,
      };
      if (!dryRun)
        for (const row of rows)
          try {
            await finish(row);
            result.completed++;
          } catch (err) {
            if (err.status === 409) result.conflicted++;
            else result.uncertain++;
          }
      return result;
    },
  };
}

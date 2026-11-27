import { normalizeRecipeContent } from './recipe.service.js';
import { updateRecipeSchema } from './recipe.validation.js';
import { interactionSummaryStages } from '../social/interaction-summary.js';
import { boundedAggregate } from '../../shared/aggregate.js';
import { createSearchService } from './search.service.js';
import { recipeSearchFields } from './search.normalization.js';
import { AppError } from '../../shared/errors.js';
import {
  validatePublication,
  transitionSchema,
  recipeSlug,
} from './publication.validation.js';
import { publicRecipePipeline } from './recipe-visibility.js';
import { recipeReferences } from './recipe-reference.js';
const fail = (status, code, message) => {
  throw new AppError(status, code, message);
};
const same = (a, b) => String(a ?? '') === String(b ?? '');
export function createPublicationService({
  Recipe,
  User,
  Category,
  Ingredient,
  MediaAsset,
  now = () => new Date(),
}) {
  async function activeOwner(actor) {
    if (
      !actor?.user?._id ||
      actor.user.status !== 'active' ||
      !(await User.exists({ _id: actor.user._id, status: 'active' }))
    )
      fail(401, 'UNAUTHENTICATED', 'Authentication required');
    return actor.user._id;
  }
  async function mediaReady(row) {
    const refs = recipeReferences(row);
    if (!MediaAsset) {
      if (refs.length)
        fail(503, 'MEDIA_UNAVAILABLE', 'Media policy unavailable');
      return;
    }
    if (
      await MediaAsset.exists({ 'attachmentIntent.target.resourceId': row._id })
    )
      fail(
        409,
        'MEDIA_RECONCILIATION_REQUIRED',
        'Media reconciliation required',
      );
    for (const ref of refs) {
      const asset = await MediaAsset.findById(ref.assetId);
      if (
        !asset ||
        asset.status !== 'attached' ||
        asset.uploadOutcome !== 'confirmed' ||
        asset.attachmentIntent ||
        asset.deleteRequestedAt ||
        asset.cloudinary?.deliveryType !== 'authenticated' ||
        !same(asset.ownerId, row.authorId) ||
        asset.purpose !== ref.target.kind ||
        !same(asset.attachedTo?.resourceId, row._id) ||
        asset.attachedTo?.kind !== ref.target.kind ||
        !same(asset.attachedTo?.stepId, ref.target.stepId)
      )
        fail(
          409,
          'MEDIA_RECONCILIATION_REQUIRED',
          'Media references are not stable',
        );
    }
  }
  async function catalogReady(row) {
    const details = [];
    if (!(await Category.exists({ _id: row.categoryId, isActive: true })))
      details.push({ field: 'categoryId', code: 'inactive_or_missing' });
    const ids = row.ingredients
      .filter((v) => v.ingredientId)
      .map((v) => v.ingredientId);
    const found = await Ingredient.find({
      _id: { $in: ids },
      isActive: true,
    }).select('_id');
    row.ingredients.forEach((v, i) => {
      if (v.ingredientId && !found.some((x) => same(x._id, v.ingredientId)))
        details.push({
          field: `ingredients.${i}.ingredientId`,
          code: 'inactive_or_missing',
        });
    });
    if (details.length)
      throw new AppError(
        422,
        'RECIPE_NOT_PUBLISHABLE',
        'Catalog references must be active',
        details,
      );
  }
  async function transition(actor, id, input, publishing) {
    const { version } = transitionSchema.parse(input);
    const authorId = await activeOwner(actor);
    const row = await Recipe.findOne({
      _id: id,
      authorId,
      deletedAt: null,
      creationState: 'complete',
    });
    if (!row) fail(404, 'RECIPE_NOT_FOUND', 'Recipe not found');
    if (row.version !== version)
      fail(409, 'VERSION_CONFLICT', 'Recipe version conflict');
    const status = publishing ? 'draft' : 'published';
    if (
      row.status !== status ||
      (publishing && row.moderationStatus !== 'normal')
    )
      fail(409, 'RECIPE_STATE_CONFLICT', 'Recipe cannot make this transition');
    if (publishing) {
      validatePublication(row);
      await mediaReady(row);
      await catalogReady(row);
      await activeOwner(actor);
    }
    for (let attempt = 0; attempt < 5; attempt++) {
      const slug =
        row.slug ||
        `${recipeSlug(row.title)}${attempt ? `-${String(row._id)}-${attempt}` : ''}`;
      let result;
      try {
        result = await Recipe.findOneAndUpdate(
          {
            _id: row._id,
            authorId,
            version,
            status,
            deletedAt: null,
            creationState: 'complete',
            ...(publishing ? { moderationStatus: 'normal' } : {}),
          },
          {
            $set: publishing
              ? {
                  ...recipeSearchFields(row),
                  status: 'published',
                  slug,
                  publishedAt: row.publishedAt || now(),
                  totalMinutes: row.prepMinutes + row.cookMinutes,
                }
              : { status: 'draft' },
            $inc: { version: 1 },
          },
          { returnDocument: 'after', runValidators: true },
        );
      } catch (err) {
        if (err.code === 11000 && !row.slug && err.keyPattern?.slug) continue;
        fail(
          503,
          'RECIPE_TRANSITION_UNCERTAIN',
          'Read the current recipe before retrying',
        );
      }
      if (!result) fail(409, 'VERSION_CONFLICT', 'Recipe changed concurrently');
      return result;
    }
    fail(409, 'RECIPE_SLUG_CONFLICT', 'Unable to allocate a unique slug');
  }
  async function updatePublished(actor, id, raw) {
    const input = updateRecipeSchema.parse(raw);
    const authorId = await activeOwner(actor);
    const owner = {
      _id: id,
      authorId,
      deletedAt: null,
      creationState: 'complete',
    };
    const current = await Recipe.findOne(owner).select('+moderationIntent');
    if (!current) fail(404, 'RECIPE_NOT_FOUND', 'Recipe not found');
    if (
      current.status !== 'published' ||
      current.moderationStatus !== 'normal' ||
      current.moderationIntent
    )
      fail(
        409,
        'RECIPE_STATE_CONFLICT',
        'Recipe cannot be updated while in this state',
      );
    if (current.version !== input.version)
      fail(409, 'VERSION_CONFLICT', 'Recipe version conflict');

    const data = normalizeRecipeContent(input, current);
    const proposed = { ...current.toObject(), ...data };
    // Step order may change; image ownership follows its slot and stable step ID.
    const slots = (row) =>
      recipeReferences(row)
        .map(({ target, assetId }) =>
          [target.kind, target.stepId ?? '', assetId].join('/'),
        )
        .sort();
    const before = slots(current),
      after = slots(proposed);
    if (
      before.length !== after.length ||
      before.some((slot, i) => slot !== after[i])
    )
      fail(
        409,
        'PUBLISHED_MEDIA_CHANGE',
        'Unpublish before changing recipe images',
      );
    validatePublication(proposed);
    const ids = proposed.ingredients
      .filter((i) => i.ingredientId)
      .map((i) => String(i.ingredientId));
    if (new Set(ids).size !== ids.length)
      fail(422, 'RECIPE_DUPLICATE_INGREDIENT', 'Duplicate catalog ingredient');
    await catalogReady(proposed);
    await mediaReady(current);
    await activeOwner(actor);
    let result;
    try {
      result = await Recipe.findOneAndUpdate(
        {
          ...owner,
          version: input.version,
          status: 'published',
          moderationStatus: 'normal',
          moderationIntent: null,
        },
        { $set: data, $inc: { version: 1 } },
        { returnDocument: 'after', runValidators: true },
      );
    } catch {
      fail(
        503,
        'RECIPE_UPDATE_UNCERTAIN',
        'Read the current recipe before retrying',
      );
    }
    if (!result) fail(409, 'VERSION_CONFLICT', 'Recipe changed concurrently');
    return result;
  }
  async function visible(filter, stages = []) {
    return boundedAggregate(Recipe, [
      ...publicRecipePipeline(User, filter),
      { $limit: 1 },
      ...stages,
    ]);
  }
  const search = createSearchService({ Recipe, User });
  return {
    publish: (actor, id, input) => transition(actor, id, input, true),
    unpublish: (actor, id, input) => transition(actor, id, input, false),
    mediaReady,
    updatePublished,
    async isPublic(id) {
      return (await visible({ _id: id }))[0] ?? null;
    },
    async detail(slug) {
      const row = (await visible({ slug }, interactionSummaryStages(User)))[0];
      if (!row) fail(404, 'RECIPE_NOT_FOUND', 'Recipe not found');
      return row;
    },
    list: search.list,
    async listByAuthor(userId, query) {
      const user = await User.exists({ _id: userId, status: 'active' });
      if (!user) fail(404, 'USER_NOT_FOUND', 'User not found');
      return search.list(query, user._id);
    },
  };
}

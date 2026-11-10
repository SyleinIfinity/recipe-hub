import { createHash, randomUUID } from 'node:crypto';
import { recipeSearchFields } from './search.normalization.js';
import { AppError } from '../../shared/errors.js';
import {
  createRecipeSchema,
  updateRecipeSchema,
  recipeQuery,
} from './recipe.validation.js';
import { recipeReferences } from './recipe-reference.js';
const error = (status, code, message) => {
  throw new AppError(status, code, message);
};
const same = (a, b) => String(a ?? '') === String(b ?? '');
export function createRecipeService({
  Recipe,
  Category,
  Ingredient,
  media,
  now = () => new Date(),
}) {
  function author(actor) {
    if (!actor?.user?._id || actor.user.status !== 'active')
      error(401, 'UNAUTHENTICATED', 'Authentication required');
    return actor.user._id;
  }
  const filter = (actor, id) => ({
    _id: id,
    authorId: author(actor),
    deletedAt: null,
    creationState: 'complete',
    status: 'draft',
  });
  async function get(actor, id) {
    const owned = filter(actor, id);
    delete owned.status;
    const row = await Recipe.findOne(owned);
    if (!row) error(404, 'RECIPE_NOT_FOUND', 'Recipe not found');
    return row;
  }
  function normalize(input, old) {
    const data = { ...input };
    delete data.version;
    if (data.ingredients)
      data.ingredients = [...data.ingredients]
        .sort((a, b) => a.order - b.order)
        .map((v, i) => ({
          ingredientId: null,
          quantity: null,
          unit: null,
          quantityText: null,
          note: null,
          ...v,
          order: i + 1,
        }));
    if (data.steps)
      data.steps = [...data.steps]
        .sort((a, b) => a.order - b.order)
        .map((v, i) => {
          const prior = v.stepId
            ? old?.steps.find((s) => s.stepId === v.stepId)
            : null;
          if (v.stepId && !prior)
            error(
              422,
              'RECIPE_INVALID_STEP',
              'Step ID must belong to this recipe',
            );
          return {
            stepId: v.stepId || randomUUID(),
            order: i + 1,
            instruction: v.instruction ?? prior?.instruction ?? '',
            durationMinutes:
              v.durationMinutes === undefined
                ? (prior?.durationMinutes ?? null)
                : v.durationMinutes,
            imageAssetId:
              v.imageAssetId === undefined
                ? (prior?.imageAssetId ?? null)
                : v.imageAssetId,
          };
        });
    const prep =
        data.prepMinutes === undefined
          ? (old?.prepMinutes ?? null)
          : data.prepMinutes,
      cook =
        data.cookMinutes === undefined
          ? (old?.cookMinutes ?? null)
          : data.cookMinutes;
    data.totalMinutes =
      prep === null && cook === null ? null : (prep ?? 0) + (cook ?? 0);
    Object.assign(
      data,
      recipeSearchFields({
        title: data.title ?? old?.title,
        description: data.description ?? old?.description,
      }),
    );
    return data;
  }
  async function catalog(data, old) {
    if (data.categoryId) {
      const row = await Category.findById(data.categoryId);
      if (!row || (!row.isActive && !same(old?.categoryId, data.categoryId)))
        error(
          422,
          'RECIPE_INVALID_CATEGORY',
          'Category must exist and be active when newly selected',
        );
    }
    const entries = data.ingredients ?? [];
    const ids = entries
      .filter((v) => v.ingredientId)
      .map((v) => String(v.ingredientId));
    if (new Set(ids).size !== ids.length)
      error(422, 'RECIPE_DUPLICATE_INGREDIENT', 'Duplicate catalog ingredient');
    const rows = await Ingredient.find({ _id: { $in: ids } });
    for (const id of ids) {
      const row = rows.find((v) => same(v._id, id));
      const retained = old?.ingredients.some((v) => same(v.ingredientId, id));
      if (!row || (!row.isActive && !retained))
        error(
          422,
          'RECIPE_INVALID_INGREDIENT',
          'Ingredient must exist and be active when newly selected',
        );
    }
  }
  async function replay(actor, row) {
    if (row.deletedAt)
      error(
        409,
        'RECIPE_CREATE_REPLAY_UNAVAILABLE',
        'Recipe was deleted; this key cannot create a replacement',
      );
    for (const entry of recipeReferences(row)) {
      let asset = await media.lifecycle.validateOwnedAsset(
        actor,
        entry.assetId,
      );
      if (asset.attachmentIntent) {
        await media.lifecycle.reconcileAttachment(asset);
        asset = await media.lifecycle.validateOwnedAsset(actor, entry.assetId);
      }
      if (asset.status !== 'attached')
        error(
          503,
          'MEDIA_RECONCILIATION_REQUIRED',
          'Creation media requires reconciliation',
        );
    }
    return get(actor, row._id);
  }
  async function finishCreate(actor, row) {
    if (row.creationState === 'complete') return replay(actor, row);
    const desired = row.creationMedia.map((v) => ({
      assetId: String(v.assetId),
      target: {
        kind: v.kind,
        resourceId: String(row._id),
        ...(v.stepId ? { stepId: v.stepId } : {}),
      },
    }));
    // A previous interrupted attempt may still hold intents. Fence/repair it before a new CAS.
    for (const entry of desired) {
      const asset = await media.lifecycle.validateOwnedAsset(
        actor,
        entry.assetId,
      );
      if (
        asset.attachmentIntent &&
        same(asset.attachmentIntent.target.resourceId, row._id)
      )
        await media.lifecycle.reconcileAttachment(asset);
    }
    row = await Recipe.findOne({
      _id: row._id,
      authorId: author(actor),
    }).select('+creationMedia +creationKey +creationFingerprint');
    if (row.creationState === 'complete') return replay(actor, row);
    const steps = row.steps.map((v) => ({
      ...v.toObject(),
      imageAssetId:
        desired.find((e) => e.target.stepId === v.stepId)?.assetId ?? null,
    }));
    const coverImageAssetId =
      desired.find((e) => e.target.kind === 'recipe_cover')?.assetId ?? null;
    return media.lifecycle.applyReferences(actor, {
      before: [],
      after: desired,
      expectedVersion: row.version,
      commit: () =>
        Recipe.findOneAndUpdate(
          {
            _id: row._id,
            authorId: author(actor),
            creationState: 'pending',
            status: 'draft',
            deletedAt: null,
            version: row.version,
          },
          {
            $set: {
              steps,
              coverImageAssetId,
              creationState: 'complete',
              creationMedia: [],
            },
            $inc: { version: 1 },
          },
          { returnDocument: 'after', runValidators: true },
        ),
    });
  }
  return {
    get,
    async create(actor, raw, key) {
      const owner = author(actor);
      const input = createRecipeSchema.parse(raw);
      if (
        !/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(
          key ?? '',
        )
      )
        error(400, 'RECIPE_INVALID_KEY', 'Idempotency-Key UUID v4 required');
      key = key.toLowerCase();
      const fingerprint = createHash('sha256')
        .update(JSON.stringify(input))
        .digest('hex');
      let row = await Recipe.findOne({
        authorId: owner,
        creationKey: key,
      }).select('+creationKey +creationFingerprint +creationMedia');
      if (row) {
        if (row.creationFingerprint !== fingerprint)
          error(
            409,
            'RECIPE_IDEMPOTENCY_CONFLICT',
            'Key belongs to a different draft payload',
          );
        return finishCreate(actor, row);
      }
      const data = normalize(input);
      await catalog(data);
      const desired = [
        ...(data.coverImageAssetId
          ? [{ assetId: data.coverImageAssetId, kind: 'recipe_cover' }]
          : []),
        ...(data.steps ?? [])
          .filter((v) => v.imageAssetId)
          .map((v) => ({
            assetId: v.imageAssetId,
            kind: 'recipe_step',
            stepId: v.stepId,
          })),
      ];
      if (
        new Set(desired.map((v) => String(v.assetId))).size !== desired.length
      )
        error(
          422,
          'MEDIA_DUPLICATE_REFERENCE',
          'One image may occupy only one slot',
        );
      for (const entry of desired)
        await media.lifecycle.validateAttachableAsset(actor, entry.assetId, {
          kind: entry.kind,
        });
      try {
        row = await Recipe.create({
          ...data,
          authorId: owner,
          creationKey: key,
          creationFingerprint: fingerprint,
          creationState: desired.length ? 'pending' : 'complete',
          creationMedia: desired,
          ...(desired.length
            ? {
                coverImageAssetId: null,
                steps: (data.steps ?? []).map((v) => ({
                  ...v,
                  imageAssetId: null,
                })),
              }
            : {}),
        });
      } catch (err) {
        if (err.code !== 11000) throw err;
        row = await Recipe.findOne({
          authorId: owner,
          creationKey: key,
        }).select('+creationKey +creationFingerprint +creationMedia');
        if (!row || row.creationFingerprint !== fingerprint)
          error(
            409,
            'RECIPE_IDEMPOTENCY_CONFLICT',
            'Concurrent draft creation conflict',
          );
      }
      return finishCreate(actor, row);
    },
    async list(actor, query) {
      const { page, limit, sort } = recipeQuery.parse(query);
      const f = {
        authorId: author(actor),
        deletedAt: null,
        status: 'draft',
        creationState: 'complete',
      };
      const field = sort.replace('-', ''),
        direction = sort.startsWith('-') ? -1 : 1;
      const [rows, total] = await Promise.all([
        Recipe.find(f)
          .sort({ [field]: direction, _id: direction })
          .skip((page - 1) * limit)
          .limit(limit),
        Recipe.countDocuments(f),
      ]);
      return { rows, meta: { page, limit, total } };
    },
    async update(actor, id, raw) {
      const input = updateRecipeSchema.parse(raw);
      const old = await get(actor, id);
      if (old.status !== 'draft')
        error(404, 'RECIPE_NOT_FOUND', 'Recipe not found');
      if (old.version !== input.version)
        error(409, 'VERSION_CONFLICT', 'Recipe version conflict');
      const data = normalize(input, old);
      await catalog(data, old);
      const proposed = { ...old.toObject(), ...data };
      return media.lifecycle.applyReferences(actor, {
        before: recipeReferences(old),
        after: recipeReferences(proposed),
        expectedVersion: input.version,
        commit: () =>
          Recipe.findOneAndUpdate(
            { ...filter(actor, id), version: input.version },
            { $set: data, $inc: { version: 1 } },
            { returnDocument: 'after', runValidators: true },
          ),
      });
    },
    async remove(actor, id) {
      const row = await Recipe.findOne({
        _id: id,
        authorId: author(actor),
        creationState: 'complete',
        status: 'draft',
      });
      if (!row) error(404, 'RECIPE_NOT_FOUND', 'Recipe not found');
      if (row.deletedAt) return;
      const result = await Recipe.updateOne(
        { ...filter(actor, id), version: row.version },
        { $set: { deletedAt: now() }, $inc: { version: 1 } },
      );
      if (!result.modifiedCount)
        error(409, 'VERSION_CONFLICT', 'Recipe changed concurrently');
    },
    async restore(actor, id, version) {
      if (!Number.isSafeInteger(version) || version < 0)
        error(
          422,
          'RECIPE_INVALID_VERSION',
          'Expected version must be a nonnegative integer',
        );
      const row = await Recipe.findOne({
        _id: id,
        authorId: author(actor),
        status: 'draft',
        creationState: 'complete',
      });
      if (!row) error(404, 'RECIPE_NOT_FOUND', 'Recipe not found');
      if (!row.deletedAt || +now() - +row.deletedAt > 30 * 86400000)
        error(
          409,
          'RECIPE_RESTORE_UNAVAILABLE',
          'Restore retention elapsed or recipe is active',
        );
      const restored = await Recipe.findOneAndUpdate(
        { _id: id, authorId: author(actor), version, deletedAt: row.deletedAt },
        { $set: { deletedAt: null }, $inc: { version: 1 } },
        { returnDocument: 'after' },
      );
      if (!restored) error(409, 'VERSION_CONFLICT', 'Recipe version conflict');
      return restored;
    },
  };
}

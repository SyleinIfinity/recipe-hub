import mongoose from 'mongoose';
import { publicRecipeMatch } from './recipe-visibility.js';
import { recipeSearchFields } from './search.normalization.js';
const { Schema } = mongoose;
const nullableId = { type: Schema.Types.ObjectId, default: null };
const minute = {
  type: Number,
  min: 0,
  max: 1440,
  default: null,
  validate: (v) => v == null || Number.isInteger(v),
};
const short = (max, defaultValue = '') => ({
  type: String,
  maxlength: max,
  default: defaultValue,
});
export function createRecipeModel(connection) {
  if (connection.models.Recipe) return connection.models.Recipe;
  const ingredient = new Schema(
    {
      ingredientId: nullableId,
      name: { type: String, required: true, maxlength: 100 },
      quantity: { type: Number, min: 0, max: 1e9, default: null },
      unit: short(32, null),
      quantityText: short(100, null),
      note: short(500, null),
      order: {
        type: Number,
        required: true,
        min: 1,
        max: 40,
        validate: Number.isInteger,
      },
    },
    { _id: false, strict: 'throw' },
  );
  const step = new Schema(
    {
      stepId: { type: String, required: true },
      order: {
        type: Number,
        required: true,
        min: 1,
        max: 30,
        validate: Number.isInteger,
      },
      instruction: short(2000),
      durationMinutes: minute,
      imageAssetId: nullableId,
    },
    { _id: false, strict: 'throw' },
  );
  const desired = new Schema(
    {
      assetId: { type: Schema.Types.ObjectId, required: true },
      kind: {
        type: String,
        enum: ['recipe_cover', 'recipe_step'],
        required: true,
      },
      stepId: String,
    },
    { _id: false, strict: 'throw' },
  );
  const schema = new Schema(
    {
      authorId: {
        type: Schema.Types.ObjectId,
        required: true,
        immutable: true,
      },
      searchTokens: { type: [String], select: false, default: undefined },
      searchVersion: { type: Number, select: false },
      title: short(150),
      slug: short(200, null),
      description: short(2000),
      coverImageAssetId: nullableId,
      categoryId: nullableId,
      tags: {
        type: [String],
        default: [],
        validate: (v) => v.length <= 12 && v.every((t) => t.length <= 40),
      },
      difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard', null],
        default: null,
      },
      prepMinutes: minute,
      cookMinutes: minute,
      totalMinutes: { type: Number, min: 0, max: 2880, default: null },
      servings: {
        type: Number,
        min: 1,
        max: 100,
        default: null,
        validate: (v) => v == null || Number.isInteger(v),
      },
      ingredients: {
        type: [ingredient],
        default: [],
        validate: (v) =>
          v.length <= 40 && new Set(v.map((x) => x.order)).size === v.length,
      },
      steps: {
        type: [step],
        default: [],
        validate: (v) =>
          v.length <= 30 &&
          new Set(v.map((x) => x.order)).size === v.length &&
          new Set(v.map((x) => x.stepId)).size === v.length,
      },
      status: { type: String, enum: ['draft', 'published'], default: 'draft' },
      moderationStatus: {
        type: String,
        enum: ['normal', 'hidden'],
        default: 'normal',
      },
      moderationReason: short(1000, null),
      moderationIntent: {
        type: Schema.Types.ObjectId,
        default: null,
        select: false,
      },
      publishedAt: { type: Date, default: null },
      deletedAt: { type: Date, default: null },
      version: {
        type: Number,
        min: 0,
        default: 0,
        validate: Number.isSafeInteger,
      },
      creationKey: {
        type: String,
        required: true,
        immutable: true,
        select: false,
      },
      creationFingerprint: {
        type: String,
        required: true,
        immutable: true,
        select: false,
      },
      creationState: {
        type: String,
        enum: ['pending', 'complete'],
        default: 'complete',
      },
      creationMedia: { type: [desired], default: [], select: false },
    },
    {
      collection: 'recipes',
      timestamps: true,
      strict: 'throw',
      versionKey: false,
    },
  );
  schema.pre('validate', function () {
    Object.assign(this, recipeSearchFields(this));
  });
  for (const [field, name] of [
    ['searchTokens', 'public_search_tokens'],
    ['categoryId', 'public_category'],
    ['ingredients.ingredientId', 'public_ingredients'],
  ])
    schema.index(
      { [field]: 1, publishedAt: -1, _id: -1 },
      { name, partialFilterExpression: publicRecipeMatch() },
    );
  schema.index({ authorId: 1, createdAt: -1, _id: -1 });
  schema.index({ authorId: 1, updatedAt: -1, _id: -1 });
  schema.index(
    { slug: 1 },
    { unique: true, partialFilterExpression: { slug: { $type: 'string' } } },
  );
  schema.index({ authorId: 1, creationKey: 1 }, { unique: true });
  schema.index({
    status: 1,
    moderationStatus: 1,
    deletedAt: 1,
    creationState: 1,
    publishedAt: -1,
    _id: -1,
  });
  schema.index({ coverImageAssetId: 1 });
  schema.index({ 'steps.imageAssetId': 1 });
  return connection.model('Recipe', schema);
}

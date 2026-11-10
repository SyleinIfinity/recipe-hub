import mongoose from 'mongoose';
const { Schema } = mongoose;
export const dietaryTags = [
  'vegetarian',
  'vegan',
  'gluten-free',
  'dairy-free',
  'low-carb',
  'halal',
];
const preferences = new Schema(
  {
    dietaryTags: [{ type: String, enum: dietaryTags }],
    excludedIngredientIds: [{ type: Schema.Types.ObjectId, ref: 'Ingredient' }],
    favoriteCategoryIds: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
    maxPrepMinutes: { type: Number, min: 0, max: 1440, default: null },
    timezone: { type: String, default: 'Asia/Ho_Chi_Minh' },
    notificationSettings: {
      follows: { type: Boolean, default: true },
      recipes: { type: Boolean, default: true },
      comments: { type: Boolean, default: true },
    },
    recommendationOptIn: { type: Boolean, default: false },
  },
  { _id: false, strict: 'throw' },
);
export function createUserModel(connection) {
  const schema = new Schema(
    {
      email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        maxlength: 254,
      },
      displayName: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 80,
      },
      passwordHash: { type: String, required: true, select: false },
      bio: { type: String, maxlength: 500, default: '' },
      mediaVersion: { type: Number, default: 0, min: 0 },
      avatarAssetId: {
        type: Schema.Types.ObjectId,
        ref: 'MediaAsset',
        default: null,
      },
      role: { type: String, enum: ['user', 'admin'], default: 'user' },
      status: {
        type: String,
        enum: ['active', 'suspended'],
        default: 'active',
      },
      emailVerifiedAt: { type: Date, default: null },
      preferences: { type: preferences, default: () => ({}) },
      authVersion: { type: Number, default: 0, select: false },
    },
    { collection: 'user', timestamps: true, strict: 'throw' },
  );
  schema.index({ email: 1 }, { unique: true });
  schema.index({ createdAt: -1, _id: -1 });
  return connection.models.User || connection.model('User', schema);
}

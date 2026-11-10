import mongoose from 'mongoose';
export function createFavoriteModel(connection) {
  if (connection.models.Favorite) return connection.models.Favorite;
  const schema = new mongoose.Schema(
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        immutable: true,
      },
      recipeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Recipe',
        required: true,
        immutable: true,
      },
      createdAt: { type: Date, default: Date.now, immutable: true },
    },
    { collection: 'favorites', strict: 'throw', versionKey: false },
  );
  schema.index({ userId: 1, recipeId: 1 }, { unique: true });
  schema.index({ userId: 1, createdAt: -1, _id: -1 });
  return connection.model('Favorite', schema);
}

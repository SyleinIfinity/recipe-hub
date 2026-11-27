import mongoose from 'mongoose';
export function createBookmarkModel(connection) {
  if (connection.models.Bookmark) return connection.models.Bookmark;
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
      createdAt: {
        type: Date,
        default: Date.now,
        required: true,
        immutable: true,
      },
    },
    { collection: 'bookmarks', strict: 'throw', versionKey: false },
  );
  schema.index({ userId: 1, recipeId: 1 }, { unique: true });
  schema.index({ userId: 1, createdAt: -1, _id: -1 });
  return connection.model('Bookmark', schema);
}

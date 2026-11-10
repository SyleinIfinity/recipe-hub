import mongoose from 'mongoose';
export function createReviewModel(connection) {
  if (connection.models.Review) return connection.models.Review;
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
      rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
        validate: Number.isInteger,
      },
      content: { type: String, default: '', maxlength: 1000 },
      deletedAt: { type: Date, default: null },
      status: { type: String, enum: ['visible', 'hidden'], default: 'visible' },
    },
    {
      collection: 'reviews',
      timestamps: true,
      strict: 'throw',
      versionKey: false,
    },
  );
  schema.index({ userId: 1, recipeId: 1 }, { unique: true });
  schema.index({ recipeId: 1, status: 1, createdAt: -1, _id: -1 });
  return connection.model('Review', schema);
}

import mongoose from 'mongoose';
export function createCommentModel(connection) {
  if (connection.models.Comment) return connection.models.Comment;
  const id = mongoose.Schema.Types.ObjectId;
  const schema = new mongoose.Schema(
    {
      authorId: { type: id, ref: 'User', required: true, immutable: true },
      recipeId: { type: id, ref: 'Recipe', required: true, immutable: true },
      parentId: { type: id, ref: 'Comment', default: null, immutable: true },
      content: { type: String, required: true, maxlength: 1500 },
      status: { type: String, enum: ['visible', 'hidden'], default: 'visible' },
      deletedAt: { type: Date, default: null },
      version: {
        type: Number,
        default: 0,
        min: 0,
        validate: Number.isSafeInteger,
      },
      moderationReason: { type: String, default: null, maxlength: 500 },
      moderationIntent: { type: id, default: null, select: false },
      replyIntent: { type: id, default: null, select: false },
      creationState: {
        type: String,
        enum: ['pending', 'complete'],
        default: 'complete',
      },
      creationKey: { type: String, select: false, immutable: true },
      creationFingerprint: { type: String, select: false, immutable: true },
      parentVersion: { type: Number, select: false },
    },
    {
      collection: 'comments',
      timestamps: true,
      strict: 'throw',
      versionKey: false,
    },
  );
  schema.index({
    recipeId: 1,
    status: 1,
    deletedAt: 1,
    creationState: 1,
    createdAt: 1,
    _id: 1,
  });
  schema.index({ parentId: 1, createdAt: 1, _id: 1 });
  schema.index(
    { authorId: 1, creationKey: 1 },
    {
      unique: true,
      partialFilterExpression: { creationKey: { $type: 'string' } },
    },
  );
  schema.index({ creationState: 1, _id: 1 });
  schema.index(
    { replyIntent: 1 },
    { partialFilterExpression: { replyIntent: { $type: 'objectId' } } },
  );
  return connection.model('Comment', schema);
}

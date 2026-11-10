import mongoose from 'mongoose';
export function createTokenModel(connection) {
  const schema = new mongoose.Schema(
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      purpose: {
        type: String,
        enum: ['password_reset', 'email_verify'],
        required: true,
      },
      tokenHash: { type: String, required: true, select: false },
      authVersion: { type: Number, required: true },
      expiresAt: { type: Date, required: true },
      usedAt: { type: Date, default: null },
    },
    { collection: 'auth_tokens', timestamps: true, strict: 'throw' },
  );
  schema.index({ tokenHash: 1 }, { unique: true });
  schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  schema.index({ userId: 1, purpose: 1 });
  return connection.models.AuthToken || connection.model('AuthToken', schema);
}

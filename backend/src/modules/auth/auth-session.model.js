import mongoose from 'mongoose';
export function createSessionModel(connection) {
  const schema = new mongoose.Schema(
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      tokenHash: { type: String, required: true, select: false },
      authVersion: { type: Number, required: true },
      expiresAt: { type: Date, required: true },
      revokedAt: { type: Date, default: null },
    },
    { collection: 'auth_sessions', timestamps: true, strict: 'throw' },
  );
  schema.index({ tokenHash: 1 }, { unique: true });
  schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  schema.index({ userId: 1, revokedAt: 1 });
  return (
    connection.models.AuthSession || connection.model('AuthSession', schema)
  );
}

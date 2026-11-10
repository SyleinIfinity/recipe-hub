import mongoose from 'mongoose';
export function createAuditLogModel(connection) {
  const schema = new mongoose.Schema(
    {
      actorId: { type: mongoose.Schema.Types.ObjectId, required: true },
      action: {
        type: String,
        enum: [
          'user_status_change',
          'recipe_moderation',
          'comment_moderation',
          'report_resolution',
        ],
        required: true,
      },
      targetType: {
        type: String,
        enum: ['user', 'recipe', 'comment', 'report'],
        required: true,
      },
      targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
      reason: { type: String, required: true, maxlength: 500 },
      before: { status: String, version: Number },
      after: {
        status: {
          type: String,
          enum: [
            'active',
            'suspended',
            'normal',
            'hidden',
            'visible',
            'pending',
            'resolved',
            'rejected',
          ],
        },
        version: Number,
      },
      operationKey: { type: String, maxlength: 150 },
      fingerprint: { type: String, select: false },
      plan: {
        expectedVersion: Number,
        resolutionAction: { type: String, enum: ['none', 'hide'] },
        targetType: { type: String, enum: ['recipe', 'comment'] },
        targetId: mongoose.Schema.Types.ObjectId,
        targetVersion: Number,
        targetStatus: String,
      },
      reconciledAt: { type: Date, default: null },
      outcome: {
        type: String,
        enum: ['pending', 'applied', 'not_found', 'conflict'],
        default: 'pending',
      },
      requestId: { type: String, required: true },
    },
    { collection: 'audit_logs', timestamps: true, strict: 'throw' },
  );
  schema.index({ targetId: 1, createdAt: -1 });
  schema.index(
    { operationKey: 1 },
    {
      unique: true,
      partialFilterExpression: { operationKey: { $type: 'string' } },
    },
  );
  schema.index({ actorId: 1, createdAt: -1 });
  schema.index({ action: 1, reconciledAt: 1, _id: 1 });
  return connection.models.AuditLog || connection.model('AuditLog', schema);
}

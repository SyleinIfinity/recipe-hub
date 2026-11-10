import mongoose from 'mongoose';
export function createReportModel(connection) {
  if (connection.models.Report) return connection.models.Report;
  const id = mongoose.Schema.Types.ObjectId;
  const schema = new mongoose.Schema(
    {
      reporterId: { type: id, ref: 'User', required: true, immutable: true },
      targetType: {
        type: String,
        enum: ['recipe', 'comment'],
        required: true,
        immutable: true,
      },
      targetId: { type: id, required: true, immutable: true },
      reason: {
        type: String,
        enum: ['spam', 'abuse', 'copyright', 'other'],
        required: true,
        immutable: true,
      },
      details: { type: String, default: '', maxlength: 2000, immutable: true },
      status: {
        type: String,
        enum: ['pending', 'resolved', 'rejected'],
        default: 'pending',
      },
      reviewedBy: { type: id, default: null },
      reviewedAt: { type: Date, default: null },
      resolutionNote: { type: String, default: null, maxlength: 500 },
      resolutionAction: {
        type: String,
        enum: ['none', 'hide', null],
        default: null,
      },
      version: {
        type: Number,
        default: 0,
        min: 0,
        validate: Number.isSafeInteger,
      },
      decisionIntent: { type: id, default: null, select: false },
    },
    {
      collection: 'reports',
      timestamps: true,
      strict: 'throw',
      versionKey: false,
    },
  );
  schema.index(
    { reporterId: 1, targetType: 1, targetId: 1 },
    { unique: true, partialFilterExpression: { status: 'pending' } },
  );
  schema.index({ status: 1, createdAt: -1, _id: -1 });
  return connection.model('Report', schema);
}

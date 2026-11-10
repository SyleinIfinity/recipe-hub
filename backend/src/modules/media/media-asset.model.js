import mongoose from 'mongoose';
const { Schema } = mongoose;
const integer = { type: Number, min: 1, validate: Number.isInteger };
export function createMediaAssetModel(connection) {
  if (connection.models.MediaAsset) return connection.models.MediaAsset;
  const schema = new Schema(
    {
      ownerId: { type: Schema.Types.ObjectId, required: true, immutable: true },
      purpose: {
        type: String,
        enum: ['avatar', 'recipe_cover', 'recipe_step'],
        required: true,
        immutable: true,
      },
      provider: {
        type: String,
        enum: ['fake', 'cloudinary'],
        required: true,
        immutable: true,
      },
      cloudinary: {
        assetId: { type: String, maxlength: 200 },
        publicId: { type: String, required: true, immutable: true },
        resourceType: { type: String, enum: ['image'], default: 'image' },
        deliveryType: {
          type: String,
          enum: ['authenticated'],
          default: 'authenticated',
        },
        version: integer,
      },
      assetFolder: { type: String, required: true, immutable: true },
      format: { type: String, enum: ['jpg', 'png', 'webp'], required: true },
      bytes: { ...integer, required: true },
      width: { ...integer, required: true, max: 10000 },
      height: { ...integer, required: true, max: 10000 },
      status: {
        type: String,
        enum: [
          'pending_upload',
          'temporary',
          'attached',
          'pending_delete',
          'delete_failed',
          'deleted',
        ],
        default: 'pending_upload',
        required: true,
      },
      attachedTo: {
        type: new Schema(
          {
            kind: {
              type: String,
              enum: ['user_avatar', 'recipe_cover', 'recipe_step'],
            },
            resourceId: Schema.Types.ObjectId,
            stepId: String,
          },
          { _id: false },
        ),
        default: null,
      },
      expiresAt: { type: Date, default: null },
      deleteRequestedAt: { type: Date, default: null },
      deleteAttempts: { type: Number, default: 0, min: 0 },
      lastErrorCode: { type: String, default: null, maxlength: 80 },
      uploadOutcome: {
        type: String,
        enum: ['pending', 'confirmed', 'rejected', 'uncertain'],
        default: 'pending',
      },
      idempotencyKey: { type: String, required: true, immutable: true },
      fingerprint: { type: String, required: true, immutable: true },
      attachmentIntent: {
        type: new Schema(
          {
            token: { type: String, required: true },
            target: {
              kind: String,
              resourceId: Schema.Types.ObjectId,
              stepId: String,
            },
            expectedVersion: Number,
            oldAssetId: Schema.Types.ObjectId,
            startedAt: Date,
          },
          { _id: false },
        ),
        default: null,
      },
      everAttached: { type: Boolean, default: false },
      nextAttemptAt: { type: Date, default: null },
      leaseToken: { type: String, default: null },
      leaseUntil: { type: Date, default: null },
      reconcileAttempts: { type: Number, default: 0 },
      quotaSlot: { type: Number, min: 0, max: 19, validate: Number.isInteger },
    },
    { timestamps: true, collection: 'media_assets', strict: 'throw' },
  );
  schema.pre('validate', function () {
    if (this.width * this.height > 20000000)
      this.invalidate('width', 'Pixel limit exceeded');
    if (this.bytes > (this.purpose === 'avatar' ? 2 : 5) * 1024 * 1024)
      this.invalidate('bytes', 'Byte limit exceeded');
    if (
      ['temporary', 'attached'].includes(this.status) &&
      (!this.cloudinary?.assetId ||
        !this.cloudinary?.version ||
        this.uploadOutcome !== 'confirmed')
    )
      this.invalidate('status', 'Confirmed provider metadata required');
    if (this.status === 'temporary' && !this.expiresAt)
      this.invalidate('expiresAt', 'Temporary deadline required');
  });
  schema.index(
    { provider: 1, 'cloudinary.assetId': 1 },
    {
      unique: true,
      partialFilterExpression: { 'cloudinary.assetId': { $type: 'string' } },
    },
  );
  schema.index(
    {
      provider: 1,
      'cloudinary.publicId': 1,
      'cloudinary.resourceType': 1,
      'cloudinary.deliveryType': 1,
    },
    { unique: true },
  );
  schema.index({ ownerId: 1, idempotencyKey: 1 }, { unique: true });
  schema.index(
    { ownerId: 1, quotaSlot: 1 },
    {
      unique: true,
      partialFilterExpression: { quotaSlot: { $type: 'number' } },
    },
  );
  schema.index({ ownerId: 1, status: 1, createdAt: -1 });
  schema.index({ status: 1, expiresAt: 1 });
  schema.index({ nextAttemptAt: 1, leaseUntil: 1, status: 1 });
  schema.index({ ownerId: 1, purpose: 1, status: 1 });
  schema.index({ 'attachedTo.kind': 1, 'attachedTo.resourceId': 1 });
  return connection.model('MediaAsset', schema);
}

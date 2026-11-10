import mongoose from 'mongoose';
import { cleanText, categorySlug } from '../../shared/catalog-normalization.js';
export function createCategoryModel(connection) {
  const schema = new mongoose.Schema(
    {
      name: {
        type: String,
        required: true,
        minlength: 1,
        maxlength: 100,
        set: cleanText,
      },
      slug: {
        type: String,
        required: true,
        maxlength: 100,
        match: /^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u,
        set: categorySlug,
      },
      description: { type: String, maxlength: 1000, default: '' },
      isActive: { type: Boolean, default: true },
      sortOrder: {
        type: Number,
        default: 0,
        min: 0,
        max: 100000,
        validate: Number.isInteger,
      },
    },
    {
      collection: 'categories',
      timestamps: true,
      strict: 'throw',
      optimisticConcurrency: true,
    },
  );
  schema.index({ slug: 1 }, { unique: true });
  schema.index({ isActive: 1, sortOrder: 1, _id: 1 });
  return connection.models.Category || connection.model('Category', schema);
}

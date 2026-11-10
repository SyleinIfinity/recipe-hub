import mongoose from 'mongoose';
import { cleanText } from '../../shared/catalog-normalization.js';
import { normalizeIngredient } from './ingredient.normalization.js';
export function createIngredientModel(connection) {
  const schema = new mongoose.Schema(
    {
      name: {
        type: String,
        required: true,
        minlength: 1,
        maxlength: 100,
        set: cleanText,
      },
      normalizedName: { type: String, required: true, maxlength: 100 },
      aliases: {
        type: [{ type: String, minlength: 1, maxlength: 100 }],
        default: [],
        validate: (value) => value.length <= 20,
      },
      lookupKeys: { type: [String], select: false },
      defaultUnit: { type: String, maxlength: 32, default: '', set: cleanText },
      group: { type: String, maxlength: 80, default: '', set: cleanText },
      isActive: { type: Boolean, default: true },
    },
    {
      collection: 'ingredients',
      timestamps: true,
      strict: 'throw',
      optimisticConcurrency: true,
    },
  );
  schema.pre('validate', function () {
    if (typeof this.name === 'string')
      Object.assign(this, normalizeIngredient(this.name, this.aliases));
  });
  schema.index({ normalizedName: 1 }, { unique: true });
  schema.index({ lookupKeys: 1 }, { unique: true });
  schema.index({ isActive: 1, lookupKeys: 1 });
  schema.index({ isActive: 1, normalizedName: 1, _id: 1 });
  return connection.models.Ingredient || connection.model('Ingredient', schema);
}

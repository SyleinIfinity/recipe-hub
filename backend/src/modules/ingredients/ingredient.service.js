import { AppError } from '../../shared/errors.js';
import {
  requireCatalogAdmin,
  catalogWriteError,
} from '../../shared/catalog-policy.js';
import { escapeRegex } from '../../shared/catalog-normalization.js';
export function createIngredientService(Ingredient) {
  return {
    searchCatalog({ q, limit }) {
      const filter = { isActive: true };
      if (q) filter.lookupKeys = { $regex: `^${escapeRegex(q)}` };
      return Ingredient.find(filter)
        .hint(
          q
            ? { isActive: 1, lookupKeys: 1 }
            : { isActive: 1, normalizedName: 1, _id: 1 },
        )
        .sort({ normalizedName: 1, _id: 1 })
        .limit(limit)
        .maxTimeMS(1000);
    },
    async createCanonicalIngredient(actor, input) {
      requireCatalogAdmin(actor);
      try {
        return await Ingredient.create({
          name: input.name,
          aliases: input.aliases,
          defaultUnit: input.defaultUnit,
          group: input.group,
          isActive: input.isActive,
        });
      } catch (error) {
        catalogWriteError(error, 'INGREDIENT_NAME_CONFLICT');
      }
    },
    async updateIngredient(actor, ingredientId, input) {
      requireCatalogAdmin(actor);
      const ingredient = await Ingredient.findById(ingredientId);
      if (!ingredient)
        throw new AppError(404, 'INGREDIENT_NOT_FOUND', 'Ingredient not found');
      for (const key of ['name', 'aliases', 'defaultUnit', 'group', 'isActive'])
        if (Object.hasOwn(input, key)) ingredient[key] = input[key];
      try {
        return await ingredient.save();
      } catch (error) {
        catalogWriteError(error, 'INGREDIENT_NAME_CONFLICT');
      }
    },
  };
}

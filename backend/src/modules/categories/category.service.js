import { AppError } from '../../shared/errors.js';
import {
  requireCatalogAdmin,
  catalogWriteError,
} from '../../shared/catalog-policy.js';
import { categorySlug } from '../../shared/catalog-normalization.js';
export function createCategoryService(Category) {
  return {
    listActiveCategories: ({ page, limit }) =>
      Category.find({ isActive: true })
        .sort({ sortOrder: 1, _id: 1 })
        .hint({ isActive: 1, sortOrder: 1, _id: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .maxTimeMS(1000),
    async createCategory(actor, input) {
      requireCatalogAdmin(actor);
      try {
        return await Category.create({
          name: input.name,
          slug: input.slug ?? categorySlug(input.name),
          description: input.description,
          isActive: input.isActive,
          sortOrder: input.sortOrder,
        });
      } catch (error) {
        catalogWriteError(error, 'CATEGORY_SLUG_EXISTS');
      }
    },
    async updateCategory(actor, categoryId, input) {
      requireCatalogAdmin(actor);
      const category = await Category.findById(categoryId);
      if (!category)
        throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Category not found');
      for (const key of [
        'name',
        'slug',
        'description',
        'isActive',
        'sortOrder',
      ])
        if (Object.hasOwn(input, key)) category[key] = input[key];
      try {
        return await category.save();
      } catch (error) {
        catalogWriteError(error, 'CATEGORY_SLUG_EXISTS');
      }
    },
  };
}

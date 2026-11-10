import { createCategoryModel } from './categories/category.model.js';
import { createCategoryService } from './categories/category.service.js';
import { createCategoryController } from './categories/category.controller.js';
import { categoryRoutes } from './categories/category.routes.js';
import { createIngredientModel } from './ingredients/ingredient.model.js';
import { createIngredientService } from './ingredients/ingredient.service.js';
import { createIngredientController } from './ingredients/ingredient.controller.js';
import { ingredientRoutes } from './ingredients/ingredient.routes.js';
import { authenticate } from '../middleware/authenticate.js';
export async function createCatalog(connection, identity) {
  const Category = createCategoryModel(connection);
  const Ingredient = createIngredientModel(connection);
  await Promise.all([Category.createIndexes(), Ingredient.createIndexes()]);
  const requireAuth = authenticate(
    identity.sessions,
    identity.security.sessionCookie,
  );
  return {
    models: { Category, Ingredient },
    routers: [
      categoryRoutes(
        createCategoryController(createCategoryService(Category)),
        requireAuth,
      ),
      ingredientRoutes(
        createIngredientController(createIngredientService(Ingredient)),
        requireAuth,
      ),
    ],
  };
}

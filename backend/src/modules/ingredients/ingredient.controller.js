import { ingredientDto } from './ingredient.dto.js';
export function createIngredientController(service) {
  return {
    async search(req, res) {
      res.json({
        success: true,
        data: (await service.searchCatalog(req.validated.query)).map(
          ingredientDto,
        ),
      });
    },
    async create(req, res) {
      res.status(201).json({
        success: true,
        data: ingredientDto(
          await service.createCanonicalIngredient(
            req.actor,
            req.validated.body,
          ),
        ),
      });
    },
    async update(req, res) {
      res.json({
        success: true,
        data: ingredientDto(
          await service.updateIngredient(
            req.actor,
            req.validated.params.ingredientId,
            req.validated.body,
          ),
        ),
      });
    },
  };
}

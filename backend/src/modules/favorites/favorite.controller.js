import { publicRecipeCardDTO } from '../recipes/recipe.dto.js';
export function createFavoriteController(service) {
  return {
    async add(req, res) {
      const result = await service.add(
        req.actor,
        req.validated.params.recipeId,
      );
      res.status(result.created ? 201 : 200).json({
        success: true,
        data: { recipeId: result.recipeId, favorited: true },
      });
    },
    async remove(req, res) {
      await service.remove(req.actor, req.validated.params.recipeId);
      res.status(204).end();
    },
    async list(req, res) {
      const { rows, meta } = await service.list(req.actor, req.validated.query);
      res.json({ success: true, data: rows.map(publicRecipeCardDTO), meta });
    },
  };
}

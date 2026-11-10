import {
  ownerRecipeDTO,
  publicRecipeCardDTO,
  publicRecipeDetailDTO,
} from './recipe.dto.js';
export function createRecipeController(service, publication, images) {
  return {
    async publish(req, res) {
      res.json({
        success: true,
        data: ownerRecipeDTO(
          await publication.publish(
            req.actor,
            req.validated.params.recipeId,
            req.validated.body,
          ),
        ),
      });
    },
    async unpublish(req, res) {
      res.json({
        success: true,
        data: ownerRecipeDTO(
          await publication.unpublish(
            req.actor,
            req.validated.params.recipeId,
            req.validated.body,
          ),
        ),
      });
    },
    async publicList(req, res) {
      const { rows, meta } = await publication.list(req.validated.query);
      res.json({ success: true, data: rows.map(publicRecipeCardDTO), meta });
    },
    async publicDetail(req, res) {
      res.json({
        success: true,
        data: publicRecipeDetailDTO(
          await publication.detail(req.validated.params.slug),
        ),
      });
    },
    async image(req, res) {
      const result = await images.read(
        req.actor,
        req.validated.params.recipeId,
        req.validated.params.assetId,
      );
      res.set({
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
        'Content-Type': result.contentType,
      });
      res.status(200).end(result.buffer);
    },
    async create(req, res) {
      res.status(201).json({
        success: true,
        data: ownerRecipeDTO(
          await service.create(
            req.actor,
            req.validated.body,
            req.validated.headers['idempotency-key'],
          ),
        ),
      });
    },
    async list(req, res) {
      const { rows, meta } = await service.list(req.actor, req.validated.query);
      res.json({ success: true, data: rows.map(ownerRecipeDTO), meta });
    },
    async get(req, res) {
      res.json({
        success: true,
        data: ownerRecipeDTO(
          await service.get(req.actor, req.validated.params.recipeId),
        ),
      });
    },
    async update(req, res) {
      res.json({
        success: true,
        data: ownerRecipeDTO(
          await service.update(
            req.actor,
            req.validated.params.recipeId,
            req.validated.body,
          ),
        ),
      });
    },
    async remove(req, res) {
      await service.remove(req.actor, req.validated.params.recipeId);
      res.status(204).end();
    },
  };
}

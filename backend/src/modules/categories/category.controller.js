import { categoryDto } from './category.dto.js';
export function createCategoryController(service) {
  return {
    async list(req, res) {
      res.json({
        success: true,
        data: (await service.listActiveCategories(req.validated.query)).map(
          categoryDto,
        ),
        meta: {
          page: req.validated.query.page,
          limit: req.validated.query.limit,
        },
      });
    },
    async create(req, res) {
      res.status(201).json({
        success: true,
        data: categoryDto(
          await service.createCategory(req.actor, req.validated.body),
        ),
      });
    },
    async update(req, res) {
      res.json({
        success: true,
        data: categoryDto(
          await service.updateCategory(
            req.actor,
            req.validated.params.categoryId,
            req.validated.body,
          ),
        ),
      });
    },
  };
}

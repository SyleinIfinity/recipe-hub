const id = (v) => (v == null ? null : String(v));
export function ownerRecipeDTO(r) {
  return {
    recipeId: String(r._id),
    title: r.title,
    slug: r.slug,
    description: r.description,
    coverImageAssetId: id(r.coverImageAssetId),
    coverImageUrl: null,
    categoryId: id(r.categoryId),
    tags: r.tags,
    difficulty: r.difficulty,
    prepMinutes: r.prepMinutes,
    cookMinutes: r.cookMinutes,
    totalMinutes: r.totalMinutes,
    servings: r.servings,
    ingredients: r.ingredients.map((v) => ({
      ingredientId: id(v.ingredientId),
      name: v.name,
      quantity: v.quantity,
      unit: v.unit,
      quantityText: v.quantityText,
      note: v.note,
      order: v.order,
    })),
    steps: r.steps.map((v) => ({
      stepId: v.stepId,
      order: v.order,
      instruction: v.instruction,
      durationMinutes: v.durationMinutes,
      imageAssetId: id(v.imageAssetId),
      imageUrl: null,
    })),
    status: r.status,
    moderationStatus: r.moderationStatus,
    version: r.version,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export function publicRecipeCardDTO(r) {
  return {
    recipeId: String(r._id),
    slug: r.slug,
    title: r.title,
    summary: r.description.slice(0, 200),
    categoryId: id(r.categoryId),
    difficulty: r.difficulty,
    totalMinutes: r.totalMinutes,
    coverImageUrl: null,
    publishedAt: r.publishedAt,
    author: {
      id: String(r.publicAuthor._id),
      displayName: r.publicAuthor.displayName,
    },
  };
}
export function publicRecipeDetailDTO(r) {
  const owner = ownerRecipeDTO(r);
  return {
    ...publicRecipeCardDTO(r),
    description: r.description,
    servings: r.servings,
    prepMinutes: r.prepMinutes,
    cookMinutes: r.cookMinutes,
    tags: r.tags,
    ingredients: owner.ingredients,
    steps: owner.steps.map((s) => ({
      stepId: s.stepId,
      order: s.order,
      instruction: s.instruction,
      durationMinutes: s.durationMinutes,
      imageUrl: null,
    })),
  };
}

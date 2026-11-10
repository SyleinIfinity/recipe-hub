export const categoryDto = (value) => ({
  id: String(value._id),
  name: value.name,
  slug: value.slug,
  description: value.description,
  isActive: value.isActive,
  sortOrder: value.sortOrder,
  createdAt: value.createdAt,
  updatedAt: value.updatedAt,
});

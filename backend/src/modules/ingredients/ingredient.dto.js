export const ingredientDto = (value) => ({
  id: String(value._id),
  name: value.name,
  aliases: [...value.aliases],
  defaultUnit: value.defaultUnit,
  group: value.group,
  isActive: value.isActive,
  createdAt: value.createdAt,
  updatedAt: value.updatedAt,
});

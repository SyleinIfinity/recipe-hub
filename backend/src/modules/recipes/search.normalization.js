// Exact word matching; no stemming, substring, fuzzy or relevance ranking.
export function searchTokens(text) {
  return [
    ...new Set(
      text
        .normalize('NFKD')
        .replace(/\p{M}/gu, '')
        .replace(/[đĐ]/g, 'd')
        .toLowerCase()
        .match(/[\p{L}\p{N}]+/gu) ?? [],
    ),
  ];
}
export function recipeSearchFields(recipe) {
  return {
    searchTokens: searchTokens(
      `${recipe.title ?? ''} ${recipe.description ?? ''}`,
    ),
    searchVersion: 1,
  };
}

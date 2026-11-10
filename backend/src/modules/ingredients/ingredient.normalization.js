import { cleanText, lookupName } from '../../shared/catalog-normalization.js';
export function normalizeIngredient(name, aliases = []) {
  const normalizedName = lookupName(name);
  const unique = new Map();
  for (const alias of aliases) {
    const key = lookupName(alias);
    if (key && key !== normalizedName && !unique.has(key))
      unique.set(key, cleanText(alias));
  }
  return {
    name: cleanText(name),
    normalizedName,
    aliases: [...unique.values()],
    lookupKeys: [normalizedName, ...unique.keys()],
  };
}

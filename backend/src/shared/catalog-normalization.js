export const cleanText = (value) =>
  value.normalize('NFC').trim().replace(/\s+/gu, ' ');
export const lookupName = (value) =>
  cleanText(value).toLowerCase().normalize('NFC');
export const categorySlug = (value) =>
  lookupName(value)
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
export const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const catalogTextPattern = /^[^\p{Cc}\p{Cf}]*$/u;

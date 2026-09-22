/**
 * Diacritic-insensitive fold for substring search over user-facing text.
 *
 * Vietnamese users routinely type without Telex diacritics — "an uong" must
 * find "Ăn uống". NFD decomposition plus stripping combining marks covers
 * every vowel mark; đ/Đ carry no Unicode decomposition mapping, so they
 * fold to d/D explicitly. Stored text and the typed query go through the
 * same fold, so queries written WITH diacritics keep matching too.
 *
 * Mirrors the normalizeDesc pipeline in inbox/detect.ts without its
 * fingerprint punctuation collapse — search preserves substring positions,
 * it does not produce equality keys.
 */
export function normalizeSearchText(value: string): string {
  return value
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("vi")
    .trim();
}

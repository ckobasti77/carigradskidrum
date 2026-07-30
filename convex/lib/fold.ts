/**
 * Text folding for search. Convex's search index lowercases but does NOT fold
 * diacritics ("cevapi" would miss "ćevapi") and has no stemming, so we
 * maintain folded searchText columns and fold the user's query identically.
 *
 * German special case: convention writes ü→ue, ö→oe, ä→ae, but Serbian users
 * type plain u/o/a. The INDEX text therefore contains BOTH variants
 * ("munchen muenchen"), while the QUERY is folded with the basic fold only —
 * so "Munchen", "Muenchen" and "München" all match.
 */

/** Basic fold — used for queries and as the primary index variant. */
export function foldBasic(input: string): string {
  return input
    .toLowerCase()
    .replaceAll("ß", "ss")
    .replaceAll("đ", "dj")
    .normalize("NFD")
    .replace(/\p{Diacritic}+/gu, "")
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** German-convention fold (ä→ae, ö→oe, ü→ue) — extra index variant only. */
export function foldGermanVariant(input: string): string {
  return input
    .toLowerCase()
    .replaceAll("ß", "ss")
    .replaceAll("đ", "dj")
    .replaceAll("ä", "ae")
    .replaceAll("ö", "oe")
    .replaceAll("ü", "ue")
    .normalize("NFD")
    .replace(/\p{Diacritic}+/gu, "")
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Builds the folded search-column text from content parts: every part is
 * emitted in its basic fold, plus the German-variant fold when it differs.
 */
export function buildSearchText(parts: Array<string | undefined | null>): string {
  const tokens = new Set<string>();
  for (const part of parts) {
    if (!part) continue;
    const basic = foldBasic(part);
    if (basic) tokens.add(basic);
    const german = foldGermanVariant(part);
    if (german && german !== basic) tokens.add(german);
  }
  return [...tokens].join(" ");
}

/** URL-ish slug from a display string (e.g. city facet values). */
export function foldToSlug(input: string): string {
  return foldBasic(input).replace(/\s+/g, "-");
}

import type { Locale } from "./config";
import sr from "./dictionaries/sr.json";
import de from "./dictionaries/de.json";

/**
 * The Serbian dictionary is the source of truth for the key structure.
 * JSON imports are typed structurally (string, not literal), so the
 * `satisfies` check below fails the build when de.json is missing a key.
 */
export type Dictionary = typeof sr;

const { _meta, ...deStrings } = de;
void _meta; // review marker, not a UI string

const dictionaries: Record<Locale, Dictionary> = {
  sr,
  de: deStrings satisfies Dictionary,
};

/**
 * Server-side dictionary access (use in Server Components; client islands
 * receive the string subsets they need via props — never import the full
 * dictionary from a "use client" file).
 */
export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

export { t } from "./format";

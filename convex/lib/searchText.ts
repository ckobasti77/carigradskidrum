import { CATEGORY_ALIASES } from "./aliases";
import type { CountryCode } from "./constants";
import { buildSearchText } from "./fold";

const COUNTRY_NAMES_SR: Record<CountryCode, string> = {
  AT: "Austrija",
  RS: "Srbija",
  HR: "Hrvatska",
  BA: "Bosna i Hercegovina",
};

const COUNTRY_NAMES_DE: Record<CountryCode, string> = {
  AT: "Österreich",
  RS: "Serbien",
  HR: "Kroatien",
  BA: "Bosnien und Herzegowina",
};

export type SearchTextInput = {
  name: string;
  descriptionSr?: string;
  descriptionDe?: string;
  categories: Array<{ slug: string; nameSr: string; nameDe: string }>;
  cities: string[];
  countries: CountryCode[];
};

/**
 * Computes both folded search columns. Aliases are bilingual by design and go
 * into BOTH columns (better recall for mixed-language queries). Every mutation
 * that touches name/description/categories/locations must re-run this.
 */
export function computeSearchTexts(input: SearchTextInput): {
  searchTextSr: string;
  searchTextDe: string;
} {
  const aliasParts = input.categories.flatMap(
    (category) => CATEGORY_ALIASES[category.slug] ?? [],
  );
  const shared = [...input.cities, ...aliasParts];

  const searchTextSr = buildSearchText([
    input.name,
    input.descriptionSr,
    ...input.categories.map((c) => c.nameSr),
    ...input.countries.map((c) => COUNTRY_NAMES_SR[c]),
    ...shared,
  ]);

  const searchTextDe = buildSearchText([
    input.name,
    input.descriptionDe ?? input.descriptionSr,
    ...input.categories.map((c) => c.nameDe),
    ...input.countries.map((c) => COUNTRY_NAMES_DE[c]),
    ...shared,
  ]);

  return { searchTextSr, searchTextDe };
}

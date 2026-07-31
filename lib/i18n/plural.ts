import type { Locale } from "./config";

/**
 * Srpski ima tri oblika množine, pa "3 firmi" zvuči pogrešno svakom izvornom
 * govorniku. Nemački ima dva. Držano ručno umesto Intl.PluralRules da bi bilo
 * bezbedno u klijentskom bundle-u (isti razlog kao za t() u format.ts) i da bi
 * oblici stajali u rečniku, a ne u kodu.
 */
export type PluralForms = { one: string; few: string; many: string };

/** sr: 1 → one; 2–4 → few; ostalo → many. 11–14 su izuzetak i idu u many. */
export function pluralForm(locale: Locale, count: number): keyof PluralForms {
  if (locale === "de") return count === 1 ? "one" : "many";

  const abs = Math.abs(count);
  const lastTwo = abs % 100;
  const last = abs % 10;

  if (lastTwo >= 11 && lastTwo <= 14) return "many";
  if (last === 1) return "one";
  if (last >= 2 && last <= 4) return "few";
  return "many";
}

/** pluralize("sr", 3, forms) → "3 firme" */
export function pluralize(locale: Locale, count: number, forms: PluralForms) {
  return `${count} ${forms[pluralForm(locale, count)]}`;
}

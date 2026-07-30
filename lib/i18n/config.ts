export const locales = ["sr", "de"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "sr";

export function hasLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

/** Builds a localized path: localePath("sr", "/firme") -> "/sr/firme" */
export function localePath(locale: Locale, path = "/") {
  return `/${locale}${path === "/" ? "" : path}`;
}

/**
 * The ONLY path for Convex data in Server Components on cached (ISR) pages.
 *
 * `fetchQuery` from convex/nextjs is hardcoded `cache: "no-store"` — calling
 * it directly in an ISR page silently makes the route dynamic. Every getter
 * here wraps it in `unstable_cache` with tags, so:
 *   - ISR works (`next build` must show ● for firma/[slug]);
 *   - POST /api/revalidate can invalidate via revalidateTag(tag, "max").
 *
 * The dynamic /firme page intentionally uses `fetchDirectoryDirect` (dynamic
 * SSR is correct there; the client island takes over reactively).
 *
 * CI builds have no NEXT_PUBLIC_CONVEX_URL: every getter degrades to its
 * empty fallback (build stays green; completeness is verified on preview).
 */
import { unstable_cache } from "next/cache";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import type { Locale } from "@/lib/i18n/config";
import type { CountryCode } from "@/convex/lib/constants";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;

/** Hour-rounded clock: stable cache inputs, precise enough for 14-day grace. */
export function hourNow(): number {
  return Math.floor(Date.now() / 3_600_000) * 3_600_000;
}

async function safe<T>(fallback: T, run: () => Promise<T>): Promise<T> {
  if (!CONVEX_URL) return fallback;
  try {
    return await run();
  } catch (error) {
    console.error("[lib/data]", error);
    return fallback;
  }
}

export type DirectoryFilters = {
  q?: string;
  categorySlug?: string;
  country?: CountryCode;
  citySlug?: string;
  acceptsCard?: boolean;
  sort?: "recommended" | "newest";
};

export type DirectoryResult = Awaited<ReturnType<typeof fetchDirectoryDirect>>;
export type FacetsResult = Awaited<ReturnType<typeof getFacets>>;
export type CompanyProfile = NonNullable<Awaited<ReturnType<typeof getCompany>>>;

/** Direct (uncached) list — for the dynamic /firme page only. */
export async function fetchDirectoryDirect(locale: Locale, filters: DirectoryFilters) {
  return safe(
    { items: [], total: 0, capped: false },
    () => fetchQuery(api.directory.list, { locale, ...filters, now: hourNow() }),
  );
}

const cachedFacets = unstable_cache(
  async (locale: Locale) => fetchQuery(api.directory.facets, { locale }),
  ["facets"],
  { revalidate: 600, tags: ["directory", "categories"] },
);
export async function getFacets(locale: Locale) {
  return safe(
    { total: 0, countries: [], cities: [], categories: [] },
    () => cachedFacets(locale),
  );
}

const cachedNewest = unstable_cache(
  async (locale: Locale, limit: number, now: number) =>
    fetchQuery(api.directory.newest, { locale, limit, now }),
  ["newest"],
  { revalidate: 600, tags: ["directory"] },
);
export async function getNewest(locale: Locale, limit: number) {
  return safe({ items: [], isFeatured: false }, () =>
    cachedNewest(locale, limit, hourNow()),
  );
}

const cachedPartners = unstable_cache(
  async (locale: Locale, now: number) =>
    fetchQuery(api.directory.discountPartners, { locale, now }),
  ["discount-partners"],
  { revalidate: 600, tags: ["directory"] },
);
export async function getDiscountPartners(locale: Locale) {
  return safe([], () => cachedPartners(locale, hourNow()));
}

export async function getCompany(locale: Locale, slug: string) {
  // unstable_cache tags cannot depend on the wrapped function's arguments,
  // so the per-company tag requires building the wrapper per call (the key
  // parts make the entry stable). Lets the approve flow invalidate ONE
  // profile via revalidateTag(`company:${slug}`, "max").
  const tagged = unstable_cache(
    async () => fetchQuery(api.companies.bySlug, { locale, slug, now: hourNow() }),
    ["company", locale, slug],
    { revalidate: 300, tags: ["directory", `company:${slug}`] },
  );
  return safe(null, () => tagged());
}

const cachedCategoryList = unstable_cache(
  async () => fetchQuery(api.categories.list, {}),
  ["categories"],
  { revalidate: 600, tags: ["categories"] },
);
export async function getCategories() {
  return safe([], () => cachedCategoryList());
}

const cachedCategoryCompanies = unstable_cache(
  async (locale: Locale, categorySlug: string, now: number) =>
    fetchQuery(api.directory.list, { locale, categorySlug, now }),
  ["category-companies"],
  { revalidate: 600, tags: ["directory"] },
);
export async function getCategoryCompanies(locale: Locale, categorySlug: string) {
  return safe({ items: [], total: 0, capped: false }, () =>
    cachedCategoryCompanies(locale, categorySlug, hourNow()),
  );
}

const cachedCountryCompanies = unstable_cache(
  async (locale: Locale, country: CountryCode, now: number) =>
    fetchQuery(api.directory.list, { locale, country, now }),
  ["country-companies"],
  { revalidate: 600, tags: ["directory"] },
);
export async function getCountryCompanies(locale: Locale, country: CountryCode) {
  return safe({ items: [], total: 0, capped: false }, () =>
    cachedCountryCompanies(locale, country, hourNow()),
  );
}

const cachedPublishedSlugs = unstable_cache(
  async () => fetchQuery(api.companies.publishedSlugs, {}),
  ["published-slugs"],
  { revalidate: 600, tags: ["directory"] },
);
export async function getPublishedSlugs() {
  return safe([], () => cachedPublishedSlugs());
}

const cachedCountries = unstable_cache(
  async () => fetchQuery(api.companies.countriesWithCompanies, {}),
  ["countries"],
  { revalidate: 600, tags: ["directory"] },
);
export async function getCountriesWithCompanies() {
  return safe([], () => cachedCountries());
}

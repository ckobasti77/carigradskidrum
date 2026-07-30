import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import {
  fetchDirectoryDirect,
  getFacets,
  type DirectoryFilters,
} from "@/lib/data";
import { pageAlternates } from "@/lib/seo";
import { COUNTRY_CODES, type CountryCode } from "@/convex/lib/constants";
import { DirectoryExplorer } from "@/components/site/directory-explorer";

// Deliberately dynamic (reads searchParams): crawlers get the first page of
// results server-rendered; the client island takes over reactively.
type SearchParams = { [key: string]: string | string[] | undefined };

function parseFilters(sp: SearchParams): DirectoryFilters {
  const get = (key: string) =>
    typeof sp[key] === "string" ? (sp[key] as string) : undefined;
  const country = get("zemlja")?.toUpperCase();
  return {
    q: get("q") || undefined,
    categorySlug: get("kategorija") || undefined,
    country:
      country && (COUNTRY_CODES as readonly string[]).includes(country)
        ? (country as CountryCode)
        : undefined,
    citySlug: get("grad") || undefined,
    acceptsCard: get("kartica") === "1" || undefined,
    sort: get("sort") === "najnovije" ? ("newest" as const) : undefined,
  };
}

function hasAnyFilter(filters: DirectoryFilters) {
  return Boolean(
    filters.q ||
      filters.categorySlug ||
      filters.country ||
      filters.citySlug ||
      filters.acceptsCard ||
      filters.sort,
  );
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const dict = getDictionary(locale);
  const filtered = hasAnyFilter(parseFilters(await searchParams));
  return {
    title: dict.directory.title,
    description: dict.directory.subtitle,
    alternates: pageAlternates(locale, "/firme"),
    // Only the bare /firme URL is indexable; filtered querystrings are
    // noindex,follow with the canonical pointing at the bare URL.
    ...(filtered ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function DirectoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const filters = parseFilters(await searchParams);

  const [initial, facets] = await Promise.all([
    fetchDirectoryDirect(locale, filters),
    getFacets(locale),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
      <header className="mb-6 space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">
          {dict.directory.title}
        </h1>
        <p className="text-muted-foreground">{dict.directory.subtitle}</p>
      </header>

      <DirectoryExplorer
        locale={locale}
        initial={initial}
        initialFilters={filters}
        facets={facets}
        strings={{
          searchPlaceholder: dict.directory.searchPlaceholder,
          searchLabel: dict.common.actions.search,
          filters: dict.directory.filters,
          sort: dict.directory.sort,
          resultsCount: dict.directory.resultsCount,
          empty: dict.directory.empty,
          showMore: dict.common.actions.showMore,
          card: {
            countryLabels: dict.common.countries,
            discountTemplate: dict.company.discountBadge,
          },
        }}
      />
    </div>
  );
}

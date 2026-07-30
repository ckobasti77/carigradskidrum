import type { MetadataRoute } from "next";
import { locales } from "@/lib/i18n/config";
import {
  getCategories,
  getCountriesWithCompanies,
  getPublishedSlugs,
} from "@/lib/data";

/**
 * Both locales for every public URL, with hreflang alternates (sr is
 * x-default via the metadata layer). /account, /admin and filtered /firme
 * URLs are deliberately absent.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const [slugs, categories, countries] = await Promise.all([
    getPublishedSlugs(),
    getCategories(),
    getCountriesWithCompanies(),
  ]);

  const entries: MetadataRoute.Sitemap = [];

  function push(path: string, options?: { lastModified?: Date; priority?: number }) {
    const languages = {
      sr: `${siteUrl}/sr${path}`,
      de: `${siteUrl}/de${path}`,
    };
    for (const locale of locales) {
      entries.push({
        url: `${siteUrl}/${locale}${path}`,
        lastModified: options?.lastModified,
        priority: options?.priority,
        alternates: { languages },
      });
    }
  }

  push("", { priority: 1 });
  push("/firme", { priority: 0.9 });
  push("/kartica", { priority: 0.7 });
  push("/o-nama", { priority: 0.4 });
  push("/kontakt", { priority: 0.4 });
  push("/dodaj-firmu", { priority: 0.6 });

  for (const category of categories) {
    push(`/kategorija/${category.slug}`, { priority: 0.8 });
  }
  for (const code of countries) {
    push(`/zemlja/${code.toLowerCase()}`, { priority: 0.7 });
  }
  for (const entry of slugs) {
    push(`/firma/${entry.slug}`, {
      priority: 0.8,
      lastModified: new Date(entry.updatedAt),
    });
  }

  return entries;
}

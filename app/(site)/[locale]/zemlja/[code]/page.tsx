import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { hasLocale, localePath } from "@/lib/i18n/config";
import { getDictionary, t } from "@/lib/i18n/dictionaries";
import { getCountriesWithCompanies, getCountryCompanies } from "@/lib/data";
import { pageAlternates } from "@/lib/seo";
import { COUNTRY_CODES, type CountryCode } from "@/convex/lib/constants";
import { Button } from "@/components/ui/button";
import { CompanyCard } from "@/components/site/company-card";
import { CompanyCardGrid } from "@/components/site/company-card-grid";

export const revalidate = 600;
export const dynamicParams = true;

// URL uses lowercase codes (/zemlja/at); storage uses uppercase.
function parseCode(code: string): CountryCode | null {
  const upper = code.toUpperCase();
  return (COUNTRY_CODES as readonly string[]).includes(upper)
    ? (upper as CountryCode)
    : null;
}

export async function generateStaticParams() {
  // Only countries with ≥1 published company get a landing page.
  const codes = await getCountriesWithCompanies();
  return codes.map((code) => ({ code: code.toLowerCase() }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; code: string }>;
}): Promise<Metadata> {
  const { locale, code } = await params;
  if (!hasLocale(locale)) return {};
  const country = parseCode(code);
  if (!country) return {};
  const dict = getDictionary(locale);
  const label = dict.common.countries[country];
  return {
    title: t(dict.country.companiesIn, { country: label }),
    description: `${dict.directory.subtitle} — ${label}`,
    alternates: pageAlternates(locale, `/zemlja/${code.toLowerCase()}`),
  };
}

export default async function CountryPage({
  params,
}: {
  params: Promise<{ locale: string; code: string }>;
}) {
  const { locale, code } = await params;
  if (!hasLocale(locale)) notFound();
  const country = parseCode(code);
  if (!country) notFound();

  const [codesWithCompanies, result] = await Promise.all([
    getCountriesWithCompanies(),
    getCountryCompanies(locale, country),
  ]);
  // An empty, indexable country page is an SEO liability — 404 instead.
  if (!codesWithCompanies.includes(country) || result.items.length === 0) {
    notFound();
  }

  const dict = getDictionary(locale);
  const label = dict.common.countries[country];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
      <header className="mb-8">
        <h1 className="text-3xl tracking-tight">
          {t(dict.country.companiesIn, { country: label })}
        </h1>
      </header>
      <CompanyCardGrid>
        {result.items.map((card) => (
          <CompanyCard
            key={card.id}
            locale={locale}
            card={card}
            strings={{
              countryLabels: dict.common.countries,
              discountTemplate: dict.company.discountBadge,
            }}
          />
        ))}
      </CompanyCardGrid>
      <div className="mt-8">
        <Button asChild variant="outline">
          <Link
            href={`${localePath(locale, "/firme")}?zemlja=${country.toLowerCase()}`}
          >
            {dict.country.browseAll}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

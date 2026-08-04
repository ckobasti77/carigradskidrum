import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { hasLocale, localePath } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getCategories, getCategoryCompanies } from "@/lib/data";
import { pageAlternates } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/components/site/category-icon";
import { CompanyCard } from "@/components/site/company-card";
import { CompanyCardGrid } from "@/components/site/company-card-grid";
import { EmptyState } from "@/components/site/empty-state";

export const revalidate = 600;
export const dynamicParams = true;

export async function generateStaticParams() {
  const categories = await getCategories();
  return categories.map((category) => ({ slug: category.slug }));
}

async function loadCategory(slug: string) {
  const categories = await getCategories();
  return categories.find((category) => category.slug === slug) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!hasLocale(locale)) return {};
  const category = await loadCategory(slug);
  if (!category) return {};
  const name = locale === "de" ? category.nameDe : category.nameSr;
  const description =
    (locale === "de" ? category.descriptionDe : category.descriptionSr) ??
    undefined;
  return {
    title: name,
    description,
    alternates: pageAlternates(locale, `/kategorija/${slug}`),
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!hasLocale(locale)) notFound();
  const category = await loadCategory(slug);
  if (!category) notFound();
  const dict = getDictionary(locale);
  const result = await getCategoryCompanies(locale, slug);

  const name = locale === "de" ? category.nameDe : category.nameSr;
  const description =
    locale === "de" ? category.descriptionDe : category.descriptionSr;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
      <header className="mb-8 max-w-3xl">
        <div className="flex items-center gap-3">
          <span className="grid size-13 place-items-center rounded-full bg-terracotta-100 text-terracotta-700">
            <CategoryIcon name={category.icon} className="size-6" />
          </span>
          <div>
            <p className="text-sm text-muted-foreground">
              {dict.category.companiesIn}
            </p>
            <h1 className="text-3xl tracking-tight">{name}</h1>
          </div>
        </div>
        {description && (
          <p className="mt-4 leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </header>

      {result.items.length === 0 ? (
        <EmptyState
          title={dict.category.emptyTitle}
          text={dict.category.emptyText}
          action={
            <Button asChild size="sm">
              <Link href={localePath(locale, "/dodaj-firmu")}>
                {dict.common.cta.addCompany}
              </Link>
            </Button>
          }
        />
      ) : (
        <>
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
                href={`${localePath(locale, "/firme")}?kategorija=${category.slug}`}
              >
                {dict.category.browseAll}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

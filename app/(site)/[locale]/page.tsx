import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CreditCard } from "lucide-react";
import { hasLocale, localePath } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getDiscountPartners, getFacets, getNewest } from "@/lib/data";
import { pageAlternates } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { HomeHero } from "@/components/site/home-hero";
import { CategoryIcon } from "@/components/site/category-icon";
import { CompanyCard } from "@/components/site/company-card";
import { RouteLine } from "@/components/site/route-line";
import { DiscountBadge } from "@/components/site/discount-badge";

export const revalidate = 600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  return { alternates: pageAlternates(locale, "") };
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const dict = getDictionary(locale);

  const [facets, newest, partners] = await Promise.all([
    getFacets(locale),
    getNewest(locale, 6),
    getDiscountPartners(locale),
  ]);

  const cardStrings = {
    countryLabels: dict.common.countries,
    discountTemplate: dict.company.discountBadge,
  };

  return (
    <>
      <HomeHero
        locale={locale}
        strings={{
          title: dict.home.hero.title,
          subtitle: dict.home.hero.subtitle,
          searchPlaceholder: dict.home.hero.searchPlaceholder,
          searchLabel: dict.home.hero.searchLabel,
          searchButton: dict.common.actions.search,
        }}
      />

      {/* Categories */}
      <section className="mx-auto max-w-6xl px-4 py-14 md:px-6 md:py-20">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
              {dict.home.categories.title}
            </h2>
            <p className="mt-1 text-muted-foreground">
              {dict.home.categories.subtitle}
            </p>
          </div>
          <Button asChild variant="ghost" className="shrink-0">
            <Link href={localePath(locale, "/firme")}>
              {dict.common.actions.viewAll}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {facets.categories.map((category) => (
            <li key={category.slug}>
              <Link
                href={localePath(locale, `/kategorija/${category.slug}`)}
                className="group flex h-full items-center gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-secondary text-primary">
                  <CategoryIcon name={category.icon} className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">
                    {category.name}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {category.count} {dict.home.categories.companiesSuffix}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Newest / featured companies */}
      {newest.items.length > 0 && (
        <section className="border-y border-border bg-secondary/30">
          <div className="mx-auto max-w-6xl px-4 py-14 md:px-6 md:py-20">
            <div className="mb-8">
              <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
                {newest.isFeatured
                  ? dict.home.newest.titleFeatured
                  : dict.home.newest.titleFallback}
              </h2>
              <p className="mt-1 text-muted-foreground">{dict.home.newest.subtitle}</p>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {newest.items.map((card) => (
                <CompanyCard
                  key={card.id}
                  locale={locale}
                  card={card}
                  strings={cardStrings}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="relative mx-auto max-w-6xl overflow-hidden px-4 py-14 md:px-6 md:py-20">
        <RouteLine className="pointer-events-none absolute inset-x-0 top-10 hidden h-16 w-full text-primary/10 md:block" />
        <h2 className="relative mb-10 text-2xl font-semibold tracking-tight md:text-3xl">
          {dict.home.howItWorks.title}
        </h2>
        <ol className="relative grid gap-8 md:grid-cols-3">
          {dict.home.howItWorks.steps.map((step, index) => (
            <li key={step.title} className="flex gap-4">
              <span
                aria-hidden="true"
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary font-mono text-sm font-semibold text-primary-foreground"
              >
                {index + 1}
              </span>
              <div>
                <h3 className="font-semibold">{step.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Card promo + partners */}
      <section className="border-y border-border bg-accent/25">
        <div className="mx-auto max-w-6xl px-4 py-14 md:px-6 md:py-20">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl">
              <p className="flex items-center gap-2 text-sm font-medium text-primary">
                <CreditCard className="size-4" aria-hidden="true" />
                {dict.home.cardPromo.title}
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
                {dict.home.partners.title}
              </h2>
              <p className="mt-1 text-muted-foreground">{dict.home.partners.subtitle}</p>
            </div>
            <Button asChild>
              <Link href={localePath(locale, "/kartica")}>
                {dict.home.cardPromo.cta}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
          {partners.length > 0 && (
            <ul className="mt-8 flex flex-wrap gap-3">
              {partners.map((partner) => (
                <li key={partner.id}>
                  <Link
                    href={localePath(locale, `/firma/${partner.slug}`)}
                    className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium transition-colors hover:border-primary/40"
                  >
                    {partner.name}
                    {partner.discountPercent !== null && (
                      <DiscountBadge
                        percent={partner.discountPercent}
                        template={dict.company.discountBadge}
                        compact
                      />
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* CTA band */}
      <section className="mx-auto max-w-6xl px-4 py-14 md:px-6 md:py-20">
        <div className="flex flex-col items-start gap-5 rounded-xl bg-primary px-6 py-10 text-primary-foreground md:flex-row md:items-center md:justify-between md:px-10">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
              {dict.home.ctaBand.title}
            </h2>
            <p className="mt-1 max-w-xl text-primary-foreground/85">
              {dict.home.ctaBand.text}
            </p>
          </div>
          <Button asChild size="lg" variant="secondary" className="shrink-0">
            <Link href={localePath(locale, "/dodaj-firmu")}>
              {dict.home.ctaBand.cta}
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}

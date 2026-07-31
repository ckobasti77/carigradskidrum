import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CreditCard, Mail } from "lucide-react";
import { hasLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getDiscountPartners } from "@/lib/data";
import { pageAlternates } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { CompanyCard } from "@/components/site/company-card";
import { RouteLine } from "@/components/site/route-line";

export const revalidate = 600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const dict = getDictionary(locale);
  return {
    title: dict.card.title,
    description: dict.card.lead,
    alternates: pageAlternates(locale, "/kartica"),
  };
}

export default async function CardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const partners = await getDiscountPartners(locale);

  return (
    <div>
      <header className="relative overflow-hidden border-b border-neutral-200 bg-terracotta-100">
        <RouteLine className="pointer-events-none absolute inset-x-0 bottom-0 h-20 w-full text-terracotta-300" />
        <div className="relative mx-auto max-w-6xl px-4 py-14 md:px-6 md:py-20">
          <p className="flex items-center gap-2 text-sm font-medium text-primary">
            <CreditCard className="size-4" aria-hidden="true" />
            Carigradski Drum
          </p>
          <h1 className="mt-2 max-w-2xl text-3xl tracking-tight md:text-4xl">
            {dict.card.title}
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
            {dict.card.lead}
          </p>
          <Button asChild size="lg" className="mt-6">
            <a href="mailto:office@carigradskidrum.com?subject=Carigradski%20Drum%20kartica">
              <Mail className="size-4" aria-hidden="true" />
              {dict.card.contactCta}
            </a>
          </Button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-12 md:px-6">
        <h2 className="text-2xl tracking-tight">
          {dict.card.howTitle}
        </h2>
        <ol className="mt-6 grid gap-6 md:grid-cols-3">
          {dict.card.howSteps.map((step, index) => (
            <li key={index} className="flex gap-4">
              <span
                aria-hidden="true"
                className="grid size-14 shrink-0 place-items-center rounded-full bg-terracotta-100 font-heading text-2xl text-terracotta-700"
              >
                {index + 1}
              </span>
              <p className="text-sm leading-relaxed text-muted-foreground">{step}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-t border-neutral-200 bg-sage-100">
        <div className="mx-auto max-w-6xl px-4 py-12 md:px-6">
          <h2 className="text-2xl tracking-tight">
            {dict.card.partnersTitle}
          </h2>
          {partners.length === 0 ? (
            <p className="mt-4 text-muted-foreground">{dict.card.partnersEmpty}</p>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {partners.map((card) => (
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
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

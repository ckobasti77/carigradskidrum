import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Mail, MessagesSquare, Percent, TrendingUp } from "lucide-react";
import { hasLocale, localePath } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { pageAlternates } from "@/lib/seo";
import { getCategories } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { AddCompanyWizard } from "@/components/site/add-company-wizard/wizard";
import type { WizardCategory } from "@/components/site/add-company-wizard/types";

const BENEFIT_ICONS = [TrendingUp, MessagesSquare, Percent];

/**
 * Categories rarely change and the wizard is not a cached page's critical
 * path, but going through lib/data.ts keeps the "no direct fetchQuery in RSC"
 * rule intact and reuses the shared `categories` cache tag.
 */
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
    title: dict.addCompany.title,
    description: dict.addCompany.lead,
    alternates: pageAlternates(locale, "/dodaj-firmu"),
  };
}

/**
 * Self-service funnel: benefits (SEO + conversion) followed by the submission
 * wizard. NOTE: no loading.tsx may be added to this route — the known Next
 * 16.2.12 bug documented in AGENTS.md leaves the Suspense boundary dehydrated,
 * which would silently turn the wizard into dead markup.
 */
export default async function AddCompanyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const categories = await getCategories();

  const wizardCategories: WizardCategory[] = categories.map((category) => ({
    slug: category.slug,
    name: locale === "de" ? category.nameDe : category.nameSr,
    icon: category.icon,
  }));

  return (
    <div className="mx-auto max-w-4xl px-4 py-14 md:px-6 md:py-20">
      <h1 className="text-3xl tracking-tight md:text-4xl">
        {dict.addCompany.title}
      </h1>
      <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
        {dict.addCompany.lead}
      </p>

      <ul className="mt-10 grid gap-6 md:grid-cols-3">
        {dict.addCompany.benefits.map((benefit, index) => {
          const Icon = BENEFIT_ICONS[index] ?? TrendingUp;
          return (
            <li
              key={benefit.title}
              className="rounded-lg border border-border bg-card p-5"
            >
              <Icon className="size-5 text-primary" aria-hidden="true" />
              <h2 className="mt-3">{benefit.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{benefit.text}</p>
            </li>
          );
        })}
      </ul>

      <div className="mt-12">
        <AddCompanyWizard
          locale={locale}
          categories={wizardCategories}
          strings={{
            ...dict.addCompany.form,
            countries: dict.common.countries,
            days: dict.common.days,
            privacyHref: "/pravno/privatnost",
            contactEmail: "eintragsservice@carigradskidrum.com",
            backHome: dict.common.actions.backHome,
            backHomeHref: localePath(locale),
          }}
        />
      </div>

      <div className="mt-10 rounded-xl border border-terracotta-300 bg-terracotta-100 p-6 md:p-8">
        <h2 className="text-xl">{dict.addCompany.helpTitle}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-foreground/90">
          {dict.addCompany.helpText}
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button asChild size="lg">
            <a href="mailto:eintragsservice@carigradskidrum.com">
              <Mail className="size-4" aria-hidden="true" />
              eintragsservice@carigradskidrum.com
            </a>
          </Button>
          <span className="text-sm text-muted-foreground">
            {dict.addCompany.contactPrompt} +43 667 762 676 0
          </span>
        </div>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  ArrowDown,
  Clock3,
  Mail,
  MessagesSquare,
  Percent,
  Save,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { hasLocale, localePath } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { pageAlternates } from "@/lib/seo";
import { getCategories } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { AddCompanyPageMotion } from "@/components/site/add-company-page-motion";
import { AddCompanyWizard } from "@/components/site/add-company-wizard/wizard";
import type { WizardCategory } from "@/components/site/add-company-wizard/types";

const BENEFIT_ICONS = [TrendingUp, MessagesSquare, Percent];
const TRUST_ICONS = [ShieldCheck, Save, Clock3];

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
    <AddCompanyPageMotion>
      <div className="relative isolate overflow-clip pb-16 md:pb-24">
        <div
          className="pointer-events-none absolute -top-32 -right-28 -z-10 size-96 rounded-full border-[4rem] border-terracotta-200/45"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute top-[34rem] -left-32 -z-10 size-80 rounded-full border-[3rem] border-sage-200/55"
          aria-hidden="true"
        />

        <section className="mx-auto grid max-w-7xl items-center gap-12 px-4 pt-14 pb-16 md:px-6 md:pt-20 md:pb-24 lg:grid-cols-[minmax(0,0.92fr)_minmax(30rem,1.08fr)] lg:gap-16">
          <div data-add-hero-copy>
            <p className="inline-flex items-center gap-2 rounded-full border border-terracotta-300 bg-terracotta-100 px-4 py-2 text-sm font-medium text-terracotta-800">
              <ShieldCheck className="size-4" aria-hidden="true" />
              {dict.addCompany.eyebrow}
            </p>
            <h1 className="mt-6 max-w-3xl text-5xl tracking-tight text-balance md:text-6xl">
              {dict.addCompany.title}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
              {dict.addCompany.lead}
            </p>

            <ul className="mt-7 grid gap-3 text-sm text-neutral-800">
              {dict.addCompany.trustPoints.map((point, index) => {
                const Icon = TRUST_ICONS[index] ?? ShieldCheck;
                return (
                  <li key={point} className="flex items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-sage-100 text-sage-800">
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                    <span>{point}</span>
                  </li>
                );
              })}
            </ul>

            <Button asChild size="lg" className="mt-8 shadow-md">
              <a href="#prijava">
                {dict.addCompany.startAction}
                <ArrowDown className="size-5" aria-hidden="true" />
              </a>
            </Button>
          </div>

          <div
            data-add-route-panel
            className="relative min-h-[30rem] overflow-hidden rounded-2xl border border-sage-700 bg-sage-800 p-5 text-cream shadow-lg sm:p-7"
          >
            <div
              className="absolute -top-24 -right-20 size-64 rounded-full border-[2.75rem] border-sage-700/70"
              aria-hidden="true"
            />
            <svg
              className="pointer-events-none absolute inset-0 h-full w-full text-sage-500/70"
              viewBox="0 0 560 500"
              fill="none"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path
                d="M76 -20 C 470 70, 62 170, 402 246 S 500 412, 92 530"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="2 14"
              />
            </svg>
            <span
              data-add-route-marker
              className="absolute top-[43%] right-[21%] size-4 rounded-full bg-terracotta-400 ring-8 ring-terracotta-300/20"
              aria-hidden="true"
            />

            <p className="relative z-10 max-w-sm text-sm font-medium tracking-wide text-sage-200 uppercase">
              {dict.addCompany.processTitle}
            </p>
            <ul className="relative z-10 mt-6 space-y-4">
              {dict.addCompany.benefits.map((benefit, index) => {
                const Icon = BENEFIT_ICONS[index] ?? TrendingUp;
                return (
                  <li
                    data-add-benefit
                    key={benefit.title}
                    className={`max-w-[27rem] rounded-lg border border-sage-600 bg-cream p-5 text-ink shadow-md ${
                      index === 1 ? "ml-auto" : index === 2 ? "ml-5 sm:ml-10" : ""
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-terracotta-100 text-terracotta-700">
                        <Icon className="size-5" aria-hidden="true" />
                      </span>
                      <div>
                        <h2 className="text-lg">{benefit.title}</h2>
                        <p className="mt-1 text-sm leading-relaxed text-neutral-700">
                          {benefit.text}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <section
          id="prijava"
          data-add-reveal
          className="scroll-mt-24 border-y border-border bg-neutral-100/55 py-14 md:py-20"
        >
          <div className="mx-auto max-w-7xl px-4 md:px-6">
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
        </section>

        <section
          data-add-reveal
          className="mx-auto mt-14 max-w-7xl px-4 md:mt-20 md:px-6"
        >
          <div className="relative overflow-hidden rounded-2xl border border-terracotta-300 bg-terracotta-100 p-6 shadow-sm md:p-10">
            <div
              className="absolute -right-16 -bottom-24 size-72 rounded-full border-[3rem] border-terracotta-200"
              aria-hidden="true"
            />
            <div className="relative z-10 grid min-w-0 items-end gap-8 lg:grid-cols-[minmax(0,1fr)_auto]">
              <div className="min-w-0">
                <p className="text-sm font-medium tracking-wide text-terracotta-800 uppercase">
                  {dict.addCompany.helpEyebrow}
                </p>
                <h2 className="mt-3 max-w-2xl text-2xl text-balance sm:text-3xl md:text-4xl">
                  {dict.addCompany.helpTitle}
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-800">
                  {dict.addCompany.helpText}
                </p>
              </div>
              <div className="flex min-w-0 flex-col items-start gap-2 lg:items-end">
                <Button asChild size="lg" className="w-full sm:w-auto">
                  <a href="mailto:eintragsservice@carigradskidrum.com">
                    <Mail className="size-4" aria-hidden="true" />
                    {dict.addCompany.emailAction}
                  </a>
                </Button>
                <span className="max-w-full break-all text-xs text-muted-foreground">
                  eintragsservice@carigradskidrum.com
                </span>
                <span className="text-sm text-muted-foreground">
                  {dict.addCompany.contactPrompt} +43 667 762 676 0
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </AddCompanyPageMotion>
  );
}

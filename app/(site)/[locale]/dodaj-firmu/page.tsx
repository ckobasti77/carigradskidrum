import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Mail, MessagesSquare, Percent, TrendingUp } from "lucide-react";
import { hasLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { pageAlternates } from "@/lib/seo";
import { Button } from "@/components/ui/button";

const BENEFIT_ICONS = [TrendingUp, MessagesSquare, Percent];

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
 * M1 funnel page: benefits + "contact us and we add you" (self-service
 * wizard arrives with auth in M2 — the copy already promises it).
 */
export default async function AddCompanyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const dict = getDictionary(locale);

  return (
    <div className="mx-auto max-w-4xl px-4 py-14 md:px-6 md:py-20">
      <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
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
              <h2 className="mt-3 font-semibold">{benefit.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{benefit.text}</p>
            </li>
          );
        })}
      </ul>

      <div className="mt-10 rounded-xl border border-primary/25 bg-primary/5 p-6 md:p-8">
        <p className="max-w-2xl text-sm leading-relaxed text-foreground/90">
          {dict.addCompany.selfServiceSoon}
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

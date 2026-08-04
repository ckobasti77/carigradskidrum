import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { hasLocale, localePath } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { t } from "@/lib/i18n/format";
import { pluralize } from "@/lib/i18n/plural";
import { getDiscountPartners, getFacets, getNewest } from "@/lib/data";
import { pageAlternates } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { HomeHero } from "@/components/site/home-hero";
import { CategoryIcon } from "@/components/site/category-icon";
import { CompanyCard } from "@/components/site/company-card";
import { CompanyCardGrid } from "@/components/site/company-card-grid";
import {
  CATEGORY_IMAGE_BY_SLUG,
  type CategoryImageSlug,
} from "@/lib/category-images";

export const revalidate = 600;

/** Tinte se smenjuju kroz grid — terakota, žalfija, terakota… */
function tone(index: number) {
  return index % 2 === 0
    ? { bg: "bg-terracotta-100", text: "text-terracotta-700" }
    : { bg: "bg-sage-100", text: "text-sage-700" };
}

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
    discountTemplate: dict.company.discountBadgeShort,
  };

  return (
    <div className="mx-auto max-w-[1200px] px-[clamp(20px,5vw,72px)]">
      <HomeHero
        locale={locale}
        strings={{
          title: dict.home.hero.title,
          subtitle: dict.home.hero.subtitle,
          searchPlaceholder: dict.home.hero.searchPlaceholder,
          searchLabel: dict.home.hero.searchLabel,
          searchButton: dict.common.actions.search,
          imageAlt: dict.home.hero.imageAlt,
        }}
        trust={[
          {
            label: t(dict.home.hero.trust.companies, { count: facets.total }),
            tone: "terracotta",
          },
          {
            label: t(dict.home.hero.trust.categories, {
              count: facets.categories.length,
            }),
            tone: "sage",
          },
          { label: dict.home.hero.trust.regions, tone: "terracotta" },
        ]}
      />

      {/* Kategorije */}
      <section id="kategorije" className="py-[clamp(40px,5vw,72px)]">
        <h2 className="text-[clamp(30px,3vw,42px)]">{dict.home.categories.title}</h2>
        <p className="mt-3.5 text-[19px] text-neutral-800">
          {dict.home.categories.subtitle}
        </p>

        <ul className="mt-9 grid auto-rows-fr grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {facets.categories.map((category, index) => {
            const imageSrc =
              CATEGORY_IMAGE_BY_SLUG[category.slug as CategoryImageSlug];
            const shortName =
              dict.home.categories.shortNames[
                category.slug as keyof typeof dict.home.categories.shortNames
              ] ?? category.name;

            return (
              <li key={category.slug} className="h-full">
                <Link
                  href={localePath(locale, `/kategorija/${category.slug}`)}
                  className="group flex h-full flex-col overflow-hidden rounded-lg bg-neutral-100 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <span className="relative block aspect-video w-full overflow-hidden bg-neutral-200">
                    <Image
                      src={imageSrc}
                      alt=""
                      fill
                      loading="lazy"
                      sizes="(max-width: 767px) 50vw, (max-width: 1023px) 33vw, 25vw"
                      className="object-cover motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-[1.025] motion-reduce:transform-none"
                    />
                  </span>
                  <span className="flex flex-1 flex-col items-start gap-2.5 p-3 sm:flex-row sm:items-center sm:gap-3 sm:p-4">
                    <span
                      className={`grid size-10 shrink-0 place-items-center rounded-full sm:size-12 ${tone(index).bg} ${tone(index).text}`}
                    >
                      <CategoryIcon
                        name={category.icon}
                        className="size-5.5 sm:size-6"
                        strokeWidth={2.75}
                      />
                    </span>
                    <span className="min-w-0">
                      <strong className="line-clamp-3 block text-[13px] leading-snug font-bold [overflow-wrap:anywhere] min-[360px]:text-sm sm:text-base">
                        {shortName}
                      </strong>
                      <span className="mt-1 block text-xs text-neutral-700">
                        {pluralize(
                          locale,
                          category.count,
                          dict.home.categories.companies,
                        )}
                      </span>
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}

          <li className="h-full">
            <Link
              href={localePath(locale, "/firme")}
              className="flex h-full items-center justify-center gap-2.5 rounded-lg border-2 border-terracotta-300 px-3 py-5 text-center text-sm font-bold text-terracotta-700 transition-colors hover:bg-terracotta-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:px-5 sm:text-base"
            >
              {dict.home.categories.viewAllTile}
              <ArrowRight className="size-5.5" strokeWidth={2.75} aria-hidden="true" />
            </Link>
          </li>
        </ul>
      </section>

      {/* Kako funkcioniše */}
      <section className="py-[clamp(40px,5vw,72px)]">
        <h2 className="text-[clamp(30px,3vw,42px)]">{dict.home.howItWorks.title}</h2>
        <ol className="mt-10 grid gap-[clamp(24px,4vw,56px)] [grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr))]">
          {dict.home.howItWorks.steps.map((step, index) => (
            <li key={step.title}>
              <span
                aria-hidden="true"
                className={`grid size-19 place-items-center rounded-full font-heading text-[34px] ${tone(index).bg} ${tone(index).text}`}
              >
                {index + 1}
              </span>
              <h3 className="mt-5 text-2xl">{step.title}</h3>
              <p className="mt-2.5 text-base text-neutral-800">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Novo na platformi */}
      {newest.items.length > 0 && (
        <section className="py-[clamp(40px,5vw,72px)]">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <h2 className="text-[clamp(30px,3vw,42px)]">
                {newest.isFeatured
                  ? dict.home.newest.titleFeatured
                  : dict.home.newest.titleFallback}
              </h2>
              <p className="mt-3.5 text-[19px] text-neutral-800">
                {dict.home.newest.subtitle}
              </p>
            </div>
            <Link
              href={localePath(locale, "/firme")}
              className="inline-flex min-h-11 items-center text-base font-bold whitespace-nowrap text-terracotta-700 hover:underline"
            >
              {dict.common.actions.viewAll} →
            </Link>
          </div>

          <CompanyCardGrid className="mt-9 gap-5">
            {newest.items.map((card) => (
              <CompanyCard
                key={card.id}
                locale={locale}
                card={card}
                strings={cardStrings}
              />
            ))}
          </CompanyCardGrid>
        </section>
      )}

      {/* Kartica popusta */}
      <section id="kartica" className="py-[clamp(40px,5vw,72px)]">
        <div className="grid items-center gap-[clamp(28px,4vw,64px)] rounded-xl bg-sage-100 p-[clamp(28px,4vw,64px)] [grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr))]">
          <div>
            <span className="mb-3.5 block text-xs font-bold tracking-[0.06em] uppercase text-sage-800">
              {dict.home.cardPromo.title}
            </span>
            <h2 className="text-[clamp(28px,2.8vw,40px)]">{dict.home.partners.title}</h2>
            <p className="mt-4.5 max-w-[50ch] text-base text-neutral-800">
              {dict.home.cardPromo.text}
            </p>

            {partners.length > 0 && (
              <ul className="mt-6 flex flex-wrap gap-2.5">
                {partners.map((partner) => (
                  <li key={partner.id}>
                    <Link
                      href={localePath(locale, `/firma/${partner.slug}`)}
                      className="inline-flex min-h-11 items-center rounded-full bg-terracotta-100 px-4 text-xs text-terracotta-800 transition-colors hover:bg-terracotta-200"
                    >
                      {partner.name}
                      {partner.discountPercent !== null && (
                        <span className="ml-1.5 font-semibold">
                          −{partner.discountPercent}%
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-7">
              <Button asChild variant="secondary">
                <Link href={localePath(locale, "/kartica")}>
                  {dict.home.cardPromo.cta}
                </Link>
              </Button>
            </div>
          </div>

          {/* Maketa kartice — čisto dekorativna. */}
          <div aria-hidden="true" className="w-[min(380px,100%)] justify-self-center">
            {/* `w-full` je obavezan: bez njega `aspect-ratio` računa širinu iz
                `min-h` i kartica preraste svoju kolonu na uskim ekranima. */}
            <div className="flex aspect-[86/54] min-h-[220px] w-full -rotate-3 flex-col justify-between rounded-3xl bg-terracotta px-7.5 py-6.5 text-terracotta-100 shadow-lg">
              <div className="flex items-start justify-between">
                <span className="font-heading text-xl leading-[1.15]">
                  Carigradski
                  <br />
                  Drum
                </span>
                <span className="h-8.5 w-11 rounded-sm bg-terracotta-300" />
              </div>
              <div>
                <span className="block text-xs tracking-[0.14em] uppercase opacity-85">
                  {dict.home.cardPromo.mockupLabel}
                </span>
                <span className="mt-1.5 block text-[19px] font-bold tracking-[0.08em]">
                  •••• {new Date().getFullYear()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Imate firmu? */}
      <section className="pt-[clamp(20px,3vw,40px)] pb-[clamp(48px,6vw,88px)]">
        <div className="flex flex-wrap items-center justify-between gap-7 rounded-xl bg-terracotta-100 p-[clamp(28px,4vw,64px)]">
          <div>
            <h2 className="text-[clamp(28px,2.8vw,40px)]">{dict.home.ctaBand.title}</h2>
            <p className="mt-3.5 max-w-[52ch] text-base text-neutral-800">
              {dict.home.ctaBand.text}
            </p>
          </div>
          <Button asChild size="lg" className="shrink-0">
            <Link href={localePath(locale, "/dodaj-firmu")}>
              {dict.home.ctaBand.cta}
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

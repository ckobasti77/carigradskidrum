import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Clock,
  ExternalLink,
  Mail,
  MapPin,
  Navigation,
  Package,
  Phone,
  Wrench,
} from "lucide-react";
import { hasLocale, localePath } from "@/lib/i18n/config";
import { getDictionary, t } from "@/lib/i18n/dictionaries";
import { getCompany, getPublishedSlugs } from "@/lib/data";
import { jsonLdScriptProps, localBusinessJsonLd, pageAlternates } from "@/lib/seo";
import { badgeVariants } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CompanyCard } from "@/components/site/company-card";
import { DiscountBadge } from "@/components/site/discount-badge";
import { ClaimBanner } from "@/components/site/claim-banner";
import { InquiryForm } from "@/components/site/inquiry-form";
import { MapView } from "@/components/site/map-view";

export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  const slugs = await getPublishedSlugs();
  return slugs.map((entry) => ({ slug: entry.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!hasLocale(locale)) return {};
  const profile = await getCompany(locale, slug);
  if (!profile) return {};
  const dict = getDictionary(locale);
  const categoryNames = profile.categories.map((c) => c.name).join(", ");
  const description =
    profile.description?.slice(0, 155) ??
    `${profile.name} — ${categoryNames} · ${profile.city}, ${
      dict.common.countries[profile.countries[0] as "AT"] ?? ""
    }`;
  return {
    title: `${profile.name} — ${profile.city}`,
    description,
    alternates: pageAlternates(locale, `/firma/${slug}`),
    openGraph: profile.cover?.url
      ? { images: [{ url: profile.cover.url }] }
      : undefined,
  };
}

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!hasLocale(locale)) notFound();
  const profile = await getCompany(locale, slug);
  if (!profile) notFound();
  const dict = getDictionary(locale);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const primaryLocation =
    profile.locations.find((l) => l.isPrimary) ?? profile.locations[0] ?? null;
  const cardStrings = {
    countryLabels: dict.common.countries,
    discountTemplate: dict.company.discountBadge,
  };
  const countryLabel =
    dict.common.countries[
      (primaryLocation?.country ?? profile.countries[0]) as "AT"
    ] ?? "";

  return (
    <article>
      <script {...jsonLdScriptProps(localBusinessJsonLd(profile, locale, siteUrl))} />

      {/* Title bar */}
      <header className="relative overflow-hidden border-b border-border bg-secondary/40">
        {profile.cover?.url && (
          <>
            <Image
              src={profile.cover.url}
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover opacity-25 blur-[2px]"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/70 to-background/40"
            />
          </>
        )}
        <div className="relative mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">
          <div className="flex flex-wrap items-center gap-2">
            {profile.categories.map((category) => (
              <Link
                key={category.slug}
                href={localePath(locale, `/kategorija/${category.slug}`)}
                className={badgeVariants({ variant: "secondary" })}
              >
                {category.name}
              </Link>
            ))}
            {profile.discountPercent !== null && (
              <DiscountBadge
                percent={profile.discountPercent}
                template={dict.company.discountBadge}
              />
            )}
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
            {profile.name}
          </h1>
          {primaryLocation && (
            <p className="mt-2 flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="size-4 shrink-0" aria-hidden="true" />
              {primaryLocation.address ??
                `${primaryLocation.city}, ${countryLabel}`}
            </p>
          )}
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 md:px-6 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-10">
          {/* Overview */}
          {profile.description && (
            <section aria-labelledby="section-overview">
              <h2 id="section-overview" className="text-xl font-semibold">
                {dict.company.sections.overview}
              </h2>
              <p className="mt-3 whitespace-pre-line leading-relaxed text-foreground/90">
                {profile.description}
              </p>
            </section>
          )}

          {/* Offerings (paid tier) */}
          {profile.offerings.length > 0 && (
            <section aria-labelledby="section-offerings">
              <h2 id="section-offerings" className="text-xl font-semibold">
                {dict.company.sections.offerings}
              </h2>
              <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                {profile.offerings.map((offering, index) => (
                  <li
                    key={index}
                    className="flex gap-3 rounded-lg border border-border bg-card p-4"
                  >
                    {offering.type === "product" ? (
                      <Package className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                    ) : (
                      <Wrench className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                    )}
                    <div className="min-w-0">
                      <p className="font-medium">{offering.name}</p>
                      {offering.description && (
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {offering.description}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Gallery (paid tier) */}
          {profile.gallery.length > 0 && (
            <section aria-labelledby="section-gallery">
              <h2 id="section-gallery" className="text-xl font-semibold">
                {dict.company.sections.gallery}
              </h2>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {profile.gallery.map(
                  (item, index) =>
                    item.url && (
                      <div
                        key={index}
                        className="relative aspect-[4/3] overflow-hidden rounded-lg border border-border"
                      >
                        <Image
                          src={item.url}
                          alt={item.alt ?? profile.name}
                          fill
                          sizes="(max-width: 640px) 50vw, 33vw"
                          className="object-cover"
                        />
                      </div>
                    ),
                )}
              </div>
            </section>
          )}

          {/* Location */}
          {primaryLocation && (
            <section aria-labelledby="section-location">
              <h2 id="section-location" className="text-xl font-semibold">
                {dict.company.sections.location}
              </h2>
              <div className="mt-3 space-y-3">
                <p className="text-muted-foreground">
                  {primaryLocation.address ?? primaryLocation.city},{" "}
                  {countryLabel}
                </p>
                {primaryLocation.lat != null && primaryLocation.lng != null && (
                  <>
                    <MapView
                      lat={primaryLocation.lat}
                      lng={primaryLocation.lng}
                      name={profile.name}
                    />
                    <Button asChild variant="outline" size="sm">
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${primaryLocation.lat},${primaryLocation.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Navigation className="size-4" aria-hidden="true" />
                        {dict.company.getDirections}
                      </a>
                    </Button>
                  </>
                )}
              </div>
            </section>
          )}

          {/* Similar companies */}
          {profile.similar.length > 0 && (
            <section aria-labelledby="section-similar">
              <h2 id="section-similar" className="text-xl font-semibold">
                {dict.company.sections.similar}
              </h2>
              <div className="mt-3 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {profile.similar.slice(0, 3).map((card) => (
                  <CompanyCard
                    key={card.id}
                    locale={locale}
                    card={card}
                    strings={cardStrings}
                  />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-5">
          <div className="space-y-4 rounded-lg border border-border bg-card p-5">
            {profile.website && (
              <Button asChild className="w-full">
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="size-4" aria-hidden="true" />
                  {dict.company.website}
                </a>
              </Button>
            )}
            {profile.phone && (
              <p className="flex items-center gap-2 text-sm">
                <Phone className="size-4 shrink-0 text-primary" aria-hidden="true" />
                <a className="hover:underline" href={`tel:${profile.phone.replace(/\s/g, "")}`}>
                  {profile.phone}
                </a>
              </p>
            )}
            {profile.email && (
              <p className="flex items-center gap-2 text-sm">
                <Mail className="size-4 shrink-0 text-primary" aria-hidden="true" />
                <a className="hover:underline" href={`mailto:${profile.email}`}>
                  {profile.email}
                </a>
              </p>
            )}
            {profile.openingHours && profile.openingHours.length > 0 && (
              <div className="text-sm">
                <p className="flex items-center gap-2 font-medium">
                  <Clock className="size-4 text-primary" aria-hidden="true" />
                  {dict.company.sections.hours}
                </p>
                <table className="mt-2 w-full text-muted-foreground">
                  <tbody>
                    {profile.openingHours.map((entry) => (
                      <tr key={entry.day}>
                        <td className="py-0.5 pr-3">
                          {dict.common.days[entry.day] ?? entry.day}
                        </td>
                        <td className="py-0.5 text-right font-mono tabular-nums">
                          {entry.open}–{entry.close}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {profile.discountPercent !== null && (
              <p className="rounded-md bg-accent/40 p-3 text-sm">
                {t(dict.company.discountBadge, { percent: profile.discountPercent })}
              </p>
            )}
            {!profile.website &&
              !profile.phone &&
              !profile.email &&
              profile.discountPercent === null && (
                <p className="text-sm text-muted-foreground">
                  {dict.company.addedByNote}
                </p>
              )}
          </div>

          {profile.claimable && (
            <ClaimBanner locale={locale} strings={dict.company.claim} />
          )}

          <div className="rounded-lg border border-border bg-card p-5">
            <InquiryForm
              companyId={profile.id}
              locale={locale}
              strings={{
                ...dict.company.inquiry,
                sending: dict.common.actions.sending,
              }}
            />
          </div>

          <Separator />
          <p className="text-xs text-muted-foreground">{dict.company.addedByNote}</p>
        </aside>
      </div>
    </article>
  );
}

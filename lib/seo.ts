import type { Locale } from "@/lib/i18n/config";
import type { CompanyProfile } from "@/lib/data";

/**
 * hreflang + canonical for a localized path ("" or "/firme"…). Relative URLs
 * resolve against metadataBase (set in the root layout).
 */
export function pageAlternates(locale: Locale, path: string) {
  return {
    canonical: `/${locale}${path}`,
    languages: {
      sr: `/sr${path}`,
      de: `/de${path}`,
      "x-default": `/sr${path}`,
    },
  };
}

/**
 * JSON-LD script props with the `<` escape the Next docs require (XSS guard —
 * company names/descriptions are user-supplied content).
 */
export function jsonLdScriptProps(data: object) {
  return {
    type: "application/ld+json",
    dangerouslySetInnerHTML: {
      __html: JSON.stringify(data).replace(/</g, "\\u003c"),
    },
  } as const;
}

const SCHEMA_COUNTRY: Record<string, string> = {
  AT: "AT",
  RS: "RS",
  HR: "HR",
  BA: "BA",
};

export function localBusinessJsonLd(
  profile: CompanyProfile,
  locale: Locale,
  siteUrl: string,
) {
  const primary = profile.locations.find((l) => l.isPrimary) ?? profile.locations[0];
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: profile.name,
    url: `${siteUrl}/${locale}/firma/${profile.slug}`,
    ...(profile.description ? { description: profile.description } : {}),
    ...(profile.cover?.url ? { image: profile.cover.url } : {}),
    ...(profile.website ? { sameAs: [profile.website] } : {}),
    ...(profile.phone ? { telephone: profile.phone } : {}),
    ...(primary
      ? {
          address: {
            "@type": "PostalAddress",
            ...(primary.address ? { streetAddress: primary.address } : {}),
            addressLocality: primary.city,
            ...(primary.zip ? { postalCode: primary.zip } : {}),
            addressCountry: SCHEMA_COUNTRY[primary.country] ?? primary.country,
          },
        }
      : {}),
    ...(primary?.lat != null && primary?.lng != null
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: primary.lat,
            longitude: primary.lng,
          },
        }
      : {}),
  };
}

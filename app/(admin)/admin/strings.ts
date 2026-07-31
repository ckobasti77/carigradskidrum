/**
 * Admin panel labels.
 *
 * Documented exception to the "UI strings only from lib/i18n/dictionaries"
 * rule: that rule exists so the PUBLIC bilingual site can never ship an
 * untranslated string (de.json is typed `satisfies typeof sr`). The admin panel
 * has exactly one operator and one language, so pushing ~200 internal keys into
 * the bilingual dictionaries would only create dead German copy to maintain.
 *
 * Only labels that repeat across pages live here — page-specific headings stay
 * inline where they are read.
 */

export const NAV = [
  { href: "/admin", label: "Pregled", exact: true },
  { href: "/admin/submissions", label: "Prijave" },
  { href: "/admin/companies", label: "Firme" },
  { href: "/admin/subscriptions", label: "Pretplate" },
  { href: "/admin/payments", label: "Uplate" },
  { href: "/admin/inquiries", label: "Upiti" },
  { href: "/admin/audit", label: "Evidencija" },
] as const;

export const COMPANY_STATUS: Record<string, string> = {
  draft: "Nacrt",
  pending: "Na čekanju",
  published: "Objavljena",
  suspended: "Suspendovana",
};

export const SUBMISSION_STATUS: Record<string, string> = {
  pending: "Na čekanju",
  approved: "Odobrena",
  rejected: "Odbijena",
  spam: "Spam",
};

export const SUBSCRIPTION_STATUS: Record<string, string> = {
  active: "Aktivna",
  past_due: "Kasni plaćanje",
  canceled: "Otkazana",
  expired: "Istekla",
};

export const PLAN_LABEL: Record<string, string> = {
  yearly_365: "Godišnji — 365 €",
  monthly_45: "Mesečni — 45 €",
};

export const PAYMENT_METHOD: Record<string, string> = {
  bank: "Uplata na račun",
  cash: "Gotovina",
  card: "Kartica",
  stripe: "Stripe",
};

export const COUNTRY_LABEL: Record<string, string> = {
  AT: "Austrija",
  RS: "Srbija",
  HR: "Hrvatska",
  BA: "Bosna i Hercegovina",
};

export const OFFERING_TYPE: Record<string, string> = {
  product: "Proizvod",
  service: "Usluga",
};

export const MEDIA_KIND: Record<string, string> = {
  logo: "Logo",
  cover: "Naslovna",
  gallery: "Galerija",
};

export const DAYS = [
  "Ponedeljak",
  "Utorak",
  "Sreda",
  "Četvrtak",
  "Petak",
  "Subota",
  "Nedelja",
];

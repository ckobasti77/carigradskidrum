/**
 * Shared constants — imported by Convex functions AND Next.js code
 * (plain TS module, no runtime coupling).
 */

// BA was added when the first physically-Bosnian company surfaced in the
// migration data (Steco Centar, Janja) — per the plan's "add with the first
// company" rule.
export const COUNTRY_CODES = ["AT", "RS", "HR", "BA"] as const;
export type CountryCode = (typeof COUNTRY_CODES)[number];

export const LOCALES = ["sr", "de"] as const;
export type ContentLocale = (typeof LOCALES)[number];

/** Directory list queries return at most this many results (client slices pages of 24). */
export const DIRECTORY_RESULT_CAP = 300;
/** Bounded scan cap for browse queries — documented ceiling, revisit at ~2000 companies. */
export const DIRECTORY_SCAN_CAP = 1001;
/** Search branch reads at most this many ranked hits. */
export const SEARCH_TAKE = 200;

export const INQUIRY_LIMIT_PER_COMPANY_24H = 10;
export const INQUIRY_LIMIT_PER_EMAIL_24H = 3;

export const FALLBACK_INQUIRY_RECIPIENT = "eintragsservice@carigradskidrum.com";

export const PLAN_IDS = ["yearly_365", "monthly_45"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export const PLAN_PRICES_EUR: Record<PlanId, number> = {
  yearly_365: 365,
  monthly_45: 45,
};

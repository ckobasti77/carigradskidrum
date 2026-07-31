/**
 * Shared validation for the public "add your company" wizard.
 *
 * Plain TS with no Convex runtime coupling (same contract as constants.ts) so
 * the SAME rules run in the browser for instant inline errors and in the
 * submissions mutation as the authoritative gate. Divergence between the two
 * is the classic source of "the form said it was fine but the server said no".
 *
 * Every failure is reported as a stable machine code (never a sentence) —
 * the client maps codes to dictionary strings, the server just returns them.
 */

import { COUNTRY_CODES, type CountryCode } from "./constants";
import { WRITE_CAPS } from "./entitlements";

export const INPUT_LIMITS = {
  name: 200,
  description: WRITE_CAPS.descriptionLength,
  website: 500,
  phone: 40,
  email: 320,
  city: 120,
  address: 240,
  zip: 20,
  offeringName: 200,
  offeringDescription: 1000,
  discountTerms: 1000,
  submitterName: 200,
  submitterRole: 120,
  rejectReason: 2000,
  adminNote: 4000,
  /** Not shown to the user — a transaction-safety ceiling, not a product limit. */
  maxOfferings: WRITE_CAPS.offerings,
  maxGallery: WRITE_CAPS.galleryImages,
  maxCategories: 3,
  minNameLength: 2,
  minDescriptionLength: 20,
  discountMin: 1,
  discountMax: 90,
} as const;

/** Same rule as convex/inquiries.ts — deliberately permissive, not RFC 5322. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export type OpeningHourRow = { day: number; open: string; close: string };

export type OfferingInput = {
  type: "product" | "service";
  nameSr: string;
  nameDe?: string;
  descriptionSr?: string;
  descriptionDe?: string;
  order: number;
};

export type CompanyInput = {
  name: string;
  descriptionSr?: string;
  descriptionDe?: string;
  website?: string;
  phone?: string;
  email?: string;
  country: string;
  city: string;
  address?: string;
  zip?: string;
  categorySlugs: string[];
  openingHours?: OpeningHourRow[];
  offerings?: OfferingInput[];
  galleryCount?: number;
  discountPercent?: number;
  discountTermsSr?: string;
  discountTermsDe?: string;
};

export type SubmitterInput = {
  submitterName: string;
  submitterEmail: string;
  submitterPhone?: string;
  submitterRole?: string;
  consent: boolean;
};

/** field key -> error code. Empty object means valid. */
export type FieldErrors = Record<string, string>;

export function isValidEmail(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length <= INPUT_LIMITS.email && EMAIL_RE.test(trimmed);
}

export function isCountryCode(value: string): value is CountryCode {
  return (COUNTRY_CODES as readonly string[]).includes(value);
}

/**
 * Users type "example.com" far more often than a full URL. We accept both and
 * store a canonical absolute URL so hrefs on the profile never turn into
 * relative links.
 */
export function normalizeWebsite(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed.replace(/^\/+/, "")}`;
}

export function isValidWebsite(value: string): boolean {
  const normalized = normalizeWebsite(value);
  if (normalized.length > INPUT_LIMITS.website) return false;
  try {
    const url = new URL(normalized);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    // Requires a dot in the host: "https://localhost" is not a business site.
    return /^[^.\s]+(\.[^.\s]+)+$/.test(url.hostname);
  } catch {
    return false;
  }
}

/** Rows must be well-formed HH:MM with open strictly before close. */
export function isValidHours(rows: OpeningHourRow[]): boolean {
  if (rows.length > 7) return false;
  const seen = new Set<number>();
  for (const row of rows) {
    if (!Number.isInteger(row.day) || row.day < 0 || row.day > 6) return false;
    if (seen.has(row.day)) return false;
    seen.add(row.day);
    if (!TIME_RE.test(row.open) || !TIME_RE.test(row.close)) return false;
    if (row.open >= row.close) return false; // lexical compare is safe on HH:MM
  }
  return true;
}

function tooLong(value: string | undefined, max: number): boolean {
  return value !== undefined && value.trim().length > max;
}

/**
 * Validates the company half of the wizard. Steps 3 and 4 are optional as a
 * whole, so every field there is only checked when it carries a value.
 */
export function validateCompany(input: CompanyInput): FieldErrors {
  const errors: FieldErrors = {};

  const name = input.name.trim();
  if (!name) errors.name = "required";
  else if (name.length < INPUT_LIMITS.minNameLength) errors.name = "tooShort";
  else if (name.length > INPUT_LIMITS.name) errors.name = "tooLong";

  if (input.categorySlugs.length === 0) errors.categorySlugs = "required";
  else if (input.categorySlugs.length > INPUT_LIMITS.maxCategories)
    errors.categorySlugs = "tooMany";
  else if (new Set(input.categorySlugs).size !== input.categorySlugs.length)
    errors.categorySlugs = "invalid";

  const descriptionSr = input.descriptionSr?.trim() ?? "";
  if (!descriptionSr) errors.descriptionSr = "required";
  else if (descriptionSr.length < INPUT_LIMITS.minDescriptionLength)
    errors.descriptionSr = "tooShort";
  else if (descriptionSr.length > INPUT_LIMITS.description)
    errors.descriptionSr = "tooLong";

  // German description is optional — the profile falls back to Serbian.
  if (tooLong(input.descriptionDe, INPUT_LIMITS.description))
    errors.descriptionDe = "tooLong";

  if (!isCountryCode(input.country)) errors.country = "required";

  const city = input.city.trim();
  if (!city) errors.city = "required";
  else if (city.length > INPUT_LIMITS.city) errors.city = "tooLong";

  if (tooLong(input.address, INPUT_LIMITS.address)) errors.address = "tooLong";
  if (tooLong(input.zip, INPUT_LIMITS.zip)) errors.zip = "tooLong";

  const website = input.website?.trim();
  if (website && !isValidWebsite(website)) errors.website = "invalid";

  if (tooLong(input.phone, INPUT_LIMITS.phone)) errors.phone = "tooLong";

  const email = input.email?.trim();
  if (email && !isValidEmail(email)) errors.email = "invalid";

  if (input.openingHours && !isValidHours(input.openingHours))
    errors.openingHours = "invalid";

  const offerings = input.offerings ?? [];
  if (offerings.length > INPUT_LIMITS.maxOfferings)
    errors.offerings = "tooMany";
  else {
    for (const [index, offering] of offerings.entries()) {
      const offeringName = offering.nameSr.trim();
      if (!offeringName) {
        errors[`offerings.${index}.nameSr`] = "required";
      } else if (offeringName.length > INPUT_LIMITS.offeringName) {
        errors[`offerings.${index}.nameSr`] = "tooLong";
      }
      if (tooLong(offering.nameDe, INPUT_LIMITS.offeringName))
        errors[`offerings.${index}.nameDe`] = "tooLong";
      if (tooLong(offering.descriptionSr, INPUT_LIMITS.offeringDescription))
        errors[`offerings.${index}.descriptionSr`] = "tooLong";
      if (tooLong(offering.descriptionDe, INPUT_LIMITS.offeringDescription))
        errors[`offerings.${index}.descriptionDe`] = "tooLong";
      if (offering.type !== "product" && offering.type !== "service")
        errors[`offerings.${index}.type`] = "invalid";
    }
  }

  if ((input.galleryCount ?? 0) > INPUT_LIMITS.maxGallery)
    errors.gallery = "tooMany";

  if (input.discountPercent !== undefined) {
    const percent = input.discountPercent;
    if (
      !Number.isFinite(percent) ||
      !Number.isInteger(percent) ||
      percent < INPUT_LIMITS.discountMin ||
      percent > INPUT_LIMITS.discountMax
    ) {
      errors.discountPercent = "invalid";
    }
  }
  if (tooLong(input.discountTermsSr, INPUT_LIMITS.discountTerms))
    errors.discountTermsSr = "tooLong";
  if (tooLong(input.discountTermsDe, INPUT_LIMITS.discountTerms))
    errors.discountTermsDe = "tooLong";

  return errors;
}

/** Validates the person filing the submission (wizard step 5). */
export function validateSubmitter(input: SubmitterInput): FieldErrors {
  const errors: FieldErrors = {};

  const submitterName = input.submitterName.trim();
  if (!submitterName) errors.submitterName = "required";
  else if (submitterName.length > INPUT_LIMITS.submitterName)
    errors.submitterName = "tooLong";

  const submitterEmail = input.submitterEmail.trim();
  if (!submitterEmail) errors.submitterEmail = "required";
  else if (!isValidEmail(submitterEmail)) errors.submitterEmail = "invalid";

  if (tooLong(input.submitterPhone, INPUT_LIMITS.phone))
    errors.submitterPhone = "tooLong";
  if (tooLong(input.submitterRole, INPUT_LIMITS.submitterRole))
    errors.submitterRole = "tooLong";

  if (!input.consent) errors.consent = "required";

  return errors;
}

/** Full submission check — what the mutation runs before touching the DB. */
export function validateSubmission(
  input: CompanyInput & SubmitterInput,
): FieldErrors {
  return { ...validateCompany(input), ...validateSubmitter(input) };
}

export function hasErrors(errors: FieldErrors): boolean {
  return Object.keys(errors).length > 0;
}

/** Collapses "" to undefined so optional Convex fields stay absent, not empty. */
export function trimmedOrUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

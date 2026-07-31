/**
 * Shared types for the public "add your company" wizard.
 *
 * `WizardStrings` is derived from the Serbian dictionary with an `import type`,
 * which TypeScript erases at compile time — no dictionary JSON reaches the
 * client bundle (the rule in AGENTS.md is about VALUE imports). Deriving it
 * instead of hand-writing a string bag means a renamed key breaks the build
 * here too, not just in de.json.
 */
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { CountryCode } from "@/convex/lib/constants";

export type WizardStrings = Dictionary["addCompany"]["form"] & {
  /** Pulled from shared sections so the island stays a single prop. */
  countries: Record<CountryCode, string>;
  days: readonly string[];
  privacyHref: string;
  contactEmail: string;
  backHome: string;
  backHomeHref: string;
};

export type WizardCategory = { slug: string; name: string; icon: string };

export type OfferingDraft = {
  id: string;
  type: "product" | "service";
  nameSr: string;
  descriptionSr: string;
};

export type HourRowDraft = { enabled: boolean; open: string; close: string };

/** Everything that survives a page reload (images cannot be serialized). */
export type FormState = {
  name: string;
  categorySlugs: string[];
  descriptionSr: string;
  descriptionDe: string;
  country: CountryCode;
  city: string;
  address: string;
  zip: string;
  website: string;
  phone: string;
  email: string;
  hours: HourRowDraft[];
  offerings: OfferingDraft[];
  discountEnabled: boolean;
  discountPercent: string;
  discountTermsSr: string;
  submitterName: string;
  submitterEmail: string;
  submitterPhone: string;
  submitterRole: string;
  consent: boolean;
  /**
   * UI-only: true when this state came back from localStorage, so the wizard
   * can show the "you're continuing where you left off" banner. Kept inside the
   * reducer (and stripped before persisting) so restoring a draft is ONE state
   * transition instead of a dispatch plus a setState inside an effect.
   */
  restoredFromDraft: boolean;
};

export type PickedImage = {
  file: File;
  previewUrl: string;
  width: number;
  height: number;
};

export type WizardImages = {
  logo: PickedImage | null;
  cover: PickedImage | null;
  gallery: PickedImage[];
};

export const STEP_KEYS = [
  "basics",
  "location",
  "contact",
  "offer",
  "submitter",
  "review",
] as const;

export type StepKey = (typeof STEP_KEYS)[number];

/**
 * Which error keys belong to which step. Used both to show only the relevant
 * errors while stepping and to jump back to the offending step from review.
 */
export const STEP_FIELDS: Record<StepKey, (key: string) => boolean> = {
  basics: (key) =>
    ["name", "categorySlugs", "descriptionSr", "descriptionDe"].includes(key),
  location: (key) => ["country", "city", "address", "zip"].includes(key),
  contact: (key) =>
    ["website", "phone", "email", "openingHours"].includes(key),
  offer: (key) =>
    key.startsWith("offerings") ||
    ["gallery", "discountPercent", "discountTermsSr", "discountTermsDe"].includes(
      key,
    ),
  submitter: (key) =>
    [
      "submitterName",
      "submitterEmail",
      "submitterPhone",
      "submitterRole",
      "consent",
    ].includes(key),
  review: () => true,
};

/** Steps the user may jump past without filling anything in. */
export const OPTIONAL_STEPS: ReadonlySet<StepKey> = new Set([
  "contact",
  "offer",
]);

export const DEFAULT_HOURS: HourRowDraft[] = Array.from(
  { length: 7 },
  (_, day) => ({
    enabled: day < 5, // Mon–Fri open by default; the days array is Monday-first.
    open: "09:00",
    close: "17:00",
  }),
);

export function emptyFormState(): FormState {
  return {
    name: "",
    categorySlugs: [],
    descriptionSr: "",
    descriptionDe: "",
    country: "AT",
    city: "",
    address: "",
    zip: "",
    website: "",
    phone: "",
    email: "",
    hours: DEFAULT_HOURS.map((row) => ({ ...row })),
    offerings: [],
    discountEnabled: false,
    discountPercent: "10",
    discountTermsSr: "",
    submitterName: "",
    submitterEmail: "",
    submitterPhone: "",
    submitterRole: "",
    consent: false,
    restoredFromDraft: false,
  };
}

/** Stable DOM id per error key so focus management needs no lookup table. */
export function fieldId(key: string): string {
  return `acw-${key.replaceAll(".", "-")}`;
}

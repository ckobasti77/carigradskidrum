import { v } from "convex/values";

export const countryValidator = v.union(
  v.literal("AT"),
  v.literal("RS"),
  v.literal("HR"),
  v.literal("BA"),
);

export const localeValidator = v.union(v.literal("sr"), v.literal("de"));

export const companyStatusValidator = v.union(
  v.literal("draft"),
  v.literal("pending"),
  v.literal("published"),
  v.literal("suspended"),
);

export const tierValidator = v.union(v.literal("free"), v.literal("paid"));

export const offeringTypeValidator = v.union(
  v.literal("product"),
  v.literal("service"),
);

export const mediaKindValidator = v.union(
  v.literal("cover"),
  v.literal("logo"),
  v.literal("gallery"),
);

export const openingHoursValidator = v.array(
  v.object({
    day: v.number(), // 0 = Monday … 6 = Sunday
    open: v.string(), // "08:00"
    close: v.string(), // "16:30"
  }),
);

export const planValidator = v.union(
  v.literal("yearly_365"),
  v.literal("monthly_45"),
);

export const subscriptionStatusValidator = v.union(
  v.literal("active"),
  v.literal("past_due"),
  v.literal("canceled"),
  v.literal("expired"),
);

export const revisionLocationValidator = v.object({
  country: countryValidator,
  city: v.string(),
  address: v.optional(v.string()),
  zip: v.optional(v.string()),
  lat: v.optional(v.number()),
  lng: v.optional(v.number()),
  isPrimary: v.boolean(),
});

export const revisionOfferingValidator = v.object({
  type: offeringTypeValidator,
  nameSr: v.string(),
  nameDe: v.optional(v.string()),
  descriptionSr: v.optional(v.string()),
  descriptionDe: v.optional(v.string()),
  order: v.number(),
});

export const revisionMediaValidator = v.object({
  storageId: v.id("_storage"),
  kind: mediaKindValidator,
  width: v.number(),
  height: v.number(),
  alt: v.optional(v.string()),
  order: v.number(),
});

/** Full owner-editable payload of a published-company revision (plan §3.1). */
export const revisionPayloadValidator = v.object({
  name: v.string(),
  descriptionSr: v.optional(v.string()),
  descriptionDe: v.optional(v.string()),
  website: v.optional(v.string()),
  phone: v.optional(v.string()),
  email: v.optional(v.string()),
  openingHours: v.optional(openingHoursValidator),
  categoryIds: v.array(v.id("categories")),
  locations: v.array(revisionLocationValidator),
  offerings: v.array(revisionOfferingValidator),
  media: v.array(revisionMediaValidator),
  discountOffer: v.optional(
    v.object({
      percent: v.number(),
      termsSr: v.optional(v.string()),
      termsDe: v.optional(v.string()),
      active: v.boolean(),
    }),
  ),
});

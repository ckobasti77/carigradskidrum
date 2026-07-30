import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  companyStatusValidator,
  countryValidator,
  localeValidator,
  mediaKindValidator,
  offeringTypeValidator,
  openingHoursValidator,
  planValidator,
  revisionPayloadValidator,
  subscriptionStatusValidator,
  tierValidator,
} from "./lib/validators";

/**
 * Full v1 schema up front (plan §3.1) so later milestones add functions,
 * not schema migrations.
 *
 * M2 note: when @convex-dev/auth lands, spread `...authTables` ABOVE the
 * `users` key — our `users` below already matches the library contract
 * (base fields optional, index named exactly "email") and extends it with
 * role/locale, so the override is safe.
 *
 * "Unclaimed" is DERIVED (status === "published" && !ownerId), never a
 * status literal.
 */
export default defineSchema({
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    role: v.optional(v.union(v.literal("owner"), v.literal("admin"))),
    locale: v.optional(localeValidator),
  }).index("email", ["email"]),

  companies: defineTable({
    slug: v.string(),
    name: v.string(), // proper noun — not localized
    status: companyStatusValidator,
    ownerId: v.optional(v.id("users")),
    descriptionSr: v.optional(v.string()),
    descriptionDe: v.optional(v.string()),
    website: v.optional(v.string()),
    phone: v.optional(v.string()), // display gated by tier
    email: v.optional(v.string()), // display gated by tier; inquiry relay target
    openingHours: v.optional(openingHoursValidator),
    coverMediaId: v.optional(v.id("media")),
    logoMediaId: v.optional(v.id("media")),
    categoryIds: v.array(v.id("categories")),
    countries: v.array(countryValidator), // denorm from locations
    primaryCountry: countryValidator, // denorm from primary location
    primaryCity: v.string(),
    primaryCitySlug: v.string(), // foldToSlug(primaryCity)
    acceptsCard: v.boolean(), // denorm from discountOffers
    discountPercent: v.optional(v.number()), // denorm (card display)
    discountLegacy: v.optional(v.boolean()), // denorm (grandfathered badge rule)
    tier: tierValidator, // written ONLY by applySubscriptionState + janitor
    paidUntil: v.optional(v.number()),
    featured: v.boolean(),
    searchTextSr: v.string(), // folded — see lib/fold.ts
    searchTextDe: v.string(),
    wpId: v.optional(v.number()), // legacy WP post id (migration idempotency)
    submittedAt: v.optional(v.number()),
    publishedAt: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_status", ["status"])
    .index("by_owner", ["ownerId"])
    .index("by_wpId", ["wpId"])
    .searchIndex("search_sr", {
      searchField: "searchTextSr",
      filterFields: [
        "status",
        "tier",
        "acceptsCard",
        "primaryCountry",
        "primaryCitySlug",
      ],
    })
    .searchIndex("search_de", {
      searchField: "searchTextDe",
      filterFields: [
        "status",
        "tier",
        "acceptsCard",
        "primaryCountry",
        "primaryCitySlug",
      ],
    }),

  categories: defineTable({
    slug: v.string(),
    nameSr: v.string(),
    nameDe: v.string(),
    descriptionSr: v.optional(v.string()), // SEO intro for the landing page
    descriptionDe: v.optional(v.string()),
    icon: v.string(), // lucide icon name
    order: v.number(),
    parentId: v.optional(v.id("categories")), // reserved (v1 is flat)
  }).index("by_slug", ["slug"]),

  locations: defineTable({
    companyId: v.id("companies"),
    country: countryValidator,
    city: v.string(),
    address: v.optional(v.string()),
    zip: v.optional(v.string()),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
    isPrimary: v.boolean(),
  }).index("by_company", ["companyId"]),

  offerings: defineTable({
    companyId: v.id("companies"),
    type: offeringTypeValidator,
    nameSr: v.string(),
    nameDe: v.optional(v.string()),
    descriptionSr: v.optional(v.string()),
    descriptionDe: v.optional(v.string()),
    order: v.number(),
  }).index("by_company", ["companyId"]),

  media: defineTable({
    companyId: v.id("companies"),
    storageId: v.id("_storage"),
    kind: mediaKindValidator,
    width: v.number(),
    height: v.number(),
    alt: v.optional(v.string()),
    order: v.number(),
  }).index("by_company", ["companyId"]),

  discountOffers: defineTable({
    companyId: v.id("companies"),
    percent: v.number(),
    termsSr: v.optional(v.string()),
    termsDe: v.optional(v.string()),
    active: v.boolean(),
    legacy: v.boolean(), // migrated partner — badge grandfathered until claimed
  }).index("by_company", ["companyId"]),

  subscriptions: defineTable({
    companyId: v.id("companies"),
    provider: v.union(v.literal("stripe"), v.literal("manual")),
    plan: planValidator,
    status: subscriptionStatusValidator,
    periodStart: v.number(),
    periodEnd: v.number(),
    cancelAtPeriodEnd: v.optional(v.boolean()),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    reminderJobId: v.optional(v.id("_scheduled_functions")),
    note: v.optional(v.string()),
  })
    .index("by_company", ["companyId"])
    .index("by_periodEnd", ["periodEnd"])
    .index("by_stripeSubscription", ["stripeSubscriptionId"])
    .index("by_stripeCustomer", ["stripeCustomerId"]),

  claims: defineTable({
    companyId: v.id("companies"),
    userId: v.id("users"),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
    ),
    message: v.optional(v.string()),
    emailDomainMatch: v.boolean(),
    resolvedBy: v.optional(v.id("users")),
    resolvedAt: v.optional(v.number()),
    rejectReason: v.optional(v.string()),
  })
    .index("by_company", ["companyId"])
    .index("by_user", ["userId"])
    .index("by_status", ["status"]),

  companyRevisions: defineTable({
    companyId: v.id("companies"),
    payload: revisionPayloadValidator,
    status: v.union(
      v.literal("draft"),
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
    ),
    submittedAt: v.optional(v.number()),
    reviewedBy: v.optional(v.id("users")),
    reviewedAt: v.optional(v.number()),
    rejectReason: v.optional(v.string()),
  })
    .index("by_company_status", ["companyId", "status"])
    .index("by_status", ["status"]),

  inquiries: defineTable({
    companyId: v.id("companies"),
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    message: v.string(),
    locale: localeValidator,
    status: v.union(v.literal("new"), v.literal("read")),
  }).index("by_company", ["companyId"]),

  stripeEvents: defineTable({
    eventId: v.string(),
    type: v.string(),
  }).index("by_eventId", ["eventId"]),
});

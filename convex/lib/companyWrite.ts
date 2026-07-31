/**
 * The single place where a company's derived columns are rebuilt.
 *
 * AGENTS.md: "Any write touching name/description/categories/locations MUST
 * recompute searchTextSr/De". Rather than trusting every call site to remember,
 * every admin mutation ends with `recomputeCompanyDerived` — it rebuilds the
 * search columns AND the country/city/discount denormalizations from the rows
 * that actually exist, so the derived state can never drift from the source.
 */

import type { MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import type { CountryCode } from "./constants";
import { computeSearchTexts } from "./searchText";
import { foldToSlug } from "./fold";

const LOCATION_SCAN = 20;
const OFFER_SCAN = 10;
const MEDIA_SCAN = 40;

export async function recomputeCompanyDerived(
  ctx: MutationCtx,
  companyId: Id<"companies">,
): Promise<void> {
  const company = await ctx.db.get("companies", companyId);
  if (!company) return;

  const categories: Doc<"categories">[] = [];
  for (const categoryId of company.categoryIds) {
    const category = await ctx.db.get("categories", categoryId);
    if (category) categories.push(category);
  }

  const locations = await ctx.db
    .query("locations")
    .withIndex("by_company", (q) => q.eq("companyId", companyId))
    .take(LOCATION_SCAN);

  const primary = locations.find((l) => l.isPrimary) ?? locations[0];
  const cities = [...new Set(locations.map((l) => l.city))];
  const countries = [
    ...new Set(locations.map((l) => l.country)),
  ] as CountryCode[];

  const offers = await ctx.db
    .query("discountOffers")
    .withIndex("by_company", (q) => q.eq("companyId", companyId))
    .take(OFFER_SCAN);
  const activeOffer = offers.find((o) => o.active) ?? null;

  const searchTexts = computeSearchTexts({
    name: company.name,
    descriptionSr: company.descriptionSr,
    descriptionDe: company.descriptionDe,
    categories,
    cities: cities.length > 0 ? cities : [company.primaryCity],
    countries: countries.length > 0 ? countries : [company.primaryCountry],
  });

  await ctx.db.patch("companies", companyId, {
    ...searchTexts,
    countries: countries.length > 0 ? countries : company.countries,
    primaryCountry: primary?.country ?? company.primaryCountry,
    primaryCity: primary?.city ?? company.primaryCity,
    primaryCitySlug: primary
      ? foldToSlug(primary.city)
      : company.primaryCitySlug,
    acceptsCard: activeOffer !== null,
    discountPercent: activeOffer?.percent,
    discountLegacy: activeOffer?.legacy ? true : undefined,
    updatedAt: Date.now(),
  });
}

/**
 * Full cascade delete. Convex storage has no GC, so every media row's blob is
 * removed explicitly — skipping that leaks bytes forever (AGENTS.md).
 */
export async function deleteCompanyCascade(
  ctx: MutationCtx,
  companyId: Id<"companies">,
): Promise<void> {
  const media = await ctx.db
    .query("media")
    .withIndex("by_company", (q) => q.eq("companyId", companyId))
    .take(MEDIA_SCAN);
  for (const item of media) {
    await ctx.storage.delete(item.storageId);
    await ctx.db.delete("media", item._id);
  }

  const locations = await ctx.db
    .query("locations")
    .withIndex("by_company", (q) => q.eq("companyId", companyId))
    .take(LOCATION_SCAN);
  for (const location of locations) {
    await ctx.db.delete("locations", location._id);
  }

  const offerings = await ctx.db
    .query("offerings")
    .withIndex("by_company", (q) => q.eq("companyId", companyId))
    .take(600);
  for (const offering of offerings) {
    await ctx.db.delete("offerings", offering._id);
  }

  const offers = await ctx.db
    .query("discountOffers")
    .withIndex("by_company", (q) => q.eq("companyId", companyId))
    .take(OFFER_SCAN);
  for (const offer of offers) {
    await ctx.db.delete("discountOffers", offer._id);
  }

  const inquiries = await ctx.db
    .query("inquiries")
    .withIndex("by_company", (q) => q.eq("companyId", companyId))
    .take(500);
  for (const inquiry of inquiries) {
    await ctx.db.delete("inquiries", inquiry._id);
  }

  const subscriptions = await ctx.db
    .query("subscriptions")
    .withIndex("by_company", (q) => q.eq("companyId", companyId))
    .take(50);
  for (const subscription of subscriptions) {
    await ctx.db.delete("subscriptions", subscription._id);
  }

  const payments = await ctx.db
    .query("payments")
    .withIndex("by_company", (q) => q.eq("companyId", companyId))
    .take(500);
  for (const payment of payments) {
    await ctx.db.delete("payments", payment._id);
  }

  // Submissions are kept as history (audit trail), but a pointer to a company
  // that no longer exists would render dead links in the admin panel.
  const submissions = await ctx.db
    .query("companySubmissions")
    .withIndex("by_company", (q) => q.eq("companyId", companyId))
    .take(50);
  for (const submission of submissions) {
    await ctx.db.patch("companySubmissions", submission._id, {
      companyId: undefined,
    });
  }

  await ctx.db.delete("companies", companyId);
}

/** Deletes every storage blob a submission uploaded (reject / spam paths). */
export async function deleteSubmissionMedia(
  ctx: MutationCtx,
  media: Array<{ storageId: Id<"_storage"> }>,
): Promise<void> {
  for (const item of media) {
    // A blob may already be gone if the janitor swept it — never let that throw.
    try {
      await ctx.storage.delete(item.storageId);
    } catch {
      // Already deleted; nothing to reclaim.
    }
  }
}

import { query } from "./_generated/server";
import { v } from "convex/values";
import { localeValidator } from "./lib/validators";
import { DIRECTORY_SCAN_CAP } from "./lib/constants";
import {
  canShowDiscountBadge,
  effectiveTier,
  ENTITLEMENTS,
} from "./lib/entitlements";
import {
  loadCategoryNameMap,
  toCompanyCard,
  type CompanyCard,
} from "./lib/cards";

/**
 * Full public profile for /firma/[slug]. Applies display entitlements
 * server-side: free tier hides contact, hours, offerings and the gallery;
 * migrated (legacy) discount badges stay visible until the company is claimed.
 */
export const bySlug = query({
  args: { slug: v.string(), locale: localeValidator, now: v.number() },
  handler: async (ctx, args) => {
    const company = await ctx.db
      .query("companies")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (!company || company.status !== "published") return null;

    const tier = effectiveTier(company, args.now);
    const ent = ENTITLEMENTS[tier];

    const locations = await ctx.db
      .query("locations")
      .withIndex("by_company", (q) => q.eq("companyId", company._id))
      .take(20);

    const offer = await ctx.db
      .query("discountOffers")
      .withIndex("by_company", (q) => q.eq("companyId", company._id))
      .take(5);
    const activeOffer = offer.find((o) => o.active) ?? null;
    const badgeVisible = canShowDiscountBadge(
      tier,
      activeOffer ? { active: true, legacy: activeOffer.legacy } : null,
    );

    const allMedia = await ctx.db
      .query("media")
      .withIndex("by_company", (q) => q.eq("companyId", company._id))
      .take(30);
    allMedia.sort((a, b) => a.order - b.order);

    async function mediaOut(mediaDoc: (typeof allMedia)[number]) {
      return {
        url: await ctx.storage.getUrl(mediaDoc.storageId),
        width: mediaDoc.width,
        height: mediaDoc.height,
        alt: mediaDoc.alt ?? null,
      };
    }

    const coverDoc =
      allMedia.find((m) => m._id === company.coverMediaId) ??
      allMedia.find((m) => m.kind === "cover") ??
      null;
    const logoDoc =
      allMedia.find((m) => m._id === company.logoMediaId) ??
      allMedia.find((m) => m.kind === "logo") ??
      null;

    // Cover occupies the free tier's single visible image slot.
    const galleryBudget = Math.max(0, ent.maxVisibleGalleryImages - 1);
    const galleryDocs = allMedia
      .filter((m) => m.kind === "gallery")
      .slice(0, galleryBudget);

    const offerings = ent.maxVisibleOfferings
      ? (
          await ctx.db
            .query("offerings")
            .withIndex("by_company", (q) => q.eq("companyId", company._id))
            .take(ent.maxVisibleOfferings)
        ).sort((a, b) => a.order - b.order)
      : [];

    const categories = await ctx.db.query("categories").take(100);
    const companyCategories = categories
      .filter((c) => company.categoryIds.includes(c._id))
      .sort((a, b) => a.order - b.order)
      .map((c) => ({
        slug: c.slug,
        name: args.locale === "de" ? c.nameDe : c.nameSr,
      }));

    // Similar: same primary category, published, exclude self, paid-first.
    const primaryCategoryId = company.categoryIds[0];
    const similar: CompanyCard[] = [];
    if (primaryCategoryId) {
      const published = await ctx.db
        .query("companies")
        .withIndex("by_status", (q) => q.eq("status", "published"))
        .take(DIRECTORY_SCAN_CAP);
      const tierRank = (c: (typeof published)[number]) =>
        effectiveTier(c, args.now) === "paid" ? 1 : 0;
      const candidates = published
        .filter(
          (c) =>
            c._id !== company._id && c.categoryIds.includes(primaryCategoryId),
        )
        .sort(
          (a, b) =>
            tierRank(b) - tierRank(a) || b._creationTime - a._creationTime,
        )
        .slice(0, 5);
      const nameById = await loadCategoryNameMap(ctx, args.locale);
      for (const candidate of candidates) {
        similar.push(await toCompanyCard(ctx, candidate, nameById, args.now));
      }
    }

    const description =
      args.locale === "de"
        ? (company.descriptionDe ?? company.descriptionSr ?? null)
        : (company.descriptionSr ?? company.descriptionDe ?? null);

    return {
      id: company._id,
      slug: company.slug,
      name: company.name,
      description,
      website: ent.showWebsite ? (company.website ?? null) : null,
      phone: ent.showContact ? (company.phone ?? null) : null,
      email: ent.showContact ? (company.email ?? null) : null,
      openingHours: ent.showHours ? (company.openingHours ?? null) : null,
      categories: companyCategories,
      countries: company.countries,
      city: company.primaryCity,
      cover: coverDoc ? await mediaOut(coverDoc) : null,
      logo: logoDoc ? await mediaOut(logoDoc) : null,
      gallery: await Promise.all(galleryDocs.map(mediaOut)),
      offerings: offerings.map((o) => ({
        type: o.type,
        name: args.locale === "de" ? (o.nameDe ?? o.nameSr) : o.nameSr,
        description:
          args.locale === "de"
            ? (o.descriptionDe ?? o.descriptionSr ?? null)
            : (o.descriptionSr ?? null),
      })),
      locations: locations.map((l) => ({
        country: l.country,
        city: l.city,
        address: l.address ?? null,
        zip: l.zip ?? null,
        lat: l.lat ?? null,
        lng: l.lng ?? null,
        isPrimary: l.isPrimary,
      })),
      discountPercent: badgeVisible ? (activeOffer?.percent ?? null) : null,
      isPaid: tier === "paid",
      claimable: company.ownerId === undefined,
      updatedAt: company.updatedAt,
      similar,
    };
  },
});

/** All published slugs — sitemap + generateStaticParams source. */
export const publishedSlugs = query({
  args: {},
  handler: async (ctx) => {
    const published = await ctx.db
      .query("companies")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .take(DIRECTORY_SCAN_CAP);
    return published.map((c) => ({ slug: c.slug, updatedAt: c.updatedAt }));
  },
});

/** Country codes that have at least one published company (zemlja pages GSP). */
export const countriesWithCompanies = query({
  args: {},
  handler: async (ctx) => {
    const published = await ctx.db
      .query("companies")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .take(DIRECTORY_SCAN_CAP);
    const codes = new Set<string>();
    for (const company of published) {
      for (const country of company.countries) codes.add(country);
    }
    return [...codes].sort();
  },
});

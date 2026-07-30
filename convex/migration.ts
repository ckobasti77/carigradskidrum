import { action, internalMutation, internalQuery } from "./_generated/server";
import { deploymentEnv } from "./lib/env";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { countryValidator } from "./lib/validators";
import { computeSearchTexts } from "./lib/searchText";
import { foldToSlug } from "./lib/fold";

const importItemValidator = v.object({
  wpId: v.number(),
  slug: v.string(),
  name: v.string(),
  categorySlugs: v.array(v.string()),
  country: countryValidator,
  city: v.string(),
  address: v.optional(v.string()),
  zip: v.optional(v.string()),
  lat: v.optional(v.number()),
  lng: v.optional(v.number()),
  website: v.optional(v.string()),
  discountPercent: v.optional(v.number()),
  coverImage: v.optional(
    v.object({ url: v.string(), width: v.number(), height: v.number() }),
  ),
});

const coverValidator = v.object({
  storageId: v.id("_storage"),
  width: v.number(),
  height: v.number(),
});

/**
 * WP migration entry point, called by scripts/migrate-wp.ts in batches of 10.
 * Public action guarded by MIGRATION_SECRET (Convex env). Idempotent via wpId:
 * re-runs upsert; cover images are only fetched when the company has none yet
 * (so a re-run never duplicates storage files).
 */
export const importCompanies = action({
  args: { secret: v.string(), companies: v.array(importItemValidator) },
  handler: async (ctx, args) => {
    const expected = deploymentEnv.MIGRATION_SECRET;
    if (!expected) throw new Error("MIGRATION_SECRET is not configured");
    if (args.secret !== expected) throw new Error("Invalid migration secret");

    const results: Array<{
      wpId: number;
      slug: string;
      action: "inserted" | "updated";
      warnings: string[];
    }> = [];

    for (const item of args.companies) {
      const warnings: string[] = [];
      const existing: { hasCover: boolean } | null = await ctx.runQuery(
        internal.migration.getByWpId,
        { wpId: item.wpId },
      );

      let cover: { storageId: string; width: number; height: number } | undefined;
      if (item.coverImage && !existing?.hasCover) {
        try {
          const response = await fetch(item.coverImage.url);
          if (!response.ok) {
            warnings.push(
              `cover fetch failed (${response.status}): ${item.coverImage.url}`,
            );
          } else {
            const blob = await response.blob();
            const storageId = await ctx.storage.store(blob);
            cover = {
              storageId,
              width: item.coverImage.width,
              height: item.coverImage.height,
            };
          }
        } catch (error) {
          warnings.push(`cover fetch error: ${String(error)}`);
        }
      }

      const out: { slug: string; action: "inserted" | "updated" } =
        await ctx.runMutation(internal.migration.upsertFromWp, {
          item,
          cover: cover as never,
        });
      results.push({ wpId: item.wpId, slug: out.slug, action: out.action, warnings });
    }

    return { count: results.length, results };
  },
});

export const getByWpId = internalQuery({
  args: { wpId: v.number() },
  handler: async (ctx, args) => {
    const company = await ctx.db
      .query("companies")
      .withIndex("by_wpId", (q) => q.eq("wpId", args.wpId))
      .unique();
    if (!company) return null;
    return { hasCover: company.coverMediaId !== undefined };
  },
});

export const upsertFromWp = internalMutation({
  args: { item: importItemValidator, cover: v.optional(coverValidator) },
  handler: async (ctx, args) => {
    const { item } = args;

    // Resolve categories — an unmapped slug is a HARD FAIL (plan M1 rule):
    // the curated map must be complete, silent drops are forbidden.
    const categories: Doc<"categories">[] = [];
    for (const slug of item.categorySlugs) {
      const category = await ctx.db
        .query("categories")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .unique();
      if (!category) {
        throw new Error(
          `Unmapped category slug "${slug}" (wpId ${item.wpId}, ${item.name})`,
        );
      }
      categories.push(category);
    }
    if (categories.length === 0) {
      throw new Error(`No categories for wpId ${item.wpId} (${item.name})`);
    }

    const searchTexts = computeSearchTexts({
      name: item.name,
      categories,
      cities: [item.city],
      countries: [item.country],
    });

    const existing = await ctx.db
      .query("companies")
      .withIndex("by_wpId", (q) => q.eq("wpId", item.wpId))
      .unique();

    const slugOwner = await ctx.db
      .query("companies")
      .withIndex("by_slug", (q) => q.eq("slug", item.slug))
      .unique();
    if (slugOwner && slugOwner.wpId !== item.wpId) {
      throw new Error(
        `Slug collision: "${item.slug}" already used by wpId ${slugOwner.wpId}`,
      );
    }

    const now = Date.now();
    const fields = {
      slug: item.slug,
      name: item.name,
      status: "published" as const,
      categoryIds: categories.map((c) => c._id),
      countries: [item.country],
      primaryCountry: item.country,
      primaryCity: item.city,
      primaryCitySlug: foldToSlug(item.city),
      acceptsCard: item.discountPercent !== undefined,
      discountPercent: item.discountPercent,
      discountLegacy: item.discountPercent !== undefined ? true : undefined,
      website: item.website,
      tier: "free" as const,
      featured: false,
      searchTextSr: searchTexts.searchTextSr,
      searchTextDe: searchTexts.searchTextDe,
      wpId: item.wpId,
      updatedAt: now,
    };

    let companyId;
    let actionTaken: "inserted" | "updated";
    if (existing) {
      await ctx.db.patch("companies", existing._id, fields);
      companyId = existing._id;
      actionTaken = "updated";
    } else {
      companyId = await ctx.db.insert("companies", {
        ...fields,
        publishedAt: now,
      });
      actionTaken = "inserted";
    }

    // Replace-semantics for the single WP location.
    const oldLocations = await ctx.db
      .query("locations")
      .withIndex("by_company", (q) => q.eq("companyId", companyId))
      .take(20);
    for (const location of oldLocations) {
      await ctx.db.delete("locations", location._id);
    }
    await ctx.db.insert("locations", {
      companyId,
      country: item.country,
      city: item.city,
      address: item.address,
      zip: item.zip,
      lat: item.lat,
      lng: item.lng,
      isPrimary: true,
    });

    // Replace-semantics for the (legacy) discount offer.
    const oldOffers = await ctx.db
      .query("discountOffers")
      .withIndex("by_company", (q) => q.eq("companyId", companyId))
      .take(5);
    for (const offer of oldOffers) {
      await ctx.db.delete("discountOffers", offer._id);
    }
    if (item.discountPercent !== undefined) {
      await ctx.db.insert("discountOffers", {
        companyId,
        percent: item.discountPercent,
        active: true,
        legacy: true,
      });
    }

    // Cover media (only when the action fetched a new image).
    if (args.cover) {
      const oldMedia = await ctx.db
        .query("media")
        .withIndex("by_company", (q) => q.eq("companyId", companyId))
        .take(30);
      for (const media of oldMedia.filter((m) => m.kind === "cover")) {
        await ctx.storage.delete(media.storageId);
        await ctx.db.delete("media", media._id);
      }
      const mediaId = await ctx.db.insert("media", {
        companyId,
        storageId: args.cover.storageId,
        kind: "cover",
        width: args.cover.width,
        height: args.cover.height,
        order: 0,
      });
      await ctx.db.patch("companies", companyId, { coverMediaId: mediaId });
    }

    return { slug: item.slug, action: actionTaken };
  },
});

import { query } from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { countryValidator, localeValidator } from "./lib/validators";
import { foldBasic } from "./lib/fold";
import {
  DIRECTORY_RESULT_CAP,
  DIRECTORY_SCAN_CAP,
  SEARCH_TAKE,
} from "./lib/constants";
import { canShowDiscountBadge, effectiveTier } from "./lib/entitlements";
import {
  denormalizedOffer,
  loadCategoryNameMap,
  toCompanyCard,
  type CompanyCard,
} from "./lib/cards";

const listArgs = {
  locale: localeValidator,
  q: v.optional(v.string()),
  categorySlug: v.optional(v.string()),
  country: v.optional(countryValidator),
  citySlug: v.optional(v.string()),
  acceptsCard: v.optional(v.boolean()),
  sort: v.optional(v.union(v.literal("recommended"), v.literal("newest"))),
  // Wall-clock is passed in (never read in queries); callers round to the hour
  // for cache stability. Used only for the 14-day-grace tier predicate.
  now: v.number(),
};

/**
 * Directory list — plan §2.5 model: no .paginate(); one bounded indexed scan
 * (or search read) + in-handler filters, capped at DIRECTORY_RESULT_CAP.
 * The client slices pages of 24 locally ("Prikaži još").
 * Documented ceiling ~1000 published companies; revisit at 2000.
 */
export const list = query({
  args: listArgs,
  handler: async (ctx, args) => {
    const term = args.q ? foldBasic(args.q) : "";
    let matches: Doc<"companies">[];

    if (term) {
      // Search branch — explicit per-locale index (typed literal, no string concat).
      matches =
        args.locale === "de"
          ? await ctx.db
              .query("companies")
              .withSearchIndex("search_de", (q) => {
                let expr = q
                  .search("searchTextDe", term)
                  .eq("status", "published");
                if (args.country) expr = expr.eq("primaryCountry", args.country);
                if (args.citySlug) expr = expr.eq("primaryCitySlug", args.citySlug);
                if (args.acceptsCard) expr = expr.eq("acceptsCard", true);
                return expr;
              })
              .take(SEARCH_TAKE)
          : await ctx.db
              .query("companies")
              .withSearchIndex("search_sr", (q) => {
                let expr = q
                  .search("searchTextSr", term)
                  .eq("status", "published");
                if (args.country) expr = expr.eq("primaryCountry", args.country);
                if (args.citySlug) expr = expr.eq("primaryCitySlug", args.citySlug);
                if (args.acceptsCard) expr = expr.eq("acceptsCard", true);
                return expr;
              })
              .take(SEARCH_TAKE);
      // BM25 relevance order is preserved — no re-sort in the search branch.
    } else {
      // Browse branch — bounded published scan, then in-handler facet filters.
      matches = await ctx.db
        .query("companies")
        .withIndex("by_status", (q) => q.eq("status", "published"))
        .take(DIRECTORY_SCAN_CAP);

      if (args.country) {
        matches = matches.filter((c) => c.countries.includes(args.country!));
      }
      if (args.citySlug) {
        matches = matches.filter((c) => c.primaryCitySlug === args.citySlug);
      }

      const tierRank = (c: Doc<"companies">) =>
        effectiveTier(c, args.now) === "paid" ? 1 : 0;
      matches = [...matches].sort((a, b) =>
        args.sort === "newest"
          ? b._creationTime - a._creationTime
          : tierRank(b) - tierRank(a) || b._creationTime - a._creationTime,
      );
    }

    // Category filter (search branch: documented in-handler exception —
    // categoryIds is an array and cannot be a search filterField).
    if (args.categorySlug) {
      const category = await ctx.db
        .query("categories")
        .withIndex("by_slug", (q) => q.eq("slug", args.categorySlug!))
        .unique();
      matches = category
        ? matches.filter((c) => c.categoryIds.includes(category._id))
        : [];
    }

    // "Accepts card" means the badge is actually visible (legacy or paid rule).
    if (args.acceptsCard) {
      matches = matches.filter((c) =>
        canShowDiscountBadge(effectiveTier(c, args.now), denormalizedOffer(c)),
      );
    }

    const total = matches.length;
    const sliced = matches.slice(0, DIRECTORY_RESULT_CAP);
    const nameById = await loadCategoryNameMap(ctx, args.locale);
    const items: CompanyCard[] = [];
    for (const company of sliced) {
      items.push(await toCompanyCard(ctx, company, nameById, args.now));
    }
    return { items, total, capped: total > DIRECTORY_RESULT_CAP };
  },
});

/** Facet values for the filter panel + category tiles (bounded scan). */
export const facets = query({
  args: { locale: localeValidator },
  handler: async (ctx, args) => {
    const published = await ctx.db
      .query("companies")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .take(DIRECTORY_SCAN_CAP);

    const cityBySlug = new Map<string, string>();
    const countPerCategory = new Map<string, number>();
    const countries = new Set<string>();
    for (const company of published) {
      cityBySlug.set(company.primaryCitySlug, company.primaryCity);
      for (const country of company.countries) countries.add(country);
      for (const categoryId of company.categoryIds) {
        countPerCategory.set(
          categoryId,
          (countPerCategory.get(categoryId) ?? 0) + 1,
        );
      }
    }

    const categories = await ctx.db.query("categories").take(100);
    categories.sort((a, b) => a.order - b.order);

    return {
      total: published.length,
      countries: [...countries].sort(),
      cities: [...cityBySlug.entries()]
        .map(([slug, name]) => ({ slug, name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      categories: categories.map((c) => ({
        slug: c.slug,
        name: args.locale === "de" ? c.nameDe : c.nameSr,
        icon: c.icon,
        count: countPerCategory.get(c._id) ?? 0,
      })),
    };
  },
});

/** Companies whose discount badge is visible — the /kartica partner list. */
export const discountPartners = query({
  args: { locale: localeValidator, now: v.number() },
  handler: async (ctx, args) => {
    const published = await ctx.db
      .query("companies")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .take(DIRECTORY_SCAN_CAP);

    const partners = published
      .filter((c) =>
        canShowDiscountBadge(effectiveTier(c, args.now), denormalizedOffer(c)),
      )
      .sort(
        (a, b) =>
          (b.discountPercent ?? 0) - (a.discountPercent ?? 0) ||
          a.name.localeCompare(b.name),
      );

    const nameById = await loadCategoryNameMap(ctx, args.locale);
    const items: CompanyCard[] = [];
    for (const company of partners) {
      items.push(await toCompanyCard(ctx, company, nameById, args.now));
    }
    return items;
  },
});

/** Newest published companies — home fallback section ("Novo na platformi"). */
export const newest = query({
  args: { locale: localeValidator, now: v.number(), limit: v.number() },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(1, args.limit), 12);
    const featured = await ctx.db
      .query("companies")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .take(DIRECTORY_SCAN_CAP);

    const featuredPaid = featured
      .filter((c) => c.featured && effectiveTier(c, args.now) === "paid")
      .sort((a, b) => b._creationTime - a._creationTime)
      .slice(0, limit);

    const pool =
      featuredPaid.length > 0
        ? featuredPaid
        : [...featured]
            .sort((a, b) => b._creationTime - a._creationTime)
            .slice(0, limit);

    const nameById = await loadCategoryNameMap(ctx, args.locale);
    const items: CompanyCard[] = [];
    for (const company of pool) {
      items.push(await toCompanyCard(ctx, company, nameById, args.now));
    }
    return { items, isFeatured: featuredPaid.length > 0 };
  },
});

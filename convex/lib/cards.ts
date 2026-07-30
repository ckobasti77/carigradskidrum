import type { QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import type { CountryCode } from "./constants";
import { canShowDiscountBadge, effectiveTier } from "./entitlements";

/** Public card shape used by the directory grid, home sections and similar lists. */
export type CompanyCard = {
  id: Id<"companies">;
  slug: string;
  name: string;
  city: string;
  country: CountryCode;
  categoryNames: string[];
  coverUrl: string | null;
  coverWidth: number | null;
  coverHeight: number | null;
  discountPercent: number | null;
  isPaid: boolean;
};

export function denormalizedOffer(company: Doc<"companies">) {
  return company.discountPercent
    ? { active: true, legacy: company.discountLegacy ?? false }
    : null;
}

export async function toCompanyCard(
  ctx: QueryCtx,
  company: Doc<"companies">,
  categoryNameById: Map<Id<"categories">, string>,
  now: number,
): Promise<CompanyCard> {
  const tier = effectiveTier(company, now);

  let coverUrl: string | null = null;
  let coverWidth: number | null = null;
  let coverHeight: number | null = null;
  if (company.coverMediaId) {
    const media = await ctx.db.get("media", company.coverMediaId);
    if (media) {
      coverUrl = await ctx.storage.getUrl(media.storageId);
      coverWidth = media.width;
      coverHeight = media.height;
    }
  }

  return {
    id: company._id,
    slug: company.slug,
    name: company.name,
    city: company.primaryCity,
    country: company.primaryCountry,
    categoryNames: company.categoryIds
      .map((id) => categoryNameById.get(id))
      .filter((name): name is string => Boolean(name)),
    coverUrl,
    coverWidth,
    coverHeight,
    discountPercent:
      canShowDiscountBadge(tier, denormalizedOffer(company)) && company.discountPercent
        ? company.discountPercent
        : null,
    isPaid: tier === "paid",
  };
}

export async function loadCategoryNameMap(
  ctx: QueryCtx,
  locale: "sr" | "de",
): Promise<Map<Id<"categories">, string>> {
  const categories = await ctx.db.query("categories").take(100);
  return new Map(
    categories.map((c) => [c._id, locale === "de" ? c.nameDe : c.nameSr]),
  );
}

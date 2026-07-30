import { query } from "./_generated/server";

/** All categories, ordered — source for landing pages, GSP and the sitemap. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const categories = await ctx.db.query("categories").take(100);
    categories.sort((a, b) => a.order - b.order);
    return categories.map((c) => ({
      slug: c.slug,
      nameSr: c.nameSr,
      nameDe: c.nameDe,
      descriptionSr: c.descriptionSr ?? null,
      descriptionDe: c.descriptionDe ?? null,
      icon: c.icon,
      order: c.order,
    }));
  },
});

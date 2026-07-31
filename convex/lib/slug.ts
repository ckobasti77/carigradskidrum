/**
 * Slug allocation for companies created outside the WP migration.
 *
 * migration.upsertFromWp THROWS on a slug collision on purpose — the curated
 * import must never silently rename a partner. User submissions are the
 * opposite case: two unrelated "Auto Servis" businesses in different cities are
 * both legitimate, so we suffix instead of failing.
 */

import type { QueryCtx } from "../_generated/server";
import { foldToSlug } from "./fold";

const MAX_SLUG_LENGTH = 80;
const MAX_NUMERIC_ATTEMPTS = 50;

/** Trims to a sane length without cutting mid-word where avoidable. */
export function baseSlug(name: string): string {
  const folded = foldToSlug(name);
  if (folded.length <= MAX_SLUG_LENGTH) return folded;
  const cut = folded.slice(0, MAX_SLUG_LENGTH);
  const lastDash = cut.lastIndexOf("-");
  return lastDash > 20 ? cut.slice(0, lastDash) : cut;
}

async function isTaken(ctx: QueryCtx, slug: string): Promise<boolean> {
  const existing = await ctx.db
    .query("companies")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .unique();
  return existing !== null;
}

/**
 * Returns a slug that is free at call time. `preferred` lets an admin override
 * the derived slug in the review screen; `ignoreCompanyId` keeps a company's
 * own slug available when editing it.
 */
export async function uniqueCompanySlug(
  ctx: QueryCtx,
  name: string,
  options?: { preferred?: string; ignoreCompanyId?: string },
): Promise<string> {
  const raw = options?.preferred?.trim() ? options.preferred : name;
  const base = baseSlug(raw) || "firma";

  for (let attempt = 0; attempt <= MAX_NUMERIC_ATTEMPTS; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const existing = await ctx.db
      .query("companies")
      .withIndex("by_slug", (q) => q.eq("slug", candidate))
      .unique();
    if (!existing) return candidate;
    if (options?.ignoreCompanyId && existing._id === options.ignoreCompanyId) {
      return candidate;
    }
  }

  // Pathological case (50+ same-named companies): fall back to a random tail.
  // Loop-bounded so a hostile name can never spin forever.
  for (let attempt = 0; attempt < 10; attempt++) {
    const suffix = Math.random().toString(36).slice(2, 7);
    const candidate = `${base}-${suffix}`;
    if (!(await isTaken(ctx, candidate))) return candidate;
  }
  throw new Error(`Could not allocate a unique slug for "${name}"`);
}

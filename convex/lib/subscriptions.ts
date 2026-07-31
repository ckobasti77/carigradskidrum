/**
 * Subscription → tier projection.
 *
 * `companies.tier` and `companies.paidUntil` are written ONLY here (schema.ts
 * line comment). Admin forms edit the `subscriptions` row and then call
 * `applySubscriptionState`; nothing sets a tier by hand, so a company can never
 * end up "paid" without a subscription backing it.
 */

import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import type { PlanId } from "./constants";

const SUBSCRIPTION_SCAN = 50;

/** Statuses that still entitle the company to the paid tier. */
const LIVE_STATUSES = new Set(["active", "past_due"]);

export async function applySubscriptionState(
  ctx: MutationCtx,
  companyId: Id<"companies">,
  now: number,
): Promise<{ tier: "free" | "paid"; paidUntil?: number }> {
  const subscriptions = await ctx.db
    .query("subscriptions")
    .withIndex("by_company", (q) => q.eq("companyId", companyId))
    .take(SUBSCRIPTION_SCAN);

  let paidUntil = 0;
  for (const subscription of subscriptions) {
    if (!LIVE_STATUSES.has(subscription.status)) continue;
    if (subscription.periodEnd > paidUntil) paidUntil = subscription.periodEnd;
  }

  // effectiveTier() adds the 14-day read-time grace on top of paidUntil, so we
  // store the raw period end here and let the read path be forgiving.
  const next =
    paidUntil > 0
      ? { tier: "paid" as const, paidUntil, updatedAt: now }
      : { tier: "free" as const, paidUntil: undefined, updatedAt: now };

  await ctx.db.patch("companies", companyId, next);
  return { tier: next.tier, paidUntil: next.paidUntil };
}

export function planMonths(plan: PlanId): number {
  return plan === "yearly_365" ? 12 : 1;
}

/**
 * Calendar-aware month arithmetic: Jan 31 + 1 month lands on Feb 28/29, not
 * Mar 2/3 as naive day math would produce.
 */
export function addMonths(from: number, months: number): number {
  const date = new Date(from);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const lastDay = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
  ).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return date.getTime();
}

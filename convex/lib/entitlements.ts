/**
 * Single source of truth for what a paid subscription unlocks.
 * Imported by Convex functions, lib/data.ts and client components.
 * Client input NEVER decides entitlements — server queries gate display
 * through these values; wizard write caps apply to everyone (anti-abuse),
 * the tier gates DISPLAY only.
 */

export const GRACE_PERIOD_MS = 14 * 24 * 3600 * 1000;

export type Tier = "free" | "paid";

/**
 * The only arbiter of display tier. The cron janitor is a janitor
 * (flips companies.tier only AFTER the grace period ends and sends mail);
 * this read-time predicate keeps a just-expired subscriber paid through
 * the 14-day grace even if the janitor already ran.
 */
export function effectiveTier(
  company: { tier: string; paidUntil?: number },
  now: number,
): Tier {
  return company.tier === "paid" &&
    company.paidUntil !== undefined &&
    company.paidUntil + GRACE_PERIOD_MS > now
    ? "paid"
    : "free";
}

export const ENTITLEMENTS = {
  free: {
    showWebsite: true,
    // Migrated card partners keep their badge until claimed ("legacyOnly");
    // new discount offers require a paid tier.
    discountBadge: "legacyOnly" as const,
    showContact: false,
    showHours: false,
    maxVisibleGalleryImages: 1,
    maxVisibleOfferings: 0,
    priorityRank: 0,
    featuredEligible: false,
  },
  paid: {
    showWebsite: true,
    discountBadge: true as const,
    showContact: true,
    showHours: true,
    maxVisibleGalleryImages: 12,
    maxVisibleOfferings: 20,
    priorityRank: 1,
    featuredEligible: true,
  },
} as const;

/** Hard write caps — enforced for every tier in wizard mutations (anti-abuse). */
export const WRITE_CAPS = {
  galleryImages: 12,
  offerings: 20,
  descriptionLength: 4000,
};

export function canShowDiscountBadge(
  tier: Tier,
  offer: { active: boolean; legacy: boolean } | null | undefined,
): boolean {
  if (!offer || !offer.active) return false;
  if (tier === "paid") return true;
  return offer.legacy;
}

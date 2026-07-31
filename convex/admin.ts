import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import {
  companyStatusValidator,
  countryValidator,
  paymentMethodValidator,
  planValidator,
  submissionStatusValidator,
  subscriptionStatusValidator,
} from "./lib/validators";
import { deploymentEnv } from "./lib/env";
import { foldBasic } from "./lib/fold";
import { uniqueCompanySlug } from "./lib/slug";
import {
  deleteCompanyCascade,
  deleteSubmissionMedia,
  recomputeCompanyDerived,
} from "./lib/companyWrite";
import {
  addMonths,
  applySubscriptionState,
  planMonths,
} from "./lib/subscriptions";
import { effectiveTier } from "./lib/entitlements";
import { INPUT_LIMITS } from "./lib/companyInput";

/**
 * Admin API. Every function is a *public* Convex function guarded by a shared
 * secret — the same pattern migration.importCompanies uses — because the Convex
 * deployment is reachable from anywhere and the Next.js cookie gate only
 * protects the UI. The secret lives exclusively on the Next.js server
 * (lib/admin/convex.ts) and is never shipped to a browser.
 *
 * Every mutation appends to adminAuditLog so the owner has a full trail of who
 * changed what and when.
 */

const SCAN = {
  submissions: 500,
  companies: 1001,
  subscriptions: 500,
  payments: 1000,
  inquiries: 500,
  audit: 200,
  categories: 100,
} as const;

function assertAdmin(secret: string): void {
  const expected = deploymentEnv.ADMIN_SECRET;
  if (!expected || secret !== expected) {
    throw new Error("unauthorized");
  }
}

async function audit(
  ctx: MutationCtx,
  action: string,
  entityTable: string,
  entityId: string,
  summary: string,
): Promise<void> {
  await ctx.db.insert("adminAuditLog", {
    action,
    entityTable,
    entityId,
    summary,
    // One shared operator account until Convex Auth (M2) supplies real users.
    actor: "admin",
  });
}

async function categoryNames(
  ctx: QueryCtx,
): Promise<Map<Id<"categories">, string>> {
  const categories = await ctx.db.query("categories").take(SCAN.categories);
  return new Map(categories.map((c) => [c._id, c.nameSr]));
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export const dashboard = query({
  args: { secret: v.string(), now: v.number() },
  handler: async (ctx, args) => {
    assertAdmin(args.secret);

    const companies = await ctx.db.query("companies").take(SCAN.companies);
    const submissions = await ctx.db
      .query("companySubmissions")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .take(SCAN.submissions);
    const subscriptions = await ctx.db
      .query("subscriptions")
      .take(SCAN.subscriptions);
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_paidAt")
      .order("desc")
      .take(SCAN.payments);
    const inquiries = await ctx.db.query("inquiries").order("desc").take(SCAN.inquiries);
    const recentAudit = await ctx.db
      .query("adminAuditLog")
      .order("desc")
      .take(10);

    const byStatus = { draft: 0, pending: 0, published: 0, suspended: 0 };
    let paid = 0;
    let featured = 0;
    for (const company of companies) {
      byStatus[company.status] += 1;
      if (effectiveTier(company, args.now) === "paid") paid += 1;
      if (company.featured) featured += 1;
    }

    const monthStart = new Date(args.now);
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const yearStart = new Date(args.now);
    yearStart.setUTCMonth(0, 1);
    yearStart.setUTCHours(0, 0, 0, 0);

    let revenueMonth = 0;
    let revenueYear = 0;
    let revenueTotal = 0;
    for (const payment of payments) {
      revenueTotal += payment.amountEur;
      if (payment.paidAt >= yearStart.getTime()) revenueYear += payment.amountEur;
      if (payment.paidAt >= monthStart.getTime())
        revenueMonth += payment.amountEur;
    }

    const THIRTY_DAYS = 30 * 24 * 3600 * 1000;
    const expiringSoon = subscriptions.filter(
      (s) =>
        (s.status === "active" || s.status === "past_due") &&
        s.periodEnd > args.now &&
        s.periodEnd <= args.now + THIRTY_DAYS,
    ).length;
    const expired = subscriptions.filter(
      (s) =>
        (s.status === "active" || s.status === "past_due") &&
        s.periodEnd <= args.now,
    ).length;

    const inquiries30d = inquiries.filter(
      (i) => i._creationTime > args.now - 30 * 24 * 3600 * 1000,
    ).length;
    const newInquiries = inquiries.filter((i) => i.status === "new").length;

    return {
      companies: {
        total: companies.length,
        ...byStatus,
        paid,
        free: companies.length - paid,
        featured,
      },
      pendingSubmissions: submissions.length,
      subscriptions: {
        total: subscriptions.length,
        active: subscriptions.filter((s) => s.status === "active").length,
        expiringSoon,
        expired,
      },
      revenue: {
        month: revenueMonth,
        year: revenueYear,
        total: revenueTotal,
        count: payments.length,
      },
      inquiries: { last30Days: inquiries30d, unread: newInquiries },
      recentAudit: recentAudit.map((entry) => ({
        id: entry._id,
        at: entry._creationTime,
        action: entry.action,
        summary: entry.summary,
      })),
    };
  },
});

// ---------------------------------------------------------------------------
// Submissions
// ---------------------------------------------------------------------------

export const listSubmissions = query({
  args: { secret: v.string(), status: v.optional(submissionStatusValidator) },
  handler: async (ctx, args) => {
    assertAdmin(args.secret);

    const rows = args.status
      ? await ctx.db
          .query("companySubmissions")
          .withIndex("by_status", (q) => q.eq("status", args.status!))
          .order("desc")
          .take(SCAN.submissions)
      : await ctx.db
          .query("companySubmissions")
          .order("desc")
          .take(SCAN.submissions);

    return rows.map((row) => {
      const primary =
        row.payload.locations.find((l) => l.isPrimary) ?? row.payload.locations[0];
      return {
        id: row._id,
        createdAt: row._creationTime,
        status: row.status,
        name: row.payload.name,
        city: primary?.city ?? "",
        country: primary?.country ?? null,
        submitterName: row.submitterName,
        submitterEmail: row.submitterEmail,
        locale: row.locale,
        mediaCount: row.payload.media.length,
        offeringCount: row.payload.offerings.length,
        hasDiscount: row.payload.discountOffer !== undefined,
        companyId: row.companyId ?? null,
      };
    });
  },
});

export const getSubmission = query({
  args: { secret: v.string(), submissionId: v.id("companySubmissions") },
  handler: async (ctx, args) => {
    assertAdmin(args.secret);
    const row = await ctx.db.get("companySubmissions", args.submissionId);
    if (!row) return null;

    const categories = await ctx.db.query("categories").take(SCAN.categories);
    const bySlug = new Map(categories.map((c) => [c.slug, c]));

    const media = [];
    for (const item of row.payload.media) {
      media.push({
        storageId: item.storageId,
        kind: item.kind,
        width: item.width,
        height: item.height,
        url: await ctx.storage.getUrl(item.storageId),
      });
    }

    // Surface near-duplicates so the reviewer sees them before publishing.
    const term = foldBasic(row.payload.name);
    const similar =
      term.length >= 3
        ? (
            await ctx.db
              .query("companies")
              .withSearchIndex("search_sr", (q) =>
                q.search("searchTextSr", term),
              )
              .take(5)
          ).map((c) => ({
            slug: c.slug,
            name: c.name,
            city: c.primaryCity,
            status: c.status,
          }))
        : [];

    return {
      id: row._id,
      createdAt: row._creationTime,
      status: row.status,
      locale: row.locale,
      reviewedAt: row.reviewedAt ?? null,
      rejectReason: row.rejectReason ?? null,
      adminNote: row.adminNote ?? null,
      companyId: row.companyId ?? null,
      submitter: {
        name: row.submitterName,
        email: row.submitterEmail,
        phone: row.submitterPhone ?? null,
        role: row.submitterRole ?? null,
      },
      payload: row.payload,
      categories: row.payload.categorySlugs.map((slug) => ({
        slug,
        name: bySlug.get(slug)?.nameSr ?? slug,
        missing: !bySlug.has(slug),
      })),
      allCategories: categories.map((c) => ({ slug: c.slug, name: c.nameSr })),
      media,
      similar,
    };
  },
});

export const approveSubmission = mutation({
  args: {
    secret: v.string(),
    submissionId: v.id("companySubmissions"),
    slug: v.optional(v.string()),
    name: v.optional(v.string()),
    categorySlugs: v.optional(v.array(v.string())),
    discountPercent: v.optional(v.number()),
    featured: v.optional(v.boolean()),
  },
  returns: v.object({
    ok: v.boolean(),
    error: v.optional(v.string()),
    slug: v.optional(v.string()),
    companyId: v.optional(v.id("companies")),
  }),
  handler: async (ctx, args) => {
    assertAdmin(args.secret);

    const submission = await ctx.db.get(
      "companySubmissions",
      args.submissionId,
    );
    if (!submission) return { ok: false, error: "not_found" };
    if (submission.status === "approved") {
      return { ok: false, error: "already_approved" };
    }

    const payload = submission.payload;
    const slugList = args.categorySlugs ?? payload.categorySlugs;

    const categories: Doc<"categories">[] = [];
    for (const slug of slugList) {
      const category = await ctx.db
        .query("categories")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .unique();
      if (category) categories.push(category);
    }
    if (categories.length === 0) return { ok: false, error: "no_categories" };

    const primary =
      payload.locations.find((l) => l.isPrimary) ?? payload.locations[0];
    if (!primary) return { ok: false, error: "no_location" };

    const name = (args.name ?? payload.name).trim();
    const slug = await uniqueCompanySlug(ctx, name, { preferred: args.slug });
    const now = Date.now();

    const companyId = await ctx.db.insert("companies", {
      slug,
      name,
      status: "published",
      descriptionSr: payload.descriptionSr,
      descriptionDe: payload.descriptionDe,
      website: payload.website,
      phone: payload.phone,
      email: payload.email,
      openingHours: payload.openingHours,
      categoryIds: categories.map((c) => c._id),
      // recomputeCompanyDerived overwrites these from the location rows below;
      // they are set here only because the fields are required on insert.
      countries: [primary.country],
      primaryCountry: primary.country,
      primaryCity: primary.city,
      primaryCitySlug: "",
      acceptsCard: false,
      tier: "free",
      featured: args.featured ?? false,
      searchTextSr: "",
      searchTextDe: "",
      submittedAt: submission._creationTime,
      publishedAt: now,
      updatedAt: now,
    });

    for (const location of payload.locations) {
      await ctx.db.insert("locations", {
        companyId,
        country: location.country,
        city: location.city,
        address: location.address,
        zip: location.zip,
        lat: location.lat,
        lng: location.lng,
        isPrimary: location === primary,
      });
    }

    for (const [index, offering] of payload.offerings
      .slice(0, INPUT_LIMITS.maxOfferings)
      .entries()) {
      await ctx.db.insert("offerings", {
        companyId,
        type: offering.type,
        nameSr: offering.nameSr,
        nameDe: offering.nameDe,
        descriptionSr: offering.descriptionSr,
        descriptionDe: offering.descriptionDe,
        order: index,
      });
    }

    const percent = args.discountPercent ?? payload.discountOffer?.percent;
    if (percent !== undefined) {
      await ctx.db.insert("discountOffers", {
        companyId,
        percent,
        termsSr: payload.discountOffer?.termsSr,
        termsDe: payload.discountOffer?.termsDe,
        active: true,
        // Only migrated WP partners are grandfathered; new offers are not.
        legacy: false,
      });
    }

    let galleryOrder = 0;
    for (const item of payload.media) {
      const mediaId = await ctx.db.insert("media", {
        companyId,
        storageId: item.storageId,
        kind: item.kind,
        width: item.width,
        height: item.height,
        alt: item.alt,
        order: item.kind === "gallery" ? galleryOrder++ : 0,
      });
      if (item.kind === "cover") {
        await ctx.db.patch("companies", companyId, { coverMediaId: mediaId });
      }
      if (item.kind === "logo") {
        await ctx.db.patch("companies", companyId, { logoMediaId: mediaId });
      }
    }

    await recomputeCompanyDerived(ctx, companyId);

    await ctx.db.patch("companySubmissions", args.submissionId, {
      status: "approved",
      companyId,
      reviewedAt: now,
      rejectReason: undefined,
    });

    await audit(
      ctx,
      "submission.approve",
      "companySubmissions",
      args.submissionId,
      `Objavljena firma "${name}" (/${slug})`,
    );
    await ctx.scheduler.runAfter(0, internal.email.sendSubmissionDecision, {
      submissionId: args.submissionId,
    });

    return { ok: true, slug, companyId };
  },
});

export const rejectSubmission = mutation({
  args: {
    secret: v.string(),
    submissionId: v.id("companySubmissions"),
    status: v.union(v.literal("rejected"), v.literal("spam")),
    reason: v.optional(v.string()),
  },
  returns: v.object({ ok: v.boolean(), error: v.optional(v.string()) }),
  handler: async (ctx, args) => {
    assertAdmin(args.secret);
    const submission = await ctx.db.get(
      "companySubmissions",
      args.submissionId,
    );
    if (!submission) return { ok: false, error: "not_found" };
    if (submission.status === "approved") {
      return { ok: false, error: "already_approved" };
    }

    // Rejected uploads are dead weight — reclaim the bytes immediately instead
    // of waiting a day for the janitor.
    await deleteSubmissionMedia(ctx, submission.payload.media);

    await ctx.db.patch("companySubmissions", args.submissionId, {
      status: args.status,
      reviewedAt: Date.now(),
      rejectReason: args.reason?.trim()
        ? args.reason.trim().slice(0, INPUT_LIMITS.rejectReason)
        : undefined,
      payload: { ...submission.payload, media: [] },
    });

    await audit(
      ctx,
      `submission.${args.status}`,
      "companySubmissions",
      args.submissionId,
      `Odbijena prijava "${submission.payload.name}"`,
    );

    // Spam is never answered — a reply confirms a live inbox to the sender.
    if (args.status === "rejected") {
      await ctx.scheduler.runAfter(0, internal.email.sendSubmissionDecision, {
        submissionId: args.submissionId,
      });
    }
    return { ok: true };
  },
});

export const setSubmissionNote = mutation({
  args: {
    secret: v.string(),
    submissionId: v.id("companySubmissions"),
    adminNote: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    assertAdmin(args.secret);
    await ctx.db.patch("companySubmissions", args.submissionId, {
      adminNote: args.adminNote.trim().slice(0, INPUT_LIMITS.adminNote) || undefined,
    });
    return null;
  },
});

// ---------------------------------------------------------------------------
// Companies
// ---------------------------------------------------------------------------

export const listCompanies = query({
  args: {
    secret: v.string(),
    now: v.number(),
    q: v.optional(v.string()),
    status: v.optional(companyStatusValidator),
    tier: v.optional(v.union(v.literal("free"), v.literal("paid"))),
    country: v.optional(countryValidator),
    categorySlug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    assertAdmin(args.secret);

    let rows = args.status
      ? await ctx.db
          .query("companies")
          .withIndex("by_status", (q) => q.eq("status", args.status!))
          .take(SCAN.companies)
      : await ctx.db.query("companies").take(SCAN.companies);

    if (args.country) {
      rows = rows.filter((c) => c.countries.includes(args.country!));
    }
    if (args.tier) {
      rows = rows.filter((c) => effectiveTier(c, args.now) === args.tier);
    }
    if (args.categorySlug) {
      const category = await ctx.db
        .query("categories")
        .withIndex("by_slug", (q) => q.eq("slug", args.categorySlug!))
        .unique();
      rows = category
        ? rows.filter((c) => c.categoryIds.includes(category._id))
        : [];
    }
    if (args.q) {
      const term = foldBasic(args.q);
      rows = rows.filter(
        (c) =>
          foldBasic(c.name).includes(term) || c.slug.includes(term.replaceAll(" ", "-")),
      );
    }

    rows.sort((a, b) => b.updatedAt - a.updatedAt);
    const nameById = await categoryNames(ctx);

    return rows.slice(0, 300).map((company) => ({
      id: company._id,
      slug: company.slug,
      name: company.name,
      status: company.status,
      tier: effectiveTier(company, args.now),
      rawTier: company.tier,
      paidUntil: company.paidUntil ?? null,
      featured: company.featured,
      city: company.primaryCity,
      country: company.primaryCountry,
      acceptsCard: company.acceptsCard,
      discountPercent: company.discountPercent ?? null,
      categories: company.categoryIds
        .map((id) => nameById.get(id))
        .filter((n): n is string => Boolean(n)),
      updatedAt: company.updatedAt,
      claimable: company.status === "published" && !company.ownerId,
    }));
  },
});

export const getCompany = query({
  args: { secret: v.string(), companyId: v.id("companies"), now: v.number() },
  handler: async (ctx, args) => {
    assertAdmin(args.secret);
    const company = await ctx.db.get("companies", args.companyId);
    if (!company) return null;

    const [locations, offerings, offers, media, subscriptions, payments, inquiries] =
      await Promise.all([
        ctx.db
          .query("locations")
          .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
          .take(20),
        ctx.db
          .query("offerings")
          .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
          .take(600),
        ctx.db
          .query("discountOffers")
          .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
          .take(10),
        ctx.db
          .query("media")
          .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
          .take(40),
        ctx.db
          .query("subscriptions")
          .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
          .take(50),
        ctx.db
          .query("payments")
          .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
          .take(200),
        ctx.db
          .query("inquiries")
          .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
          .take(200),
      ]);

    const categories = await ctx.db.query("categories").take(SCAN.categories);
    const mediaWithUrls = [];
    for (const item of media) {
      mediaWithUrls.push({
        id: item._id,
        kind: item.kind,
        order: item.order,
        width: item.width,
        height: item.height,
        url: await ctx.storage.getUrl(item.storageId),
      });
    }

    return {
      id: company._id,
      slug: company.slug,
      name: company.name,
      status: company.status,
      tier: effectiveTier(company, args.now),
      rawTier: company.tier,
      paidUntil: company.paidUntil ?? null,
      featured: company.featured,
      descriptionSr: company.descriptionSr ?? "",
      descriptionDe: company.descriptionDe ?? "",
      website: company.website ?? "",
      phone: company.phone ?? "",
      email: company.email ?? "",
      openingHours: company.openingHours ?? [],
      categoryIds: company.categoryIds,
      allCategories: categories.map((c) => ({
        id: c._id,
        slug: c.slug,
        name: c.nameSr,
      })),
      createdAt: company._creationTime,
      submittedAt: company.submittedAt ?? null,
      publishedAt: company.publishedAt ?? null,
      updatedAt: company.updatedAt,
      wpId: company.wpId ?? null,
      locations: locations.map((l) => ({
        id: l._id,
        country: l.country,
        city: l.city,
        address: l.address ?? "",
        zip: l.zip ?? "",
        isPrimary: l.isPrimary,
      })),
      offerings: offerings
        .sort((a, b) => a.order - b.order)
        .map((o) => ({
          id: o._id,
          type: o.type,
          nameSr: o.nameSr,
          descriptionSr: o.descriptionSr ?? "",
        })),
      discountOffers: offers.map((o) => ({
        id: o._id,
        percent: o.percent,
        termsSr: o.termsSr ?? "",
        active: o.active,
        legacy: o.legacy,
      })),
      media: mediaWithUrls,
      subscriptions: subscriptions.map((s) => ({
        id: s._id,
        plan: s.plan,
        status: s.status,
        provider: s.provider,
        periodStart: s.periodStart,
        periodEnd: s.periodEnd,
        cancelAtPeriodEnd: s.cancelAtPeriodEnd ?? false,
        note: s.note ?? "",
      })),
      payments: payments
        .sort((a, b) => b.paidAt - a.paidAt)
        .map((p) => ({
          id: p._id,
          amountEur: p.amountEur,
          method: p.method,
          paidAt: p.paidAt,
          invoiceNo: p.invoiceNo ?? "",
          note: p.note ?? "",
        })),
      inquiryCount: inquiries.length,
      unreadInquiries: inquiries.filter((i) => i.status === "new").length,
    };
  },
});

export const updateCompany = mutation({
  args: {
    secret: v.string(),
    companyId: v.id("companies"),
    name: v.string(),
    slug: v.string(),
    descriptionSr: v.optional(v.string()),
    descriptionDe: v.optional(v.string()),
    website: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    categorySlugs: v.array(v.string()),
    country: countryValidator,
    city: v.string(),
    address: v.optional(v.string()),
    zip: v.optional(v.string()),
    discountPercent: v.optional(v.number()),
    discountTermsSr: v.optional(v.string()),
  },
  returns: v.object({
    ok: v.boolean(),
    error: v.optional(v.string()),
    slug: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    assertAdmin(args.secret);
    const company = await ctx.db.get("companies", args.companyId);
    if (!company) return { ok: false, error: "not_found" };

    const name = args.name.trim();
    const city = args.city.trim();
    if (!name || !city) return { ok: false, error: "invalid" };

    const categoryIds: Id<"categories">[] = [];
    for (const slug of args.categorySlugs) {
      const category = await ctx.db
        .query("categories")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .unique();
      if (category) categoryIds.push(category._id);
    }
    if (categoryIds.length === 0) return { ok: false, error: "no_categories" };

    const slug =
      args.slug.trim() === company.slug
        ? company.slug
        : await uniqueCompanySlug(ctx, name, {
            preferred: args.slug,
            ignoreCompanyId: args.companyId,
          });

    await ctx.db.patch("companies", args.companyId, {
      name,
      slug,
      descriptionSr: args.descriptionSr?.trim() || undefined,
      descriptionDe: args.descriptionDe?.trim() || undefined,
      website: args.website?.trim() || undefined,
      phone: args.phone?.trim() || undefined,
      email: args.email?.trim().toLowerCase() || undefined,
      categoryIds,
    });

    // Replace-semantics for the primary location, matching migration.upsertFromWp.
    const locations = await ctx.db
      .query("locations")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .take(20);
    const primary = locations.find((l) => l.isPrimary) ?? locations[0];
    if (primary) {
      await ctx.db.patch("locations", primary._id, {
        country: args.country,
        city,
        address: args.address?.trim() || undefined,
        zip: args.zip?.trim() || undefined,
        isPrimary: true,
      });
    } else {
      await ctx.db.insert("locations", {
        companyId: args.companyId,
        country: args.country,
        city,
        address: args.address?.trim() || undefined,
        zip: args.zip?.trim() || undefined,
        isPrimary: true,
      });
    }

    const offers = await ctx.db
      .query("discountOffers")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .take(10);
    if (args.discountPercent === undefined) {
      for (const offer of offers) await ctx.db.delete("discountOffers", offer._id);
    } else {
      const existing = offers[0];
      if (existing) {
        await ctx.db.patch("discountOffers", existing._id, {
          percent: args.discountPercent,
          termsSr: args.discountTermsSr?.trim() || undefined,
          active: true,
        });
        for (const extra of offers.slice(1)) {
          await ctx.db.delete("discountOffers", extra._id);
        }
      } else {
        await ctx.db.insert("discountOffers", {
          companyId: args.companyId,
          percent: args.discountPercent,
          termsSr: args.discountTermsSr?.trim() || undefined,
          active: true,
          legacy: false,
        });
      }
    }

    await recomputeCompanyDerived(ctx, args.companyId);
    await audit(
      ctx,
      "company.update",
      "companies",
      args.companyId,
      `Izmenjena firma "${name}"`,
    );
    return { ok: true, slug };
  },
});

export const setCompanyStatus = mutation({
  args: {
    secret: v.string(),
    companyId: v.id("companies"),
    status: companyStatusValidator,
  },
  returns: v.object({ ok: v.boolean(), slug: v.optional(v.string()) }),
  handler: async (ctx, args) => {
    assertAdmin(args.secret);
    const company = await ctx.db.get("companies", args.companyId);
    if (!company) return { ok: false };

    const now = Date.now();
    await ctx.db.patch("companies", args.companyId, {
      status: args.status,
      publishedAt:
        args.status === "published" ? (company.publishedAt ?? now) : company.publishedAt,
      updatedAt: now,
    });
    await audit(
      ctx,
      "company.status",
      "companies",
      args.companyId,
      `"${company.name}" → ${args.status}`,
    );
    return { ok: true, slug: company.slug };
  },
});

export const setCompanyFeatured = mutation({
  args: {
    secret: v.string(),
    companyId: v.id("companies"),
    featured: v.boolean(),
  },
  returns: v.object({ ok: v.boolean(), slug: v.optional(v.string()) }),
  handler: async (ctx, args) => {
    assertAdmin(args.secret);
    const company = await ctx.db.get("companies", args.companyId);
    if (!company) return { ok: false };
    await ctx.db.patch("companies", args.companyId, {
      featured: args.featured,
      updatedAt: Date.now(),
    });
    await audit(
      ctx,
      "company.featured",
      "companies",
      args.companyId,
      `"${company.name}" ${args.featured ? "istaknuta" : "više nije istaknuta"}`,
    );
    return { ok: true, slug: company.slug };
  },
});

export const deleteMedia = mutation({
  args: { secret: v.string(), mediaId: v.id("media") },
  returns: v.object({ ok: v.boolean(), slug: v.optional(v.string()) }),
  handler: async (ctx, args) => {
    assertAdmin(args.secret);
    const item = await ctx.db.get("media", args.mediaId);
    if (!item) return { ok: false };
    const company = await ctx.db.get("companies", item.companyId);

    await ctx.storage.delete(item.storageId);
    await ctx.db.delete("media", args.mediaId);
    if (company?.coverMediaId === args.mediaId) {
      await ctx.db.patch("companies", item.companyId, {
        coverMediaId: undefined,
      });
    }
    if (company?.logoMediaId === args.mediaId) {
      await ctx.db.patch("companies", item.companyId, {
        logoMediaId: undefined,
      });
    }
    await audit(
      ctx,
      "company.media.delete",
      "companies",
      item.companyId,
      `Obrisana slika (${item.kind}) firme "${company?.name ?? "?"}"`,
    );
    return { ok: true, slug: company?.slug };
  },
});

export const deleteCompany = mutation({
  args: { secret: v.string(), companyId: v.id("companies") },
  returns: v.object({ ok: v.boolean(), slug: v.optional(v.string()) }),
  handler: async (ctx, args) => {
    assertAdmin(args.secret);
    const company = await ctx.db.get("companies", args.companyId);
    if (!company) return { ok: false };

    await deleteCompanyCascade(ctx, args.companyId);
    await audit(
      ctx,
      "company.delete",
      "companies",
      args.companyId,
      `Obrisana firma "${company.name}" (/${company.slug})`,
    );
    return { ok: true, slug: company.slug };
  },
});

// ---------------------------------------------------------------------------
// Subscriptions & payments
// ---------------------------------------------------------------------------

export const listSubscriptions = query({
  args: {
    secret: v.string(),
    now: v.number(),
    filter: v.optional(
      v.union(
        v.literal("all"),
        v.literal("active"),
        v.literal("expiring"),
        v.literal("expired"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    assertAdmin(args.secret);
    const rows = await ctx.db
      .query("subscriptions")
      .withIndex("by_periodEnd")
      .order("desc")
      .take(SCAN.subscriptions);

    const THIRTY_DAYS = 30 * 24 * 3600 * 1000;
    const filtered = rows.filter((s) => {
      if (!args.filter || args.filter === "all") return true;
      if (args.filter === "active") return s.status === "active";
      if (args.filter === "expiring") {
        return (
          (s.status === "active" || s.status === "past_due") &&
          s.periodEnd > args.now &&
          s.periodEnd <= args.now + THIRTY_DAYS
        );
      }
      return s.periodEnd <= args.now;
    });

    const result = [];
    for (const subscription of filtered) {
      const company = await ctx.db.get("companies", subscription.companyId);
      result.push({
        id: subscription._id,
        companyId: subscription.companyId,
        companyName: company?.name ?? "—",
        companySlug: company?.slug ?? null,
        plan: subscription.plan,
        status: subscription.status,
        provider: subscription.provider,
        periodStart: subscription.periodStart,
        periodEnd: subscription.periodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd ?? false,
        note: subscription.note ?? "",
        daysLeft: Math.ceil(
          (subscription.periodEnd - args.now) / (24 * 3600 * 1000),
        ),
      });
    }
    return result;
  },
});

export const activateSubscription = mutation({
  args: {
    secret: v.string(),
    companyId: v.id("companies"),
    plan: planValidator,
    periodStart: v.number(),
    /** Overrides the plan default — used by the 14-for-12 founding promo. */
    months: v.optional(v.number()),
    note: v.optional(v.string()),
  },
  returns: v.object({
    ok: v.boolean(),
    error: v.optional(v.string()),
    slug: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    assertAdmin(args.secret);
    const company = await ctx.db.get("companies", args.companyId);
    if (!company) return { ok: false, error: "not_found" };

    const months = args.months ?? planMonths(args.plan);
    if (!Number.isInteger(months) || months < 1 || months > 60) {
      return { ok: false, error: "invalid_months" };
    }

    const periodEnd = addMonths(args.periodStart, months);
    const subscriptionId = await ctx.db.insert("subscriptions", {
      companyId: args.companyId,
      provider: "manual",
      plan: args.plan,
      status: "active",
      periodStart: args.periodStart,
      periodEnd,
      note: args.note?.trim() || undefined,
    });

    await applySubscriptionState(ctx, args.companyId, Date.now());
    await audit(
      ctx,
      "subscription.activate",
      "subscriptions",
      subscriptionId,
      `"${company.name}" — ${args.plan}, ${months} mes.`,
    );
    return { ok: true, slug: company.slug };
  },
});

export const updateSubscription = mutation({
  args: {
    secret: v.string(),
    subscriptionId: v.id("subscriptions"),
    plan: v.optional(planValidator),
    status: v.optional(subscriptionStatusValidator),
    periodEnd: v.optional(v.number()),
    cancelAtPeriodEnd: v.optional(v.boolean()),
    note: v.optional(v.string()),
    /** Positive extends, negative shortens. */
    extendMonths: v.optional(v.number()),
  },
  returns: v.object({
    ok: v.boolean(),
    error: v.optional(v.string()),
    slug: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    assertAdmin(args.secret);
    const subscription = await ctx.db.get("subscriptions", args.subscriptionId);
    if (!subscription) return { ok: false, error: "not_found" };
    const company = await ctx.db.get("companies", subscription.companyId);

    const periodEnd =
      args.extendMonths !== undefined && args.extendMonths !== 0
        ? addMonths(subscription.periodEnd, args.extendMonths)
        : (args.periodEnd ?? subscription.periodEnd);

    await ctx.db.patch("subscriptions", args.subscriptionId, {
      plan: args.plan ?? subscription.plan,
      status: args.status ?? subscription.status,
      periodEnd,
      cancelAtPeriodEnd:
        args.cancelAtPeriodEnd ?? subscription.cancelAtPeriodEnd,
      note: args.note !== undefined ? args.note.trim() || undefined : subscription.note,
    });

    await applySubscriptionState(ctx, subscription.companyId, Date.now());
    await audit(
      ctx,
      "subscription.update",
      "subscriptions",
      args.subscriptionId,
      `Izmenjena pretplata firme "${company?.name ?? "?"}"`,
    );
    return { ok: true, slug: company?.slug };
  },
});

export const deleteSubscription = mutation({
  args: { secret: v.string(), subscriptionId: v.id("subscriptions") },
  returns: v.object({ ok: v.boolean(), slug: v.optional(v.string()) }),
  handler: async (ctx, args) => {
    assertAdmin(args.secret);
    const subscription = await ctx.db.get("subscriptions", args.subscriptionId);
    if (!subscription) return { ok: false };
    const company = await ctx.db.get("companies", subscription.companyId);

    await ctx.db.delete("subscriptions", args.subscriptionId);
    await applySubscriptionState(ctx, subscription.companyId, Date.now());
    await audit(
      ctx,
      "subscription.delete",
      "subscriptions",
      args.subscriptionId,
      `Obrisana pretplata firme "${company?.name ?? "?"}"`,
    );
    return { ok: true, slug: company?.slug };
  },
});

export const listPayments = query({
  args: {
    secret: v.string(),
    from: v.optional(v.number()),
    to: v.optional(v.number()),
    companyId: v.optional(v.id("companies")),
  },
  handler: async (ctx, args) => {
    assertAdmin(args.secret);
    const rows = args.companyId
      ? await ctx.db
          .query("payments")
          .withIndex("by_company", (q) => q.eq("companyId", args.companyId!))
          .take(SCAN.payments)
      : await ctx.db
          .query("payments")
          .withIndex("by_paidAt")
          .order("desc")
          .take(SCAN.payments);

    const filtered = rows.filter(
      (p) =>
        (args.from === undefined || p.paidAt >= args.from) &&
        (args.to === undefined || p.paidAt <= args.to),
    );
    filtered.sort((a, b) => b.paidAt - a.paidAt);

    const result = [];
    for (const payment of filtered) {
      const company = await ctx.db.get("companies", payment.companyId);
      result.push({
        id: payment._id,
        companyId: payment.companyId,
        companyName: company?.name ?? "—",
        amountEur: payment.amountEur,
        method: payment.method,
        paidAt: payment.paidAt,
        invoiceNo: payment.invoiceNo ?? "",
        note: payment.note ?? "",
      });
    }
    return {
      items: result,
      total: result.reduce((sum, p) => sum + p.amountEur, 0),
    };
  },
});

export const recordPayment = mutation({
  args: {
    secret: v.string(),
    companyId: v.id("companies"),
    subscriptionId: v.optional(v.id("subscriptions")),
    amountEur: v.number(),
    method: paymentMethodValidator,
    paidAt: v.number(),
    invoiceNo: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  returns: v.object({ ok: v.boolean(), error: v.optional(v.string()) }),
  handler: async (ctx, args) => {
    assertAdmin(args.secret);
    const company = await ctx.db.get("companies", args.companyId);
    if (!company) return { ok: false, error: "not_found" };
    if (!Number.isFinite(args.amountEur) || args.amountEur <= 0) {
      return { ok: false, error: "invalid_amount" };
    }

    const paymentId = await ctx.db.insert("payments", {
      companyId: args.companyId,
      subscriptionId: args.subscriptionId,
      amountEur: Math.round(args.amountEur * 100) / 100,
      method: args.method,
      paidAt: args.paidAt,
      invoiceNo: args.invoiceNo?.trim() || undefined,
      note: args.note?.trim() || undefined,
    });

    await audit(
      ctx,
      "payment.record",
      "payments",
      paymentId,
      `Uplata ${args.amountEur} € — "${company.name}"`,
    );
    return { ok: true };
  },
});

export const deletePayment = mutation({
  args: { secret: v.string(), paymentId: v.id("payments") },
  returns: v.object({ ok: v.boolean() }),
  handler: async (ctx, args) => {
    assertAdmin(args.secret);
    const payment = await ctx.db.get("payments", args.paymentId);
    if (!payment) return { ok: false };
    await ctx.db.delete("payments", args.paymentId);
    await audit(
      ctx,
      "payment.delete",
      "payments",
      args.paymentId,
      `Obrisana uplata ${payment.amountEur} €`,
    );
    return { ok: true };
  },
});

// ---------------------------------------------------------------------------
// Inquiries, audit, shared options
// ---------------------------------------------------------------------------

export const listInquiries = query({
  args: {
    secret: v.string(),
    status: v.optional(v.union(v.literal("new"), v.literal("read"))),
    companyId: v.optional(v.id("companies")),
  },
  handler: async (ctx, args) => {
    assertAdmin(args.secret);
    const rows = args.companyId
      ? await ctx.db
          .query("inquiries")
          .withIndex("by_company", (q) => q.eq("companyId", args.companyId!))
          .order("desc")
          .take(SCAN.inquiries)
      : await ctx.db.query("inquiries").order("desc").take(SCAN.inquiries);

    const filtered = args.status
      ? rows.filter((i) => i.status === args.status)
      : rows;

    const result = [];
    for (const inquiry of filtered) {
      const company = await ctx.db.get("companies", inquiry.companyId);
      result.push({
        id: inquiry._id,
        at: inquiry._creationTime,
        companyName: company?.name ?? "—",
        companySlug: company?.slug ?? null,
        name: inquiry.name,
        email: inquiry.email,
        phone: inquiry.phone ?? "",
        message: inquiry.message,
        locale: inquiry.locale,
        status: inquiry.status,
      });
    }
    return result;
  },
});

export const setInquiryStatus = mutation({
  args: {
    secret: v.string(),
    inquiryId: v.id("inquiries"),
    status: v.union(v.literal("new"), v.literal("read")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    assertAdmin(args.secret);
    await ctx.db.patch("inquiries", args.inquiryId, { status: args.status });
    return null;
  },
});

export const listAudit = query({
  args: { secret: v.string(), action: v.optional(v.string()) },
  handler: async (ctx, args) => {
    assertAdmin(args.secret);
    const rows = await ctx.db
      .query("adminAuditLog")
      .order("desc")
      .take(SCAN.audit);
    const filtered = args.action
      ? rows.filter((r) => r.action.startsWith(args.action!))
      : rows;
    return filtered.map((row) => ({
      id: row._id,
      at: row._creationTime,
      action: row.action,
      entityTable: row.entityTable,
      entityId: row.entityId,
      summary: row.summary,
      actor: row.actor,
    }));
  },
});

/** Lightweight company list for the "pick a company" selects. */
export const companyOptions = query({
  args: { secret: v.string() },
  handler: async (ctx, args) => {
    assertAdmin(args.secret);
    const rows = await ctx.db.query("companies").take(SCAN.companies);
    return rows
      .map((c) => ({ id: c._id, name: c.name, slug: c.slug }))
      .sort((a, b) => a.name.localeCompare(b.name, "sr"));
  },
});

import { internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import {
  localeValidator,
  submissionPayloadValidator,
} from "./lib/validators";
import {
  SUBMISSION_LIMIT_GLOBAL_24H,
  SUBMISSION_LIMIT_PER_EMAIL_24H,
  UPLOAD_MAX_BYTES,
  UPLOAD_MIME_TYPES,
} from "./lib/constants";
import {
  INPUT_LIMITS,
  normalizeWebsite,
  trimmedOrUndefined,
  validateSubmission,
  type FieldErrors,
} from "./lib/companyInput";
import { foldBasic } from "./lib/fold";

const DAY_MS = 24 * 3600 * 1000;

const fieldErrorsValidator = v.record(v.string(), v.string());

/**
 * Public "add my company" submission (wizard on /dodaj-firmu).
 *
 * Anti-spam mirrors convex/inquiries.ts exactly:
 * - honeypot `website2` — a filled value returns silent success, no write;
 * - ≤3 submissions / 24h per submitter email, ≤30 / 24h globally;
 * - nothing ever throws: the client branches on the returned `error` code.
 *
 * A submission NEVER touches `companies`. It lands in companySubmissions with
 * status "pending" and only convex/admin.ts:approveSubmission promotes it.
 */

/**
 * Upload target for wizard images. Anyone can call it (there is no auth until
 * M2), which is safe because an unreferenced file is swept by the daily
 * orphan janitor in convex/crons.ts and every file is re-validated for
 * size/content-type inside `submit` before it is recorded.
 */
export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => await ctx.storage.generateUploadUrl(),
});

/**
 * Near-duplicate detection for the wizard's first step: warns the user that
 * their company may already be listed instead of letting them file a
 * duplicate that an admin has to reject later.
 */
export const checkDuplicate = query({
  args: { name: v.string(), locale: localeValidator },
  returns: v.array(
    v.object({ slug: v.string(), name: v.string(), city: v.string() }),
  ),
  handler: async (ctx, args) => {
    const term = foldBasic(args.name);
    if (term.length < 3) return [];

    const matches =
      args.locale === "de"
        ? await ctx.db
            .query("companies")
            .withSearchIndex("search_de", (q) =>
              q.search("searchTextDe", term).eq("status", "published"),
            )
            .take(5)
        : await ctx.db
            .query("companies")
            .withSearchIndex("search_sr", (q) =>
              q.search("searchTextSr", term).eq("status", "published"),
            )
            .take(5);

    // The search index is fuzzy by design; only surface companies whose name
    // actually starts with — or is contained in — what the user typed, so the
    // warning stays believable.
    const folded = foldBasic(args.name);
    return matches
      .filter((company) => {
        const companyName = foldBasic(company.name);
        return companyName.includes(folded) || folded.includes(companyName);
      })
      .map((company) => ({
        slug: company.slug,
        name: company.name,
        city: company.primaryCity,
      }));
  },
});

export const submit = mutation({
  args: {
    payload: submissionPayloadValidator,
    submitterName: v.string(),
    submitterEmail: v.string(),
    submitterPhone: v.optional(v.string()),
    submitterRole: v.optional(v.string()),
    consent: v.boolean(),
    locale: localeValidator,
    website2: v.optional(v.string()), // honeypot
  },
  returns: v.object({
    ok: v.boolean(),
    error: v.optional(v.string()),
    fields: v.optional(fieldErrorsValidator),
  }),
  handler: async (ctx, args) => {
    if (args.website2) return { ok: true }; // honeypot hit — silent drop

    const { payload } = args;
    const primary =
      payload.locations.find((location) => location.isPrimary) ??
      payload.locations[0];
    if (!primary) return { ok: false, error: "invalid", fields: { city: "required" } };

    const errors: FieldErrors = validateSubmission({
      name: payload.name,
      descriptionSr: payload.descriptionSr,
      descriptionDe: payload.descriptionDe,
      website: payload.website,
      phone: payload.phone,
      email: payload.email,
      country: primary.country,
      city: primary.city,
      address: primary.address,
      zip: primary.zip,
      categorySlugs: payload.categorySlugs,
      openingHours: payload.openingHours,
      offerings: payload.offerings,
      galleryCount: payload.media.filter((m) => m.kind === "gallery").length,
      discountPercent: payload.discountOffer?.percent,
      discountTermsSr: payload.discountOffer?.termsSr,
      discountTermsDe: payload.discountOffer?.termsDe,
      submitterName: args.submitterName,
      submitterEmail: args.submitterEmail,
      submitterPhone: args.submitterPhone,
      submitterRole: args.submitterRole,
      consent: args.consent,
    });

    // Category slugs must resolve — a client sending a made-up slug would
    // otherwise produce a company with no categories at approval time.
    for (const slug of payload.categorySlugs) {
      const category = await ctx.db
        .query("categories")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .unique();
      if (!category) {
        errors.categorySlugs = "invalid";
        break;
      }
    }

    // Re-validate uploads server-side: the client checks are a UX nicety, the
    // storage metadata is the truth.
    if (payload.media.length > INPUT_LIMITS.maxGallery + 2) {
      errors.gallery = "tooMany";
    } else {
      for (const media of payload.media) {
        const meta = await ctx.db.system.get("_storage", media.storageId);
        if (!meta) {
          errors.gallery = "invalid";
          break;
        }
        if (meta.size > UPLOAD_MAX_BYTES) {
          errors.gallery = "tooLarge";
          break;
        }
        if (
          meta.contentType === undefined ||
          !(UPLOAD_MIME_TYPES as readonly string[]).includes(meta.contentType)
        ) {
          errors.gallery = "invalidType";
          break;
        }
        if (
          !Number.isFinite(media.width) ||
          !Number.isFinite(media.height) ||
          media.width <= 0 ||
          media.height <= 0
        ) {
          errors.gallery = "invalid";
          break;
        }
      }
    }
    if (payload.media.filter((m) => m.kind === "logo").length > 1)
      errors.gallery = "invalid";
    if (payload.media.filter((m) => m.kind === "cover").length > 1)
      errors.gallery = "invalid";

    if (Object.keys(errors).length > 0) {
      return { ok: false, error: "invalid", fields: errors };
    }

    const submitterEmail = args.submitterEmail.trim().toLowerCase();
    const cutoff = Date.now() - DAY_MS;

    const recentFromEmail = await ctx.db
      .query("companySubmissions")
      .withIndex("by_email", (q) =>
        q.eq("submitterEmail", submitterEmail).gt("_creationTime", cutoff),
      )
      .take(SUBMISSION_LIMIT_PER_EMAIL_24H + 1);
    if (recentFromEmail.length >= SUBMISSION_LIMIT_PER_EMAIL_24H) {
      return { ok: false, error: "rate_limit" };
    }

    const recentGlobal = await ctx.db
      .query("companySubmissions")
      .order("desc")
      .take(SUBMISSION_LIMIT_GLOBAL_24H + 1);
    if (
      recentGlobal.filter((s) => s._creationTime > cutoff).length >=
      SUBMISSION_LIMIT_GLOBAL_24H
    ) {
      return { ok: false, error: "rate_limit" };
    }

    const website = payload.website?.trim();
    const submissionId = await ctx.db.insert("companySubmissions", {
      status: "pending",
      payload: {
        name: payload.name.trim(),
        descriptionSr: trimmedOrUndefined(payload.descriptionSr),
        descriptionDe: trimmedOrUndefined(payload.descriptionDe),
        website: website ? normalizeWebsite(website) : undefined,
        phone: trimmedOrUndefined(payload.phone),
        email: payload.email?.trim().toLowerCase() || undefined,
        openingHours: payload.openingHours?.length
          ? payload.openingHours
          : undefined,
        categorySlugs: payload.categorySlugs,
        locations: payload.locations.map((location) => ({
          country: location.country,
          city: location.city.trim(),
          address: trimmedOrUndefined(location.address),
          zip: trimmedOrUndefined(location.zip),
          lat: location.lat,
          lng: location.lng,
          // Exactly one primary, whatever the client claimed.
          isPrimary: location === primary,
        })),
        offerings: payload.offerings.map((offering, index) => ({
          type: offering.type,
          nameSr: offering.nameSr.trim(),
          nameDe: trimmedOrUndefined(offering.nameDe),
          descriptionSr: trimmedOrUndefined(offering.descriptionSr),
          descriptionDe: trimmedOrUndefined(offering.descriptionDe),
          order: index,
        })),
        media: payload.media,
        discountOffer: payload.discountOffer
          ? {
              percent: payload.discountOffer.percent,
              termsSr: trimmedOrUndefined(payload.discountOffer.termsSr),
              termsDe: trimmedOrUndefined(payload.discountOffer.termsDe),
            }
          : undefined,
      },
      submitterName: args.submitterName.trim(),
      submitterEmail,
      submitterPhone: trimmedOrUndefined(args.submitterPhone),
      submitterRole: trimmedOrUndefined(args.submitterRole),
      locale: args.locale,
    });

    await ctx.scheduler.runAfter(0, internal.email.sendSubmissionAlert, {
      submissionId,
    });
    await ctx.scheduler.runAfter(0, internal.email.sendSubmissionReceipt, {
      submissionId,
    });

    return { ok: true };
  },
});

/** Internal: everything the submission email actions need. */
export const getForNotification = internalQuery({
  args: { submissionId: v.id("companySubmissions") },
  handler: async (ctx, args) => {
    const submission = await ctx.db.get(
      "companySubmissions",
      args.submissionId,
    );
    if (!submission) return null;

    let companySlug: string | null = null;
    if (submission.companyId) {
      const company = await ctx.db.get("companies", submission.companyId);
      companySlug = company?.slug ?? null;
    }

    const primary =
      submission.payload.locations.find((location) => location.isPrimary) ??
      submission.payload.locations[0];

    return {
      id: submission._id,
      status: submission.status,
      locale: submission.locale,
      companyName: submission.payload.name,
      city: primary?.city ?? "",
      submitterName: submission.submitterName,
      submitterEmail: submission.submitterEmail,
      submitterPhone: submission.submitterPhone ?? null,
      rejectReason: submission.rejectReason ?? null,
      companySlug,
    };
  },
});

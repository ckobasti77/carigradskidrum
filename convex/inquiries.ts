import { internalQuery, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { localeValidator } from "./lib/validators";
import {
  INQUIRY_LIMIT_PER_COMPANY_24H,
  INQUIRY_LIMIT_PER_EMAIL_24H,
} from "./lib/constants";

const DAY_MS = 24 * 3600 * 1000;

/**
 * Public inquiry submission. Anti-spam per plan §3.3:
 * - honeypot field `website2` — a filled value returns silent "success"
 *   without writing anything (bots see no signal);
 * - ≤10 inquiries / 24h per company, ≤3 / 24h per (company, email) —
 *   counted through the by_company index (_creationTime range).
 */
export const submit = mutation({
  args: {
    companyId: v.id("companies"),
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    message: v.string(),
    locale: localeValidator,
    website2: v.optional(v.string()), // honeypot
  },
  returns: v.object({ ok: v.boolean(), error: v.optional(v.string()) }),
  handler: async (ctx, args) => {
    if (args.website2) return { ok: true }; // honeypot hit — silent drop

    const name = args.name.trim();
    const email = args.email.trim().toLowerCase();
    const message = args.message.trim();
    if (!name || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { ok: false, error: "invalid" };
    }
    if (name.length > 200 || message.length > 4000 || email.length > 320) {
      return { ok: false, error: "invalid" };
    }

    const company = await ctx.db.get("companies", args.companyId);
    if (!company || company.status !== "published") {
      return { ok: false, error: "invalid" };
    }

    const cutoff = Date.now() - DAY_MS;
    const recent = await ctx.db
      .query("inquiries")
      .withIndex("by_company", (q) =>
        q.eq("companyId", args.companyId).gt("_creationTime", cutoff),
      )
      .take(INQUIRY_LIMIT_PER_COMPANY_24H + 1);

    if (recent.length >= INQUIRY_LIMIT_PER_COMPANY_24H) {
      return { ok: false, error: "rate_limit" };
    }
    if (
      recent.filter((i) => i.email === email).length >=
      INQUIRY_LIMIT_PER_EMAIL_24H
    ) {
      return { ok: false, error: "rate_limit" };
    }

    const inquiryId = await ctx.db.insert("inquiries", {
      companyId: args.companyId,
      name,
      email,
      phone: args.phone?.trim() || undefined,
      message,
      locale: args.locale,
      status: "new",
    });

    await ctx.scheduler.runAfter(0, internal.email.sendInquiryRelay, {
      inquiryId,
    });
    return { ok: true };
  },
});

/** Internal: data the email relay action needs. */
export const getForRelay = internalQuery({
  args: { inquiryId: v.id("inquiries") },
  handler: async (ctx, args) => {
    const inquiry = await ctx.db.get("inquiries", args.inquiryId);
    if (!inquiry) return null;
    const company = await ctx.db.get("companies", inquiry.companyId);
    if (!company) return null;
    return {
      inquiry: {
        name: inquiry.name,
        email: inquiry.email,
        phone: inquiry.phone ?? null,
        message: inquiry.message,
        locale: inquiry.locale,
      },
      company: {
        name: company.name,
        slug: company.slug,
        email: company.email ?? null,
      },
    };
  },
});

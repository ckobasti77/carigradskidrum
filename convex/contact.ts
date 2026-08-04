import { internalQuery, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import {
  CONTACT_LIMIT_GLOBAL_24H,
  CONTACT_LIMIT_PER_EMAIL_24H,
} from "./lib/constants";
import {
  type ContactFieldErrors,
  validateContactInput,
} from "./lib/contactInput";
import { contactTopicValidator, localeValidator } from "./lib/validators";

const DAY_MS = 24 * 60 * 60 * 1000;
const fieldErrorsValidator = v.record(v.string(), v.literal("invalid"));

export const submit = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    topic: contactTopicValidator,
    message: v.string(),
    locale: localeValidator,
    website2: v.optional(v.string()),
  },
  returns: v.object({
    ok: v.boolean(),
    error: v.optional(v.string()),
    fields: v.optional(fieldErrorsValidator),
  }),
  handler: async (ctx, args) => {
    // Honeypot hits look successful so bots do not learn how to bypass it.
    if (args.website2) return { ok: true };

    const fields: ContactFieldErrors = validateContactInput(args);
    if (Object.keys(fields).length > 0) {
      return { ok: false, error: "invalid", fields };
    }

    const email = args.email.trim().toLowerCase();
    const cutoff = Date.now() - DAY_MS;
    const recentFromEmail = await ctx.db
      .query("contactMessages")
      .withIndex("by_email", (q) =>
        q.eq("email", email).gt("_creationTime", cutoff),
      )
      .take(CONTACT_LIMIT_PER_EMAIL_24H + 1);
    if (recentFromEmail.length >= CONTACT_LIMIT_PER_EMAIL_24H) {
      return { ok: false, error: "rate_limit" };
    }

    const recentGlobal = await ctx.db
      .query("contactMessages")
      .order("desc")
      .take(CONTACT_LIMIT_GLOBAL_24H + 1);
    if (
      recentGlobal.filter((entry) => entry._creationTime > cutoff).length >=
      CONTACT_LIMIT_GLOBAL_24H
    ) {
      return { ok: false, error: "rate_limit" };
    }

    const contactMessageId = await ctx.db.insert("contactMessages", {
      name: args.name.trim(),
      email,
      phone: args.phone?.trim() || undefined,
      topic: args.topic,
      message: args.message.trim(),
      locale: args.locale,
      status: "new",
    });

    await ctx.scheduler.runAfter(0, internal.email.sendContactAlert, {
      contactMessageId,
    });
    await ctx.scheduler.runAfter(0, internal.email.sendContactReceipt, {
      contactMessageId,
    });

    return { ok: true };
  },
});

export const getForNotification = internalQuery({
  args: { contactMessageId: v.id("contactMessages") },
  returns: v.union(
    v.null(),
    v.object({
      name: v.string(),
      email: v.string(),
      phone: v.union(v.string(), v.null()),
      topic: contactTopicValidator,
      message: v.string(),
      locale: localeValidator,
    }),
  ),
  handler: async (ctx, args) => {
    const entry = await ctx.db.get("contactMessages", args.contactMessageId);
    if (!entry) return null;

    return {
      name: entry.name,
      email: entry.email,
      phone: entry.phone ?? null,
      topic: entry.topic,
      message: entry.message,
      locale: entry.locale,
    };
  },
});

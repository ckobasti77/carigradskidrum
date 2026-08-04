import { v } from "convex/values";
import { mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { deploymentEnv } from "./lib/env";

const prepareResultValidator = v.union(
  v.object({
    status: v.literal("ready"),
    slug: v.string(),
    uploadUrl: v.string(),
  }),
  v.object({
    status: v.literal("skipped"),
    slug: v.string(),
    reason: v.union(
      v.literal("already-covered"),
      v.literal("cover-media-exists"),
    ),
  }),
);

const attachResultValidator = v.union(
  v.object({
    status: v.literal("attached"),
    slug: v.string(),
    mediaId: v.id("media"),
  }),
  v.object({
    status: v.literal("skipped"),
    slug: v.string(),
    reason: v.union(
      v.literal("already-covered"),
      v.literal("cover-media-exists"),
    ),
  }),
);

function assertMigrationSecret(secret: string) {
  const expected = deploymentEnv.MIGRATION_SECRET;
  if (!expected) throw new Error("MIGRATION_SECRET is not configured");
  if (secret !== expected) throw new Error("Invalid migration secret");
}

async function findExistingCover(
  ctx: MutationCtx,
  companyId: Id<"companies">,
) {
  const media = await ctx.db
    .query("media")
    .withIndex("by_company", (q) => q.eq("companyId", companyId))
    .take(30);
  return media.find((item) => item.kind === "cover") ?? null;
}

/** Creates an upload URL only while the target company still lacks a cover. */
export const prepareUpload = mutation({
  args: { secret: v.string(), wpId: v.number() },
  returns: prepareResultValidator,
  handler: async (ctx, args) => {
    assertMigrationSecret(args.secret);
    const company = await ctx.db
      .query("companies")
      .withIndex("by_wpId", (q) => q.eq("wpId", args.wpId))
      .unique();
    if (!company) throw new Error(`Company with wpId ${args.wpId} was not found`);
    if (company.coverMediaId) {
      return { status: "skipped" as const, slug: company.slug, reason: "already-covered" as const };
    }
    if (await findExistingCover(ctx, company._id)) {
      return { status: "skipped" as const, slug: company.slug, reason: "cover-media-exists" as const };
    }
    return {
      status: "ready" as const,
      slug: company.slug,
      uploadUrl: await ctx.storage.generateUploadUrl(),
    };
  },
});

/**
 * Attaches exactly one newly uploaded cover. It never replaces existing media
 * and never deletes a storage object; race-created orphans are left to the
 * existing 24-hour janitor.
 */
export const attachCover = mutation({
  args: {
    secret: v.string(),
    wpId: v.number(),
    storageId: v.id("_storage"),
    width: v.number(),
    height: v.number(),
    expectedMime: v.union(v.literal("image/jpeg"), v.literal("image/png")),
    expectedSize: v.number(),
  },
  returns: attachResultValidator,
  handler: async (ctx, args) => {
    assertMigrationSecret(args.secret);
    if (
      !Number.isInteger(args.width) ||
      !Number.isInteger(args.height) ||
      args.width <= 0 ||
      args.height <= 0 ||
      args.width > 10_000 ||
      args.height > 10_000
    ) {
      throw new Error("Invalid image dimensions");
    }
    if (
      !Number.isInteger(args.expectedSize) ||
      args.expectedSize <= 0 ||
      args.expectedSize > 12 * 1024 * 1024
    ) {
      throw new Error("Invalid image size");
    }

    const company = await ctx.db
      .query("companies")
      .withIndex("by_wpId", (q) => q.eq("wpId", args.wpId))
      .unique();
    if (!company) throw new Error(`Company with wpId ${args.wpId} was not found`);
    if (company.coverMediaId) {
      return { status: "skipped" as const, slug: company.slug, reason: "already-covered" as const };
    }
    if (await findExistingCover(ctx, company._id)) {
      return { status: "skipped" as const, slug: company.slug, reason: "cover-media-exists" as const };
    }

    const alreadyReferenced = await ctx.db
      .query("media")
      .withIndex("by_storageId", (q) => q.eq("storageId", args.storageId))
      .take(1);
    if (alreadyReferenced.length > 0) {
      throw new Error("Storage object is already referenced by media");
    }

    const storage = await ctx.db.system.get("_storage", args.storageId);
    if (!storage) throw new Error("Uploaded storage object was not found");
    const contentType = storage.contentType?.split(";", 1)[0]?.toLowerCase();
    if (!contentType?.startsWith("image/") || contentType !== args.expectedMime) {
      throw new Error(`Unexpected storage MIME type: ${contentType ?? "missing"}`);
    }
    if (storage.size !== args.expectedSize) {
      throw new Error("Uploaded storage size does not match the validated source");
    }

    const mediaId = await ctx.db.insert("media", {
      companyId: company._id,
      storageId: args.storageId,
      kind: "cover",
      width: args.width,
      height: args.height,
      order: 0,
    });
    await ctx.db.patch("companies", company._id, { coverMediaId: mediaId });
    return { status: "attached" as const, slug: company.slug, mediaId };
  },
});

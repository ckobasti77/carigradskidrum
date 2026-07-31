import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { ORPHAN_STORAGE_GRACE_MS } from "./lib/constants";

/** One batch per run — bounded so the sweep can never blow the transaction. */
const STORAGE_SWEEP_BATCH = 500;
const PENDING_SUBMISSION_SCAN = 1000;

/**
 * Convex storage has no automatic GC (AGENTS.md), and the wizard uploads
 * images moments BEFORE the submit mutation runs. If the browser dies in that
 * window the bytes are referenced by nothing at all.
 *
 * A file is considered live when it is either attached to a `media` row (every
 * published company image, including ones promoted from an approved
 * submission) or still sitting in a pending submission awaiting review.
 * Rejected submissions delete their files immediately in admin.rejectSubmission,
 * so they never reach this sweep.
 */
export const sweepOrphanStorage = internalMutation({
  args: {},
  returns: v.object({ scanned: v.number(), deleted: v.number() }),
  handler: async (ctx) => {
    const cutoff = Date.now() - ORPHAN_STORAGE_GRACE_MS;

    const pending = await ctx.db
      .query("companySubmissions")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .take(PENDING_SUBMISSION_SCAN);

    const heldBySubmission = new Set<string>();
    for (const submission of pending) {
      for (const media of submission.payload.media) {
        heldBySubmission.add(media.storageId);
      }
    }

    // Oldest first: once we hit a file inside the grace window every remaining
    // file is newer, so the scan can stop.
    const files = await ctx.db.system
      .query("_storage")
      .order("asc")
      .take(STORAGE_SWEEP_BATCH);

    let scanned = 0;
    let deleted = 0;
    for (const file of files) {
      if (file._creationTime > cutoff) break;
      scanned++;
      if (heldBySubmission.has(file._id)) continue;

      const attached = await ctx.db
        .query("media")
        .withIndex("by_storageId", (q) => q.eq("storageId", file._id))
        .first();
      if (attached) continue;

      await ctx.storage.delete(file._id);
      deleted++;
    }

    if (deleted > 0) {
      console.log(`[crons] swept ${deleted} orphan storage file(s)`);
    }
    return { scanned, deleted };
  },
});

const crons = cronJobs();

crons.daily(
  "sweep orphan storage",
  { hourUTC: 3, minuteUTC: 20 },
  internal.crons.sweepOrphanStorage,
  {},
);

export default crons;

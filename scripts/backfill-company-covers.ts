/**
 * Validate the four client-approved official cover sources:
 *   npx tsx scripts/backfill-company-covers.ts
 *
 * Upload and attach after an explicit production approval:
 *   npx tsx scripts/backfill-company-covers.ts --push
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { ConvexHttpClient } from "convex/browser";
import type { Id } from "../convex/_generated/dataModel";
import { api } from "../convex/_generated/api";
import {
  COMPANY_COVER_SOURCES,
  type CompanyCoverSource,
} from "./company-cover-sources";

const USER_AGENT = "CarigradskiDrumCoverBackfill/1.0";
const MAX_BYTES = 12 * 1024 * 1024;

type ValidatedSource = {
  source: CompanyCoverSource;
  bytes: Uint8Array;
  size: number;
};

function loadMigrationEnv(): Record<string, string> {
  const file = path.join(process.cwd(), ".env.migration.local");
  if (!fs.existsSync(file)) return {};
  const env: Record<string, string> = {};
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match) env[match[1]] = match[2];
  }
  return env;
}

async function validateSource(
  source: CompanyCoverSource,
): Promise<ValidatedSource> {
  const response = await fetch(source.sourceUrl, {
    headers: { "User-Agent": USER_AGENT },
    redirect: "follow",
  });
  if (!response.ok) {
    throw new Error(`${source.slug}: GET failed with ${response.status}`);
  }

  const mime = response.headers.get("content-type")?.split(";", 1)[0]?.toLowerCase();
  if (mime !== source.mime) {
    throw new Error(`${source.slug}: expected ${source.mime}, received ${mime ?? "no MIME"}`);
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_BYTES) {
    throw new Error(`${source.slug}: invalid byte size ${bytes.byteLength}`);
  }

  const metadata = await sharp(bytes).metadata();
  if (metadata.width !== source.width || metadata.height !== source.height) {
    throw new Error(
      `${source.slug}: expected ${source.width}×${source.height}, received ${metadata.width ?? "?"}×${metadata.height ?? "?"}`,
    );
  }

  const sha256 = createHash("sha256").update(bytes).digest("hex");
  if (sha256 !== source.sha256) {
    throw new Error(`${source.slug}: SHA-256 changed (${sha256})`);
  }

  console.log(
    `✓ ${source.slug}: ${mime}, ${metadata.width}×${metadata.height}, ${bytes.byteLength} B, ${sha256}`,
  );
  return { source, bytes, size: bytes.byteLength };
}

async function push(validated: readonly ValidatedSource[]) {
  const env = loadMigrationEnv();
  const url = env.CONVEX_URL;
  const secret = env.MIGRATION_SECRET;
  if (!url || !secret) {
    throw new Error(
      ".env.migration.local must define CONVEX_URL and MIGRATION_SECRET",
    );
  }

  console.log(`→ PUSH: target deployment ${url}`);
  const client = new ConvexHttpClient(url);
  for (const item of validated) {
    const prepared = await client.mutation(api.coverBackfill.prepareUpload, {
      secret,
      wpId: item.source.wpId,
    });
    if (prepared.status === "skipped") {
      console.log(`↷ ${item.source.slug}: ${prepared.reason}`);
      continue;
    }
    if (prepared.slug !== item.source.slug) {
      throw new Error(
        `wpId ${item.source.wpId} resolved to ${prepared.slug}, expected ${item.source.slug}`,
      );
    }

    const upload = await fetch(prepared.uploadUrl, {
      method: "POST",
      headers: { "Content-Type": item.source.mime },
      body: new Blob([item.bytes.slice().buffer as ArrayBuffer], {
        type: item.source.mime,
      }),
    });
    if (!upload.ok) {
      throw new Error(`${item.source.slug}: upload failed with ${upload.status}`);
    }
    const payload = (await upload.json()) as { storageId?: string };
    if (!payload.storageId) {
      throw new Error(`${item.source.slug}: upload returned no storageId`);
    }

    const attached = await client.mutation(api.coverBackfill.attachCover, {
      secret,
      wpId: item.source.wpId,
      storageId: payload.storageId as Id<"_storage">,
      width: item.source.width,
      height: item.source.height,
      expectedMime: item.source.mime,
      expectedSize: item.size,
    });
    console.log(
      attached.status === "attached"
        ? `✓ ${item.source.slug}: attached ${attached.mediaId}`
        : `↷ ${item.source.slug}: ${attached.reason}`,
    );
  }
}

async function main() {
  const doPush = process.argv.includes("--push");
  console.log(
    doPush
      ? "Validating pinned sources before push…"
      : "Dry run: validating pinned sources (no Convex writes)…",
  );
  const validated: ValidatedSource[] = [];
  for (const source of COMPANY_COVER_SOURCES) {
    validated.push(await validateSource(source));
  }

  if (doPush) {
    await push(validated);
  } else {
    console.log("Dry run complete. Pass --push only after production approval.");
  }
}

main().catch((error) => {
  console.error(String(error instanceof Error ? error.stack : error));
  process.exit(1);
});

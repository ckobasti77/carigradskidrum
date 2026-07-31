/**
 * Admin session: a single shared password plus an HMAC-signed cookie.
 *
 * Convex Auth lands in M2 with real user accounts; until then the platform has
 * exactly one operator, so a shared password is the honest amount of auth. Note
 * that this gates the ADMIN UI only — the Convex admin functions are guarded
 * separately by ADMIN_SECRET (see convex/admin.ts), so nothing here is the sole
 * line of defence.
 *
 * Server-only by construction: every consumer is a Server Component, a Server
 * Action or a Route Handler. Nothing in this module may be imported from a
 * "use client" file — the secrets would end up in the browser bundle.
 */

export const ADMIN_COOKIE = "cd_admin";
const SESSION_TTL_SECONDS = 12 * 3600;
const PAYLOAD_PREFIX = "admin";

const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

async function sign(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload),
  );
  return toBase64Url(new Uint8Array(signature));
}

/** Length-independent comparison — never short-circuits on the first mismatch. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index++) {
    diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return diff === 0;
}

export type AdminConfigProblem = "password" | "sessionSecret" | "convexSecret";

/**
 * Missing configuration must FAIL CLOSED: an empty ADMIN_PASSWORD may never
 * become "any password works".
 */
export function adminConfigProblems(): AdminConfigProblem[] {
  const problems: AdminConfigProblem[] = [];
  if (!process.env.ADMIN_PASSWORD) problems.push("password");
  if (!process.env.ADMIN_SESSION_SECRET) problems.push("sessionSecret");
  if (!process.env.ADMIN_SECRET) problems.push("convexSecret");
  return problems;
}

export function checkPassword(candidate: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return safeEqual(candidate, expected);
}

export async function createSessionValue(): Promise<string | null> {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) return null;
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const signature = await sign(secret, `${PAYLOAD_PREFIX}.${expiresAt}`);
  return `${expiresAt}.${signature}`;
}

export async function isValidSessionValue(
  value: string | undefined,
): Promise<boolean> {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || !value) return false;

  const separator = value.indexOf(".");
  if (separator <= 0) return false;

  const expiresAt = Number.parseInt(value.slice(0, separator), 10);
  const signature = value.slice(separator + 1);
  if (!Number.isFinite(expiresAt)) return false;
  if (expiresAt * 1000 <= Date.now()) return false;

  const expected = await sign(secret, `${PAYLOAD_PREFIX}.${expiresAt}`);
  return safeEqual(signature, expected);
}

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/admin",
  maxAge: SESSION_TTL_SECONDS,
};

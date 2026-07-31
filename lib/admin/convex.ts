/**
 * Server-side bridge to the admin Convex functions.
 *
 * Every function in convex/admin.ts requires a `secret` argument checked
 * against ADMIN_SECRET in the deployment env. That secret lives ONLY here, on
 * the Next.js server: the admin UI is server-rendered and mutates through
 * Server Actions, so the browser never receives it and cannot call the admin
 * API directly even though the Convex deployment is publicly reachable.
 *
 * These reads are deliberately uncached (fetchQuery is hardcoded no-store) —
 * an admin looking at a moderation queue must never see a stale page.
 */
import { fetchMutation, fetchQuery } from "convex/nextjs";
import type {
  FunctionArgs,
  FunctionReference,
  FunctionReturnType,
} from "convex/server";
import { requireSession } from "./guard";

type SecretArgs = { secret: string };

/**
 * Untyped seam. `ArgsAndOptions` is a tuple whose shape depends on whether the
 * function takes arguments, which TypeScript cannot resolve while the function
 * reference is still generic — so the generic wrappers below keep the call-site
 * types and delegate the actual call through these.
 */
function callQuery(
  reference: FunctionReference<"query">,
  args: Record<string, unknown>,
) {
  return fetchQuery(reference, args);
}

function callMutation(
  reference: FunctionReference<"mutation">,
  args: Record<string, unknown>,
) {
  return fetchMutation(reference, args);
}

function adminSecret(): string {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    throw new Error(
      "ADMIN_SECRET is not set — the admin panel cannot talk to Convex.",
    );
  }
  return secret;
}

/**
 * Session check happens inside the data layer, not just in the layout: a
 * Server Action is a public HTTP endpoint and must re-authorize on every call
 * (Next.js docs, "Server Actions and Mutations" security section).
 */
export async function adminQuery<
  Query extends FunctionReference<"query", "public", SecretArgs>,
>(
  query: Query,
  args: Omit<FunctionArgs<Query>, "secret">,
): Promise<FunctionReturnType<Query>> {
  await requireSession();
  return callQuery(query, { ...args, secret: adminSecret() });
}

export async function adminMutation<
  Mutation extends FunctionReference<"mutation", "public", SecretArgs>,
>(
  mutation: Mutation,
  args: Omit<FunctionArgs<Mutation>, "secret">,
): Promise<FunctionReturnType<Mutation>> {
  await requireSession();
  return callMutation(mutation, { ...args, secret: adminSecret() });
}

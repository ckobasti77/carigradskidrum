/**
 * Deployment env access. The Convex runtime injects `process.env`, but the
 * convex/ tsconfig has no Node types — this shim types it without pulling in
 * @types/node. Values are set per deployment via `npx convex env set`.
 */
type ProcessLike = { env: Record<string, string | undefined> };

export const deploymentEnv: Record<string, string | undefined> =
  (globalThis as { process?: ProcessLike }).process?.env ?? {};

"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";

// Module scope so the client (and its websocket) survives re-renders.
// The placeholder URL keeps CI builds (no env) from throwing at module load;
// it never connects unless a component actually subscribes.
// M2 swaps ConvexProvider for ConvexAuthProvider in this same file.
const convex = new ConvexReactClient(
  process.env.NEXT_PUBLIC_CONVEX_URL ?? "https://unconfigured.convex.cloud",
);

export function Providers({ children }: { children: React.ReactNode }) {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}

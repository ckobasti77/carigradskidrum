import type { Metadata } from "next";
import { Caprasimo, Figtree } from "next/font/google";
import { TriangleAlert } from "lucide-react";
import "../../globals.css";
import { adminConfigProblems } from "@/lib/admin/session";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const caprasimo = Caprasimo({
  variable: "--font-caprasimo",
  weight: "400",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

/**
 * Second root layout of the app (there is no app/layout.tsx by design — see
 * AGENTS.md), so this file owns <html>/<body> for everything under /admin.
 * It holds no auth logic: /admin/login must render for signed-out visitors,
 * while every panel page sits behind the gate in (panel)/layout.tsx.
 *
 * Every admin route reads cookies and live Convex data — never cache it.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Administracija — Carigradski Drum",
  robots: { index: false, follow: false },
};

const CONFIG_LABELS: Record<string, string> = {
  password: "ADMIN_PASSWORD",
  sessionSecret: "ADMIN_SESSION_SECRET",
  convexSecret: "ADMIN_SECRET",
};

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Fail closed: with no password or no signing key there is no way to
  // authenticate, so the panel must not render at all.
  const blocking = adminConfigProblems().filter(
    (problem) => problem !== "convexSecret",
  );

  return (
    <html
      lang="sr"
      className={`${figtree.variable} ${caprasimo.variable} h-full antialiased`}
    >
      <body className="flex min-h-svh flex-col bg-background font-sans text-foreground antialiased">
        {blocking.length > 0 ? (
          <main className="flex flex-1 items-center justify-center p-6">
            <div className="max-w-md rounded-xl border border-destructive/40 bg-destructive/10 p-6">
              <TriangleAlert
                className="size-6 text-destructive"
                aria-hidden="true"
              />
              <h1 className="mt-3 text-xl">Administracija nije podešena</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Nedostaju promenljive okruženja:{" "}
                {blocking.map((p) => CONFIG_LABELS[p]).join(", ")}. Dodajte ih u
                .env.local (i u Vercel projekat), restartujte dev server pa
                osvežite stranicu.
              </p>
            </div>
          </main>
        ) : (
          children
        )}
      </body>
    </html>
  );
}

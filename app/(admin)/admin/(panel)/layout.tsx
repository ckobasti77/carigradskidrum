import Link from "next/link";
import { LogOut } from "lucide-react";
import { requireAdminPage } from "@/lib/admin/guard";
import { adminConfigProblems } from "@/lib/admin/session";
import { Button } from "@/components/ui/button";
import { logout } from "../actions";
import { NAV } from "../strings";

/**
 * Auth gate + chrome for every signed-in admin page. The gate is repeated at
 * page level (`requireAdminPage`) because Next renders layout and page segments
 * concurrently — the layout alone cannot stop a page's data fetch.
 */
export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminPage();
  const missingConvexSecret = adminConfigProblems().includes("convexSecret");

  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      <header className="border-b border-border bg-card lg:w-60 lg:shrink-0 lg:border-r lg:border-b-0">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 lg:block">
          <Link href="/admin" className="font-heading text-lg">
            Administracija
          </Link>
          <nav
            aria-label="Administracija"
            className="flex flex-wrap gap-1 lg:mt-5 lg:flex-col"
          >
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-1 lg:mt-6 lg:block lg:space-y-2">
            <Link
              href="/sr"
              className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-primary lg:block"
            >
              Otvori sajt →
            </Link>
            <form action={logout}>
              <Button type="submit" variant="ghost" size="sm">
                <LogOut className="size-4" aria-hidden="true" />
                Odjava
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="min-w-0 flex-1 p-4 md:p-8">
        {missingConvexSecret ? (
          <p
            role="alert"
            className="mb-6 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          >
            ADMIN_SECRET nije podešen — čitanje i upis podataka neće raditi.
          </p>
        ) : null}
        {children}
      </main>
    </div>
  );
}

import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { adminQuery } from "@/lib/admin/convex";
import { requireAdminPage } from "@/lib/admin/guard";
import { requestNow } from "@/lib/admin/time";
import { formatDateTime, formatEur } from "@/lib/admin/format";
import { PageHeader, Panel, StatCard } from "../ui";

export default async function AdminDashboard() {
  await requireAdminPage();
  const data = await adminQuery(api.admin.dashboard, { now: requestNow() });

  return (
    <>
      <PageHeader
        title="Pregled"
        description="Stanje direktorijuma, prijava i naplate."
      />

      {data.pendingSubmissions > 0 ? (
        <Link
          href="/admin/submissions?status=pending"
          className="mb-6 block rounded-lg border border-terracotta-300 bg-terracotta-100 p-4 transition-colors hover:border-primary"
        >
          <p className="font-medium">
            {data.pendingSubmissions === 1
              ? "1 prijava čeka proveru"
              : `${data.pendingSubmissions} prijava čeka proveru`}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Otvorite red za pregled →
          </p>
        </Link>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Objavljene firme"
          value={data.companies.published}
          hint={`ukupno ${data.companies.total} u bazi`}
          href="/admin/companies?status=published"
        />
        <StatCard
          label="Plaćeni paketi"
          value={data.companies.paid}
          hint={`${data.companies.free} besplatnih`}
          href="/admin/companies?tier=paid"
        />
        <StatCard
          label="Prihod ovog meseca"
          value={formatEur(data.revenue.month)}
          hint={`godina: ${formatEur(data.revenue.year)}`}
          href="/admin/payments"
        />
        <StatCard
          label="Pretplate ističu ≤30 dana"
          value={data.subscriptions.expiringSoon}
          hint={
            data.subscriptions.expired > 0
              ? `${data.subscriptions.expired} već isteklo`
              : "sve u roku"
          }
          tone={data.subscriptions.expiringSoon > 0 ? "warning" : "neutral"}
          href="/admin/subscriptions?filter=expiring"
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Prijave na čekanju"
          value={data.pendingSubmissions}
          tone={data.pendingSubmissions > 0 ? "warning" : "neutral"}
          href="/admin/submissions?status=pending"
        />
        <StatCard
          label="Suspendovane"
          value={data.companies.suspended}
          tone={data.companies.suspended > 0 ? "danger" : "neutral"}
          href="/admin/companies?status=suspended"
        />
        <StatCard
          label="Nepročitani upiti"
          value={data.inquiries.unread}
          hint={`${data.inquiries.last30Days} u 30 dana`}
          href="/admin/inquiries?status=new"
        />
        <StatCard
          label="Istaknute firme"
          value={data.companies.featured}
          hint={`ukupan prihod: ${formatEur(data.revenue.total)}`}
        />
      </div>

      <Panel
        title="Poslednje izmene"
        description="Svaka administratorska radnja se beleži."
        className="mt-8"
      >
        {data.recentAudit.length === 0 ? (
          <p className="text-sm text-muted-foreground">Još nema izmena.</p>
        ) : (
          <ul className="space-y-2.5 text-sm">
            {data.recentAudit.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1"
              >
                <span>{entry.summary}</span>
                <span className="text-xs whitespace-nowrap text-muted-foreground">
                  {formatDateTime(entry.at)}
                </span>
              </li>
            ))}
          </ul>
        )}
        <Link
          href="/admin/audit"
          className="mt-4 inline-block text-sm text-primary underline underline-offset-2"
        >
          Cela evidencija →
        </Link>
      </Panel>
    </>
  );
}

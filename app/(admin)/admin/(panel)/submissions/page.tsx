import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { adminQuery } from "@/lib/admin/convex";
import { requireAdminPage } from "@/lib/admin/guard";
import { formatDateTime } from "@/lib/admin/format";
import { Cell, DataTable, PageHeader, Panel, Row, Tag, statusTone } from "../../ui";
import { COUNTRY_LABEL, SUBMISSION_STATUS } from "../../strings";

const FILTERS = [
  { value: "", label: "Sve" },
  { value: "pending", label: "Na čekanju" },
  { value: "approved", label: "Odobrene" },
  { value: "rejected", label: "Odbijene" },
  { value: "spam", label: "Spam" },
] as const;

type SubmissionStatus = "pending" | "approved" | "rejected" | "spam";

function asStatus(value: string | undefined): SubmissionStatus | undefined {
  return value === "pending" ||
    value === "approved" ||
    value === "rejected" ||
    value === "spam"
    ? value
    : undefined;
}

export default async function SubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdminPage();
  const { status } = await searchParams;
  const active = asStatus(status);
  const rows = await adminQuery(api.admin.listSubmissions, { status: active });

  return (
    <>
      <PageHeader
        title="Prijave firmi"
        description="Prijave sa javne stranice /dodaj-firmu. Firma se objavljuje tek kada je odobrite."
      />

      <nav aria-label="Filter" className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((filter) => {
          const isActive = (active ?? "") === filter.value;
          return (
            <Link
              key={filter.value || "all"}
              href={
                filter.value
                  ? `/admin/submissions?status=${filter.value}`
                  : "/admin/submissions"
              }
              aria-current={isActive ? "page" : undefined}
              className={
                isActive
                  ? "rounded-full border border-primary bg-accent px-3.5 py-1.5 text-sm text-accent-foreground"
                  : "rounded-full border border-border bg-card px-3.5 py-1.5 text-sm transition-colors hover:border-primary"
              }
            >
              {filter.label}
            </Link>
          );
        })}
      </nav>

      <Panel>
        <DataTable
          head={["Firma", "Podnosilac", "Stigla", "Sadržaj", "Status", ""]}
          empty={rows.length === 0 ? "Nema prijava u ovom filteru." : undefined}
        >
          {rows.map((row) => (
            <Row key={row.id}>
              <Cell>
                <Link
                  href={`/admin/submissions/${row.id}`}
                  className="font-medium underline-offset-2 hover:underline"
                >
                  {row.name}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {row.city}
                  {row.country ? `, ${COUNTRY_LABEL[row.country]}` : ""}
                </p>
              </Cell>
              <Cell>
                {row.submitterName}
                <p className="text-xs text-muted-foreground">
                  {row.submitterEmail}
                </p>
              </Cell>
              <Cell className="text-xs whitespace-nowrap text-muted-foreground">
                {formatDateTime(row.createdAt)}
              </Cell>
              <Cell className="text-xs text-muted-foreground">
                {row.mediaCount} sl. · {row.offeringCount} st.
                {row.hasDiscount ? " · popust" : ""}
              </Cell>
              <Cell>
                <Tag tone={statusTone(row.status)}>
                  {SUBMISSION_STATUS[row.status]}
                </Tag>
              </Cell>
              <Cell>
                <Link
                  href={`/admin/submissions/${row.id}`}
                  className="text-sm text-primary underline underline-offset-2"
                >
                  Otvori
                </Link>
              </Cell>
            </Row>
          ))}
        </DataTable>
      </Panel>
    </>
  );
}

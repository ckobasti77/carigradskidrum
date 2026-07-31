import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { adminQuery } from "@/lib/admin/convex";
import { requireAdminPage } from "@/lib/admin/guard";
import { formatDateTime } from "@/lib/admin/format";
import { Cell, DataTable, PageHeader, Panel, Row, Tag } from "../../ui";

const FILTERS = [
  { value: "", label: "Sve" },
  { value: "submission", label: "Prijave" },
  { value: "company", label: "Firme" },
  { value: "subscription", label: "Pretplate" },
  { value: "payment", label: "Uplate" },
] as const;

/** Where a log entry's subject can still be opened, if it exists. */
function entityHref(entityTable: string, entityId: string): string | null {
  if (entityTable === "companies") return `/admin/companies/${entityId}`;
  if (entityTable === "companySubmissions")
    return `/admin/submissions/${entityId}`;
  return null;
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string }>;
}) {
  await requireAdminPage();
  const { action } = await searchParams;
  const active = FILTERS.find((f) => f.value === action)?.value ?? "";

  const rows = await adminQuery(api.admin.listAudit, {
    action: active || undefined,
  });

  return (
    <>
      <PageHeader
        title="Evidencija"
        description="Hronologija administratorskih radnji — poslednjih 200 zapisa."
      />

      <nav aria-label="Filter" className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((filter) => {
          const isActive = active === filter.value;
          return (
            <Link
              key={filter.value || "all"}
              href={
                filter.value
                  ? `/admin/audit?action=${filter.value}`
                  : "/admin/audit"
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
          head={["Vreme", "Radnja", "Opis", ""]}
          empty={rows.length === 0 ? "Nema zapisa." : undefined}
        >
          {rows.map((entry) => {
            const href = entityHref(entry.entityTable, entry.entityId);
            return (
              <Row key={entry.id}>
                <Cell className="text-xs whitespace-nowrap text-muted-foreground">
                  {formatDateTime(entry.at)}
                </Cell>
                <Cell>
                  <Tag>{entry.action}</Tag>
                </Cell>
                <Cell>{entry.summary}</Cell>
                <Cell>
                  {href ? (
                    <Link
                      href={href}
                      className="text-sm text-primary underline underline-offset-2"
                    >
                      Otvori
                    </Link>
                  ) : null}
                </Cell>
              </Row>
            );
          })}
        </DataTable>
      </Panel>
    </>
  );
}

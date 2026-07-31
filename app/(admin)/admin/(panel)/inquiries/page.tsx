import Link from "next/link";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { adminQuery } from "@/lib/admin/convex";
import { requireAdminPage } from "@/lib/admin/guard";
import { formatDateTime } from "@/lib/admin/format";
import { Button } from "@/components/ui/button";
import { Flash, PageHeader, Panel, Tag } from "../../ui";
import { setInquiryStatus } from "../../actions";

const FILTERS = [
  { value: "", label: "Svi" },
  { value: "new", label: "Nepročitani" },
  { value: "read", label: "Pročitani" },
] as const;

export default async function InquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; companyId?: string; ok?: string }>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const status =
    params.status === "new" || params.status === "read"
      ? params.status
      : undefined;

  const rows = await adminQuery(api.admin.listInquiries, {
    status,
    companyId: params.companyId
      ? (params.companyId as Id<"companies">)
      : undefined,
  });

  const returnTo = `/admin/inquiries${params.status ? `?status=${params.status}` : ""}`;

  return (
    <>
      <PageHeader
        title="Upiti"
        description="Poruke koje su posetioci poslali sa profila firmi."
      />

      <Flash ok={params.ok} />

      <nav aria-label="Filter" className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((filter) => {
          const isActive = (status ?? "") === filter.value;
          return (
            <Link
              key={filter.value || "all"}
              href={
                filter.value
                  ? `/admin/inquiries?status=${filter.value}`
                  : "/admin/inquiries"
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
        {params.companyId ? (
          <Link
            href="/admin/inquiries"
            className="rounded-full border border-border bg-card px-3.5 py-1.5 text-sm"
          >
            Ukloni filter po firmi ×
          </Link>
        ) : null}
      </nav>

      {rows.length === 0 ? (
        <Panel>
          <p className="text-sm text-muted-foreground">
            Nema upita u ovom filteru.
          </p>
        </Panel>
      ) : (
        <ul className="space-y-4">
          {rows.map((inquiry) => (
            <li key={inquiry.id}>
              <Panel>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {inquiry.name}{" "}
                      <span className="font-normal text-muted-foreground">
                        · {inquiry.companyName}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(inquiry.at)} · {inquiry.locale.toUpperCase()}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Tag tone={inquiry.status === "new" ? "warning" : "neutral"}>
                      {inquiry.status === "new" ? "Nepročitan" : "Pročitan"}
                    </Tag>
                    <form action={setInquiryStatus}>
                      <input type="hidden" name="inquiryId" value={inquiry.id} />
                      <input
                        type="hidden"
                        name="status"
                        value={inquiry.status === "new" ? "read" : "new"}
                      />
                      <input type="hidden" name="returnTo" value={returnTo} />
                      <Button type="submit" variant="outline" size="sm">
                        {inquiry.status === "new"
                          ? "Označi pročitanim"
                          : "Vrati u nepročitane"}
                      </Button>
                    </form>
                  </div>
                </div>

                <p className="mt-3 rounded-md border border-border bg-background p-3 text-sm whitespace-pre-wrap">
                  {inquiry.message}
                </p>

                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                  <a
                    href={`mailto:${inquiry.email}`}
                    className="text-primary underline underline-offset-2"
                  >
                    {inquiry.email}
                  </a>
                  {inquiry.phone ? (
                    <a
                      href={`tel:${inquiry.phone}`}
                      className="text-muted-foreground underline underline-offset-2"
                    >
                      {inquiry.phone}
                    </a>
                  ) : null}
                  {inquiry.companySlug ? (
                    <a
                      href={`/sr/firma/${inquiry.companySlug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-muted-foreground underline underline-offset-2"
                    >
                      Profil firme
                    </a>
                  ) : null}
                </div>
              </Panel>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

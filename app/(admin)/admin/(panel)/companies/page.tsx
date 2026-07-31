import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { adminQuery } from "@/lib/admin/convex";
import { requireAdminPage } from "@/lib/admin/guard";
import { requestNow } from "@/lib/admin/time";
import { formatDate } from "@/lib/admin/format";
import { Button } from "@/components/ui/button";
import {
  Cell,
  DataTable,
  Flash,
  INPUT_CLASS,
  PageHeader,
  Panel,
  Row,
  Tag,
  statusTone,
} from "../../ui";
import { COMPANY_STATUS, COUNTRY_LABEL } from "../../strings";

type Search = {
  q?: string;
  status?: string;
  tier?: string;
  country?: string;
  category?: string;
  ok?: string;
  error?: string;
};

const STATUSES = ["draft", "pending", "published", "suspended"] as const;
const COUNTRIES = ["AT", "RS", "HR", "BA"] as const;

function pick<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
): T | undefined {
  return allowed.includes(value as T) ? (value as T) : undefined;
}

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  await requireAdminPage();
  const params = await searchParams;

  const rows = await adminQuery(api.admin.listCompanies, {
    now: requestNow(),
    q: params.q || undefined,
    status: pick(params.status, STATUSES),
    tier: pick(params.tier, ["free", "paid"] as const),
    country: pick(params.country, COUNTRIES),
    categorySlug: params.category || undefined,
  });

  return (
    <>
      <PageHeader
        title="Firme"
        description={`${rows.length} ${rows.length === 1 ? "firma" : "firmi"} u trenutnom filteru.`}
      />

      <Flash ok={params.ok} error={params.error} />

      <Panel className="mb-6">
        {/* GET form: filters live in the URL so a filtered view is shareable
            and the browser Back button behaves. */}
        <form className="flex flex-wrap items-end gap-3">
          <label className="min-w-56 flex-1 space-y-1.5">
            <span className="text-sm font-medium">Pretraga</span>
            <input
              name="q"
              defaultValue={params.q ?? ""}
              placeholder="naziv ili slug"
              className={INPUT_CLASS}
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-medium">Status</span>
            <select
              name="status"
              defaultValue={params.status ?? ""}
              className={INPUT_CLASS}
            >
              <option value="">Svi</option>
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {COMPANY_STATUS[status]}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-medium">Paket</span>
            <select
              name="tier"
              defaultValue={params.tier ?? ""}
              className={INPUT_CLASS}
            >
              <option value="">Svi</option>
              <option value="paid">Plaćeni</option>
              <option value="free">Besplatni</option>
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-medium">Država</span>
            <select
              name="country"
              defaultValue={params.country ?? ""}
              className={INPUT_CLASS}
            >
              <option value="">Sve</option>
              {COUNTRIES.map((code) => (
                <option key={code} value={code}>
                  {COUNTRY_LABEL[code]}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit" size="sm">
            Primeni
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/companies">Poništi</Link>
          </Button>
        </form>
      </Panel>

      <Panel>
        <DataTable
          head={["Firma", "Lokacija", "Delatnosti", "Paket", "Status", "Izmenjena"]}
          empty={rows.length === 0 ? "Nema firmi za ovaj filter." : undefined}
        >
          {rows.map((company) => (
            <Row key={company.id}>
              <Cell>
                <Link
                  href={`/admin/companies/${company.id}`}
                  className="font-medium underline-offset-2 hover:underline"
                >
                  {company.name}
                </Link>
                <p className="text-xs text-muted-foreground">/{company.slug}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {company.featured ? <Tag tone="primary">Istaknuta</Tag> : null}
                  {company.acceptsCard ? (
                    <Tag tone="warning">Popust {company.discountPercent}%</Tag>
                  ) : null}
                  {company.claimable ? <Tag>Nepreuzeta</Tag> : null}
                </div>
              </Cell>
              <Cell className="text-sm">
                {company.city}
                <p className="text-xs text-muted-foreground">
                  {COUNTRY_LABEL[company.country]}
                </p>
              </Cell>
              <Cell className="text-xs text-muted-foreground">
                {company.categories.join(", ") || "—"}
              </Cell>
              <Cell>
                <Tag tone={company.tier === "paid" ? "positive" : "neutral"}>
                  {company.tier === "paid" ? "Plaćeni" : "Besplatni"}
                </Tag>
                {company.paidUntil ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    do {formatDate(company.paidUntil)}
                  </p>
                ) : null}
              </Cell>
              <Cell>
                <Tag tone={statusTone(company.status)}>
                  {COMPANY_STATUS[company.status]}
                </Tag>
              </Cell>
              <Cell className="text-xs whitespace-nowrap text-muted-foreground">
                {formatDate(company.updatedAt)}
              </Cell>
            </Row>
          ))}
        </DataTable>
      </Panel>
    </>
  );
}

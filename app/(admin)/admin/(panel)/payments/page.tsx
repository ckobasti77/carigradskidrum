import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { adminQuery } from "@/lib/admin/convex";
import { requireAdminPage } from "@/lib/admin/guard";
import { requestNow } from "@/lib/admin/time";
import {
  formatDate,
  formatEur,
  fromDateInputValue,
  toDateInputValue,
} from "@/lib/admin/format";
import { Button } from "@/components/ui/button";
import {
  AdminField,
  Cell,
  DataTable,
  Flash,
  INPUT_CLASS,
  PageHeader,
  Panel,
  Row,
} from "../../ui";
import { PAYMENT_METHOD } from "../../strings";
import { deletePayment, recordPayment } from "../../actions";

type Search = {
  from?: string;
  to?: string;
  ok?: string;
  error?: string;
};

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  await requireAdminPage();
  const params = await searchParams;

  // Default window: the current calendar year, which is what the owner
  // reconciles against.
  const now = requestNow();
  const yearStart = new Date(now);
  yearStart.setUTCMonth(0, 1);
  yearStart.setUTCHours(0, 0, 0, 0);

  const from = params.from
    ? fromDateInputValue(params.from, yearStart.getTime())
    : yearStart.getTime();
  const to = params.to ? fromDateInputValue(params.to, now) : undefined;

  const [data, companies] = await Promise.all([
    adminQuery(api.admin.listPayments, { from, to }),
    adminQuery(api.admin.companyOptions, {}),
  ]);

  const today = toDateInputValue(now);
  const returnTo = "/admin/payments";

  return (
    <>
      <PageHeader
        title="Uplate"
        description="Evidencija uplata firmi ka platformi."
        actions={
          <Button asChild variant="outline" size="sm">
            <a
              href={`/admin/payments/export?from=${from}${to ? `&to=${to}` : ""}`}
            >
              Preuzmi CSV
            </a>
          </Button>
        }
      />

      <Flash ok={params.ok} error={params.error} />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs tracking-wide text-muted-foreground uppercase">
            Zbir u periodu
          </p>
          <p className="mt-1.5 font-heading text-3xl">{formatEur(data.total)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs tracking-wide text-muted-foreground uppercase">
            Broj uplata
          </p>
          <p className="mt-1.5 font-heading text-3xl">{data.items.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs tracking-wide text-muted-foreground uppercase">
            Prosečna uplata
          </p>
          <p className="mt-1.5 font-heading text-3xl">
            {formatEur(
              data.items.length > 0 ? data.total / data.items.length : 0,
            )}
          </p>
        </div>
      </div>

      <Panel title="Nova uplata" className="mb-6">
        <form
          action={recordPayment}
          className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_8rem_10rem_9rem_9rem_auto]"
        >
          <input type="hidden" name="returnTo" value={returnTo} />
          <AdminField label="Firma">
            <select name="companyId" required className={INPUT_CLASS}>
              <option value="">— izaberite firmu —</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </AdminField>
          <AdminField label="Iznos (€)">
            <input
              name="amountEur"
              type="number"
              step="0.01"
              min="0.01"
              required
              defaultValue={365}
              className={INPUT_CLASS}
            />
          </AdminField>
          <AdminField label="Način">
            <select name="method" className={INPUT_CLASS}>
              {Object.entries(PAYMENT_METHOD).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </AdminField>
          <AdminField label="Datum">
            <input
              name="paidAt"
              type="date"
              defaultValue={today}
              className={INPUT_CLASS}
            />
          </AdminField>
          <AdminField label="Broj računa">
            <input name="invoiceNo" maxLength={60} className={INPUT_CLASS} />
          </AdminField>
          <Button type="submit" className="self-end">
            Evidentiraj
          </Button>
        </form>
      </Panel>

      <Panel className="mb-6">
        <form className="flex flex-wrap items-end gap-3">
          <AdminField label="Od">
            <input
              name="from"
              type="date"
              defaultValue={toDateInputValue(from)}
              className={INPUT_CLASS}
            />
          </AdminField>
          <AdminField label="Do">
            <input
              name="to"
              type="date"
              defaultValue={to ? toDateInputValue(to) : ""}
              className={INPUT_CLASS}
            />
          </AdminField>
          <Button type="submit" size="sm">
            Prikaži
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/payments">Poništi</Link>
          </Button>
        </form>
      </Panel>

      <Panel>
        <DataTable
          head={["Datum", "Firma", "Iznos", "Način", "Račun", "Beleška", ""]}
          empty={
            data.items.length === 0 ? "Nema uplata u ovom periodu." : undefined
          }
        >
          {data.items.map((payment) => (
            <Row key={payment.id}>
              <Cell className="whitespace-nowrap">
                {formatDate(payment.paidAt)}
              </Cell>
              <Cell>
                <Link
                  href={`/admin/companies/${payment.companyId}`}
                  className="underline-offset-2 hover:underline"
                >
                  {payment.companyName}
                </Link>
              </Cell>
              <Cell className="whitespace-nowrap tabular-nums">
                {formatEur(payment.amountEur)}
              </Cell>
              <Cell>{PAYMENT_METHOD[payment.method]}</Cell>
              <Cell className="text-muted-foreground">
                {payment.invoiceNo || "—"}
              </Cell>
              <Cell className="text-muted-foreground">
                {payment.note || "—"}
              </Cell>
              <Cell>
                <form action={deletePayment}>
                  <input type="hidden" name="paymentId" value={payment.id} />
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <button
                    type="submit"
                    className="text-xs text-destructive underline underline-offset-2"
                  >
                    Obriši
                  </button>
                </form>
              </Cell>
            </Row>
          ))}
        </DataTable>
      </Panel>
    </>
  );
}

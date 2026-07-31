import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { adminQuery } from "@/lib/admin/convex";
import { requireAdminPage } from "@/lib/admin/guard";
import { requestNow } from "@/lib/admin/time";
import { formatDate, toDateInputValue } from "@/lib/admin/format";
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
  Tag,
  statusTone,
} from "../../ui";
import { PLAN_LABEL, SUBSCRIPTION_STATUS } from "../../strings";
import {
  activateSubscription,
  deleteSubscription,
  updateSubscription,
} from "../../actions";

const FILTERS = [
  { value: "all", label: "Sve" },
  { value: "active", label: "Aktivne" },
  { value: "expiring", label: "Ističu ≤30 dana" },
  { value: "expired", label: "Istekle" },
] as const;

type Filter = (typeof FILTERS)[number]["value"];

export default async function SubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; ok?: string; error?: string }>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const filter = (FILTERS.find((f) => f.value === params.filter)?.value ??
    "all") as Filter;

  const [rows, companies] = await Promise.all([
    adminQuery(api.admin.listSubscriptions, { now: requestNow(), filter }),
    adminQuery(api.admin.companyOptions, {}),
  ]);

  const today = toDateInputValue(requestNow());

  return (
    <>
      <PageHeader
        title="Pretplate"
        description="Ručna naplata (BILLING_PROVIDER=manual). Stripe polja ostaju prazna do M4."
      />

      <Flash ok={params.ok} error={params.error} />

      <nav aria-label="Filter" className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((item) => {
          const isActive = filter === item.value;
          return (
            <Link
              key={item.value}
              href={`/admin/subscriptions?filter=${item.value}`}
              aria-current={isActive ? "page" : undefined}
              className={
                isActive
                  ? "rounded-full border border-primary bg-accent px-3.5 py-1.5 text-sm text-accent-foreground"
                  : "rounded-full border border-border bg-card px-3.5 py-1.5 text-sm transition-colors hover:border-primary"
              }
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <Panel
        title="Nova pretplata"
        description="Founding partner promo: upišite 14 meseci za cenu godišnjeg plana."
        className="mb-6"
      >
        <form
          action={activateSubscription}
          className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_12rem_10rem_8rem_auto]"
        >
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
          <AdminField label="Plan">
            <select name="plan" className={INPUT_CLASS}>
              {Object.entries(PLAN_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </AdminField>
          <AdminField label="Početak">
            <input
              name="periodStart"
              type="date"
              defaultValue={today}
              className={INPUT_CLASS}
            />
          </AdminField>
          <AdminField label="Meseci">
            <input
              name="months"
              type="number"
              min={1}
              max={60}
              placeholder="12"
              className={INPUT_CLASS}
            />
          </AdminField>
          <Button type="submit" className="self-end">
            Aktiviraj
          </Button>
        </form>
      </Panel>

      <Panel>
        <DataTable
          head={["Firma", "Plan", "Period", "Preostalo", "Status", "Radnje"]}
          empty={rows.length === 0 ? "Nema pretplata u ovom filteru." : undefined}
        >
          {rows.map((subscription) => (
            <Row key={subscription.id}>
              <Cell>
                <Link
                  href={`/admin/companies/${subscription.companyId}`}
                  className="font-medium underline-offset-2 hover:underline"
                >
                  {subscription.companyName}
                </Link>
                {subscription.note ? (
                  <p className="text-xs text-muted-foreground">
                    {subscription.note}
                  </p>
                ) : null}
              </Cell>
              <Cell className="whitespace-nowrap">
                {PLAN_LABEL[subscription.plan]}
              </Cell>
              <Cell className="text-xs whitespace-nowrap text-muted-foreground">
                {formatDate(subscription.periodStart)} —{" "}
                {formatDate(subscription.periodEnd)}
              </Cell>
              <Cell className="whitespace-nowrap tabular-nums">
                {subscription.daysLeft > 0 ? (
                  <span
                    className={
                      subscription.daysLeft <= 30 ? "text-primary" : undefined
                    }
                  >
                    {subscription.daysLeft} d.
                  </span>
                ) : (
                  <span className="text-destructive">isteklo</span>
                )}
              </Cell>
              <Cell>
                <Tag tone={statusTone(subscription.status)}>
                  {SUBSCRIPTION_STATUS[subscription.status]}
                </Tag>
                {subscription.cancelAtPeriodEnd ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    otkazuje se na kraju
                  </p>
                ) : null}
              </Cell>
              <Cell>
                <div className="flex flex-wrap items-center gap-1.5">
                  <form action={updateSubscription}>
                    <input
                      type="hidden"
                      name="subscriptionId"
                      value={subscription.id}
                    />
                    <input type="hidden" name="extendMonths" value="12" />
                    <input
                      type="hidden"
                      name="returnTo"
                      value={`/admin/subscriptions?filter=${filter}`}
                    />
                    <Button type="submit" variant="outline" size="sm">
                      +12 mes.
                    </Button>
                  </form>
                  <form action={updateSubscription}>
                    <input
                      type="hidden"
                      name="subscriptionId"
                      value={subscription.id}
                    />
                    <input type="hidden" name="status" value="canceled" />
                    <input
                      type="hidden"
                      name="returnTo"
                      value={`/admin/subscriptions?filter=${filter}`}
                    />
                    <Button type="submit" variant="ghost" size="sm">
                      Otkaži
                    </Button>
                  </form>
                  <form action={deleteSubscription}>
                    <input
                      type="hidden"
                      name="subscriptionId"
                      value={subscription.id}
                    />
                    <input
                      type="hidden"
                      name="returnTo"
                      value={`/admin/subscriptions?filter=${filter}`}
                    />
                    <button
                      type="submit"
                      className="text-xs text-destructive underline underline-offset-2"
                    >
                      Obriši
                    </button>
                  </form>
                </div>
              </Cell>
            </Row>
          ))}
        </DataTable>
      </Panel>
    </>
  );
}

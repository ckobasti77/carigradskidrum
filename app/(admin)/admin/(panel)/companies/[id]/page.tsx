import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { adminQuery } from "@/lib/admin/convex";
import { requireAdminPage } from "@/lib/admin/guard";
import { requestNow } from "@/lib/admin/time";
import {
  formatDate,
  formatDateTime,
  formatEur,
  toDateInputValue,
} from "@/lib/admin/format";
import { Button } from "@/components/ui/button";
import {
  AdminField,
  Cell,
  DataTable,
  DefinitionList,
  Flash,
  INPUT_CLASS,
  PageHeader,
  Panel,
  Row,
  Tag,
  TEXTAREA_CLASS,
  statusTone,
} from "../../../ui";
import {
  COMPANY_STATUS,
  COUNTRY_LABEL,
  DAYS,
  MEDIA_KIND,
  OFFERING_TYPE,
  PAYMENT_METHOD,
  PLAN_LABEL,
  SUBSCRIPTION_STATUS,
} from "../../../strings";
import {
  activateSubscription,
  deleteCompany,
  deleteCompanyMedia,
  recordPayment,
  setCompanyFeatured,
  setCompanyStatus,
  updateCompany,
} from "../../../actions";

const COUNTRIES = ["AT", "RS", "HR", "BA"] as const;

export default async function CompanyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  await requireAdminPage();
  const { id } = await params;
  const { ok, error } = await searchParams;

  const company = await adminQuery(api.admin.getCompany, {
    companyId: id as Id<"companies">,
    now: requestNow(),
  });
  if (!company) notFound();

  const primary =
    company.locations.find((l) => l.isPrimary) ?? company.locations[0];
  const activeOffer = company.discountOffers.find((o) => o.active) ?? null;
  const returnTo = `/admin/companies/${company.id}`;
  const today = toDateInputValue(requestNow());

  return (
    <>
      <PageHeader
        title={company.name}
        description={`/${company.slug} · izmenjena ${formatDateTime(company.updatedAt)}`}
        actions={
          <>
            <Tag tone={statusTone(company.status)}>
              {COMPANY_STATUS[company.status]}
            </Tag>
            <Tag tone={company.tier === "paid" ? "positive" : "neutral"}>
              {company.tier === "paid" ? "Plaćeni paket" : "Besplatni paket"}
            </Tag>
            <Button asChild variant="outline" size="sm">
              <a
                href={`/sr/firma/${company.slug}`}
                target="_blank"
                rel="noreferrer"
              >
                Javni profil
                <ExternalLink className="size-3.5" aria-hidden="true" />
              </a>
            </Button>
          </>
        }
      />

      <Flash ok={ok} error={error} />

      <div className="mb-6 flex flex-wrap gap-2">
        {(["published", "suspended", "draft"] as const)
          .filter((status) => status !== company.status)
          .map((status) => (
            <form key={status} action={setCompanyStatus}>
              <input type="hidden" name="companyId" value={company.id} />
              <input type="hidden" name="status" value={status} />
              <Button type="submit" variant="outline" size="sm">
                {status === "published"
                  ? "Objavi"
                  : status === "suspended"
                    ? "Suspenduj"
                    : "Vrati u nacrt"}
              </Button>
            </form>
          ))}
        <form action={setCompanyFeatured}>
          <input type="hidden" name="companyId" value={company.id} />
          <input
            type="hidden"
            name="featured"
            value={company.featured ? "false" : "true"}
          />
          <Button type="submit" variant="outline" size="sm">
            {company.featured ? "Ukloni isticanje" : "Istakni"}
          </Button>
        </form>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <Panel title="Osnovni podaci">
            <form action={updateCompany} className="space-y-4">
              <input type="hidden" name="companyId" value={company.id} />

              <div className="grid gap-4 sm:grid-cols-2">
                <AdminField label="Naziv">
                  <input
                    name="name"
                    defaultValue={company.name}
                    required
                    maxLength={200}
                    className={INPUT_CLASS}
                  />
                </AdminField>
                <AdminField
                  label="Slug"
                  hint="Menjanje sluga menja javni URL firme."
                >
                  <input
                    name="slug"
                    defaultValue={company.slug}
                    required
                    maxLength={100}
                    className={INPUT_CLASS}
                  />
                </AdminField>
              </div>

              <AdminField label="Opis (srpski)">
                <textarea
                  name="descriptionSr"
                  rows={4}
                  maxLength={4000}
                  defaultValue={company.descriptionSr}
                  className={TEXTAREA_CLASS}
                />
              </AdminField>
              <AdminField
                label="Opis (nemački)"
                hint="Prazno = nemačkim posetiocima se prikazuje srpski opis."
              >
                <textarea
                  name="descriptionDe"
                  rows={4}
                  maxLength={4000}
                  defaultValue={company.descriptionDe}
                  className={TEXTAREA_CLASS}
                />
              </AdminField>

              <div className="grid gap-4 sm:grid-cols-3">
                <AdminField label="Veb sajt">
                  <input
                    name="website"
                    defaultValue={company.website}
                    maxLength={500}
                    className={INPUT_CLASS}
                  />
                </AdminField>
                <AdminField label="Telefon">
                  <input
                    name="phone"
                    defaultValue={company.phone}
                    maxLength={40}
                    className={INPUT_CLASS}
                  />
                </AdminField>
                <AdminField label="Email">
                  <input
                    name="email"
                    type="email"
                    defaultValue={company.email}
                    maxLength={320}
                    className={INPUT_CLASS}
                  />
                </AdminField>
              </div>

              <fieldset>
                <legend className="text-sm font-medium">Delatnosti</legend>
                <div className="mt-2 grid gap-1.5 rounded-md border border-border p-3 sm:grid-cols-2">
                  {company.allCategories.map((category) => (
                    <label
                      key={category.slug}
                      className="flex cursor-pointer items-center gap-2.5 text-sm"
                    >
                      <input
                        type="checkbox"
                        name="categorySlugs"
                        value={category.slug}
                        defaultChecked={company.categoryIds.includes(category.id)}
                        className="size-4 accent-primary"
                      />
                      {category.name}
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="grid gap-4 sm:grid-cols-4">
                <AdminField label="Država">
                  <select
                    name="country"
                    defaultValue={primary?.country ?? "AT"}
                    className={INPUT_CLASS}
                  >
                    {COUNTRIES.map((code) => (
                      <option key={code} value={code}>
                        {COUNTRY_LABEL[code]}
                      </option>
                    ))}
                  </select>
                </AdminField>
                <AdminField label="Grad">
                  <input
                    name="city"
                    defaultValue={primary?.city ?? ""}
                    required
                    maxLength={120}
                    className={INPUT_CLASS}
                  />
                </AdminField>
                <AdminField label="Adresa">
                  <input
                    name="address"
                    defaultValue={primary?.address ?? ""}
                    maxLength={240}
                    className={INPUT_CLASS}
                  />
                </AdminField>
                <AdminField label="Pošt. broj">
                  <input
                    name="zip"
                    defaultValue={primary?.zip ?? ""}
                    maxLength={20}
                    className={INPUT_CLASS}
                  />
                </AdminField>
              </div>

              <fieldset className="rounded-md border border-border p-4">
                <legend className="px-1 text-sm font-medium">
                  Popust za karticu
                </legend>
                <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                  <input
                    type="checkbox"
                    name="discountEnabled"
                    defaultChecked={activeOffer !== null}
                    className="size-4 accent-primary"
                  />
                  Firma nudi popust
                </label>
                <div className="mt-3 grid gap-4 sm:grid-cols-[8rem_1fr]">
                  <AdminField label="Procenat">
                    <input
                      name="discountPercent"
                      type="number"
                      min={1}
                      max={90}
                      defaultValue={activeOffer?.percent ?? 10}
                      className={INPUT_CLASS}
                    />
                  </AdminField>
                  <AdminField label="Uslovi">
                    <input
                      name="discountTermsSr"
                      defaultValue={activeOffer?.termsSr ?? ""}
                      maxLength={1000}
                      className={INPUT_CLASS}
                    />
                  </AdminField>
                </div>
                {activeOffer?.legacy ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Nasleđena ponuda iz WP migracije — bedž ostaje vidljiv i na
                    besplatnom paketu dok firma ne preuzme profil.
                  </p>
                ) : null}
              </fieldset>

              <Button type="submit">Sačuvaj izmene</Button>
            </form>
          </Panel>

          {company.media.length > 0 ? (
            <Panel title={`Slike (${company.media.length})`}>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {company.media.map((item) => (
                  <li key={item.id}>
                    <div className="aspect-square overflow-hidden rounded-lg border border-border bg-muted">
                      {item.url ? (
                        // eslint-disable-next-line @next/next/no-img-element -- Convex storage URL, admin-only preview
                        <img
                          src={item.url}
                          alt={`${MEDIA_KIND[item.kind]} — ${company.name}`}
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {MEDIA_KIND[item.kind]} · {item.width}×{item.height}
                    </p>
                    <form action={deleteCompanyMedia}>
                      <input type="hidden" name="companyId" value={company.id} />
                      <input type="hidden" name="mediaId" value={item.id} />
                      <button
                        type="submit"
                        className="mt-0.5 text-xs text-destructive underline underline-offset-2"
                      >
                        Obriši
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}

          {company.offerings.length > 0 ? (
            <Panel title={`Proizvodi i usluge (${company.offerings.length})`}>
              <ul className="space-y-2 text-sm">
                {company.offerings.map((offering) => (
                  <li
                    key={offering.id}
                    className="flex flex-wrap items-baseline gap-2 border-b border-border/60 pb-2 last:border-0"
                  >
                    <Tag>{OFFERING_TYPE[offering.type]}</Tag>
                    <span className="font-medium">{offering.nameSr}</span>
                    {offering.descriptionSr ? (
                      <span className="text-muted-foreground">
                        {offering.descriptionSr}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}

          {company.openingHours.length > 0 ? (
            <Panel title="Radno vreme">
              <ul className="space-y-1 text-sm">
                {company.openingHours.map((row) => (
                  <li key={row.day}>
                    <span className="inline-block w-28 text-muted-foreground">
                      {DAYS[row.day]}
                    </span>
                    {row.open}–{row.close}
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}

          <Panel
            title="Uplate"
            description={`Ukupno ${formatEur(company.payments.reduce((sum, p) => sum + p.amountEur, 0))}`}
          >
            <form
              action={recordPayment}
              className="mb-5 grid gap-3 sm:grid-cols-[8rem_10rem_9rem_1fr_auto]"
            >
              <input type="hidden" name="companyId" value={company.id} />
              <input type="hidden" name="returnTo" value={returnTo} />
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
              <Button type="submit" size="sm" className="self-end">
                Evidentiraj
              </Button>
            </form>

            <DataTable
              head={["Datum", "Iznos", "Način", "Račun"]}
              empty={
                company.payments.length === 0
                  ? "Još nema evidentiranih uplata."
                  : undefined
              }
            >
              {company.payments.map((payment) => (
                <Row key={payment.id}>
                  <Cell className="whitespace-nowrap">
                    {formatDate(payment.paidAt)}
                  </Cell>
                  <Cell className="whitespace-nowrap tabular-nums">
                    {formatEur(payment.amountEur)}
                  </Cell>
                  <Cell>{PAYMENT_METHOD[payment.method]}</Cell>
                  <Cell className="text-muted-foreground">
                    {payment.invoiceNo || "—"}
                  </Cell>
                </Row>
              ))}
            </DataTable>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Pretplata">
            {company.subscriptions.length > 0 ? (
              <ul className="mb-5 space-y-3 text-sm">
                {company.subscriptions.map((subscription) => (
                  <li
                    key={subscription.id}
                    className="rounded-md border border-border p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Tag tone={statusTone(subscription.status)}>
                        {SUBSCRIPTION_STATUS[subscription.status]}
                      </Tag>
                      <span>{PLAN_LABEL[subscription.plan]}</span>
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {formatDate(subscription.periodStart)} —{" "}
                      {formatDate(subscription.periodEnd)}
                      {subscription.cancelAtPeriodEnd
                        ? " · otkazuje se na kraju perioda"
                        : ""}
                    </p>
                    {subscription.note ? (
                      <p className="mt-1 text-xs">{subscription.note}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mb-5 text-sm text-muted-foreground">
                Firma nema pretplatu — profil je na besplatnom paketu.
              </p>
            )}

            <form action={activateSubscription} className="space-y-3">
              <input type="hidden" name="companyId" value={company.id} />
              <input type="hidden" name="returnTo" value={returnTo} />
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
              <AdminField
                label="Broj meseci"
                hint="Prazno = 12 za godišnji, 1 za mesečni. Founding partner: upišite 14."
              >
                <input
                  name="months"
                  type="number"
                  min={1}
                  max={60}
                  placeholder="12"
                  className={INPUT_CLASS}
                />
              </AdminField>
              <AdminField label="Beleška">
                <input name="note" maxLength={300} className={INPUT_CLASS} />
              </AdminField>
              <Button type="submit" size="sm" className="w-full">
                Aktiviraj pretplatu
              </Button>
            </form>
          </Panel>

          <Panel title="Podaci">
            <DefinitionList
              rows={[
                ["Kreirana", formatDate(company.createdAt)],
                ["Prijavljena", formatDate(company.submittedAt)],
                ["Objavljena", formatDate(company.publishedAt)],
                ["Plaćeno do", formatDate(company.paidUntil)],
                ["WP id", company.wpId ? String(company.wpId) : "—"],
                [
                  "Upiti",
                  `${company.inquiryCount} (${company.unreadInquiries} nepročitanih)`,
                ],
              ]}
            />
            <Link
              href={`/admin/inquiries?companyId=${company.id}`}
              className="mt-3 inline-block text-sm text-primary underline underline-offset-2"
            >
              Upiti ove firme →
            </Link>
          </Panel>

          <Panel
            title="Brisanje firme"
            description="Trajno briše profil, lokacije, ponude, slike, upite, pretplate i uplate. Ne može se poništiti."
          >
            <form action={deleteCompany} className="space-y-3">
              <input type="hidden" name="companyId" value={company.id} />
              <input type="hidden" name="expectedName" value={company.name} />
              <AdminField
                label="Potvrda"
                hint={`Upišite tačan naziv: ${company.name}`}
              >
                <input
                  name="confirmName"
                  required
                  autoComplete="off"
                  className={INPUT_CLASS}
                />
              </AdminField>
              <Button type="submit" variant="destructive" size="sm">
                Obriši firmu
              </Button>
            </form>
          </Panel>
        </div>
      </div>
    </>
  );
}

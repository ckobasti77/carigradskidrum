import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, TriangleAlert } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { adminQuery } from "@/lib/admin/convex";
import { requireAdminPage } from "@/lib/admin/guard";
import { formatDateTime } from "@/lib/admin/format";
import { Button } from "@/components/ui/button";
import {
  AdminField,
  DefinitionList,
  Flash,
  INPUT_CLASS,
  PageHeader,
  Panel,
  Tag,
  TEXTAREA_CLASS,
  statusTone,
} from "../../../ui";
import {
  COUNTRY_LABEL,
  DAYS,
  MEDIA_KIND,
  OFFERING_TYPE,
  SUBMISSION_STATUS,
} from "../../../strings";
import {
  approveSubmission,
  rejectSubmission,
  saveSubmissionNote,
} from "../../../actions";

export default async function SubmissionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  await requireAdminPage();
  const { id } = await params;
  const { ok, error } = await searchParams;

  const submission = await adminQuery(api.admin.getSubmission, {
    submissionId: id as Id<"companySubmissions">,
  });
  if (!submission) notFound();

  const payload = submission.payload;
  const primary =
    payload.locations.find((l) => l.isPrimary) ?? payload.locations[0];
  const decided = submission.status !== "pending";

  return (
    <>
      <PageHeader
        title={payload.name}
        description={`Prijava stigla ${formatDateTime(submission.createdAt)} · jezik: ${submission.locale.toUpperCase()}`}
        actions={
          <>
            <Tag tone={statusTone(submission.status)}>
              {SUBMISSION_STATUS[submission.status]}
            </Tag>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/submissions">Nazad na listu</Link>
            </Button>
          </>
        }
      />

      <Flash ok={ok} error={error} />

      {submission.companyId ? (
        <p className="mb-6 rounded-lg border border-sage-300 bg-sage-100 p-3 text-sm">
          Objavljena firma:{" "}
          <Link
            href={`/admin/companies/${submission.companyId}`}
            className="underline underline-offset-2"
          >
            otvori u administraciji
          </Link>
        </p>
      ) : null}

      {submission.similar.length > 0 && !decided ? (
        <div className="mb-6 rounded-lg border border-terracotta-300 bg-terracotta-100 p-4 text-sm">
          {/* Search-index matches are fuzzy by design, so this is a "look
              before you publish" hint, not a duplicate verdict. */}
          <p className="flex items-center gap-2 font-medium">
            <TriangleAlert className="size-4" aria-hidden="true" />
            Slične firme u direktorijumu — proverite da nije duplikat
          </p>
          <ul className="mt-2 space-y-1">
            {submission.similar.map((company) => (
              <li key={company.slug}>
                <a
                  href={`/sr/firma/${company.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-2"
                >
                  {company.name}
                </a>
                <span className="text-muted-foreground">
                  {" "}
                  — {company.city} ({company.status})
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <Panel title="Podaci o firmi">
            <DefinitionList
              rows={[
                ["Naziv", payload.name],
                [
                  "Delatnosti",
                  submission.categories.length > 0 ? (
                    <span className="flex flex-wrap gap-1.5">
                      {submission.categories.map((category) => (
                        <Tag
                          key={category.slug}
                          tone={category.missing ? "danger" : "neutral"}
                        >
                          {category.name}
                        </Tag>
                      ))}
                    </span>
                  ) : (
                    "—"
                  ),
                ],
                ["Opis (sr)", payload.descriptionSr || "—"],
                ["Opis (de)", payload.descriptionDe || "—"],
                [
                  "Lokacija",
                  primary
                    ? [
                        primary.address,
                        [primary.zip, primary.city].filter(Boolean).join(" "),
                        COUNTRY_LABEL[primary.country],
                      ]
                        .filter(Boolean)
                        .join(", ")
                    : "—",
                ],
                [
                  "Veb",
                  payload.website ? (
                    <a
                      href={payload.website}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 underline underline-offset-2"
                    >
                      {payload.website}
                      <ExternalLink className="size-3.5" aria-hidden="true" />
                    </a>
                  ) : (
                    "—"
                  ),
                ],
                ["Telefon", payload.phone || "—"],
                ["Email firme", payload.email || "—"],
                [
                  "Radno vreme",
                  payload.openingHours && payload.openingHours.length > 0
                    ? payload.openingHours
                        .map(
                          (row) => `${DAYS[row.day]} ${row.open}–${row.close}`,
                        )
                        .join(" · ")
                    : "—",
                ],
                [
                  "Popust",
                  payload.discountOffer
                    ? `${payload.discountOffer.percent}%${payload.discountOffer.termsSr ? ` — ${payload.discountOffer.termsSr}` : ""}`
                    : "—",
                ],
              ]}
            />
          </Panel>

          {payload.offerings.length > 0 ? (
            <Panel title={`Proizvodi i usluge (${payload.offerings.length})`}>
              <ul className="space-y-2 text-sm">
                {payload.offerings.map((offering, index) => (
                  <li
                    key={index}
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

          {submission.media.length > 0 ? (
            <Panel title={`Slike (${submission.media.length})`}>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {submission.media.map((item) => (
                  <li key={item.storageId}>
                    <div className="aspect-square overflow-hidden rounded-lg border border-border bg-muted">
                      {item.url ? (
                        // eslint-disable-next-line @next/next/no-img-element -- Convex storage URL, admin-only preview
                        <img
                          src={item.url}
                          alt={`${MEDIA_KIND[item.kind]} — ${payload.name}`}
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {MEDIA_KIND[item.kind]} · {item.width}×{item.height}
                    </p>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}
        </div>

        <div className="space-y-6">
          <Panel title="Podnosilac">
            <DefinitionList
              rows={[
                ["Ime", submission.submitter.name],
                [
                  "Email",
                  <a
                    key="email"
                    href={`mailto:${submission.submitter.email}`}
                    className="underline underline-offset-2"
                  >
                    {submission.submitter.email}
                  </a>,
                ],
                ["Telefon", submission.submitter.phone ?? "—"],
                ["Uloga", submission.submitter.role ?? "—"],
              ]}
            />
          </Panel>

          {submission.status === "pending" ? (
            <>
              <Panel
                title="Objavi firmu"
                description="Podatke možete izmeniti pre objave."
              >
                <form action={approveSubmission} className="space-y-4">
                  <input type="hidden" name="submissionId" value={submission.id} />

                  <AdminField label="Naziv">
                    <input
                      name="name"
                      defaultValue={payload.name}
                      required
                      maxLength={200}
                      className={INPUT_CLASS}
                    />
                  </AdminField>

                  <AdminField
                    label="Slug (URL)"
                    hint="Ostavite prazno da se izvede iz naziva. Zauzet slug dobija sufiks."
                  >
                    <input
                      name="slug"
                      placeholder="auto-servis-nikolic"
                      maxLength={100}
                      className={INPUT_CLASS}
                    />
                  </AdminField>

                  <fieldset>
                    <legend className="text-sm font-medium">Delatnosti</legend>
                    <div className="mt-2 max-h-56 space-y-1.5 overflow-y-auto rounded-md border border-border p-3">
                      {submission.allCategories.map((category) => (
                        <label
                          key={category.slug}
                          className="flex cursor-pointer items-center gap-2.5 text-sm"
                        >
                          <input
                            type="checkbox"
                            name="categorySlugs"
                            value={category.slug}
                            defaultChecked={payload.categorySlugs.includes(
                              category.slug,
                            )}
                            className="size-4 accent-primary"
                          />
                          {category.name}
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <AdminField
                    label="Popust (%)"
                    hint="Prazno = bez ponude popusta. Bedž se prikazuje tek uz plaćeni paket."
                  >
                    <input
                      name="discountPercent"
                      type="number"
                      min={1}
                      max={90}
                      defaultValue={payload.discountOffer?.percent ?? ""}
                      className={INPUT_CLASS}
                    />
                  </AdminField>

                  <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                    <input
                      type="checkbox"
                      name="featured"
                      className="size-4 accent-primary"
                    />
                    Istakni firmu na početnoj
                  </label>

                  <Button type="submit" className="w-full">
                    Objavi firmu
                  </Button>
                </form>
              </Panel>

              <Panel
                title="Odbij prijavu"
                description="Slike se odmah brišu iz skladišta."
              >
                <form action={rejectSubmission} className="space-y-4">
                  <input type="hidden" name="submissionId" value={submission.id} />
                  <AdminField
                    label="Razlog"
                    hint="Šalje se podnosiocu. Kod spama se ne šalje ništa."
                  >
                    <textarea
                      name="reason"
                      rows={3}
                      maxLength={2000}
                      className={TEXTAREA_CLASS}
                    />
                  </AdminField>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="submit"
                      name="status"
                      value="rejected"
                      variant="outline"
                      size="sm"
                    >
                      Odbij
                    </Button>
                    <Button
                      type="submit"
                      name="status"
                      value="spam"
                      variant="destructive"
                      size="sm"
                    >
                      Označi kao spam
                    </Button>
                  </div>
                </form>
              </Panel>
            </>
          ) : (
            <Panel title="Odluka">
              <DefinitionList
                rows={[
                  ["Status", SUBMISSION_STATUS[submission.status]],
                  [
                    "Obrađeno",
                    submission.reviewedAt
                      ? formatDateTime(submission.reviewedAt)
                      : "—",
                  ],
                  ["Razlog", submission.rejectReason ?? "—"],
                ]}
              />
            </Panel>
          )}

          <Panel title="Interna beleška">
            <form action={saveSubmissionNote} className="space-y-3">
              <input type="hidden" name="submissionId" value={submission.id} />
              <textarea
                name="adminNote"
                rows={4}
                maxLength={4000}
                defaultValue={submission.adminNote ?? ""}
                className={TEXTAREA_CLASS}
                aria-label="Interna beleška"
              />
              <Button type="submit" variant="outline" size="sm">
                Sačuvaj belešku
              </Button>
            </form>
          </Panel>
        </div>
      </div>
    </>
  );
}

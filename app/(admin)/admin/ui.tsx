/**
 * Presentational building blocks shared by the admin pages. All server
 * components — the admin panel renders on the server and mutates through
 * Server Actions, so there is no Convex client and no secret in the browser.
 */
import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl tracking-tight">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function Panel({
  title,
  description,
  children,
  className,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn("rounded-lg border border-border bg-card p-5", className)}
    >
      {title ? <h2 className="text-lg">{title}</h2> : null}
      {description ? (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      ) : null}
      <div className={title || description ? "mt-4" : undefined}>{children}</div>
    </section>
  );
}

const TONE_CLASSES = {
  neutral: "border-border bg-muted text-muted-foreground",
  positive: "border-sage-300 bg-sage-100 text-sage-900",
  warning: "border-terracotta-300 bg-terracotta-100 text-terracotta-900",
  danger: "border-destructive/40 bg-destructive/10 text-destructive",
  primary: "border-primary/40 bg-accent text-accent-foreground",
} as const;

export type Tone = keyof typeof TONE_CLASSES;

export function Tag({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: Tone;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs whitespace-nowrap",
        TONE_CLASSES[tone],
      )}
    >
      {children}
    </span>
  );
}

export function statusTone(status: string): Tone {
  switch (status) {
    case "published":
    case "approved":
    case "active":
      return "positive";
    case "pending":
    case "past_due":
      return "warning";
    case "suspended":
    case "rejected":
    case "spam":
    case "expired":
      return "danger";
    default:
      return "neutral";
  }
}

export function StatCard({
  label,
  value,
  hint,
  href,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
  tone?: Tone;
}) {
  const body = (
    <>
      <p className="text-xs tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p
        className={cn(
          "mt-1.5 font-heading text-3xl",
          tone === "warning" && "text-primary",
          tone === "danger" && "text-destructive",
        )}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </>
  );

  const className =
    "block rounded-lg border border-border bg-card p-4 transition-colors";

  return href ? (
    <Link href={href} className={cn(className, "hover:border-primary")}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

export function DataTable({
  head,
  children,
  empty,
}: {
  head: ReactNode[];
  children: ReactNode;
  empty?: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[40rem] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            {head.map((cell, index) => (
              <th
                key={index}
                className="px-3 py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase"
              >
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
      {empty ? (
        <p className="px-3 py-8 text-center text-sm text-muted-foreground">
          {empty}
        </p>
      ) : null}
    </div>
  );
}

export function Row({ children }: { children: ReactNode }) {
  return (
    <tr className="border-b border-border/60 align-top last:border-0">
      {children}
    </tr>
  );
}

export function Cell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <td className={cn("px-3 py-3", className)}>{children}</td>;
}

export function DefinitionList({
  rows,
}: {
  rows: Array<[string, ReactNode]>;
}) {
  return (
    <dl className="grid gap-x-4 gap-y-2.5 text-sm sm:grid-cols-[minmax(0,11rem)_1fr]">
      {rows.map(([label, value], index) => (
        <div key={`${label}-${index}`} className="contents">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="break-words whitespace-pre-wrap">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Consistent form field chrome for the admin's plain HTML forms. */
export function AdminField({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

const FLASH_MESSAGES: Record<string, string> = {
  approved: "Firma je objavljena i keš javnog sajta je osvežen.",
  rejected: "Prijava je odbijena, podnosilac je obavešten.",
  spam: "Prijava je označena kao spam (bez obaveštenja).",
  note: "Beleška je sačuvana.",
  saved: "Izmene su sačuvane.",
  status: "Status je promenjen.",
  featured: "Isticanje je promenjeno.",
  media: "Slika je obrisana.",
  deleted: "Obrisano.",
  activated: "Pretplata je aktivirana.",
  updated: "Pretplata je izmenjena.",
  payment: "Uplata je evidentirana.",
  payment_deleted: "Uplata je obrisana.",
};

const FLASH_ERRORS: Record<string, string> = {
  not_found: "Zapis ne postoji.",
  already_approved: "Prijava je već odobrena.",
  no_categories: "Morate izabrati bar jednu delatnost.",
  no_location: "Prijava nema lokaciju.",
  invalid: "Podaci nisu ispravni.",
  invalid_amount: "Iznos mora biti veći od nule.",
  invalid_months: "Broj meseci mora biti između 1 i 60.",
  confirm: "Naziv se ne poklapa — brisanje je otkazano.",
  greska: "Radnja nije uspela. Pokušajte ponovo.",
};

/** Outcome banner driven by the ?ok= / ?error= params the actions redirect with. */
export function Flash({ ok, error }: { ok?: string; error?: string }) {
  if (error) {
    return (
      <p
        role="alert"
        className="mb-6 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
      >
        {FLASH_ERRORS[error] ?? FLASH_ERRORS.greska}
      </p>
    );
  }
  if (ok) {
    return (
      <p
        role="status"
        className="mb-6 rounded-lg border border-sage-300 bg-sage-100 p-3 text-sm"
      >
        {FLASH_MESSAGES[ok] ?? "Gotovo."}
      </p>
    );
  }
  return null;
}

export const INPUT_CLASS =
  "h-11 w-full rounded-md border border-input bg-background px-3 text-sm transition-colors hover:border-neutral-400 focus-visible:border-primary";

export const TEXTAREA_CLASS =
  "min-h-24 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm transition-colors hover:border-neutral-400 focus-visible:border-primary";

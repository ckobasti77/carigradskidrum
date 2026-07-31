/**
 * Formatting helpers for the admin panel. `sr-Latn-RS` everywhere and an
 * explicit UTC-free local rendering, so a timestamp always reads the same on
 * the server-rendered HTML as it does in the operator's head.
 */

const DATE_TIME = new Intl.DateTimeFormat("sr-Latn-RS", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Vienna",
});

const DATE_ONLY = new Intl.DateTimeFormat("sr-Latn-RS", {
  dateStyle: "medium",
  timeZone: "Europe/Vienna",
});

const EUR = new Intl.NumberFormat("sr-Latn-RS", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});

export function formatDateTime(ms: number): string {
  return DATE_TIME.format(new Date(ms));
}

export function formatDate(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return "—";
  return DATE_ONLY.format(new Date(ms));
}

export function formatEur(amount: number): string {
  return EUR.format(amount);
}

/** `<input type="date">` needs a plain YYYY-MM-DD value. */
export function toDateInputValue(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Parses a YYYY-MM-DD form value at local noon to dodge DST edge cases. */
export function fromDateInputValue(value: string, fallback: number): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return fallback;
  const parsed = Date.parse(`${value}T12:00:00.000Z`);
  return Number.isNaN(parsed) ? fallback : parsed;
}

/**
 * Wall clock for one admin request.
 *
 * Same convention as `hourNow()` in lib/data.ts: the timestamp is read through
 * a named helper instead of calling `Date.now()` inside a component body. Admin
 * pages are `force-dynamic` async Server Components that render exactly once
 * per request, so the value is stable for that render — but keeping the call
 * out of the render body is what the react-hooks purity rule (correctly) asks
 * for, and it names the intent: "now, as of this request".
 *
 * Unlike the public directory, admin reads are NOT rounded to the hour: a
 * moderation queue and a "expires in N days" column must show live values.
 */
export function requestNow(): number {
  return Date.now();
}

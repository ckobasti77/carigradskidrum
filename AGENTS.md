<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Vibe Coding Workflow

This repository is a zero-config starter for people who describe websites in
plain language. Make the requested website, not a generic demo or a different
product.

## Before making changes

1. Read this file, `package.json`, the relevant existing files, and the
   matching documentation under `node_modules/next/dist/docs/`.
2. Inspect the available skills in the current agent environment. Use a skill
   only when it is actually available; never claim to have used one otherwise.
3. Ask a question only when the answer would materially change the product.
   Otherwise make a sensible, explicit assumption and continue.

## Design and UX process

For a UI task, use this order whenever the named skills are available:

1. **Taste** — select the subtype that matches the product and audience.
2. **UI UX Pro Max** — use it to review hierarchy, flows, accessibility, and
   interaction details.
3. **Frontend Design** — use it to make deliberate typography, color, layout,
   copy, and motion decisions.
4. **Design-to-Code** — use it when the user supplies a screenshot, Figma
   reference, or another visual source of truth.

When any of those skills is unavailable, follow this fallback before coding:

- State the audience, the page's single job, and the intended visual direction.
- Define a compact design system: palette, type roles, layout rhythm, and one
  signature detail that belongs to this specific product.
- Reject generic AI-dashboard styling, arbitrary gradients, placeholder copy,
  and decoration that has no purpose.
- Design responsive layouts, keyboard focus states, readable contrast, reduced
  motion behavior, and useful empty and error states.

Do not apply one visual style to every project. Each website needs an
intentional direction based on its subject and audience.

## Implementation rules

- Use the App Router and Server Components by default. Add `"use client"` only
  at the smallest boundary that needs browser state, effects, or events.
- Use Tailwind CSS and the shadcn/ui primitives in `components/ui` first. Add a
  shadcn component only when the requested experience needs it.
- Use `lucide-react` for interface icons. Icons need an accessible label when
  their purpose is not already clear from nearby text.
- Use Framer Motion for local UI transitions. Use GSAP only for a purposeful
  timeline or scroll sequence, keep it inside a client component, clean up its
  context, and honor `prefers-reduced-motion`. Do not duplicate one animation
  with both libraries.
- Prefer semantic HTML, `next/image` for real images, and `next/link` for
  internal navigation. Keep CSS imports global only in the root layout and use
  CSS Modules only for component-specific behavior that Tailwind cannot express
  clearly.
- Do not add Convex, authentication, a database, CMS, analytics, or another
  dependency unless the user explicitly requests it. If a feature needs
  environment variables, add documented placeholders to `.env.example`; never
  commit secrets.
- Preserve user changes and keep the work narrowly scoped to the requested
  website.

## Finish every task

1. Run `npm run check`.
2. When a browser is available, inspect the changed UI at desktop and mobile
   widths and exercise its interactive paths.
3. Fix console errors, broken loading/error/empty states, accessibility
   regressions, and visual overflow before reporting completion.
4. Report the result in plain language: what changed, which commands passed,
   and any assumption or next manual step.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->

# Project: Carigradski Drum 2.0

Bilingual (sr/de) B2B/B2C business directory with a self-serve claim → subscribe
funnel. Stack: Next.js 16.2 (App Router, Turbopack), Convex (DB/functions/storage;
Convex Auth in M2), Tailwind v4 (tokens in app/globals.css), shadcn/ui, GSAP +
Framer Motion, Resend, Stripe behind BILLING_PROVIDER (M4). Deploy: Vercel +
Convex prod. Original brief: docs/brief.md. Implementation plan sections M2–M5
continue from the approved plan.

## Commands
- `npm run dev` + `npx convex dev` during development
- `npm run check` — eslint + build; MUST pass before done (CI runs it)
- `npx convex run seed:seedCategories '{}'` — upsert the 13 categories (before migration)
- `npx tsx scripts/migrate-wp.ts [--push] [--fresh]` — WP migration (idempotent via
  wpId; reads .env.migration.local; caches exports under scripts/out/)

## Next 16 gotchas (docs: node_modules/next/dist/docs — read before any new API)
- `proxy.ts`, NOT middleware.ts (nodejs runtime). `unstable_rootParams` is REMOVED —
  that is why root layouts live at `app/(site)/[locale]/layout.tsx` (and a future
  `app/(admin)/admin/` gets its own). There is NO `app/layout.tsx` — required for
  multiple root layouts. Do not "simplify" this structure.
- `params`/`searchParams`/`cookies()`/`headers()` are Promises — always await.
- `cacheComponents` is OFF: use `export const revalidate`, `generateStaticParams`,
  `unstable_cache`. NEVER `use cache`/`cacheLife`/`cacheTag`.
- CRITICAL: `fetchQuery` from convex/nextjs is hardcoded no-store. Public RSC data
  goes ONLY through lib/data.ts (unstable_cache wrappers with tags). Direct
  fetchQuery in a cached page silently kills ISR — `next build` must show ● for
  /[locale]/firma/[slug].
- KNOWN BUG (verified in prod build, Next 16.2.12 + React 19.2.8): a `loading.tsx`
  on /[locale]/firma/[slug] leaves the page's Suspense boundary permanently
  DEHYDRATED — content renders but no client component in it ever hydrates (forms
  do native GET submits, leaflet never boots). loading.tsx was therefore removed
  there; do not re-add one without re-verifying hydration on a production build.
- `revalidateTag(tag, "max")` — 2nd arg required (see app/api/revalidate).
  error.tsx uses `unstable_retry`, not `reset`.
- images.remotePatterns derives the host from NEXT_PUBLIC_CONVEX_URL via new URL()
  — "*.convex.cloud" does NOT match multi-label hosts.
- Never add webpack config (Turbopack build fails). `next lint` does not exist.

## Convex rules
- Read convex/_generated/ai/guidelines.md BEFORE any Convex code.
- Module filenames: alphanumeric/underscore/period ONLY (no hyphens — deploy fails).
- This convex version has no generated `env` export and no defineApp({ env }) —
  read deployment env through convex/lib/env.ts (typed process.env shim).
- Validate args with v.* from convex/lib/validators.ts. Client input NEVER decides
  entitlements: convex/lib/entitlements.ts is the only source of paid-feature
  truth; effectiveTier() is read-time (14-day grace); the cron janitor (M3) only
  flips tier AFTER grace and sends mail.
- Directory reads: one bounded indexed scan + in-handler filters, capped at 300
  results, NO .paginate in directory queries (documented ceiling ~1000 companies,
  revisit at 2000). Queries never read Date.now() — callers pass hour-rounded `now`.
- Any write touching name/description/categories/locations MUST recompute
  searchTextSr/De via convex/lib/searchText.ts (folded; German ä/ö/ü get BOTH
  plain and ae/oe/ue variants in the INDEX, queries fold plain — see lib/fold.ts).
  Search aliases live in convex/lib/aliases.ts — extend them, then re-run the
  migration push (or any write) to refresh columns.
- Deleting company/media MUST delete _storage files (no auto GC).
- Company statuses: draft | pending | published | suspended. "Unclaimed" is
  DERIVED: published && !ownerId — never a status literal.

## i18n rules
- Locales sr (default, x-default) + de, both prefixed; proxy.ts 307-redirects
  unprefixed paths (cookie > Accept-Language > sr; hr/bs/sh/sl/mk map to sr).
- UI strings only from lib/i18n/dictionaries/{sr,de}.json — never hardcode
  user-facing text; de.json is typed `satisfies typeof sr` (missing key fails
  the build). de.json carries a TODO-REVIEW meta note until the M5 native pass.
- Public URL segments are localized-Serbian BY DESIGN (documented exception;
  /firma per the brief); account/admin segments and ALL files/identifiers/commits
  are English. Company `name` is one field; descriptions are per-locale with
  read-time fallback. City names are stored in Serbian form ("Beč") — displayed
  as-is in both locales in v1.
- Interpolation: use t() from lib/i18n/format.ts in client code (importing
  dictionaries.ts from a client file would pull both dictionaries into the bundle).

## Product rules
- Plans: yearly_365 (EUR 365), monthly_45 (EUR 45). Free shows website + LEGACY
  discount badges (migrated partners, grandfathered until claimed — discountOffers.legacy);
  paid unlocks contact/hours/gallery(12)/offerings(20)/priority/featured/new badges.
  Write caps apply to everyone; the tier gates DISPLAY only.
- Founding-partner promo: 14 months for 12 (manual activation in v1).
- Inquiries: honeypot `website2` + rate limits (10/24h per company, 3/24h per
  company+email); relay falls back to eintragsservice@carigradskidrum.com; email
  sends skip gracefully without RESEND_API_KEY.
- M1 claim CTA routes to /dodaj-firmu; M2 swaps it to /{locale}/account/claim/[slug]
  and replaces ConvexProvider with ConvexAuthProvider inside components/providers.tsx.

## Design & motion
- Tokens only from app/globals.css @theme (warm light, terracotta primary). No
  arbitrary hex in components. No dark mode in v1.
- GSAP only inside useGSAP (@gsap/react); purposeful sequences (hero, reveals,
  RouteLine — M5); 0.2–0.4s; transform/opacity only; everything off under
  prefers-reduced-motion. Framer for micro-interactions + template.tsx page
  transitions (M5). Never both libs on one element.

## Do / Don't
- DO keep public pages ISR through lib/data.ts; future /account + /admin are
  client-only + noindex and never in the sitemap.
- DO update .env.example with every new env var. DO wrap build-time Convex reads
  in try/catch → empty fallback (CI has no deployment; completeness is verified
  on a Vercel preview).
- DON'T add dependencies beyond the approved list (see .env.example header and
  plan §2.8) without written justification.
- DON'T hand-edit scripts/out/* or redirects/legacy-redirects.json — regenerate
  via scripts/migrate-wp.ts.
- DON'T ship a page without empty/error states and keyboard navigation.

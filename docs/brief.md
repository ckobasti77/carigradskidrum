# PROJECT BRIEF — "Carigradski Drum 2.0": Self-Serve B2B/B2C Directory Platform (Austria ↔ Serbia / Western Balkans)

> Original client brief (2026-07-30), committed for reference. The approved implementation
> plan derived from it lives with the project owner; locked decisions are summarized at the end.

## 1. Role
Act as a senior full-stack product engineer and UI/UX lead (12+ years) who has shipped multiple marketplace/directory SaaS products on Next.js + Convex, ruthless about simplicity, intuitive UX and SEO.

## 2. Current state — verified facts about https://carigradskidrum.com/
- WordPress site (Slider Revolution + a directory/listings plugin — verified: Listeo theme + listeo-core), bilingual Serbian (`/sr/…`) and German (default, unprefixed), WP login with roles "Gast" and "Eigentümer".
- Purpose: connects clients and companies from Austria and the Balkans (focus Serbia, some Croatia) — trades, services, real estate, healthcare, transport, products. Tagline spirit: "Za nekoga sve, za svakog po nešto."
- Homepage categories (~13): Građevinarstvo; Nekretnine (prodaja i izdavanje); Servisi i kućne zanatske usluge; Auto; Prevoz putnika i robe; Proizvodnja i prodaja; Trgovina; Zdravlje i medicina; Nega lica i tela; Pravne / prevodilačke / knjigovodstvene / finansijske / IT usluge; Turizam; Ugostiteljstvo; Kultura i umetnost.
- Listing detail page: company name, category tags, region, address + Google Maps "Get Directions" (lat/lng — NOTE: swapped in markup), cover image, website link, optional discount badge (e.g. "10% sa Carigradski drum karticom"), similar listings, social share.
- All 85 listings added manually by admin account "Eintragsservice", with a note inviting owners to claim their listing by email (eintragsservice@carigradskidrum.com). This manual process is the core problem being solved.
- Loyalty product: "Carigradski Drum kartica" — holders get discounts at flagged companies (in practice 5–20%, 7 of 85 listings).
- Technical debt fixed by the rebuild: regions (Austrija, Srbija, Kroatien) mixed into the business-category taxonomy; whole site noindex,nofollow; no self-service, no payments, no owner dashboard.

## 3. Product vision
1. All existing companies migrated as "unclaimed" listings (basic info visible) → the directory is full on day one.
2. A company owner registers, claims their listing (or creates a new one), builds a full profile through a guided wizard (activity/category, products, services, media, locations, discount offer); it goes live after admin approval.
3. Monetization: subscription €365/year plus a monthly plan (decided: €45/month). Paid = full rich profile, priority placement, discount-partner badge. Unpaid/unclaimed = minimal listing.
4. Stripe handles billing when enabled; until then the same billing layer supports manual activation by admin (bank transfer), behind a feature flag (`BILLING_PROVIDER=stripe|manual`).

The claim → subscribe funnel is the growth engine.

## 4. Users & roles
- **Visitor** — browses/searches the directory, contacts companies. No account needed.
- **Owner** — manages exactly one company profile in v1; sees subscription status.
- **Admin** — approves/edits/publishes listings, manages categories, manually activates subscriptions, runs imports, sees basic metrics.

## 5. MVP scope (v1)
### 5.1 Public site
- Home: hero, category grid, featured companies, how-it-works, CTA "Dodaj svoju firmu", partners section.
- Directory: full-text search + filters (category, country AT/RS/HR, city/region, "prihvata Carigradski drum karticu"), sorting, pagination, card grid.
- Listing detail: everything from §2 plus gallery, description, products/services list, opening hours, inquiry form (email relay to owner), map.
- Category and country landing pages (SEO), About, Contact, Card info page, legal pages (Privacy, Terms, Impressum — Austrian requirement).

### 5.2 Auth & accounts
Convex Auth; email/password + Google. Roles per §4. UI in Serbian and German.

### 5.3 Owner dashboard
- Claim flow: find your company → verify (email/phone at minimum; admin confirms in v1).
- Multi-step profile wizard with live preview and autosave (draft → submit → pending review → published).
- Edit anytime; rule for which edits re-trigger review (decided: in v1 ALL edits are reviewed).
- Subscription status card (plan, renewal date, invoices link once Stripe is on).

### 5.4 Admin panel
Review queue (approve/reject with reason), full CRUD on companies and categories, user list, manual subscription activation/extension, CSV/JSON import tool, basic stats (listings, claims, active subs).

### 5.5 Billing
- Plans: `yearly_365` and `monthly_45`; a single source of truth for entitlements.
- Stripe Checkout + Customer Portal + webhooks (`checkout.session.completed`, `invoice.paid`, `customer.subscription.updated/deleted` + payment-failure events), all behind `BILLING_PROVIDER=stripe|manual`.
- Never invent API keys — read from env and document every required env var in `.env.example`.
- Grace period and downgrade behavior when a subscription lapses (profile reverts to minimal, never deleted). Decided: 14-day grace.

### 5.6 i18n
Serbian + German at launch, English-ready. Localized routes (`/sr`, `/de`), localized metadata. Content model supports per-language company descriptions.

### 5.7 Data migration
A locally-run script that exports current WP listings (open REST API + per-listing HTML parse) into Convex seed data, mapping the old mixed taxonomy → new `category` + `country` (+ city) fields. Old URLs → 301 redirect map.

### 5.8 Motion & polish
GSAP + ScrollTrigger: hero intro, scroll reveals, micro-interactions, page transitions. Subtle and fast (≈0.2–0.4s), never scroll-jacking, fully disabled under `prefers-reduced-motion`.

## 6. Explicitly OUT of scope for v1
Reviews/ratings; in-app messaging; job board; multi-member company teams; e-commerce checkout for products; card issuing/management portal (v1 only shows the discount badge); mobile apps; blog/CMS; owners with multiple listings; affiliate program.

## 7. Tech stack (fixed) & engineering standards
- Next.js (latest stable, App Router, TypeScript, RSC-first), Convex (DB + server functions + file storage + Convex Auth), Tailwind CSS, GSAP. Deploy: Vercel + Convex prod.
- SEO first-class: SSR/ISR for all public pages, per-page metadata, `sitemap.xml`, `robots.txt`, OpenGraph, JSON-LD `LocalBusiness` on listing pages, clean slugs (`/firma/{slug}`), hreflang for sr/de.
- Performance budget: LCP < 2.5s on a mid-range phone; images via `next/image` + Convex storage; zero layout shift caused by GSAP.
- Accessibility WCAG 2.1 AA; filters and the wizard fully keyboard-navigable.
- Mobile-first; the profile wizard must be pleasant on a phone.
- zod validation shared between client and Convex functions; never trust client input for entitlements.
- Secrets only via env (`.env.local`, Convex env vars); commit `.env.example`.
- Keep dependencies minimal; justify every new package.

## 8. Data model — starting point (challenged and refined in the plan)
`users`, `companies` (status; entitlement fields), `categories`, `companyCategories` (dropped — see plan), `locations`, `offerings` (single table with type), `media`, `discountOffers`, `subscriptions` (stripe | manual), `claims`, `inquiries`, `legacyUrls` (replaced by redirects/legacy-redirects.json).
Convex indexes for every §5.1 query pattern. Full-text search: Convex search index (chosen over external service — justified in plan).

## 9. Locked decisions (Q&A with owner, 2026-07-30)
1. Brand: keep name + logo, new visual system (light theme, warm accent).
2. Monthly price: **€45**.
3. Free tier: unclaimed/unpaid listings stay publicly visible with minimal info.
4. Stripe entity: **Austrian entity exists/planned** → Stripe in M4; manual until then. (Serbia is NOT a supported Stripe merchant country; Austria is.)
5. No trial; founding-partner promo: claim within first 90 days → 14 months for the price of 12 (manual activation in v1).
6. Languages: `/sr` + `/de` both prefixed; root `/` redirects by Accept-Language; x-default → `/sr`. Old unprefixed (German) URLs → 301 to `/de/...`.
7. Inquiries: email relay to owner AND stored as leads in the dashboard.
8. Legal texts (Terms/Privacy/Impressum) provided by the client's lawyer; structure + working drafts shipped by us.
9. Same domain with 301s from old WP paths.
10. v1 review: EVERY new profile and EVERY edit goes through admin review.
11. Auth: Convex Auth (beta risk accepted) strictly client-side behind an isolation layer (Clerk swap = days).
12. Transactional email: Resend.
13. Migration: local script over the open WP REST API (+ HTML parse for fields REST does not expose).
14. Analytics: Vercel Analytics.

## 10. Milestones
- **M1**: Public directory + migrated seed data + SEO (already better than the old site)
- **M2**: Auth + owner dashboard + claim flow + review queue
- **M3**: Admin panel + manual billing + paid entitlements live
- **M4**: Stripe (flag flipped on)
- **M5**: Motion polish, i18n QA, performance & a11y pass, 301s, launch checklist

# Handoff: Carigradski Drum — redizajn početne strane

## Overview
Full redesign of the homepage for carigradskidrum.vercel.app — a B2B/B2C directory connecting Austrian companies and diaspora with clients from Serbia and the Western Balkans. Target audience skews older, so the design is deliberately large-type, low-clutter, and high-contrast. Language: Serbian (sr), with a DE toggle in the nav.

## About the Design Files
The files in this bundle are **design references created in HTML** — a prototype showing the intended look and behavior, NOT production code to copy directly. The task is to **recreate this design in the existing codebase** (Next.js on Vercel, with Convex storage) using its established patterns, i18n (sr/de), routing, and data. `Carigradski Drum.dc.html` is the design source (all styles inline); `styles.css` is the design-token sheet it references.

## Fidelity
**High-fidelity.** Colors, typography, spacing, radii and copy are final. Recreate pixel-perfectly, but wire up real data (categories, firm counts, newest firms, partner discounts) from the existing backend.

## Design Tokens (from styles.css)
- Ground: `--color-bg` #f5ead8 (warm cream); text `--color-text` #201e1d
- Accent (terracotta): `--color-accent` #c67139, with 100–900 OKLCH ramp (`--color-accent-100…900`)
- Second accent (sage): `--color-accent-2` #7a8a5e, with 100–900 ramp
- Neutral ramp: `--color-neutral-100…900` (warm, never grey)
- Headings: **Caprasimo** (`--font-heading`, weight 400); Body: **Figtree** (`--font-body`) — both on Google Fonts
- Radii: 16px (`--radius-lg`) for containers; 999px pills for buttons/inputs; 32px for big panels; 48px for the hero image frame
- Shadows: `--shadow-sm/md/lg` from the token sheet
- Base body font-size: 18px (large-type audience). Never below 15px.
- Icons: Lucide, stroke-width 2.75, 26px in category circles
- Focus: `:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }` — never default blue

## Screens / Views (single page, top to bottom)

### 1. Nav
Flex bar, brand "Carigradski Drum" in Caprasimo 24px, links (Početna, Firme, Kartica, Kontakt) Figtree 600 17px, right side: SR/DE language pills (active = sage-200 bg / sage-800 text pill), and a primary pill button "Dodaj svoju firmu" (solid terracotta, white text, border-radius 999px).

### 2. Hero (two columns)
- Left: H1 Caprasimo clamp(42–74px), line-height 1.08, two lines: "Proverene firme," / "od Beča do Beograda." Sub-paragraph 19–22px/1.6, neutral-800. Search row: pill input (18px text, padding 16px 24px, placeholder "Šta vam treba? npr. moler, advokat, prevoz…") + primary pill button "Pretraži". Below: three trust items with 12px colored dot bullets: "86 proverenih firmi", "13 delatnosti", "Austrija · Srbija · Balkan" — 17px bold, accent-700.
- Right: large photo, 4:5, max-width 440px, border-radius 48px, with the "washed" treatment (slightly desaturated/lifted so it sits into the cream page); small terracotta-200 circle (88px) peeking behind bottom-left.
- Decorative sage-200 circle (420px) bleeding off top-right of the section, behind content (z-index -1), page has overflow-x: clip.

### 3. Kategorije
H2 Caprasimo 30–42px + sub. Grid `repeat(auto-fill, minmax(250px, 1fr))`, gap 16px. Each category = link row: 52px circle (alternating terracotta-100/sage-100 tint, icon in matching 700 step) + name (18px bold) + count ("9 firmi", 15px neutral-700), background neutral-100, radius 16px, padding 18px 20px; hover: accent-100 bg. Last cell = outlined "Prikaži sve firme →" (2px accent-300 border, accent-700 text). 13 categories, counts from live data.

### 4. Kako funkcioniše
3 equal columns (auto-fit minmax 260px). Each: 76px numbered circle (Caprasimo 34px numeral; tints alternate terracotta/sage 100 bg with 700 text), H3 24px Caprasimo, copy 18px/1.6.

### 5. Novo na platformi
Header row with H2 + "Prikaži sve →" link (accent-700, bold). Grid auto-fill minmax(300px,1fr), gap 20px. Card (.card, shadow-sm, radius 16px): 56px initial circle (alternating terracotta-200/sage-200 with 800 text, Caprasimo 24px) — replace with firm logo where available; optional discount tag "−20% sa karticom" (terracotta tag pill, 15px) top-right; firm name Caprasimo 22px; category 16px neutral-700; city+country 16px semibold sage-700. Show 6 newest firms.

### 6. Kartica (discount card panel)
Sage-100 panel, radius 32px, two columns. Left: uppercase kicker "CARIGRADSKI DRUM KARTICA" (14px, 700, sage-800), H2 "Jedna kartica, popusti kod partnera", copy, wrap of terracotta tag pills listing partners with discounts (from live data), secondary pill button "Više o kartici". Right: card mockup — 86:54 aspect (min-height 220px), radius 24px, solid terracotta bg, cream text, rotated −3°, shadow-lg; brand top-left, chip rect top-right (accent-300), "KARTICA POPUSTA" + "•••• 2026" bottom.

### 7. CTA — Imate firmu?
Terracotta-100 panel, radius 32px, flex space-between: H2 "Imate firmu?" + copy, and a large primary pill button "Dodaj svoju firmu" (19px, padding 18px 36px).

### 8. Footer (#kontakt)
2px neutral-200 top border. 3 columns: brand + tagline; "KONTAKT" (Marketing Agentur Carigradski Drum, Tržni centar Kocka, Kralja Petra 1, Paraćin, +43 667 762 676 0, office@carigradskidrum.com); "SARADNIK ZA SRBIJU" (Varadinska Oaza, Livadska 7, 21132 Petrovaradin, +381 63 835 92 05). Column headings 16px uppercase accent-700. Bottom row: © line + legal links (Politika privatnosti, Uslovi korišćenja, Impressum). Links: accent-700, hover accent-800.

## Interactions & Behavior
- Search submits to the existing directory search/results page.
- Category tiles link to `/sr/kategorija/<slug>`; firm cards to `/sr/firma/<slug>`.
- Hovers: tinted fills one ramp step (tiles → accent-100; buttons per token sheet); all buttons/inputs are pills.
- Language toggle switches sr/de routes (existing i18n).
- Responsive: hero collapses to one column under ~750px (image below text acceptable); grids use auto-fill/auto-fit so they degrade naturally; nav wraps.
- Minimum hit targets 44px.

## State Management
Static marketing page — only live data: category counts, newest 6 firms, partner discount list. All already exist in the current Convex backend.

## Assets
- Hero image: placeholder in the prototype — client should supply a real photo (craftsman + client / handshake), treated "washed" (slight desaturation, lifted contrast, radius 48px).
- Firm logos from existing Convex storage; fall back to initial-in-circle avatars as designed.
- Icons: Lucide (hammer, home, wrench, car, truck, factory, shopping-bag, heart-pulse, sparkles, briefcase, plane, utensils, palette, arrow-right), stroke-width 2.75.
- Fonts: Caprasimo + Figtree via Google Fonts.

## Files
- `Carigradski Drum.dc.html` — the full design (all layout/styles inline; open in a browser to view)
- `styles.css` — design tokens + component classes (.btn, .tag, .card, .nav, .input, .washed) referenced by the design

## Screenshots
Reference captures of the design, top to bottom, in `screenshots/`:
- `01-pocetna.png` — nav + hero (search, trust row, hero image slot)
- `02-pocetna.png` — Kategorije grid
- `03-pocetna.png` — Kartica panel with partner discounts
- `04-pocetna.png` — CTA "Imate firmu?" + footer

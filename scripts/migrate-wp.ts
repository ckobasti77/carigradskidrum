/**
 * WP → Convex migration (plan §6 M1 step 2). Run locally:
 *
 *   npx tsx scripts/migrate-wp.ts            # export + transform only (dry run)
 *   npx tsx scripts/migrate-wp.ts --push     # ... + import into Convex
 *
 * Phases (order is load-bearing):
 *   1. EXPORT    — WP REST (open API) + per-listing HTML for fields REST
 *                  does not expose (address, coords with the lat/lng SWAP
 *                  fix, website). Writes scripts/out/wp-export.json.
 *   2. FOLD SPIKE— sanity assertions of the diacritic folding over the REAL
 *                  exported names (may only change fold rules/aliases).
 *   3. TRANSFORM — curated taxonomy mapping (scripts/category-map.ts) with
 *                  HARD-FAIL on unmapped terms / missing city / country.
 *                  Writes scripts/out/seed.json + migration-warnings.json
 *                  + redirects/legacy-redirects.json.
 *   4. PUSH      — batches of 10 through api.migration.importCompanies
 *                  (reads CONVEX_URL + MIGRATION_SECRET from
 *                  .env.migration.local). Idempotent via wpId.
 */
import fs from "node:fs";
import path from "node:path";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { foldBasic } from "../convex/lib/fold";
import type { CountryCode } from "../convex/lib/constants";
import {
  AT_CITY_HINTS,
  CATEGORY_OVERRIDES,
  CITY_NORMALIZE,
  CITY_OVERRIDES,
  COORD_OVERRIDES,
  COUNTRY_OVERRIDES,
  IGNORED_REGION_TERMS,
  STUB_TO_CATEGORY,
  TERM_TO_CATEGORY,
  TERM_TO_COUNTRY,
} from "./category-map";

const BASE = "https://carigradskidrum.com";
const OUT_DIR = path.join(process.cwd(), "scripts", "out");
const REDIRECTS_FILE = path.join(process.cwd(), "redirects", "legacy-redirects.json");
const USER_AGENT = "Mozilla/5.0 (compatible; CarigradskiDrumMigration/1.0)";
const FETCH_DELAY_MS = 250;

type WpTerm = { taxonomy: string; name: string; slug: string };
type WpListing = {
  id: number;
  slug: string;
  link: string;
  title: { rendered: string };
  _embedded?: {
    "wp:term"?: WpTerm[][];
    "wp:featuredmedia"?: Array<{
      source_url?: string;
      media_details?: { width?: number; height?: number };
    }>;
  };
};

type ExportedListing = {
  wpId: number;
  slug: string;
  name: string;
  terms: WpTerm[];
  featuredImage: { url: string; width: number; height: number } | null;
  html: {
    address: string | null;
    dataLatitude: number | null; // legacy field, unused (see coord notes)
    dataLongitude: number | null; // legacy field, unused
    website: string | null;
  };
  /**
   * "Similar listings" cards found on this detail page — each carries the
   * OTHER company's slug + coords (already un-swapped) + address. The union
   * across all pages is a coordinate source for companies the AJAX-driven
   * /listings/ index does not server-render.
   */
  similarCards?: Array<{ slug: string; lat: number; lng: number; address: string | null }>;
};

type SeedItem = {
  wpId: number;
  slug: string;
  name: string;
  categorySlugs: string[];
  country: CountryCode;
  city: string;
  address?: string;
  zip?: string;
  lat?: number;
  lng?: number;
  website?: string;
  discountPercent?: number;
  coverImage?: { url: string; width: number; height: number };
};

const warnings: Array<{ wpId: number; slug: string; warning: string }> = [];
const fatal: string[] = [];

function decodeEntities(input: string): string {
  return input
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    )
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#039;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&nbsp;", " ")
    .trim();
}

function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ")).trim();
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!response.ok) throw new Error(`GET ${url} → ${response.status}`);
  return response.text();
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!response.ok) throw new Error(`GET ${url} → ${response.status}`);
  return (await response.json()) as T;
}

// ---------------------------------------------------------------------------
// Phase 1 — EXPORT
// ---------------------------------------------------------------------------
async function exportFromWp(): Promise<ExportedListing[]> {
  console.log("→ EXPORT: fetching listings via WP REST…");
  const listings = await fetchJson<WpListing[]>(
    `${BASE}/wp-json/wp/v2/listing?per_page=100&_embed`,
  );
  console.log(`  ${listings.length} listings from REST`);

  const exported: ExportedListing[] = [];
  for (const [index, listing] of listings.entries()) {
    const terms = (listing._embedded?.["wp:term"] ?? []).flat().filter(Boolean);
    const media = listing._embedded?.["wp:featuredmedia"]?.[0];
    const featuredImage =
      media?.source_url && media.media_details?.width && media.media_details.height
        ? {
            url: media.source_url,
            width: media.media_details.width,
            height: media.media_details.height,
          }
        : null;

    // Per-listing HTML (German default URL) for address/coords/website.
    let address: string | null = null;
    const dataLatitude: number | null = null;
    const dataLongitude: number | null = null;
    let website: string | null = null;
    const similarCards: Array<{
      slug: string;
      lat: number;
      lng: number;
      address: string | null;
    }> = [];
    try {
      const html = await fetchText(`${BASE}/listing/${listing.slug}/`);
      const addressMatch = html.match(
        /class="listing-address[^"]*"[^>]*>([\s\S]*?)<\/div>/,
      );
      if (addressMatch) {
        const text = stripTags(addressMatch[1]);
        address = text.length > 0 ? text : null;
      }
      // Similar-listing cards: attrs are swapped on the live site
      // (data-longitude holds LATITUDE) — store them un-swapped.
      for (const chunk of html.split("listing-item-container").slice(1)) {
        const head = chunk.slice(0, 2000);
        const slugMatch = head.match(
          /href="https?:\/\/[^"]*\/listing\/([^/"]+)\/?"/,
        );
        const latAttr = head.match(/data-longitude="([-0-9.]+)"/);
        const lngAttr = head.match(/data-latitude="([-0-9.]+)"/);
        const addressAttr = head.match(/data-address="([^"]*)"/);
        if (slugMatch && latAttr && lngAttr) {
          similarCards.push({
            slug: slugMatch[1],
            lat: Number.parseFloat(latAttr[1]),
            lng: Number.parseFloat(lngAttr[1]),
            address: addressAttr ? decodeEntities(addressAttr[1]) : null,
          });
        }
      }
      const websiteMatch =
        html.match(
          /class="listing-links contact-links"[\s\S]{0,600}?<a[^>]+href="([^"]+)"/,
        ) ?? html.match(/widget_buttons[\s\S]{0,800}?<a[^>]+href="(https?:[^"]+)"/);
      if (websiteMatch) website = decodeEntities(websiteMatch[1]);
    } catch (error) {
      warnings.push({
        wpId: listing.id,
        slug: listing.slug,
        warning: `HTML fetch failed: ${String(error)}`,
      });
    }

    exported.push({
      wpId: listing.id,
      slug: listing.slug,
      name: decodeEntities(listing.title.rendered),
      terms,
      featuredImage,
      html: { address, dataLatitude, dataLongitude, website },
      similarCards,
    });

    if ((index + 1) % 10 === 0) console.log(`  …${index + 1}/${listings.length}`);
    await sleep(FETCH_DELAY_MS);
  }
  return exported;
}

/**
 * Authoritative per-company coordinates come from the /listings/ index cards
 * (each card carries data-address + data-latitude/longitude for ITS company).
 * The pairs on a DETAIL page all belong to the "similar listings" cards —
 * grabbing the first one there assigns a random other company's pin, which is
 * why detail-page coords are ignored entirely. Card attributes are swapped on
 * the live site (data-longitude holds latitude); bbox check per company.
 */
type CardInfo = { lat: number | null; lng: number | null; address: string | null };

async function fetchListingCards(): Promise<Map<string, CardInfo>> {
  console.log("→ EXPORT: fetching /listings/ index cards (coords source)…");
  const cards = new Map<string, CardInfo>();
  const pages = [
    `${BASE}/listings/`,
    `${BASE}/listings/page/2/`,
    `${BASE}/listings/page/3/`,
  ];
  for (const url of pages) {
    const html = await fetchText(url);
    const chunks = html.split("listing-item-container").slice(1);
    for (const chunk of chunks) {
      const head = chunk.slice(0, 2000);
      const slugMatch = head.match(/href="https?:\/\/[^"]*\/listing\/([^/"]+)\/?"/);
      if (!slugMatch) continue;
      const slug = slugMatch[1];
      const latAttr = head.match(/data-latitude="([-0-9.]+)"/); // holds LONGITUDE
      const lngAttr = head.match(/data-longitude="([-0-9.]+)"/); // holds LATITUDE
      const addressAttr = head.match(/data-address="([^"]*)"/);
      const existing = cards.get(slug);
      if (existing?.lat != null) continue;
      cards.set(slug, {
        lat: lngAttr ? Number.parseFloat(lngAttr[1]) : null,
        lng: latAttr ? Number.parseFloat(latAttr[1]) : null,
        address: addressAttr ? decodeEntities(addressAttr[1]) : null,
      });
    }
    await sleep(FETCH_DELAY_MS);
  }
  console.log(`  ${cards.size} cards with coordinates`);
  return cards;
}

// ---------------------------------------------------------------------------
// Phase 2 — FOLD SPIKE (assertions over real data; fold rules only)
// ---------------------------------------------------------------------------
function foldSpike(exported: ExportedListing[]) {
  console.log("→ FOLD SPIKE: validating folding on real names…");
  if (foldBasic("Ćevapi") !== "cevapi") fatal.push("fold: Ćevapi ≠ cevapi");
  if (foldBasic("Niš") !== "nis") fatal.push("fold: Niš ≠ nis");
  if (foldBasic("Đorđe") !== "djordje") fatal.push("fold: Đorđe ≠ djordje");
  if (foldBasic("München") !== "munchen") fatal.push("fold: München ≠ munchen");
  if (foldBasic("Straße") !== "strasse") fatal.push("fold: Straße ≠ strasse");

  const withDiacritics = exported.filter((l) => /[čćžšđäöüß]/i.test(l.name));
  for (const listing of withDiacritics.slice(0, 10)) {
    console.log(`  "${listing.name}" → "${foldBasic(listing.name)}"`);
  }
  if (fatal.length > 0) {
    throw new Error(`Fold spike failed:\n${fatal.join("\n")}`);
  }
  console.log(
    `  OK (${withDiacritics.length} names with diacritics verified foldable)`,
  );
}

// ---------------------------------------------------------------------------
// Geocoding fallback (Nominatim) for companies with a street address but no
// card coordinates. One-off migration use, cached, 1.2s between requests per
// the usage policy. City-only addresses are NOT geocoded (a centroid pin
// would mislead) — those profiles simply render without a map.
// ---------------------------------------------------------------------------
const GEOCODE_CACHE_FILE = path.join(OUT_DIR, "geocode-cache.json");

function loadGeocodeCache(): Record<string, { lat: number; lng: number } | null> {
  if (!fs.existsSync(GEOCODE_CACHE_FILE)) return {};
  return JSON.parse(fs.readFileSync(GEOCODE_CACHE_FILE, "utf8"));
}

async function geocodeAddress(
  address: string,
  cache: Record<string, { lat: number; lng: number } | null>,
): Promise<{ lat: number; lng: number } | null> {
  if (address in cache) return cache[address];
  await sleep(1200);
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=at,rs,hr,ba&q=${encodeURIComponent(address)}`;
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "CarigradskiDrumMigration/1.0 (office@carigradskidrum.com)",
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const results = (await response.json()) as Array<{ lat: string; lon: string }>;
    const hit = results[0]
      ? { lat: Number.parseFloat(results[0].lat), lng: Number.parseFloat(results[0].lon) }
      : null;
    cache[address] = hit;
  } catch (error) {
    console.warn(`  geocode failed for "${address}": ${String(error)}`);
    cache[address] = null;
  }
  fs.writeFileSync(GEOCODE_CACHE_FILE, JSON.stringify(cache, null, 2), "utf8");
  return cache[address];
}

// ---------------------------------------------------------------------------
// Phase 3 — TRANSFORM
// ---------------------------------------------------------------------------
function extractZip(address: string): string | undefined {
  const match = address.match(/\b(\d{4,5})\b/);
  return match ? match[1] : undefined;
}

function extractCity(address: string | null, wpId: number): string | null {
  if (CITY_OVERRIDES[wpId]) return CITY_OVERRIDES[wpId];
  if (!address) return null;

  const cleaned = address
    .replace(
      /[,\s–-]*\s*(srbija|serbien|austrija|austria|österreich|osterreich|kroatien|hrvatska|bosna i hercegovina|bosnien(?: und herzegowina)?)\s*$/i,
      "",
    )
    .replace(/[\s–—-]+$/, "");
  const segments = cleaned
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  for (let i = segments.length - 1; i >= 0; i--) {
    // "…street 165C/II 11080 Zemun" → the words AFTER the zip are the city.
    const afterZip = segments[i].match(/\b\d{4,5}\b\s+([\p{L}][\p{L}\s.'–-]*)$/u);
    const candidate = afterZip
      ? afterZip[1]
      : segments[i]
          .replace(/\b\d+[a-zA-Z]?(\/[\dA-Za-z]+)?\b/g, " ") // house numbers/zips
          .replace(/\bbr\.?\s*/gi, " ")
          .replace(/\s+/g, " ")
          .trim();
    const words = candidate.replace(/[\s–—-]+$/, "").trim();
    if (words.length > 1) {
      return CITY_NORMALIZE[foldBasic(words)] ?? words;
    }
  }
  return null;
}

async function transform(
  exported: ExportedListing[],
  cards: Map<string, CardInfo>,
): Promise<SeedItem[]> {
  console.log("→ TRANSFORM: mapping taxonomy + normalizing fields…");
  const geocodeCache = loadGeocodeCache();
  const items: SeedItem[] = [];
  const unmappedTerms = new Map<string, string[]>(); // term → listing slugs

  for (const listing of exported) {
    const categorySlugs = new Set<string>();
    const countries = new Set<CountryCode>();
    let discountPercent: number | undefined;

    for (const term of listing.terms) {
      const key = foldBasic(term.name);
      const slugKey = foldBasic(term.slug);
      if (term.taxonomy === "listing_category") {
        const category = TERM_TO_CATEGORY[key] ?? TERM_TO_CATEGORY[slugKey];
        const country = TERM_TO_COUNTRY[key] ?? TERM_TO_COUNTRY[slugKey];
        if (category) categorySlugs.add(category);
        else if (country) countries.add(country);
        else {
          const list = unmappedTerms.get(term.name) ?? [];
          list.push(listing.slug);
          unmappedTerms.set(term.name, list);
        }
      } else if (term.taxonomy === "region") {
        if (IGNORED_REGION_TERMS.has(term.slug)) continue;
        const country = TERM_TO_COUNTRY[key] ?? TERM_TO_COUNTRY[slugKey];
        if (country) countries.add(country);
        else {
          const list = unmappedTerms.get(`region:${term.name}`) ?? [];
          list.push(listing.slug);
          unmappedTerms.set(`region:${term.name}`, list);
        }
      } else if (term.taxonomy === "service_category") {
        const percentMatch = term.name.match(/(\d+)\s*%/);
        if (percentMatch) {
          discountPercent = Math.max(
            discountPercent ?? 0,
            Number.parseInt(percentMatch[1], 10),
          );
        }
      }
      // listing_feature / event_category / … — no data on the live site.
    }

    for (const override of CATEGORY_OVERRIDES[listing.wpId] ?? []) {
      categorySlugs.add(override);
    }
    if (categorySlugs.size === 0) {
      fatal.push(
        `wpId ${listing.wpId} (${listing.slug}): no mapped business category — add CATEGORY_OVERRIDES entry`,
      );
      continue;
    }

    // Country: explicit override REPLACES term data (WP tags can contradict
    // the physical location) → terms → address hints → FAIL.
    let country: CountryCode | undefined =
      COUNTRY_OVERRIDES[listing.wpId] ?? [...countries][0];
    const city = extractCity(listing.html.address, listing.wpId);
    if (!country && city && AT_CITY_HINTS.has(foldBasic(city))) country = "AT";
    if (!country && listing.html.address) {
      if (/\b\d{5}\b/.test(listing.html.address)) country = "RS";
      else if (/\b\d{4}\b/.test(listing.html.address)) country = "AT";
    }
    if (!country) {
      fatal.push(
        `wpId ${listing.wpId} (${listing.slug}): country underivable — add COUNTRY_OVERRIDES entry`,
      );
      continue;
    }

    if (!city) {
      fatal.push(
        `wpId ${listing.wpId} (${listing.slug}): city underivable from address "${listing.html.address ?? "∅"}" — add CITY_OVERRIDES entry`,
      );
      continue;
    }

    // Coordinates: authoritative source is the company's OWN /listings/ index
    // card (detail-page attribute pairs belong to "similar listings" and are
    // a trap). Card attrs are swapped (handled in fetchListingCards); bbox
    // sanity check per company, with a swap-back fallback, else drop.
    let lat: number | undefined;
    let lng: number | undefined;
    const coordOverride = COORD_OVERRIDES[listing.wpId];
    const card = cards.get(listing.slug);
    const inBbox = (candLat: number, candLng: number) =>
      candLat >= 40 && candLat <= 50 && candLng >= 8 && candLng <= 24;
    if (coordOverride !== undefined) {
      if (coordOverride !== null) {
        lat = coordOverride.lat;
        lng = coordOverride.lng;
      }
    } else if (card && card.lat !== null && card.lng !== null) {
      if (inBbox(card.lat, card.lng)) {
        lat = card.lat;
        lng = card.lng;
      } else if (inBbox(card.lng, card.lat)) {
        lat = card.lng;
        lng = card.lat;
        warnings.push({
          wpId: listing.wpId,
          slug: listing.slug,
          warning: "card coords were not swapped — used swap-back",
        });
      } else {
        warnings.push({
          wpId: listing.wpId,
          slug: listing.slug,
          warning: `card coords outside AT/RS/HR bbox (${card.lat}, ${card.lng}) — dropped`,
        });
      }
    }

    // Street address + no pin yet → Nominatim (city-only addresses excluded).
    if (
      lat === undefined &&
      coordOverride === undefined &&
      listing.html.address &&
      /\d/.test(listing.html.address)
    ) {
      const geocoded = await geocodeAddress(listing.html.address, geocodeCache);
      if (geocoded && inBbox(geocoded.lat, geocoded.lng)) {
        lat = geocoded.lat;
        lng = geocoded.lng;
        warnings.push({
          wpId: listing.wpId,
          slug: listing.slug,
          warning: "coords from Nominatim geocode of the street address",
        });
      }
    }
    if (lat === undefined && coordOverride === undefined) {
      warnings.push({
        wpId: listing.wpId,
        slug: listing.slug,
        warning: "no coordinates available — map hidden on this profile",
      });
    }

    let website = listing.html.website ?? undefined;
    if (website) {
      website = website.trim();
      if (website.startsWith("www.")) website = `https://${website}`;
      if (!/^https?:\/\//.test(website)) website = undefined;
    }

    items.push({
      wpId: listing.wpId,
      slug: listing.slug,
      name: listing.name,
      categorySlugs: [...categorySlugs],
      country,
      city,
      address: listing.html.address ?? undefined,
      zip: listing.html.address ? extractZip(listing.html.address) : undefined,
      lat,
      lng,
      website,
      discountPercent,
      coverImage: listing.featuredImage ?? undefined,
    });
  }

  if (unmappedTerms.size > 0) {
    for (const [term, slugs] of unmappedTerms) {
      fatal.push(
        `Unmapped taxonomy term "${term}" on: ${slugs.join(", ")} — extend scripts/category-map.ts`,
      );
    }
  }
  if (fatal.length > 0) {
    throw new Error(`TRANSFORM failed (${fatal.length} problems):\n${fatal.join("\n")}`);
  }
  console.log(`  ${items.length} companies transformed`);
  return items;
}

// ---------------------------------------------------------------------------
// Redirect map generation (plan §2.9 — sources WITHOUT trailing slash)
// ---------------------------------------------------------------------------
function buildRedirects(exported: ExportedListing[]) {
  const redirects: Array<{ source: string; destination: string; permanent: true }> = [];
  const add = (source: string, destination: string) =>
    redirects.push({ source, destination, permanent: true });

  // Listing detail pages (both languages; slug identical).
  add("/listing/:slug", "/de/firma/:slug");
  add("/sr/listing/:slug", "/sr/firma/:slug");

  // Directory index + pagination.
  add("/listings", "/de/firme");
  add("/listings/page/:n", "/de/firme");
  add("/sr/listings", "/sr/firme");
  add("/sr/listings/page/:n", "/sr/firme");

  // Used listing_category term archives → category or country pages.
  const usedTermSlugs = new Map<string, string>(); // term slug → destination path
  for (const listing of exported) {
    for (const term of listing.terms) {
      if (term.taxonomy !== "listing_category") continue;
      const key = foldBasic(term.name);
      const slugKey = foldBasic(term.slug);
      const category = TERM_TO_CATEGORY[key] ?? TERM_TO_CATEGORY[slugKey];
      const country = TERM_TO_COUNTRY[key] ?? TERM_TO_COUNTRY[slugKey];
      if (category) usedTermSlugs.set(term.slug, `/kategorija/${category}`);
      else if (country) usedTermSlugs.set(term.slug, `/zemlja/${country.toLowerCase()}`);
    }
  }
  for (const [termSlug, target] of usedTermSlugs) {
    add(`/listing-category/${termSlug}`, `/de${target}`);
    add(`/sr/listing-category/${termSlug}`, `/sr${target}`);
  }
  // Catch-alls for the remaining ~77 unused terms (after the specific rules).
  add("/listing-category/:path*", "/de/firme");
  add("/sr/listing-category/:path*", "/sr/firme");

  // The 13 empty stub pages behind the homepage tiles.
  for (const [stub, category] of Object.entries(STUB_TO_CATEGORY)) {
    add(`/${stub}`, `/de/kategorija/${category}`);
    add(`/sr/${stub}`, `/sr/kategorija/${category}`);
  }

  // Legacy standalone pages.
  add("/optimo-loco-card", "/de/kartica");
  add("/sr/optimo-loco-card", "/sr/kartica");
  add("/beispiel-seite", "/de/o-nama");
  add("/sr/beispiel-seite", "/sr/o-nama");
  add("/contact", "/de/kontakt");
  add("/sr/contact", "/sr/kontakt");
  // /account ships in M2 — until then the owner-intent funnel page.
  add("/my-account", "/de/dodaj-firmu");
  add("/sr/my-account", "/sr/dodaj-firmu");

  // Dead taxonomies / author archives.
  add("/service-category/:path*", "/de/firme");
  add("/sr/service-category/:path*", "/sr/firme");
  add("/Region/:path*", "/de/firme");
  add("/Aufhörfunktion/:path*", "/de/firme");
  add("/author/:path*", "/de/firme");

  return redirects;
}

// ---------------------------------------------------------------------------
// Phase 4 — PUSH
// ---------------------------------------------------------------------------
function loadMigrationEnv(): Record<string, string> {
  const file = path.join(process.cwd(), ".env.migration.local");
  if (!fs.existsSync(file)) return {};
  const env: Record<string, string> = {};
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match) env[match[1]] = match[2];
  }
  return env;
}

async function push(items: SeedItem[]) {
  const env = loadMigrationEnv();
  const url = env.CONVEX_URL;
  const secret = env.MIGRATION_SECRET;
  if (!url || !secret) {
    throw new Error(
      ".env.migration.local must define CONVEX_URL and MIGRATION_SECRET (see .env.example)",
    );
  }
  console.log(`→ PUSH: importing ${items.length} companies into ${url}`);
  const client = new ConvexHttpClient(url);
  let inserted = 0;
  let updated = 0;
  for (let i = 0; i < items.length; i += 10) {
    const batch = items.slice(i, i + 10);
    const result = await client.action(api.migration.importCompanies, {
      secret,
      companies: batch,
    });
    for (const row of result.results) {
      if (row.action === "inserted") inserted += 1;
      else updated += 1;
      for (const warning of row.warnings) {
        warnings.push({ wpId: row.wpId, slug: row.slug, warning });
      }
    }
    console.log(`  …${Math.min(i + 10, items.length)}/${items.length}`);
  }
  console.log(`  done: ${inserted} inserted, ${updated} updated`);
}

// ---------------------------------------------------------------------------
async function main() {
  const doPush = process.argv.includes("--push");
  const fresh = process.argv.includes("--fresh");
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const exportFile = path.join(OUT_DIR, "wp-export.json");
  let exported: ExportedListing[];
  if (!fresh && fs.existsSync(exportFile)) {
    exported = JSON.parse(fs.readFileSync(exportFile, "utf8"));
    console.log(
      `→ EXPORT: reusing ${exported.length} listings from scripts/out/wp-export.json (pass --fresh to refetch)`,
    );
  } else {
    exported = await exportFromWp();
    fs.writeFileSync(exportFile, JSON.stringify(exported, null, 2), "utf8");
  }

  foldSpike(exported);

  const cardsFile = path.join(OUT_DIR, "listing-cards.json");
  let cards: Map<string, CardInfo>;
  if (!fresh && fs.existsSync(cardsFile)) {
    cards = new Map(
      Object.entries(
        JSON.parse(fs.readFileSync(cardsFile, "utf8")) as Record<string, CardInfo>,
      ),
    );
    console.log(`→ EXPORT: reusing ${cards.size} index cards from scripts/out/listing-cards.json`);
  } else {
    cards = await fetchListingCards();
    fs.writeFileSync(
      cardsFile,
      JSON.stringify(Object.fromEntries(cards), null, 2),
      "utf8",
    );
  }

  // Merge in the similar-card union from detail pages (fills the companies
  // the AJAX index never server-rendered).
  let merged = 0;
  for (const listing of exported) {
    for (const card of listing.similarCards ?? []) {
      if (!cards.has(card.slug)) {
        cards.set(card.slug, {
          lat: card.lat,
          lng: card.lng,
          address: card.address,
        });
        merged += 1;
      }
    }
  }
  console.log(
    `→ coords coverage: ${cards.size} companies (${merged} filled from similar-card union)`,
  );

  const items = await transform(exported, cards);
  fs.writeFileSync(
    path.join(OUT_DIR, "seed.json"),
    JSON.stringify(items, null, 2),
    "utf8",
  );

  const redirects = buildRedirects(exported);
  fs.writeFileSync(REDIRECTS_FILE, JSON.stringify(redirects, null, 2), "utf8");
  console.log(`→ ${redirects.length} redirect rules → redirects/legacy-redirects.json`);

  fs.writeFileSync(
    path.join(OUT_DIR, "migration-warnings.json"),
    JSON.stringify(warnings, null, 2),
    "utf8",
  );
  console.log(`→ ${warnings.length} warnings → scripts/out/migration-warnings.json`);

  if (doPush) {
    await push(items);
    fs.writeFileSync(
      path.join(OUT_DIR, "migration-warnings.json"),
      JSON.stringify(warnings, null, 2),
      "utf8",
    );
  } else {
    console.log("Dry run complete (no --push). Review scripts/out/seed.json.");
  }
}

main().catch((error) => {
  console.error(String(error?.stack ?? error));
  process.exit(1);
});

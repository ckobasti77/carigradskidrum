/**
 * Curated mapping of the legacy WP taxonomy (3 parallel naming systems) onto
 * the 13 new categories + countries (plan Prilog A). The migration HARD-FAILS
 * on any term found on a listing that is not covered here — silent drops are
 * forbidden; extend the maps instead.
 */
import type { CountryCode } from "../convex/lib/constants";

/** Keyed by lowercased WP `listing_category` term NAME and/or SLUG. */
export const TERM_TO_CATEGORY: Record<string, string> = {
  gradjevinarstvo: "gradjevinarstvo",
  nekretnine: "nekretnine",
  servisi: "servisi",
  auto: "auto",
  prevoz: "prevoz",
  proizvodnja: "proizvodnja",
  trgovina: "trgovina",
  zdravlje: "zdravlje",
  nega: "nega",
  usluge: "strucne-usluge",
  turizam: "turizam",
  ugostiteljstvo: "ugostiteljstvo",
  kultura: "kultura",
};

/** Country terms that sit inside listing_category AND the region taxonomy. */
export const TERM_TO_COUNTRY: Record<string, CountryCode> = {
  srbija: "RS",
  austrija: "AT",
  serbien: "RS",
  austria: "AT",
  kroatien: "HR",
  hrvatska: "HR",
  bosnien: "BA",
  "bosnien und herzegowina": "BA",
  "bosna i hercegovina": "BA",
};

/** Region-taxonomy terms to silently ignore. */
export const IGNORED_REGION_TERMS = new Set<string>([]);

/** Display normalization for extracted city names. */
export const CITY_NORMALIZE: Record<string, string> = {
  wien: "Beč",
  vienna: "Beč",
  belgrad: "Beograd",
  bec: "Beč",
};

/**
 * Manual city per wpId for listings whose address is missing or unparseable.
 * Filled during the migration dry run — the script fails and prints the wpIds
 * that need an entry. Cities verified against the listing's map pin and the
 * company's own website.
 */
export const CITY_OVERRIDES: Record<number, string> = {
  // Cities verified against each company's OWN website (the WP map pins on
  // detail pages belong to "similar listings" and are not trustworthy).
  3754: "Bački Jarak", // Dikić d.o.o — site footer: "Bački Jarak, 021/848-087"
  3751: "Novi Sad", // PaySpot — HQ Novi Sad (payspot.rs)
  3745: "Beč", // 4M — Margaretenstraße 99, 1050 Wien (4m-immo.at JSON-LD)
  3742: "Irig", // Aurora 369 — Ive Lole Ribara 65, 22406 Irig (kontakt page)
  3738: "Beograd", // Pavleri — TC Medaković 3, ul. braće Srnić 23a, Beograd
  3736: "Zemun", // Geviner — zemun@geviner.rs, 011 call centar
  2539: "Janja", // Steco Centar — Kojčinovac 132, Janja 76316, BiH
};

/**
 * Manual country per wpId — REPLACES the term-derived countries entirely
 * (used when the WP tags contradict the company's physical location).
 */
export const COUNTRY_OVERRIDES: Record<number, CountryCode> = {
  2539: "BA", // Steco Centar — WP says region:Serbien, address says Janja, BiH
};

/**
 * Manual business-category per wpId for listings with NO mapped
 * listing_category term on the live site.
 */
export const CATEGORY_OVERRIDES: Record<number, string[]> = {
  293: ["servisi"], // SAUBER & REIN, Mladenovic KG — cleaning service, Wien
};

/**
 * Coordinate overrides: `null` drops the pin entirely (e.g. a listing
 * geocoded to the country centroid — a wrong pin is worse than none).
 */
export const COORD_OVERRIDES: Record<number, { lat: number; lng: number } | null> = {
  3751: null, // PaySpot — pin is the "Serbia" geocoder centroid, meaningless
  // Vienna street addresses placed manually (Nominatim unreachable from the
  // build environment; both verified against the district street grid):
  293: { lat: 48.1899, lng: 16.3301 }, // Sauber & Rein — Reindorfgasse 25, 1150 Wien
  342: { lat: 48.1755, lng: 16.3776 }, // Restaurant Lovac — Favoritenstraße 146, 1100 Wien
};

/** Austrian city names seen in addresses — used to derive country=AT. */
export const AT_CITY_HINTS = new Set([
  "beč",
  "wien",
  "graz",
  "linz",
  "salzburg",
  "innsbruck",
  "klagenfurt",
  "villach",
  "wels",
  "sankt pölten",
]);

/**
 * The 13 legacy stub pages (homepage tiles) → new category slugs.
 * Source for the 301 map.
 */
export const STUB_TO_CATEGORY: Record<string, string> = {
  gradevinarstvo: "gradjevinarstvo",
  "nekretnine-prodaja-i-izdavanje": "nekretnine",
  "servisi-i-kucne-zanatske-usluge": "servisi",
  auto: "auto",
  "prevoz-putnika-i-robe": "prevoz",
  proizvodnja: "proizvodnja",
  trgovina: "trgovina",
  "zdravlje-i-medicina": "zdravlje",
  "nega-lica-i-tela": "nega",
  "pravne-prevodilacke-knjigovodstvene-finansijske-it-usluge": "strucne-usluge",
  turizam: "turizam",
  ugostiteljstvo: "ugostiteljstvo",
  kultura: "kultura",
};

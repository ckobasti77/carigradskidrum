export const CATEGORY_IMAGE_BY_SLUG = {
  gradjevinarstvo: "/images/categories/gradjevinarstvo.webp",
  nekretnine: "/images/categories/nekretnine.webp",
  servisi: "/images/categories/servisi.webp",
  auto: "/images/categories/auto.webp",
  prevoz: "/images/categories/prevoz.webp",
  proizvodnja: "/images/categories/proizvodnja.webp",
  trgovina: "/images/categories/trgovina.webp",
  zdravlje: "/images/categories/zdravlje.webp",
  nega: "/images/categories/nega.webp",
  "strucne-usluge": "/images/categories/strucne-usluge.webp",
  turizam: "/images/categories/turizam.webp",
  ugostiteljstvo: "/images/categories/ugostiteljstvo.webp",
  kultura: "/images/categories/kultura.webp",
} as const;

export type CategoryImageSlug = keyof typeof CATEGORY_IMAGE_BY_SLUG;

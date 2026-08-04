export type CompanyCoverSource = {
  wpId: number;
  slug: string;
  name: string;
  sourceUrl: string;
  mime: "image/jpeg" | "image/png";
  width: number;
  height: number;
  sha256: string;
};

/**
 * Client-approved official sources for the only four migrated companies that
 * do not currently have a cover. Hashes pin the exact reviewed files.
 */
export const COMPANY_COVER_SOURCES = [
  {
    wpId: 1913,
    slug: "advokat-dragan-alempijevic",
    name: "Advokat Dragan Alempijević",
    sourceUrl:
      "https://www.draganalempijevic.com/wp-content/uploads/2022/04/Dragan-Alempijevic-Advokat-4a.jpg",
    mime: "image/jpeg",
    width: 717,
    height: 499,
    sha256: "4ae9e351b209a84d19319caed59c63d133892253595d0a012066acafedcd0e6a",
  },
  {
    wpId: 521,
    slug: "n-gastech",
    name: "N-GasTech",
    sourceUrl:
      "https://cdn.prod.website-files.com/65e89df79632885461ea2187/65fd65dcd53b1c3e5291b1e6_IMG_0152%201-min%202.png",
    mime: "image/png",
    width: 1622,
    height: 950,
    sha256: "a8463a3cfc1ff334fabfae93aabd4a68fcab50819b30de2b9feae958172ef06c",
  },
  {
    wpId: 293,
    slug: "sauber-rein",
    name: "SAUBER & REIN",
    sourceUrl:
      "https://sauberundrein.at/wp-content/uploads/2024/11/6195122-1024x683.jpeg",
    mime: "image/jpeg",
    width: 1024,
    height: 683,
    sha256: "a2b03ad13a485d1069c67736c32606fcd231973acdb4974008c12bcf3c31fe65",
  },
  {
    wpId: 1175,
    slug: "stanek-gasgeraetetechnik",
    name: "Stanek Gasgerätetechnik",
    sourceUrl:
      "http://www.stanek-gasgeraetetechnik.at/s/misc/logo.PNG?t=1782787405",
    mime: "image/png",
    width: 263,
    height: 139,
    sha256: "88c185242c017dcde4ee64bb942c7d45e39b9e38470d6d9f2da5b231099342b1",
  },
] as const satisfies readonly CompanyCoverSource[];

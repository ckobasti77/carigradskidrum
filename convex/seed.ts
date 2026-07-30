import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

type CategorySeed = {
  slug: string;
  nameSr: string;
  nameDe: string;
  descriptionSr: string;
  descriptionDe: string;
  icon: string;
  order: number;
};

/**
 * The 13 launch categories (plan Prilog A). German copy is machine-drafted
 * (TODO-REVIEW) — native pass scheduled for M5. Upserts by slug, so re-runs
 * are no-ops; run BEFORE the WP migration:
 *   npx convex run seed:seedCategories '{}'
 */
const CATEGORIES: CategorySeed[] = [
  {
    slug: "gradjevinarstvo",
    nameSr: "Građevinarstvo",
    nameDe: "Bauwesen",
    descriptionSr:
      "Građevinske firme, zidarski i fasaderski radovi, montažne kuće, projektovanje i kompletna renoviranja — proverene ekipe koje rade u Austriji i Srbiji. Pronađite izvođača koji govori vaš jezik i poznaje standarde oba tržišta.",
    descriptionDe:
      "Baufirmen, Maurer- und Fassadenarbeiten, Fertighäuser, Planung und Komplettsanierungen — geprüfte Teams, die in Österreich und Serbien arbeiten. Finden Sie einen Ausführenden, der Ihre Sprache spricht und die Standards beider Märkte kennt.",
    icon: "HardHat",
    order: 1,
  },
  {
    slug: "nekretnine",
    nameSr: "Nekretnine — prodaja i izdavanje",
    nameDe: "Immobilien — Verkauf & Vermietung",
    descriptionSr:
      "Stanovi, kuće i poslovni prostori za kupovinu ili izdavanje, kao i agencije koje poznaju tržišta Austrije i Srbije. Bilo da kupujete u Beču ili gradite u Srbiji, ovde su firme koje mogu da pomognu.",
    descriptionDe:
      "Wohnungen, Häuser und Geschäftsräume zum Kauf oder zur Miete sowie Agenturen, die die Märkte in Österreich und Serbien kennen. Ob Sie in Wien kaufen oder in Serbien bauen — hier finden Sie die passenden Firmen.",
    icon: "Building2",
    order: 2,
  },
  {
    slug: "servisi",
    nameSr: "Servisi i kućne zanatske usluge",
    nameDe: "Handwerk & Hausservice",
    descriptionSr:
      "Vodoinstalateri, električari, klima i grejanje, solarni sistemi i majstori za sve popravke u domu. Zanatlije iz dijaspore i regiona kojima možete da objasnite problem na svom jeziku — i dobijete uslugu bez nesporazuma.",
    descriptionDe:
      "Installateure, Elektriker, Klima und Heizung, Solaranlagen und Handwerker für alle Reparaturen im Haus. Fachleute aus der Diaspora und der Region, denen Sie Ihr Anliegen in Ihrer Sprache erklären können.",
    icon: "Wrench",
    order: 3,
  },
  {
    slug: "auto",
    nameSr: "Auto",
    nameDe: "Auto",
    descriptionSr:
      "Auto-mehaničari, limari, vulkanizeri, auto-škole i prodaja vozila. Servisi u Austriji i Srbiji kojima poverenje poklanjaju i domaći i dijaspora — od redovnog servisa do registracije i osiguranja.",
    descriptionDe:
      "Kfz-Mechaniker, Karosseriebauer, Reifenservice, Fahrschulen und Fahrzeugverkauf. Werkstätten in Österreich und Serbien, denen Einheimische und Diaspora vertrauen — von der Wartung bis zu Anmeldung und Versicherung.",
    icon: "Car",
    order: 4,
  },
  {
    slug: "prevoz",
    nameSr: "Prevoz putnika i robe",
    nameDe: "Personen- & Gütertransport",
    descriptionSr:
      "Redovne linije i kombi prevoz između Austrije i Srbije, selidbe, špedicija i transport robe. Firme koje svakodnevno voze relaciju Beč–Beograd i znaju svaki granični prelaz.",
    descriptionDe:
      "Linien- und Kleinbustransport zwischen Österreich und Serbien, Umzüge, Spedition und Warentransport. Firmen, die täglich die Strecke Wien–Belgrad fahren und jeden Grenzübergang kennen.",
    icon: "Truck",
    order: 5,
  },
  {
    slug: "proizvodnja",
    nameSr: "Proizvodnja i prodaja",
    nameDe: "Produktion & Verkauf",
    descriptionSr:
      "Stolarija, nameštaj po meri, ograde, terase, paneli i druga proizvodnja iz regiona. Kvalitetna izrada po pristupačnim cenama, sa isporukom i montažom i u Austriji i u Srbiji.",
    descriptionDe:
      "Tischlerei, Möbel nach Maß, Zäune, Terrassen, Paneele und weitere Produktion aus der Region. Hochwertige Fertigung zu fairen Preisen, mit Lieferung und Montage in Österreich und Serbien.",
    icon: "Factory",
    order: 6,
  },
  {
    slug: "trgovina",
    nameSr: "Trgovina",
    nameDe: "Handel",
    descriptionSr:
      "Prodavnice, veleprodaje i trgovinske firme — od građevinskog materijala do domaćih proizvoda. Trgovci koji povezuju ponudu regiona sa kupcima u Austriji i obrnuto.",
    descriptionDe:
      "Geschäfte, Großhandel und Handelsfirmen — von Baumaterial bis zu heimischen Produkten. Händler, die das Angebot der Region mit Kunden in Österreich verbinden und umgekehrt.",
    icon: "ShoppingBag",
    order: 7,
  },
  {
    slug: "zdravlje",
    nameSr: "Zdravlje i medicina",
    nameDe: "Gesundheit & Medizin",
    descriptionSr:
      "Stomatolozi, ordinacije, lekari i zdravstvene usluge na srpskom i nemačkom jeziku. Mnogi iz dijaspore biraju stomatološke i medicinske usluge u Srbiji — ovde su proverene adrese.",
    descriptionDe:
      "Zahnärzte, Ordinationen, Ärzte und Gesundheitsleistungen auf Serbisch und Deutsch. Viele aus der Diaspora wählen zahnmedizinische und medizinische Leistungen in Serbien — hier finden Sie geprüfte Adressen.",
    icon: "Stethoscope",
    order: 8,
  },
  {
    slug: "nega",
    nameSr: "Nega lica i tela",
    nameDe: "Gesichts- & Körperpflege",
    descriptionSr:
      "Frizerski i kozmetički saloni, nega lica i tela, masaže i tretmani. Saloni u kojima se dogovorite bez jezičke barijere — u Beču, Beogradu i svuda između.",
    descriptionDe:
      "Friseur- und Kosmetiksalons, Gesichts- und Körperpflege, Massagen und Behandlungen. Salons, in denen Sie sich ohne Sprachbarriere verständigen — in Wien, Belgrad und überall dazwischen.",
    icon: "Sparkles",
    order: 9,
  },
  {
    slug: "strucne-usluge",
    nameSr: "Pravne, prevodilačke, knjigovodstvene, finansijske i IT usluge",
    nameDe: "Rechts-, Übersetzungs-, Buchhaltungs-, Finanz- & IT-Dienstleistungen",
    descriptionSr:
      "Advokati, sudski tumači i prevodioci, knjigovođe, poreski i finansijski savetnici i IT firme. Stručnjaci koji poznaju propise i Austrije i Srbije — ključni saveznici za život i posao na dva tržišta.",
    descriptionDe:
      "Rechtsanwälte, Gerichtsdolmetscher und Übersetzer, Buchhalter, Steuer- und Finanzberater sowie IT-Firmen. Experten, die die Vorschriften Österreichs und Serbiens kennen — wichtige Partner für Leben und Arbeiten auf zwei Märkten.",
    icon: "Scale",
    order: 10,
  },
  {
    slug: "turizam",
    nameSr: "Turizam",
    nameDe: "Tourismus",
    descriptionSr:
      "Hoteli, apartmani, banje i turističke agencije u Srbiji i regionu. Planirate odmor u zavičaju ili vikend u banji — ovde su smeštaj i organizacija na jednom mestu.",
    descriptionDe:
      "Hotels, Apartments, Kurorte und Reiseagenturen in Serbien und der Region. Ob Urlaub in der Heimat oder ein Wellness-Wochenende — Unterkunft und Organisation an einem Ort.",
    icon: "Plane",
    order: 11,
  },
  {
    slug: "ugostiteljstvo",
    nameSr: "Ugostiteljstvo",
    nameDe: "Gastronomie",
    descriptionSr:
      "Restorani, kafići, hoteli i prenoćišta sa ukusima Balkana — u Austriji i Srbiji. Mesta gde se dobro jede i još bolje dočekuje, bilo da ste u Beču ili na putu ka jugu.",
    descriptionDe:
      "Restaurants, Cafés, Hotels und Unterkünfte mit den Geschmäckern des Balkans — in Österreich und Serbien. Orte, an denen man gut isst und noch besser empfangen wird, ob in Wien oder auf dem Weg nach Süden.",
    icon: "UtensilsCrossed",
    order: 12,
  },
  {
    slug: "kultura",
    nameSr: "Kultura i umetnost",
    nameDe: "Kultur & Kunst",
    descriptionSr:
      "Udruženja, umetnici, muzika i kulturni programi koji čuvaju vezu dijaspore sa zavičajem. Podrška onima koji stvaraju i okupljaju zajednicu na relaciji Austrija–Srbija.",
    descriptionDe:
      "Vereine, Künstler, Musik und Kulturprogramme, die die Verbindung der Diaspora zur Heimat pflegen. Unterstützung für alle, die auf der Achse Österreich–Serbien Gemeinschaft schaffen.",
    icon: "Palette",
    order: 13,
  },
];

export const seedCategories = internalMutation({
  args: {},
  returns: v.object({ inserted: v.number(), updated: v.number() }),
  handler: async (ctx) => {
    let inserted = 0;
    let updated = 0;
    for (const category of CATEGORIES) {
      const existing = await ctx.db
        .query("categories")
        .withIndex("by_slug", (q) => q.eq("slug", category.slug))
        .unique();
      if (existing) {
        await ctx.db.patch("categories", existing._id, category);
        updated += 1;
      } else {
        await ctx.db.insert("categories", category);
        inserted += 1;
      }
    }
    return { inserted, updated };
  },
});

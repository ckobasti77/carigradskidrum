import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { hasLocale, localePath } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { pageAlternates } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { RouteLine } from "@/components/site/route-line";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const dict = getDictionary(locale);
  return {
    title: dict.about.title,
    description: dict.about.lead,
    alternates: pageAlternates(locale, "/o-nama"),
  };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const dict = getDictionary(locale);

  const paragraphs =
    locale === "de"
      ? [
          "Der „Carigradski drum” — die Konstantinopel-Straße — verbindet seit Jahrhunderten Wien und Belgrad. Auf dieser historischen Achse leben und arbeiten heute hunderttausende Menschen, die beide Welten kennen: die Diaspora in Österreich und ihre Familien, Freunde und Geschäftspartner in Serbien und der Region.",
          "Unsere Plattform bringt genau diese beiden Welten zusammen. Handwerker, Ärzte, Transporteure, Immobilienagenturen und viele andere Firmen präsentieren sich hier zweisprachig — und Kunden finden Dienstleister, mit denen sie sich ohne Sprachbarriere verständigen können.",
          "Das Verzeichnis ist für Besucher kostenlos. Firmen können ihr Profil übernehmen, vervollständigen und mit der Carigradski-Drum-Karte Teil des Partnernetzwerks mit Rabatten werden.",
        ]
      : [
          "„Carigradski drum” vekovima povezuje Beč i Beograd. Na toj istorijskoj osi danas žive i rade stotine hiljada ljudi koji poznaju oba sveta: dijaspora u Austriji i njihove porodice, prijatelji i poslovni partneri u Srbiji i regionu.",
          "Naša platforma spaja upravo ta dva sveta. Zanatlije, lekari, prevoznici, agencije za nekretnine i mnoge druge firme ovde se predstavljaju dvojezično — a klijenti pronalaze usluge sa kojima se dogovaraju bez jezičke barijere.",
          "Imenik je besplatan za posetioce. Firme mogu da preuzmu svoj profil, dopune ga i uz Carigradski Drum karticu postanu deo partnerske mreže sa popustima.",
        ];

  return (
    <div className="relative overflow-hidden">
      <RouteLine className="pointer-events-none absolute inset-x-0 top-24 h-20 w-full text-primary/10" />
      <div className="relative mx-auto max-w-3xl px-4 py-14 md:px-6 md:py-20">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          {dict.about.title}
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">{dict.about.lead}</p>
        <div className="mt-8 space-y-5 leading-relaxed text-foreground/90">
          {paragraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 24)}>{paragraph}</p>
          ))}
        </div>
        <Button asChild className="mt-8">
          <Link href={localePath(locale, "/firme")}>
            {dict.common.nav.directory}
          </Link>
        </Button>
      </div>
    </div>
  );
}

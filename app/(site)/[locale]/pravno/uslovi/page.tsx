import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { pageAlternates } from "@/lib/seo";
import { LegalPage, type LegalSection } from "@/components/site/legal-page";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const dict = getDictionary(locale);
  return {
    title: dict.legal.termsTitle,
    alternates: pageAlternates(locale, "/pravno/uslovi"),
    robots: { index: false, follow: true },
  };
}

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const dict = getDictionary(locale);

  const sections: LegalSection[] =
    locale === "de"
      ? [
          {
            heading: "Geltungsbereich",
            body: [
              "Diese Bedingungen regeln die Nutzung der Plattform carigradskidrum.com durch Besucher und eingetragene Firmen. TODO (Rechtsberatung): endgültige Fassung inkl. anwendbarem Recht und Gerichtsstand.",
            ],
          },
          {
            heading: "Verzeichnis & Firmenprofile",
            body: [
              "Basisprofile sind teilweise aus öffentlich zugänglichen Quellen erstellt. Firmeninhaber können ihr Profil übernehmen und vervollständigen; Änderungen werden vor Veröffentlichung geprüft.",
              "Bezahlte Profile (Jahresabo € 365 bzw. Monatsabo € 45) erhalten erweiterte Darstellung, bevorzugte Platzierung und die Rabatt-Partner-Kennzeichnung. TODO: Zahlungs-, Kündigungs- und Rückerstattungsbedingungen.",
            ],
          },
          {
            heading: "Pflichten der Nutzer",
            body: [
              "Es dürfen nur wahrheitsgemäße Angaben veröffentlicht werden. Unzulässig sind rechtswidrige Inhalte, Spam und die missbräuchliche Übernahme fremder Profile. Wir behalten uns vor, Profile abzulehnen oder zu sperren.",
            ],
          },
          {
            heading: "Haftung",
            body: [
              "Verträge kommen ausschließlich zwischen Kunden und den gelisteten Firmen zustande. Die Plattform ist nicht Vertragspartei und haftet nicht für Leistungen der gelisteten Firmen.",
            ],
          },
        ]
      : [
          {
            heading: "Oblast primene",
            body: [
              "Ovi uslovi uređuju korišćenje platforme carigradskidrum.com od strane posetilaca i registrovanih firmi. TODO (pravni savetnik): konačna verzija sa merodavnim pravom i nadležnim sudom.",
            ],
          },
          {
            heading: "Imenik i profili firmi",
            body: [
              "Osnovni profili su delom sastavljeni iz javno dostupnih izvora. Vlasnici mogu da preuzmu i dopune svoj profil; izmene se objavljuju nakon provere.",
              "Plaćeni profili (godišnja pretplata 365 € ili mesečna 45 €) dobijaju prošireni prikaz, prioritetnu poziciju i oznaku partnera sa popustom. TODO: uslovi plaćanja, otkazivanja i povraćaja.",
            ],
          },
          {
            heading: "Obaveze korisnika",
            body: [
              "Dozvoljeno je objavljivanje isključivo tačnih podataka. Zabranjeni su nezakonit sadržaj, spam i zloupotreba preuzimanja tuđih profila. Zadržavamo pravo da odbijemo ili suspendujemo profil.",
            ],
          },
          {
            heading: "Odgovornost",
            body: [
              "Ugovori se zaključuju isključivo između klijenata i izlistanih firmi. Platforma nije ugovorna strana i ne odgovara za usluge izlistanih firmi.",
            ],
          },
        ];

  return (
    <LegalPage
      title={dict.legal.termsTitle}
      draftNote={dict.legal.draftNote}
      sections={sections}
    />
  );
}

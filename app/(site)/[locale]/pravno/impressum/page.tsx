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
    title: dict.legal.impressumTitle,
    alternates: pageAlternates(locale, "/pravno/impressum"),
    robots: { index: false, follow: true },
  };
}

export default async function ImpressumPage({
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
            heading: "Medieninhaber & Betreiber",
            body: [
              "Marketing Agentur Carigradski Drum — TODO: vollständige Firmenbezeichnung, Rechtsform und Firmenbuchnummer ergänzen (Angaben gemäß § 5 ECG und § 25 MedienG).",
              "Anschrift: Tržni centar Kocka, Kralja Petra 1, Paraćin — TODO: österreichische Geschäftsanschrift ergänzen, sobald die Gesellschaft eingetragen ist.",
              "Kontakt: office@carigradskidrum.com · +43 667 762 676 0",
            ],
          },
          {
            heading: "Unternehmensgegenstand",
            body: [
              "Betrieb einer Online-Plattform (B2B/B2C-Verzeichnis), die Firmen und Kunden aus Österreich, Serbien und der Region verbindet.",
            ],
          },
          {
            heading: "Umsatzsteuer & Aufsicht",
            body: [
              "TODO: UID-Nummer, Mitgliedschaften (WKO), Aufsichtsbehörde und anwendbare gewerberechtliche Vorschriften ergänzen.",
            ],
          },
          {
            heading: "Haftungshinweis",
            body: [
              "Firmenprofile beruhen teilweise auf öffentlich zugänglichen Quellen. Trotz sorgfältiger Kontrolle übernehmen wir keine Haftung für die Richtigkeit der Angaben oder die Inhalte externer Links. Inhaber können ihr Profil übernehmen und korrigieren.",
            ],
          },
        ]
      : [
          {
            heading: "Vlasnik i izdavač platforme",
            body: [
              "Marketing Agentur Carigradski Drum — TODO: pun naziv firme, pravna forma i matični broj (obavezni podaci po austrijskom § 5 ECG i § 25 MedienG).",
              "Adresa: Tržni centar Kocka, Kralja Petra 1, Paraćin — TODO: dopuniti austrijsku poslovnu adresu po registraciji društva.",
              "Kontakt: office@carigradskidrum.com · +43 667 762 676 0",
            ],
          },
          {
            heading: "Delatnost",
            body: [
              "Vođenje online platforme (B2B/B2C imenika) koja povezuje firme i klijente iz Austrije, Srbije i regiona.",
            ],
          },
          {
            heading: "PDV i nadležnosti",
            body: [
              "TODO: UID/PIB broj, članstva (WKO), nadležni organ i propisi koji se primenjuju.",
            ],
          },
          {
            heading: "Ograničenje odgovornosti",
            body: [
              "Profili firmi delom potiču iz javno dostupnih izvora. Uprkos pažljivoj proveri ne garantujemo tačnost podataka niti odgovaramo za sadržaj spoljnih linkova. Vlasnici mogu da preuzmu i isprave svoj profil.",
            ],
          },
        ];

  return (
    <LegalPage
      title={dict.legal.impressumTitle}
      draftNote={dict.legal.draftNote}
      sections={sections}
    />
  );
}

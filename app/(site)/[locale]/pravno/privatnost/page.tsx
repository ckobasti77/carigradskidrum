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
    title: dict.legal.privacyTitle,
    alternates: pageAlternates(locale, "/pravno/privatnost"),
    robots: { index: false, follow: true },
  };
}

export default async function PrivacyPage({
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
            heading: "Verantwortlicher",
            body: [
              "Marketing Agentur Carigradski Drum (Kontakt: office@carigradskidrum.com). TODO: vollständige Angaben des Verantwortlichen im Sinne der DSGVO.",
            ],
          },
          {
            heading: "Welche Daten wir verarbeiten",
            body: [
              "Anfrageformulare: Name, E-Mail-Adresse, optional Telefonnummer und Ihre Nachricht. Diese Daten werden an die kontaktierte Firma weitergeleitet und zur Missbrauchsabwehr gespeichert.",
              "Firmenprofile: geschäftliche Angaben (Name, Adresse, Website, Kategorie), teilweise aus öffentlich zugänglichen Quellen. Inhaber können ihr Profil übernehmen, ändern oder die Entfernung verlangen.",
              "Technische Daten: Server-Logs und aggregierte, cookielose Nutzungsstatistik (Vercel Analytics). Es werden keine Werbe-Cookies gesetzt.",
            ],
          },
          {
            heading: "Rechtsgrundlage & Speicherdauer",
            body: [
              "TODO (Rechtsberatung): Rechtsgrundlagen nach Art. 6 DSGVO, Speicherfristen, Auftragsverarbeiter (Vercel, Convex, Resend) und Drittlandübermittlungen dokumentieren.",
            ],
          },
          {
            heading: "Ihre Rechte",
            body: [
              "Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch. Wenden Sie sich an office@carigradskidrum.com. Beschwerden: österreichische Datenschutzbehörde (dsb.gv.at).",
            ],
          },
        ]
      : [
          {
            heading: "Rukovalac podacima",
            body: [
              "Marketing Agentur Carigradski Drum (kontakt: office@carigradskidrum.com). TODO: puni podaci rukovaoca u smislu GDPR-a.",
            ],
          },
          {
            heading: "Koje podatke obrađujemo",
            body: [
              "Forma za upit: ime, email adresa, opciono telefon i vaša poruka. Podaci se prosleđuju firmi koju kontaktirate i čuvaju radi sprečavanja zloupotrebe.",
              "Profili firmi: poslovni podaci (naziv, adresa, sajt, kategorija), delom iz javno dostupnih izvora. Vlasnici mogu da preuzmu profil, izmene ga ili zatraže uklanjanje.",
              "Tehnički podaci: serverski logovi i agregirana statistika posete bez kolačića (Vercel Analytics). Ne postavljamo marketinške kolačiće.",
            ],
          },
          {
            heading: "Pravni osnov i rokovi čuvanja",
            body: [
              "TODO (pravni savetnik): pravni osnovi po čl. 6 GDPR, rokovi čuvanja, obrađivači (Vercel, Convex, Resend) i prenosi u treće zemlje.",
            ],
          },
          {
            heading: "Vaša prava",
            body: [
              "Imate pravo na pristup, ispravku, brisanje, ograničenje obrade, prenosivost podataka i prigovor. Pišite na office@carigradskidrum.com. Pritužbe: austrijski organ za zaštitu podataka (dsb.gv.at).",
            ],
          },
        ];

  return (
    <LegalPage
      title={dict.legal.privacyTitle}
      draftNote={dict.legal.draftNote}
      sections={sections}
    />
  );
}

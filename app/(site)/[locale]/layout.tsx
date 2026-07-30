import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import { Analytics } from "@vercel/analytics/next";
import "../../globals.css";
import { hasLocale, locales } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";

// latin-ext covers Serbian latin (čćžšđ) and German umlauts.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "latin-ext"],
});

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const dict = getDictionary(locale);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: `${dict.common.siteName} — ${dict.common.tagline}`,
      template: `%s — ${dict.common.siteName}`,
    },
    description: dict.common.description,
    openGraph: {
      siteName: dict.common.siteName,
      locale: locale === "sr" ? "sr_RS" : "de_DE",
      type: "website",
    },
  };
}

export default async function SiteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const dict = getDictionary(locale);

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-svh flex-col bg-background font-sans text-foreground antialiased">
        <Providers>
          <SiteHeader
            locale={locale}
            strings={{
              siteName: dict.common.siteName,
              nav: dict.common.nav,
              addCompany: dict.common.cta.addCompany,
              openMenu: dict.common.actions.openMenu,
              switcherLabel: dict.common.languageSwitcher.label,
            }}
          />
          <main className="flex-1">{children}</main>
          <SiteFooter locale={locale} dict={dict} />
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}

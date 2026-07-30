import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Mail, MapPin, Phone } from "lucide-react";
import { hasLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { pageAlternates } from "@/lib/seo";
import { Button } from "@/components/ui/button";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const dict = getDictionary(locale);
  return {
    title: dict.contact.title,
    description: dict.contact.lead,
    alternates: pageAlternates(locale, "/kontakt"),
  };
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const dict = getDictionary(locale);

  return (
    <div className="mx-auto max-w-4xl px-4 py-14 md:px-6 md:py-20">
      <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
        {dict.contact.title}
      </h1>
      <p className="mt-3 text-lg text-muted-foreground">{dict.contact.lead}</p>

      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-6">
          <p className="font-semibold">Marketing Agentur Carigradski Drum</p>
          <address className="mt-3 space-y-2 text-sm not-italic text-muted-foreground">
            <p className="flex items-center gap-2">
              <MapPin className="size-4 shrink-0 text-primary" aria-hidden="true" />
              Tržni centar Kocka, Kralja Petra 1, Paraćin
            </p>
            <p className="flex items-center gap-2">
              <Phone className="size-4 shrink-0 text-primary" aria-hidden="true" />
              <a className="hover:underline" href="tel:+436677626760">
                +43 667 762 676 0
              </a>
            </p>
            <p className="flex items-center gap-2">
              <Mail className="size-4 shrink-0 text-primary" aria-hidden="true" />
              <a className="hover:underline" href="mailto:office@carigradskidrum.com">
                office@carigradskidrum.com
              </a>
            </p>
          </address>
          <Button asChild className="mt-5 w-full">
            <a href="mailto:office@carigradskidrum.com">
              {dict.contact.form.submit}
            </a>
          </Button>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <p className="font-semibold">{dict.common.footer.partnerTitle}</p>
          <p className="mt-1 text-sm text-muted-foreground">Varadinska Oaza</p>
          <address className="mt-3 space-y-2 text-sm not-italic text-muted-foreground">
            <p className="flex items-center gap-2">
              <MapPin className="size-4 shrink-0 text-primary" aria-hidden="true" />
              Livadska 7, 21132 Petrovaradin
            </p>
            <p className="flex items-center gap-2">
              <Phone className="size-4 shrink-0 text-primary" aria-hidden="true" />
              <a className="hover:underline" href="tel:+381638359205">
                +381 63 835 92 05
              </a>
            </p>
            <p className="flex items-center gap-2">
              <Mail className="size-4 shrink-0 text-primary" aria-hidden="true" />
              <a className="hover:underline" href="mailto:varadinskaoaza2024@gmail.com">
                varadinskaoaza2024@gmail.com
              </a>
            </p>
          </address>
        </div>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  ArrowUpRight,
  Clock3,
  Mail,
  MapPin,
  MessageCircleMore,
  Phone,
} from "lucide-react";
import { ContactForm } from "@/components/site/contact-form";
import { RouteLine } from "@/components/site/route-line";
import { hasLocale, localePath } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { pageAlternates } from "@/lib/seo";

const OFFICE_EMAIL = "office@carigradskidrum.com";
const OFFICE_PHONE_HREF = "tel:+436677626760";
const OFFICE_PHONE_LABEL = "+43 667 762 676 0";
const OFFICE_ADDRESS = "Tržni centar Kocka, Kralja Petra 1, Paraćin";
const OFFICE_MAP =
  "https://www.google.com/maps/search/?api=1&query=Tr%C5%BEni%20centar%20Kocka%2C%20Kralja%20Petra%201%2C%20Para%C4%87in";

const PARTNER_EMAIL = "varadinskaoaza2024@gmail.com";
const PARTNER_PHONE_HREF = "tel:+381638359205";
const PARTNER_PHONE_LABEL = "+381 63 835 92 05";
const PARTNER_ADDRESS = "Livadska 7, 21132 Petrovaradin";
const PARTNER_MAP =
  "https://www.google.com/maps/search/?api=1&query=Livadska%207%2C%2021132%20Petrovaradin";

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
    <div>
      <section className="relative isolate overflow-hidden border-b border-border bg-card/45">
        <div
          className="pointer-events-none absolute -right-24 -top-32 size-80 rounded-full border-[3rem] border-terracotta-100 opacity-70"
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-6xl px-4 py-14 md:px-6 md:py-20 lg:py-24">
          <div className="max-w-4xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-terracotta-300 bg-terracotta-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-terracotta-800">
              <MessageCircleMore className="size-4" aria-hidden="true" />
              {dict.contact.eyebrow}
            </p>
            <h1 className="mt-6 max-w-3xl text-4xl tracking-tight sm:text-5xl lg:text-[3.5rem]">
              {dict.contact.headline}
            </h1>
            <p className="mt-5 max-w-3xl text-lg text-muted-foreground">
              {dict.contact.lead}
            </p>
          </div>

          <div className="mt-10 max-w-3xl" aria-hidden="true">
            <RouteLine className="h-14 w-full text-terracotta-400 sm:h-16" />
            <div className="-mt-1 flex justify-between text-xs font-semibold uppercase tracking-[0.14em] text-terracotta-800">
              <span>{dict.contact.routeFrom}</span>
              <span>{dict.contact.routeTo}</span>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:px-6 md:py-16 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] lg:items-start lg:gap-12 lg:py-20">
        <aside className="space-y-5 lg:sticky lg:top-28">
          <section className="rounded-xl border border-neutral-300 bg-card p-6 shadow-sm sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-terracotta-700">
              {dict.contact.officeLabel}
            </p>
            <h2 className="mt-3 text-2xl tracking-tight">
              {dict.contact.detailsTitle}
            </h2>

            <address className="mt-6 divide-y divide-border not-italic">
              <ContactLink
                icon={Mail}
                label={dict.contact.emailLabel}
                value={OFFICE_EMAIL}
                href={`mailto:${OFFICE_EMAIL}`}
              />
              <ContactLink
                icon={Phone}
                label={dict.contact.phoneLabel}
                value={OFFICE_PHONE_LABEL}
                href={OFFICE_PHONE_HREF}
              />
              <ContactLink
                icon={MapPin}
                label={dict.contact.addressLabel}
                value={OFFICE_ADDRESS}
                href={OFFICE_MAP}
                external
                actionLabel={dict.contact.mapAction}
              />
            </address>
          </section>

          <section className="rounded-xl border border-sage-300 bg-sage-100 p-6 sm:p-7">
            <Clock3 className="size-6 text-sage-700" aria-hidden="true" />
            <h2 className="mt-4 text-xl tracking-tight">
              {dict.contact.responseTitle}
            </h2>
            <p className="mt-2 text-sm text-sage-900/80">
              {dict.contact.responseText}
            </p>
          </section>

          <section className="rounded-xl border border-neutral-300 bg-background p-6 sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sage-700">
              {dict.contact.partnerEyebrow}
            </p>
            <h2 className="mt-3 text-xl tracking-tight">Varadinska Oaza</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {dict.contact.partnerText}
            </p>
            <address className="mt-5 space-y-3 text-sm not-italic">
              <a
                className="flex items-start gap-3 text-foreground transition-colors hover:text-terracotta-700"
                href={PARTNER_PHONE_HREF}
              >
                <Phone className="mt-1 size-4 shrink-0 text-primary" aria-hidden="true" />
                {PARTNER_PHONE_LABEL}
              </a>
              <a
                className="flex items-start gap-3 break-all text-foreground transition-colors hover:text-terracotta-700"
                href={`mailto:${PARTNER_EMAIL}`}
              >
                <Mail className="mt-1 size-4 shrink-0 text-primary" aria-hidden="true" />
                {PARTNER_EMAIL}
              </a>
              <a
                className="flex items-start gap-3 text-foreground transition-colors hover:text-terracotta-700"
                href={PARTNER_MAP}
                target="_blank"
                rel="noreferrer"
              >
                <MapPin className="mt-1 size-4 shrink-0 text-primary" aria-hidden="true" />
                <span>
                  {PARTNER_ADDRESS}
                  <span className="mt-1 flex items-center gap-1 text-xs font-semibold text-terracotta-700">
                    {dict.contact.mapAction}
                    <ArrowUpRight className="size-3.5" aria-hidden="true" />
                  </span>
                </span>
              </a>
            </address>
          </section>
        </aside>

        <ContactForm
          locale={locale}
          privacyHref={localePath(locale, "/pravno/privatnost")}
          strings={dict.contact.form}
        />
      </main>
    </div>
  );
}

function ContactLink({
  icon: Icon,
  label,
  value,
  href,
  external = false,
  actionLabel,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
  href: string;
  external?: boolean;
  actionLabel?: string;
}) {
  return (
    <a
      className="group flex items-start gap-4 py-4 first:pt-0 last:pb-0"
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-terracotta-100 text-terracotta-700 transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 pt-0.5">
        <span className="block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </span>
        <span className="mt-1 block break-words text-sm font-semibold text-foreground group-hover:text-terracotta-700">
          {value}
        </span>
        {actionLabel ? (
          <span className="mt-1 flex items-center gap-1 text-xs font-semibold text-terracotta-700">
            {actionLabel}
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </span>
        ) : null}
      </span>
    </a>
  );
}

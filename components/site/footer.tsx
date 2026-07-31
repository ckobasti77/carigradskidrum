import Link from "next/link";
import { localePath, type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";

const COLUMN_HEADING =
  "mb-3.5 block text-sm font-bold tracking-[0.04em] uppercase text-terracotta-700";
const BODY_LINK = "font-bold text-terracotta-700 hover:text-terracotta-800";
/* Navigacioni linkovi nisu inline u rečenici, pa ih WCAG izuzetak ne pokriva —
   dobijaju punih 44px. Telefon/mejl u <address> ostaju inline. */
const NAV_LINK = `inline-flex min-h-11 items-center ${BODY_LINK}`;

export function SiteFooter({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const year = new Date().getFullYear();
  const { footer, nav } = dict.common;

  return (
    <footer className="mx-auto w-full max-w-[1200px] px-5 pb-10 md:px-[clamp(20px,5vw,72px)] md:pb-16">
      <div className="grid gap-8 border-t-2 border-neutral-200 pt-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-[clamp(28px,4vw,56px)]">
        <div>
          <span className="font-heading text-2xl">Carigradski Drum</span>
          <p className="mt-3 max-w-[30ch] text-[17px] text-neutral-700">
            {dict.common.tagline}
          </p>
        </div>

        <nav aria-label={footer.navTitle}>
          <span className={COLUMN_HEADING}>{footer.navTitle}</span>
          <ul className="text-[17px] leading-[1.7] text-neutral-800">
            <li><Link className={NAV_LINK} href={localePath(locale, "/firme")}>{nav.directory}</Link></li>
            <li><Link className={NAV_LINK} href={localePath(locale, "/kartica")}>{nav.card}</Link></li>
            <li><Link className={NAV_LINK} href={localePath(locale, "/o-nama")}>{nav.about}</Link></li>
            <li><Link className={NAV_LINK} href={localePath(locale, "/kontakt")}>{nav.contact}</Link></li>
            <li><Link className={NAV_LINK} href={localePath(locale, "/dodaj-firmu")}>{dict.common.cta.addCompany}</Link></li>
          </ul>
        </nav>

        <div>
          <span className={COLUMN_HEADING}>{footer.contactTitle}</span>
          <address className="text-[17px] leading-[1.7] text-neutral-800 not-italic">
            Marketing Agentur Carigradski Drum
            <br />
            Tržni centar Kocka, Kralja Petra 1, Paraćin
            <br />
            <a className={BODY_LINK} href="tel:+436677626760">+43 667 762 676 0</a>
            <br />
            <a className={BODY_LINK} href="mailto:office@carigradskidrum.com">
              office@carigradskidrum.com
            </a>
          </address>
        </div>

        <div>
          <span className={COLUMN_HEADING}>{footer.partnerTitle}</span>
          <address className="text-[17px] leading-[1.7] text-neutral-800 not-italic">
            Varadinska Oaza
            <br />
            Livadska 7, 21132 Petrovaradin
            <br />
            <a className={BODY_LINK} href="tel:+381638359205">+381 63 835 92 05</a>
          </address>
        </div>
      </div>

      <div className="mt-10 flex flex-wrap justify-between gap-4 text-xs text-neutral-700">
        <span>
          © {year} Carigradski Drum. {footer.rights}
        </span>
        <nav aria-label={footer.legalTitle} className="flex flex-wrap gap-x-5 gap-y-1">
          <Link className={NAV_LINK} href={localePath(locale, "/pravno/privatnost")}>
            {footer.privacy}
          </Link>
          <Link className={NAV_LINK} href={localePath(locale, "/pravno/uslovi")}>
            {footer.terms}
          </Link>
          <Link className={NAV_LINK} href={localePath(locale, "/pravno/impressum")}>
            {footer.impressum}
          </Link>
        </nav>
      </div>
    </footer>
  );
}

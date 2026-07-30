import Link from "next/link";
import { localePath, type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export function SiteFooter({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const year = new Date().getFullYear();
  const { footer, nav } = dict.common;

  return (
    <footer className="border-t border-border bg-secondary/40">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 md:px-6 lg:grid-cols-4">
        <div className="space-y-3">
          <p className="text-lg font-semibold tracking-tight">
            Carigradski <span className="text-primary">Drum</span>
          </p>
          <p className="text-sm text-muted-foreground">{dict.common.tagline}</p>
        </div>

        <nav aria-label={footer.navTitle} className="space-y-3">
          <p className="text-sm font-semibold">{footer.navTitle}</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link className="hover:text-foreground" href={localePath(locale, "/firme")}>{nav.directory}</Link></li>
            <li><Link className="hover:text-foreground" href={localePath(locale, "/kartica")}>{nav.card}</Link></li>
            <li><Link className="hover:text-foreground" href={localePath(locale, "/o-nama")}>{nav.about}</Link></li>
            <li><Link className="hover:text-foreground" href={localePath(locale, "/kontakt")}>{nav.contact}</Link></li>
            <li><Link className="hover:text-foreground" href={localePath(locale, "/dodaj-firmu")}>{dict.common.cta.addCompany}</Link></li>
          </ul>
        </nav>

        <div className="space-y-3">
          <p className="text-sm font-semibold">{footer.contactTitle}</p>
          <address className="space-y-1 text-sm not-italic text-muted-foreground">
            <p>Marketing Agentur Carigradski Drum</p>
            <p>Tržni centar Kocka, Kralja Petra 1, Paraćin</p>
            <p>
              <a className="hover:text-foreground" href="tel:+436677626760">+43 667 762 676 0</a>
            </p>
            <p>
              <a className="hover:text-foreground" href="mailto:office@carigradskidrum.com">
                office@carigradskidrum.com
              </a>
            </p>
          </address>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold">{footer.partnerTitle}</p>
          <address className="space-y-1 text-sm not-italic text-muted-foreground">
            <p>Varadinska Oaza</p>
            <p>Livadska 7, 21132 Petrovaradin</p>
            <p>
              <a className="hover:text-foreground" href="tel:+381638359205">+381 63 835 92 05</a>
            </p>
          </address>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-3 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center md:px-6">
          <p>
            © {year} Carigradski Drum. {footer.rights}
          </p>
          <nav aria-label={footer.legalTitle} className="flex flex-wrap gap-x-4 gap-y-1">
            <Link className="hover:text-foreground" href={localePath(locale, "/pravno/privatnost")}>
              {footer.privacy}
            </Link>
            <Link className="hover:text-foreground" href={localePath(locale, "/pravno/uslovi")}>
              {footer.terms}
            </Link>
            <Link className="hover:text-foreground" href={localePath(locale, "/pravno/impressum")}>
              {footer.impressum}
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}

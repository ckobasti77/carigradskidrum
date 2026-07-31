"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { localePath, type Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";
import { LanguageSwitcher } from "./language-switcher";

export type HeaderStrings = {
  siteName: string;
  nav: { home: string; directory: string; card: string; about: string; contact: string };
  addCompany: string;
  openMenu: string;
  switcherLabel: string;
};

export function SiteHeader({ locale, strings }: { locale: Locale; strings: HeaderStrings }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const items = [
    { href: localePath(locale), label: strings.nav.home, exact: true },
    { href: localePath(locale, "/firme"), label: strings.nav.directory },
    { href: localePath(locale, "/kartica"), label: strings.nav.card },
    { href: localePath(locale, "/o-nama"), label: strings.nav.about },
    { href: localePath(locale, "/kontakt"), label: strings.nav.contact },
  ];

  function isActive(item: { href: string; exact?: boolean }) {
    return item.exact ? pathname === item.href : pathname.startsWith(item.href);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-background/95 backdrop-blur">
      <div className="mx-auto flex min-h-20 max-w-[1200px] flex-wrap items-center gap-x-5 gap-y-3 px-5 py-3 lg:px-[clamp(20px,5vw,72px)]">
        <Link
          href={localePath(locale)}
          className="mr-auto flex min-h-11 items-center font-heading text-2xl"
          aria-label={strings.siteName}
        >
          Carigradski Drum
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label={strings.siteName}>
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item) ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center rounded-full px-3 text-[17px] font-semibold transition-colors",
                isActive(item)
                  ? "text-terracotta-700"
                  : "text-foreground hover:text-terracotta-700",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <LanguageSwitcher locale={locale} label={strings.switcherLabel} />
          <Button asChild size="sm">
            <Link href={localePath(locale, "/dodaj-firmu")}>{strings.addCompany}</Link>
          </Button>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <LanguageSwitcher locale={locale} label={strings.switcherLabel} />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" aria-label={strings.openMenu}>
                <Menu className="size-5" aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80">
              <SheetHeader>
                <SheetTitle className="text-left font-heading text-2xl">
                  Carigradski Drum
                </SheetTitle>
              </SheetHeader>
              <nav className="mt-2 flex flex-col gap-1 px-4" aria-label={strings.siteName}>
                {items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={isActive(item) ? "page" : undefined}
                    className={cn(
                      "flex min-h-12 items-center rounded-full px-4 text-base font-semibold transition-colors",
                      isActive(item)
                        ? "bg-terracotta-100 text-terracotta-800"
                        : "text-foreground hover:bg-terracotta-100 hover:text-terracotta-800",
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
                <Button asChild className="mt-3">
                  <Link href={localePath(locale, "/dodaj-firmu")} onClick={() => setOpen(false)}>
                    {strings.addCompany}
                  </Link>
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

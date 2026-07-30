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
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 md:px-6">
        <Link
          href={localePath(locale)}
          className="text-lg font-semibold tracking-tight"
          aria-label={strings.siteName}
        >
          Carigradski <span className="text-primary">Drum</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label={strings.siteName}>
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item) ? "page" : undefined}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive(item)
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <LanguageSwitcher locale={locale} label={strings.switcherLabel} />
          <Button asChild size="sm">
            <Link href={localePath(locale, "/dodaj-firmu")}>{strings.addCompany}</Link>
          </Button>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <LanguageSwitcher locale={locale} label={strings.switcherLabel} />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" aria-label={strings.openMenu}>
                <Menu className="size-5" aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle className="text-left text-base">
                  Carigradski <span className="text-primary">Drum</span>
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
                      "rounded-md px-3 py-2.5 text-sm font-medium",
                      isActive(item)
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground",
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

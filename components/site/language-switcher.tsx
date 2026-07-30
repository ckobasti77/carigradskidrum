"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { locales, type Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

const LOCALE_COOKIE = "locale";

export function LanguageSwitcher({
  locale,
  label,
}: {
  locale: Locale;
  label: string;
}) {
  const pathname = usePathname();

  function pathFor(target: Locale) {
    const stripped = pathname.replace(/^\/(sr|de)(?=\/|$)/, "");
    return `/${target}${stripped}`;
  }

  return (
    <nav aria-label={label} className="flex items-center rounded-md border border-border p-0.5">
      {locales.map((target) => (
        <Link
          key={target}
          href={pathFor(target)}
          aria-current={target === locale ? "true" : undefined}
          onClick={() => {
            document.cookie = `${LOCALE_COOKIE}=${target};path=/;max-age=31536000;samesite=lax`;
          }}
          className={cn(
            "rounded-[0.3rem] px-2 py-1 text-xs font-medium uppercase transition-colors",
            target === locale
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {target}
        </Link>
      ))}
    </nav>
  );
}

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
    <nav aria-label={label} className="flex items-center gap-1">
      {locales.map((target) => (
        <Link
          key={target}
          href={pathFor(target)}
          aria-current={target === locale ? "true" : undefined}
          onClick={() => {
            document.cookie = `${LOCALE_COOKIE}=${target};path=/;max-age=31536000;samesite=lax`;
          }}
          className={cn(
            "flex min-h-11 items-center rounded-full px-3 text-sm font-bold uppercase transition-colors",
            target === locale
              ? "bg-sage-200 text-sage-800"
              : "text-neutral-500 hover:text-foreground",
          )}
        >
          {target}
        </Link>
      ))}
    </nav>
  );
}

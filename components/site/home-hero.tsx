import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { localePath, type Locale } from "@/lib/i18n/config";
import { RouteLine } from "./route-line";

export function HomeHero({
  locale,
  strings,
}: {
  locale: Locale;
  strings: {
    title: string;
    subtitle: string;
    searchPlaceholder: string;
    searchLabel: string;
    searchButton: string;
  };
}) {
  return (
    <section className="relative overflow-hidden border-b border-border bg-secondary/30">
      <RouteLine className="pointer-events-none absolute inset-x-0 bottom-0 h-24 w-full text-primary/15" />
      <div className="relative mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24">
        <div className="max-w-2xl space-y-5">
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
            {strings.title}
          </h1>
          <p className="text-base text-muted-foreground md:text-lg">{strings.subtitle}</p>
          {/* Plain GET form: works without JS, lands on /{locale}/firme?q=... */}
          <form
            action={localePath(locale, "/firme")}
            role="search"
            aria-label={strings.searchLabel}
            className="flex max-w-xl gap-2"
          >
            <Input
              type="search"
              name="q"
              placeholder={strings.searchPlaceholder}
              aria-label={strings.searchLabel}
              className="h-11 bg-card"
            />
            <Button type="submit" size="lg" className="h-11">
              <Search className="size-4" aria-hidden="true" />
              <span>{strings.searchButton}</span>
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}

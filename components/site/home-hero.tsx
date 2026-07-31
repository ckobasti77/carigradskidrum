import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { localePath, type Locale } from "@/lib/i18n/config";

/**
 * Dva stuba: naslov + pretraga levo, fotografija desno. Ispod ~750px grid pada
 * na jednu kolonu i slika ide ispod teksta.
 *
 * Dekorativni krugovi (žalfija gore desno, terakota iza slike) namerno izlaze
 * iz sekcije — `overflow-x: clip` na <html>/<body> ih seče bez pravljenja
 * scroll konteksta koji bi ubio sticky header.
 */
export function HomeHero({
  locale,
  strings,
  trust,
}: {
  locale: Locale;
  strings: {
    title: string;
    subtitle: string;
    searchPlaceholder: string;
    searchLabel: string;
    searchButton: string;
    imageAlt: string;
  };
  trust: { label: string; tone: "terracotta" | "sage" }[];
}) {
  return (
    <section className="relative py-[clamp(56px,8vw,112px)]">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-[200px] -right-[60px] -z-10 size-[420px] rounded-full bg-sage-200"
      />

      <div className="grid items-center gap-[clamp(28px,5vw,80px)] [grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr))]">
        <div>
          <h1 className="-ml-[0.028em] max-w-[18ch] text-[clamp(42px,5.6vw,74px)] leading-[1.08] text-balance">
            {strings.title}
          </h1>

          <p className="mt-7 max-w-[56ch] text-[clamp(19px,1.6vw,22px)] leading-[1.6] text-neutral-800">
            {strings.subtitle}
          </p>

          {/* Običan GET form: radi i bez JS-a, sleće na /{locale}/firme?q=… */}
          <form
            action={localePath(locale, "/firme")}
            role="search"
            aria-label={strings.searchLabel}
            className="mt-9 flex max-w-[640px] flex-wrap gap-3"
          >
            <Input
              type="search"
              name="q"
              placeholder={strings.searchPlaceholder}
              aria-label={strings.searchLabel}
              className="h-14 min-w-[260px] flex-1 px-6"
            />
            <Button type="submit" size="lg" className="h-14">
              {strings.searchButton}
            </Button>
          </form>

          <ul className="mt-11 flex flex-wrap gap-x-7 gap-y-3 text-[17px] font-bold text-terracotta-700">
            {trust.map((item) => (
              <li key={item.label} className="inline-flex items-center gap-2.5">
                <span
                  aria-hidden="true"
                  className={`size-3 shrink-0 rounded-full ${
                    item.tone === "sage" ? "bg-sage-500" : "bg-terracotta"
                  }`}
                />
                {item.label}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative w-[min(440px,100%)] justify-self-center md:justify-self-end">
          <span
            aria-hidden="true"
            className="absolute bottom-8 -left-7 -z-10 size-[88px] rounded-full bg-terracotta-200"
          />
          {/* Fotografija je portretna (1536×2752), okvir je 4:5 — `fill` +
              object-cover kropuje bez upozorenja o odnosu stranica. */}
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl">
            <Image
              src="/hero.avif"
              alt={strings.imageAlt}
              fill
              priority
              sizes="(max-width: 900px) 100vw, 440px"
              className="washed object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

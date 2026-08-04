import Image from "next/image";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { localePath, type Locale } from "@/lib/i18n/config";
import type { CompanyCard as CompanyCardData } from "@/convex/lib/cards";
import { DiscountBadge } from "./discount-badge";

export type CompanyCardStrings = {
  countryLabels: Record<string, string>;
  discountTemplate: string;
};

/** Server- and client-renderable directory card. */
export function CompanyCard({
  locale,
  card,
  strings,
}: {
  locale: Locale;
  card: CompanyCardData;
  strings: CompanyCardStrings;
}) {
  const href = localePath(locale, `/firma/${card.slug}`);
  const countryLabel = strings.countryLabels[card.country] ?? card.country;

  return (
    <article className="group relative flex h-full flex-col rounded-xl bg-card p-4 shadow-sm transition-shadow hover:shadow-md focus-within:ring-2 focus-within:ring-terracotta-500 focus-within:ring-offset-2 focus-within:ring-offset-background">
      <div className="relative aspect-video w-full overflow-hidden rounded-md bg-neutral-200">
        {card.coverUrl ? (
          <Image
            src={card.coverUrl}
            alt=""
            fill
            sizes="(max-width: 639px) calc(100vw - 64px), (max-width: 1023px) 46vw, 360px"
            className="object-cover motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-[1.025] motion-reduce:transform-none"
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex h-full w-full items-center justify-center font-heading text-4xl text-terracotta-400"
          >
            {card.name.charAt(0).toUpperCase()}
          </div>
        )}
        {card.discountPercent !== null && (
          <div className="absolute top-2 right-2">
            <DiscountBadge
              percent={card.discountPercent}
              template={strings.discountTemplate}
              compact
            />
          </div>
        )}
      </div>
      <div className="flex min-h-[210px] flex-1 flex-col gap-2 px-1 pt-4 pb-1">
        <h3 className="line-clamp-3 text-xl leading-snug">
          <Link
            href={href}
            className="after:absolute after:inset-0 focus-visible:outline-none"
          >
            {card.name}
          </Link>
        </h3>
        {card.categoryNames.length > 0 && (
          <p className="line-clamp-2 text-sm leading-5 text-neutral-700">
            {card.categoryNames.join(" · ")}
          </p>
        )}
        <p className="mt-auto flex items-start gap-1.5 pt-1 text-sm font-semibold text-terracotta-700">
          <MapPin className="size-4 shrink-0" aria-hidden="true" />
          <span className="line-clamp-2">
            {card.city}, {countryLabel}
          </span>
        </p>
      </div>
    </article>
  );
}

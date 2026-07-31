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
    <article className="group relative flex flex-col overflow-hidden rounded-xl bg-card shadow-sm transition-shadow hover:shadow-md">
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-neutral-200">
        {card.coverUrl ? (
          <Image
            src={card.coverUrl}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
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
      <div className="flex flex-1 flex-col gap-1.5 p-5">
        <h3 className="text-xl leading-snug">
          <Link href={href} className="after:absolute after:inset-0">
            {card.name}
          </Link>
        </h3>
        {card.categoryNames.length > 0 && (
          <p className="text-sm text-neutral-700">
            {card.categoryNames.join(" · ")}
          </p>
        )}
        <p className="mt-auto flex items-center gap-1.5 pt-1 text-sm font-semibold text-sage-700">
          <MapPin className="size-4 shrink-0" aria-hidden="true" />
          {card.city}, {countryLabel}
        </p>
      </div>
    </article>
  );
}

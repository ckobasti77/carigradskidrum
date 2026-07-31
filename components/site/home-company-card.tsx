import Link from "next/link";
import { localePath, type Locale } from "@/lib/i18n/config";
import { t } from "@/lib/i18n/format";
import type { CompanyCard as CompanyCardData } from "@/convex/lib/cards";

/**
 * Kartica za "Novo na platformi" — namerno odvojena od `CompanyCard`, koju
 * koriste /firme i /kartica sa slikom pokrivača. Ovde je fotografija izostavljena
 * po dizajnu: krug sa inicijalom drži red mirnijim kad je šest firmi u gridu.
 */
export function HomeCompanyCard({
  locale,
  card,
  index,
  strings,
}: {
  locale: Locale;
  card: CompanyCardData;
  index: number;
  strings: { countryLabels: Record<string, string>; discountTemplate: string };
}) {
  const href = localePath(locale, `/firma/${card.slug}`);
  const countryLabel = strings.countryLabels[card.country] ?? card.country;
  // Tinte se smenjuju kroz grid, isto kao krugovi kategorija.
  const avatarTone =
    index % 2 === 0
      ? "bg-terracotta-200 text-terracotta-800"
      : "bg-sage-200 text-sage-800";

  return (
    <article className="relative flex flex-col gap-1.5 rounded-xl bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between gap-3">
        <span
          aria-hidden="true"
          className={`grid size-14 shrink-0 place-items-center rounded-full font-heading text-2xl ${avatarTone}`}
        >
          {card.name.charAt(0).toUpperCase()}
        </span>
        {card.discountPercent !== null && (
          <span className="rounded-full bg-terracotta-100 px-3 py-1 text-xs font-medium text-terracotta-800">
            {t(strings.discountTemplate, { percent: card.discountPercent })}
          </span>
        )}
      </div>

      <h3 className="mt-3 font-heading text-xl">
        <Link href={href} className="after:absolute after:inset-0">
          {card.name}
        </Link>
      </h3>

      {card.categoryNames.length > 0 && (
        <p className="text-sm text-neutral-700">{card.categoryNames.join(" · ")}</p>
      )}

      <p className="text-sm font-semibold text-sage-700">
        {card.city}, {countryLabel}
      </p>
    </article>
  );
}

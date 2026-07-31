import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { localePath, type Locale } from "@/lib/i18n/config";

/**
 * "Is this your company?" banner on unclaimed profiles. M1 routes to the
 * add-company funnel page; M2 swaps the target to /account/claim/[slug].
 */
export function ClaimBanner({
  locale,
  strings,
}: {
  locale: Locale;
  strings: { title: string; text: string; button: string };
}) {
  return (
    <div className="rounded-lg border border-terracotta-300 bg-terracotta-100 p-4">
      <p className="flex items-center gap-2 font-medium">
        <BadgeCheck className="size-4 text-primary" aria-hidden="true" />
        {strings.title}
      </p>
      <p className="mt-1.5 text-sm text-muted-foreground">{strings.text}</p>
      <Button asChild size="sm" className="mt-3">
        <Link href={localePath(locale, "/dodaj-firmu")}>{strings.button}</Link>
      </Button>
    </div>
  );
}

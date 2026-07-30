import { CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { t } from "@/lib/i18n/format";

/**
 * The card-partner badge. `template` is the localized
 * "{percent}% sa Carigradski Drum karticom" string.
 */
export function DiscountBadge({
  percent,
  template,
  compact = false,
}: {
  percent: number;
  template: string;
  compact?: boolean;
}) {
  const label = t(template, { percent });
  return (
    <Badge variant="accent" aria-label={label} title={compact ? label : undefined}>
      <CreditCard className="size-3.5" aria-hidden="true" />
      {compact ? `${percent}%` : label}
    </Badge>
  );
}

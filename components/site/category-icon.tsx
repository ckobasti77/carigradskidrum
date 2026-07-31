import {
  Building2,
  Car,
  Factory,
  HardHat,
  Palette,
  Plane,
  Scale,
  ShoppingBag,
  Sparkles,
  Stethoscope,
  Truck,
  UtensilsCrossed,
  Wrench,
  Store,
  type LucideIcon,
} from "lucide-react";

/**
 * Explicit icon map (13 categories) — keeps tree-shaking intact; a namespace
 * import of lucide-react would drag the whole icon set into the bundle.
 */
const ICONS: Record<string, LucideIcon> = {
  HardHat,
  Building2,
  Wrench,
  Car,
  Truck,
  Factory,
  ShoppingBag,
  Stethoscope,
  Sparkles,
  Scale,
  Plane,
  UtensilsCrossed,
  Palette,
};

export function CategoryIcon({
  name,
  className,
  strokeWidth,
}: {
  name: string;
  className?: string;
  /** Dizajn traži deblju liniju (2.75) u krugovima kategorija. */
  strokeWidth?: number;
}) {
  const Icon = ICONS[name] ?? Store;
  return <Icon className={className} strokeWidth={strokeWidth} aria-hidden="true" />;
}

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
}: {
  name: string;
  className?: string;
}) {
  const Icon = ICONS[name] ?? Store;
  return <Icon className={className} aria-hidden="true" />;
}

import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/* `.tag` iz token sheet-a — pilula, uvek tinta iz rampe, nikad puna boja. */
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-sage-100 text-sage-800",
        accent: "border-transparent bg-terracotta-100 text-terracotta-800",
        outline: "border-terracotta-300 text-terracotta-700",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/*
 * Sve dugmad su pilule u display fontu (Caprasimo 400) — `.btn` iz token sheet-a.
 * Visine kreću od 44px: publika je starija, pa je to donja granica hit target-a.
 * Fokus namerno nema svoj prsten — globalni `:focus-visible` iz globals.css crta
 * terakota outline na svemu.
 */
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full font-heading font-normal transition-colors disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-terracotta-600 active:bg-terracotta-700",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-border bg-transparent hover:bg-accent hover:text-accent-foreground",
        secondary:
          "border border-border bg-card text-foreground hover:bg-accent hover:text-accent-foreground",
        ghost: "text-primary hover:bg-accent hover:text-accent-foreground",
        link: "text-terracotta-700 underline-offset-4 hover:text-terracotta-800 hover:underline",
      },
      size: {
        default: "h-12 px-6 text-base",
        sm: "h-11 px-5 text-sm",
        lg: "h-14 px-9 text-lg",
        icon: "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";

  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };

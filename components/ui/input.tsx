import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Pilula, min 44px visine — `.input` iz token sheet-a. Fokus outline
        // dolazi iz globalnog `:focus-visible` pravila.
        "flex h-12 w-full min-w-0 rounded-full border bg-card px-5 text-base transition-colors placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground hover:border-neutral-400 focus-visible:border-primary disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Input };

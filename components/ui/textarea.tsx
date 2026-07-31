import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        // Jedina kontrola koja nije pilula: visestruki redovi teksta se u
        // zaobljenoj pilula formi ne citaju dobro.
        "flex min-h-28 w-full resize-y rounded-md border bg-card px-4 py-3 text-base transition-colors placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground hover:border-neutral-400 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function CompanyCardGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid auto-rows-fr gap-6 [grid-template-columns:repeat(auto-fill,minmax(min(100%,286px),1fr))]",
        className,
      )}
    >
      {children}
    </div>
  );
}

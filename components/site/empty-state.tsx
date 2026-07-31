import { SearchX } from "lucide-react";

export function EmptyState({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="col-span-full flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-neutral-300 bg-neutral-100 px-6 py-16 text-center">
      <SearchX className="size-8 text-muted-foreground" aria-hidden="true" />
      <p className="font-medium">{title}</p>
      <p className="max-w-md text-sm text-muted-foreground">{text}</p>
      {action}
    </div>
  );
}

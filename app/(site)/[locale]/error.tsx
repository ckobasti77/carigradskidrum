"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

// Next 16: `unstable_retry` re-fetches and re-renders the boundary's children
// (the de-recommended `reset` only re-renders without re-fetching).
export default function SegmentError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col items-start gap-4 px-4 py-24 md:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">
        Nešto je pošlo naopako · Etwas ist schiefgelaufen
      </h1>
      <p className="max-w-prose text-muted-foreground">
        Došlo je do neočekivane greške. · Ein unerwarteter Fehler ist aufgetreten.
      </p>
      <Button onClick={() => unstable_retry()}>
        Pokušaj ponovo · Erneut versuchen
      </Button>
    </div>
  );
}

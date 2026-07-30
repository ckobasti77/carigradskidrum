import Link from "next/link";
import { Button } from "@/components/ui/button";

// Rendered inside the [locale] layout; the segment param is not available in
// not-found files, so the copy is bilingual by design.
export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col items-start gap-4 px-4 py-24 md:px-6">
      <p className="text-sm font-medium text-primary">404</p>
      <h1 className="text-3xl font-semibold tracking-tight">
        Stranica nije pronađena · Seite nicht gefunden
      </h1>
      <p className="max-w-prose text-muted-foreground">
        Stranica koju tražite ne postoji ili je premeštena. · Die gesuchte Seite
        existiert nicht oder wurde verschoben.
      </p>
      <Button asChild>
        <Link href="/">Početna · Startseite</Link>
      </Button>
    </div>
  );
}

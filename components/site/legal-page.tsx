import { TriangleAlert } from "lucide-react";

export type LegalSection = { heading: string; body: string[] };

/** Shared shell for the draft legal pages (final text comes from the lawyer). */
export function LegalPage({
  title,
  draftNote,
  sections,
}: {
  title: string;
  draftNote: string;
  sections: LegalSection[];
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 md:px-6 md:py-20">
      <h1 className="text-3xl tracking-tight">{title}</h1>
      <p className="mt-4 flex items-start gap-2 rounded-lg border border-terracotta-300 bg-terracotta-100 p-3 text-sm">
        <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {draftNote}
      </p>
      <div className="mt-8 space-y-8">
        {sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-lg">{section.heading}</h2>
            {section.body.map((paragraph) => (
              <p
                key={paragraph.slice(0, 32)}
                className="mt-2 text-sm leading-relaxed text-muted-foreground"
              >
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}

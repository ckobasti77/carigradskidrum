/**
 * Standalone interpolation helper safe for client bundles — deliberately NOT
 * in dictionaries.ts (importing that would pull both full dictionaries into
 * the client). t("{count} rezultata", { count: 5 }) → "5 rezultata".
 */
export function t(template: string, vars: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  );
}

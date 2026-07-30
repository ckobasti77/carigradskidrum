import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, hasLocale, locales } from "@/lib/i18n/config";

const LOCALE_COOKIE = "locale";

/** Languages we map onto Serbian content (closest mutual intelligibility). */
const SERBIAN_ADJACENT = new Set(["bs", "hr", "sh", "sl", "mk"]);

function negotiateLocale(request: NextRequest): string {
  const cookie = request.cookies.get(LOCALE_COOKIE)?.value;
  if (cookie && hasLocale(cookie)) return cookie;

  const header = request.headers.get("accept-language");
  if (header) {
    const ranked = header
      .split(",")
      .map((part) => {
        const [tag, ...params] = part.trim().split(";");
        const qParam = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
        const q = qParam ? Number.parseFloat(qParam.slice(2)) : 1;
        return { tag: tag.trim().toLowerCase(), q: Number.isNaN(q) ? 0 : q };
      })
      .filter((entry) => entry.tag.length > 0)
      .sort((a, b) => b.q - a.q);

    for (const { tag } of ranked) {
      const base = tag.split("-")[0];
      if (hasLocale(base)) return base;
      if (SERBIAN_ADJACENT.has(base)) return "sr";
    }
  }
  return defaultLocale;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const hasPrefix = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );
  if (hasPrefix) return NextResponse.next();

  const locale = negotiateLocale(request);
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;

  // 307 (not 308/301): the destination depends on the request, so it must
  // never be cached as a permanent equivalence of "/". Legacy WP URLs get
  // their permanent 301s from next.config.ts redirects() instead.
  const response = NextResponse.redirect(url, 307);
  response.headers.set("Vary", "Accept-Language");
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export const config = {
  // Skip Next internals, API routes, the admin app (own root, sr-only),
  // static files (anything with an extension) and SEO endpoints.
  matcher: ["/((?!_next|api|admin|.*\\..*|sitemap\\.xml|robots\\.txt).*)"],
};

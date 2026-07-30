import type { MetadataRoute } from "next";

// Production allows indexing (the launch checklist submits the sitemap to
// GSC). Vercel preview deployments add x-robots-tag: noindex automatically,
// so pre-launch previews stay out of the index without extra logic here.
export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}

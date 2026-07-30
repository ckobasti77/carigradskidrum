import { ImageResponse } from "next/og";
import { hasLocale } from "@/lib/i18n/config";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Carigradski Drum";

/**
 * Default brand OG card for every page without a more specific image
 * (company pages use their cover photo via metadata.openGraph.images).
 * Next 16: params is a Promise here. ImageResponse supports flexbox only.
 */
export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const tagline = hasLocale(locale) && locale === "de"
    ? "B2B & B2C Marktplatz — Österreich · Serbien · Westbalkan"
    : "B2B & B2C marketplace — Austrija · Srbija · Zapadni Balkan";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: 80,
          backgroundColor: "#faf6ef",
          color: "#3d332b",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            marginBottom: 28,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 14,
              backgroundColor: "#b35a34",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff7ef",
              fontSize: 34,
              fontWeight: 700,
            }}
          >
            CD
          </div>
          <div style={{ display: "flex", fontSize: 30, color: "#8a7f74" }}>
            carigradskidrum.com
          </div>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 76,
            fontWeight: 700,
            letterSpacing: -2,
          }}
        >
          Carigradski Drum
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 18,
            fontSize: 34,
            color: "#8a7f74",
          }}
        >
          {tagline}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 48,
            width: 1040,
            height: 6,
            borderRadius: 3,
            backgroundImage:
              "linear-gradient(90deg, #b35a34 0 14px, transparent 14px 28px)",
            backgroundSize: "28px 6px",
          }}
        />
      </div>
    ),
    size,
  );
}

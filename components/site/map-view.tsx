"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

/**
 * Leaflet + OSM tiles (no API key). Client-only: leaflet is imported inside
 * the effect, so SSR renders just the container div. Default marker images
 * break under bundlers — an inline-SVG divIcon avoids asset wiring entirely.
 */
export function MapView({
  lat,
  lng,
  name,
}: {
  lat: number;
  lng: number;
  name: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let disposed = false;
    let map: import("leaflet").Map | undefined;

    (async () => {
      const L = (await import("leaflet")).default;
      if (disposed || !containerRef.current) return;

      map = L.map(containerRef.current, {
        scrollWheelZoom: false,
        attributionControl: true,
      }).setView([lat, lng], 15);

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      const icon = L.divIcon({
        className: "",
        html: `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24" fill="#c67139" stroke="white" stroke-width="1.4"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3" fill="white"/></svg>`,
        iconSize: [34, 34],
        iconAnchor: [17, 32],
      });
      L.marker([lat, lng], { icon, title: name }).addTo(map);
    })();

    return () => {
      disposed = true;
      map?.remove();
    };
  }, [lat, lng, name]);

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label={name}
      className="h-72 w-full overflow-hidden rounded-lg border border-border"
    />
  );
}

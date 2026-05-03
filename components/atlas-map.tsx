"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

export type AtlasEstate = {
  slug: string;
  name: string;
  primaryProducerSlug: string | null;
  primaryProducerName: string | null;
  lng: number;
  lat: number;
};

export default function AtlasMap({ estates }: { estates: AtlasEstate[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
      center: [-74, 4],
      zoom: 5,
      maxBounds: [
        [-180, -30],
        [180, 30],
      ],
      attributionControl: { compact: true },
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    map.on("load", () => {
      for (const estate of estates) {
        const popupHtml = estate.primaryProducerSlug
          ? `<div class="text-sm">
               <div class="font-medium">${escapeHtml(estate.name)}</div>
               <a href="/producers/${estate.primaryProducerSlug}" class="text-xs underline">
                 ${escapeHtml(estate.primaryProducerName ?? estate.primaryProducerSlug)}
               </a>
             </div>`
          : `<div class="text-sm font-medium">${escapeHtml(estate.name)}</div>`;

        new maplibregl.Marker({ color: "#171717" })
          .setLngLat([estate.lng, estate.lat])
          .setPopup(new maplibregl.Popup({ offset: 24 }).setHTML(popupHtml))
          .addTo(map);
      }
    });

    return () => {
      map.remove();
    };
  }, [estates]);

  return <div ref={containerRef} className="h-[calc(100vh-4rem)] w-full" />;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

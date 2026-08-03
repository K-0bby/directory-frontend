"use client";

import "mapbox-gl/dist/mapbox-gl.css";

import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { MapPin, Navigation } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ListingLocationCardProps {
  name: string;
  addressParts: Array<string | null | undefined>;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  physicalLocation?: boolean;
  className?: string;
}

function cleanLocationPart(value?: string | null): string | null {
  const part = value?.trim();
  if (!part || /^(?:https?:\/\/|www\.)/i.test(part)) return null;
  return part;
}

export function ListingLocationCard({
  name,
  addressParts,
  country,
  latitude,
  longitude,
  physicalLocation = true,
  className,
}: ListingLocationCardProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapState, setMapState] = useState<"loading" | "ready" | "error">("loading");
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "";
  const cleanCountry = cleanLocationPart(country);
  const locationParts = useMemo(() => {
    const seen = new Set<string>();
    return [...addressParts, cleanCountry]
      .map(cleanLocationPart)
      .filter((part): part is string => {
        if (!part) return false;
        const key = part.toLocaleLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }, [addressParts, cleanCountry]);
  const locationLabel = locationParts.join(", ");
  const hasCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);
  const hasSpecificLocation = addressParts.some((part) => cleanLocationPart(part));
  const showMap = physicalLocation && (hasCoordinates || hasSpecificLocation);
  const directionsDestination = hasCoordinates
    ? `${latitude},${longitude}`
    : [name, locationLabel].filter(Boolean).join(" ");
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(directionsDestination)}`;

  useEffect(() => {
    if (!showMap || !token || !mapContainer.current) return;
    mapboxgl.accessToken = token;
    let disposed = false;

    async function initializeMap() {
      try {
        let lng = Number(longitude);
        let lat = Number(latitude);
        if (!hasCoordinates) {
          const query = encodeURIComponent([name, locationLabel].filter(Boolean).join(" "));
          const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?access_token=${token}&limit=1`);
          const payload = await response.json() as { features?: Array<{ center?: [number, number] }> };
          const center = payload.features?.[0]?.center;
          if (!center) throw new Error("Location not found");
          [lng, lat] = center;
        }
        if (disposed || !mapContainer.current) return;
        map.current?.remove();
        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: "mapbox://styles/mapbox/streets-v12",
          center: [lng, lat],
          zoom: 14,
          interactive: false,
        });
        new mapboxgl.Marker({ color: "#93C01F" }).setLngLat([lng, lat]).addTo(map.current);
        map.current.on("load", () => setMapState("ready"));
        map.current.on("error", () => setMapState("error"));
      } catch {
        if (!disposed) setMapState("error");
      }
    }

    void initializeMap();
    return () => {
      disposed = true;
      map.current?.remove();
      map.current = null;
    };
  }, [hasCoordinates, latitude, locationLabel, longitude, name, showMap, token]);

  return (
    <Card className={cn("border-gray-100", className)}>
      <CardContent className="pt-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <MapPin className="h-4 w-4 text-[#93C01F]" /> Location
        </h3>
        {showMap && (
          <div className="relative mt-3 h-40 w-full overflow-hidden rounded-xl bg-gray-100">
            {(!token || mapState !== "ready") && (
              <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-gray-400">
                {!token || mapState === "error" ? "Map preview unavailable" : "Loading map…"}
              </div>
            )}
            {token && <div ref={mapContainer} className="absolute inset-0 h-full w-full" />}
          </div>
        )}
        <p className="mt-3 text-sm text-gray-600">
          {locationLabel || (physicalLocation ? "Location details unavailable" : "Online")}
        </p>
        {showMap && directionsDestination && (
          <a href={directionsUrl} target="_blank" rel="noreferrer" className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-[#93C01F] py-3 text-sm font-bold text-[#6f9414] transition-colors hover:bg-[#93C01F] hover:text-white">
            <Navigation className="h-4 w-4" /> Get Directions
          </a>
        )}
      </CardContent>
    </Card>
  );
}

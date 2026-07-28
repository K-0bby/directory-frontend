"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import EventSectionCarousel from "@/components/event-section-carousel";
import EventCarousel from "@/components/events/event-carousel";
import { EventCard } from "@/components/event-card";
import { Button } from "@/components/ui/button";
import { DirectoryPageShell } from "@/components/directory/directory-page-shell";
import { useDirectoryListings } from "@/lib/directory/use-directory-listings";
import type { ProcessedEvent } from "@/types/event";
import { createEventMapper } from "./map-event";

const PAGE_LOAD_TIME = Date.now();

export default function EventsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const filterCountry = searchParams.get("country");

  const eventMapper = useMemo(() => createEventMapper(), []);

  const { items, isLoading, detectedCountry } =
    useDirectoryListings<ProcessedEvent>({
      endpoint: "/api/events",
      mapItem: eventMapper,
      forwardParams: ["category_id", "category_slug", "country"],
    });

  const locationLabel = filterCountry
    ? `in ${filterCountry}`
    : detectedCountry
    ? "Near You"
    : null;

  const heroTitle = "Events Coming Up";
  const gridTitle = locationLabel
    ? `All Events ${locationLabel}`
    : "All Events";

  // 14-day window for hero carousel: today through 14 days from today.
  const [twoWeekWindowStart, twoWeekWindowEnd] = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + 14);
    end.setHours(23, 59, 59, 999);

    return [start, end];
  }, []);

  // All events: remove ended events, then sort chronologically by start date.
  const sortedItems = useMemo(() => {
    const now = PAGE_LOAD_TIME;
    return [...items]
      .filter((e) => {
        // Use endDateRaw when available; fall back to startDateRaw.
        const raw = e.endDateRaw || e.startDateRaw;
        if (!raw) return true;
        const end = new Date(raw);
        // Include events whose end date is today or in the future.
        end.setHours(23, 59, 59, 999);
        return end.getTime() >= now;
      })
      .sort((a, b) => {
        const ta = a.startDateRaw ? new Date(a.startDateRaw).getTime() : Infinity;
        const tb = b.startDateRaw ? new Date(b.startDateRaw).getTime() : Infinity;
        return ta - tb;
      });
  }, [items]);

  const handleCtaClick = () => {
    router.push("/claim");
  };

  return (
    <DirectoryPageShell<ProcessedEvent>
      mainCategorySlug="events"
      context="events"
      items={sortedItems}
      isLoading={isLoading}
      detectedCountry={detectedCountry}
      mapItem={eventMapper}
      groupBy={(e) => e.category}
      matchesCategory={(e, slug) => e.categorySlug === slug}
      heroSize={8}
      visibleGroups={0}
      emptyMessage="No events found in this category."
      gridTitle={gridTitle}
      renderHero={(heroItems) => {
        // Hero shows approved events within the next 14 days (both verified and unverified),
        // sorted with verified events first, then by date ascending.
        const nextTwoWeekEvents = heroItems.filter((e) => {
          if (!e.startDateRaw) return false;
          const start = new Date(e.startDateRaw);
          if (isNaN(start.getTime())) return false;
          return start >= twoWeekWindowStart && start <= twoWeekWindowEnd;
        });
        if (nextTwoWeekEvents.length === 0) return null;
        return (
          <EventCarousel
            events={nextTwoWeekEvents}
            title={heroTitle}
            showNavigation
          />
        );
      }}
      renderGroup={(name, groupItems) => (
        <div className="py-12 px-4 lg:px-16">
          <EventSectionCarousel events={groupItems} title={name} />
        </div>
      )}
      renderFiltered={(filtered) => (
        <div className="py-12 px-4 lg:px-16">
          <EventSectionCarousel
            events={filtered}
            title={`${filtered[0]?.category ?? "Filtered"} Events`}
          />
        </div>
      )}
      renderCard={(e) => (
        <EventCard
          event={{
            id: e.id,
            name: e.name,
            category: e.category,
            image: e.image,
            location: e.location,
            description: e.description,
            slug: e.slug,
            startDate: e.startDate,
            endDate: e.endDate,
            verified: e.verified,
            time: e.time,
            timezoneLabel: e.timezoneLabel,
          }}
        />
      )}
      renderFooterCta={() => (
        <div className="py-12 px-4 lg:px-16">
          <div className="relative flex flex-col justify-center items-center text-center bg-[#152B40] text-white rounded-3xl h-[350px] overflow-hidden px-10">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Ready To Promote Your Event?
            </h2>
            <Button
              onClick={handleCtaClick}
              className="bg-[#93C01F] hover:bg-[#93C956]"
            >
              List your Event today
            </Button>
          </div>
        </div>
      )}
    />
  );
}

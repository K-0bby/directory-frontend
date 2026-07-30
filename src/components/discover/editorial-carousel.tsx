"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import { Button } from "@/components/ui/button";
import { CarouselDots } from "@/components/ui/carousel-dots";
import { BusinessCard } from "@/components/ux/business-card";
import { EventCard } from "@/components/ux/event-card";
import CommunityCard from "@/components/communities/community-card";
import type {
  CuratedCollection,
  CuratedCollectionListing,
} from "@/types/curated-collections";
import { parseLocalDate } from "@/lib/directory/event-formatting";

function toBusinessCard(listing: CuratedCollectionListing) {
  return {
    id: String(listing.id),
    name: listing.name,
    slug: listing.slug,
    category: listing.categories[0]?.name || "",
    images: listing.images
      .map((img) => img.card || img.webp || img.original || img.thumb)
      .filter(Boolean),
    rating: listing.rating ?? 0,
    reviewCount: listing.ratings_count ?? 0,
    location: listing.city || listing.country || "",
    verified: listing.listing_verified,
  };
}

function toEventCard(listing: CuratedCollectionListing) {
  // Parsed via parseLocalDate rather than `new Date(dateString)` directly —
  // a date-only string is otherwise interpreted as UTC midnight, shifting
  // the displayed date back a day for viewers west of UTC.
  const parsedDate = parseLocalDate(listing.event_start_date);
  const formattedDate = parsedDate
    ? parsedDate.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";

  return {
    id: String(listing.id),
    name: listing.name,
    slug: listing.slug,
    category: listing.categories[0]?.name || "",
    image:
      listing.images[0]?.card ||
      listing.images[0]?.webp ||
      listing.images[0]?.original ||
      listing.images[0]?.thumb ||
      "/images/no-image.jpg",
    location: listing.event_venue || listing.event_city || listing.city || "",
    description: "",
    startDate: formattedDate,
    endDate: formattedDate,
    verified: listing.listing_verified,
  };
}

function toCommunityCard(listing: CuratedCollectionListing) {
  return {
    id: String(listing.id),
    name: listing.name,
    slug: listing.slug,
    description: listing.bio || listing.description || "",
    imageUrl:
      listing.images[0]?.card ||
      listing.images[0]?.webp ||
      listing.images[0]?.original ||
      listing.images[0]?.thumb ||
      "/images/no-image.jpg",
    image:
      listing.images[0]?.card ||
      listing.images[0]?.webp ||
      listing.images[0]?.original ||
      listing.images[0]?.thumb ||
      "/images/no-image.jpg",
    tag: listing.categories[0]?.name || "Community",
    verified: listing.listing_verified,
    type: "community" as const,
    location: listing.city || listing.country || "",
  };
}

function ListingCard({ listing }: { listing: CuratedCollectionListing }) {
  if (listing.type === "event")
    return <EventCard event={toEventCard(listing)} />;
  if (listing.type === "community")
    return <CommunityCard community={toCommunityCard(listing)} />;
  return <BusinessCard business={toBusinessCard(listing)} />;
}

// ─── Carousel ─────────────────────────────────────────────────────────────────

interface EditorialCarouselProps {
  collection: CuratedCollection;
}

export default function EditorialCarousel({
  collection,
}: EditorialCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    loop: false,
    skipSnaps: true,
    dragFree: true,
  });

  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;

    const updateButtons = () => {
      setCanScrollPrev(emblaApi.canScrollPrev());
      setCanScrollNext(emblaApi.canScrollNext());
    };

    emblaApi.on("select", updateButtons);
    emblaApi.on("reInit", updateButtons);
    updateButtons();

    return () => {
      emblaApi.off("select", updateButtons);
      emblaApi.off("reInit", updateButtons);
    };
  }, [emblaApi]);

  if (!collection.items || collection.items.length === 0) return null;

  return (
    <div className="py-8 px-4 lg:px-16">
      {/* Header — title + optional subtitle + desktop nav buttons */}
      <div className="flex flex-row justify-between items-start mb-5">
        <div className="flex-1 min-w-0 pr-4">
          <h2 className="font-semibold text-2xl md:text-3xl text-gray-900 leading-tight">
            {collection.title}
          </h2>
          {collection.subtitle && (
            <p className="mt-1 text-sm text-gray-500 leading-relaxed">
              {collection.subtitle}
            </p>
          )}
        </div>
        {/* Desktop nav — top right */}
        <div className="hidden md:flex gap-2 shrink-0 mt-1">
          <Button
            variant="outline"
            size="icon"
            onClick={scrollPrev}
            disabled={!canScrollPrev}
            className="rounded-full bg-white hover:bg-[#E2E8F0] border-[#E2E8F0] disabled:opacity-50"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={scrollNext}
            disabled={!canScrollNext}
            className="rounded-full bg-white hover:bg-[#E2E8F0] border-[#E2E8F0] disabled:opacity-50"
          >
            <ChevronRight className="w-5 h-5 text-[#275782]" />
          </Button>
        </div>
      </div>

      {/* Carousel */}
      <div className="overflow-hidden pb-2" ref={emblaRef}>
        <div className="flex gap-4">
          {collection.items.map((item) => (
            <div
              key={item.id}
              className="flex-[0_0_100%] min-w-0 sm:flex-[0_0_calc(50%-0.5rem)] lg:flex-[0_0_calc(25%-0.75rem)]"
            >
              <ListingCard listing={item.listing} />
            </div>
          ))}
        </div>
      </div>

      <CarouselDots api={emblaApi} className="md:hidden mt-4" />
    </div>
  );
}

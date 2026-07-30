// This component uses EventCard (vertical compact design) for Discover/Businesses pages
// EventCard is different from EventCardScroll (horizontal full-width design) used in Events page
// Both serve different purposes, so they remain separate
"use client";
import { useCallback, useEffect, useState } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
// import type { Event } from "@/lib/data";
import { EventCard } from "./event-card";
import { Button } from "../ui/button";
import { CarouselDots } from "@/components/ui/carousel-dots";


interface ProcessedEvent {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string; // Ensure this is string, not string | string[]
  images: string[];
  location: string;
  verified: boolean;
  rating: number;
  reviewCount: number;
  category: string;
  categorySlug: string;
  type: "business" | "event" | "community";
  country: string;
  createdAt: Date;
  title: string;
  startDate: string;
  endDate: string;
  date: string;
}


interface EventSectionCarouselProps {
  events: ProcessedEvent[];
  title?: string;
  showNavigation?: boolean;
}

export default function EventSectionCarousel({
  events,
  title,
  showNavigation = true,
}: EventSectionCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "center",
    loop: false,
    skipSnaps: true,
    dragFree: true,
  });

  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

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

  return (
    <div>
      {/* Header with Title and Navigation Buttons */}
      {title && (
        <div className="mb-8 flex items-center justify-between">
          <h2 className="font-semibold text-2xl md:text-3xl">{title}</h2>

          {showNavigation && (
            <div className="flex gap-2">
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
          )}
        </div>
      )}

      {/* Carousel Container */}
      <div className="overflow-hidden pb-2" ref={emblaRef}>
        <div className="flex gap-6">
          {events.map((event) => (
            <div
              key={event.id}
              className="flex-[0_0_100%] min-w-0 sm:flex-[0_0_calc(50%-0.5rem)] lg:flex-[0_0_calc(33%-0.70rem)]"
            >
              <EventCard event={event} />
            </div>
          ))}
        </div>
      </div>
      <CarouselDots api={emblaApi} />
    </div>
  );
}

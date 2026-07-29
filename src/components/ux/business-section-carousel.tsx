// This component uses BusinessCard for Discover/Events pages with compact layout
// No padding wrapper - parent controls spacing
"use client";
import { useCallback, useEffect, useState } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import type { Business as ApiBusiness } from "@/lib/api"; // Renamed import
import {
  BusinessCard,
  type Business as BusinessCardBusiness,
} from "./business-card";
import { Button } from "../ui/button";
import { CarouselDots } from "@/components/ui/carousel-dots";

interface BusinessSectionCarouselProps {
  businesses: ApiBusiness[]; // Use the API type
}

export default function BusinessSectionCarousel({
  businesses,
}: BusinessSectionCarouselProps) {
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

    // Initial check
    updateButtons();

    return () => {
      emblaApi.off("select", updateButtons);
      emblaApi.off("reInit", updateButtons);
    };
  }, [emblaApi]);

  // Type assertion - USE WITH CAUTION
  // This assumes the API business structure matches BusinessCard expectations
  const businessCardBusinesses =
    businesses as unknown as BusinessCardBusiness[];

  return (
    <div>
      {/* Header with hidden navigation buttons */}
      <div className="hidden mb-8 items-center justify-between">
        <h2 className="font-semibold text-2xl md:text-3xl">Businesses</h2>

        {/* Navigation Buttons - Hidden */}
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
      </div>

      {/* Carousel Container */}
      <div className="overflow-hidden pb-2" ref={emblaRef}>
        <div className="flex gap-4">
          {businessCardBusinesses.map((business) => (
            <div
              key={business.id}
              className="flex-[0_0_100%] min-w-0 sm:flex-[0_0_calc(50%-0.5rem)] lg:flex-[0_0_calc(25%-0.75rem)]"
            >
              <BusinessCard business={business} />
            </div>
          ))}
        </div>
      </div>
      <CarouselDots api={emblaApi} />
    </div>
  );
}

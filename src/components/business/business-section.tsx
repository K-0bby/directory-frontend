/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useCallback, useEffect, useState } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import type { Business as ApiBusiness } from "@/lib/api"; // Renamed
import { BusinessCard } from "../ux/business-card";
import { Button } from "../ui/button";

interface BusinessSectionProps {
  businesses: ApiBusiness[]; // Use the API type
  title: string;
  showNavigation?: boolean;
}

export default function BusinessSection({
  businesses,
  title,
  showNavigation = true,
}: BusinessSectionProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
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

  // Don't render if no businesses
  if (businesses.length === 0) {
    return null;
  }

  return (
    <div className="py-8 px-4 lg:px-16">
      {/* Header with Title and Navigation Buttons */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-semibold text-2xl md:text-3xl">{title}</h2>

        {/* Navigation Buttons */}
        {showNavigation && (
          <div className="hidden md:flex gap-2">
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

      {/* Carousel Container */}
      <div className="overflow-hidden pb-2" ref={emblaRef}>
        <div className="flex gap-4">
          {businesses.map((business) => {
            // Convert inline
            const businessForCard = {
              ...business,
              images: business.image
                ? Array.isArray(business.image)
                  ? business.image.filter((img: any) => typeof img === "string")
                  : [business.image]
                : ["/images/no-image.jpg"],
            };

            return (
              <div
                key={business.id}
                className="flex-[0_0_100%] min-w-0 sm:flex-[0_0_calc(50%-0.5rem)] lg:flex-[0_0_calc(25%-0.75rem)]"
              >
                <BusinessCard business={businessForCard as any} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

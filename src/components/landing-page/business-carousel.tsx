"use client";
import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BusinessCard, type Business } from "../ux/business-card";
import { Button } from "../ui/button";
import { CarouselDots } from "@/components/ui/carousel-dots";

type BusinessCarouselProps = {
  businesses: Business[];
};

export function BusinessCarousel({ businesses }: BusinessCarouselProps) {
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

  return (
    <div className="relative">
      {/* Carousel Container */}
      <div className="overflow-hidden pb-2" ref={emblaRef}>
        <div className="flex gap-4">
          {businesses.map((business) => (
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

      {/* Navigation Buttons */}
      {canScrollPrev && (
        <Button
          variant="outline"
          size="icon"
          onClick={scrollPrev}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 rounded-full bg-white shadow-lg hover:bg-gray-50 hidden md:flex"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
      )}

      {canScrollNext && (
        <Button
          variant="outline"
          size="icon"
          onClick={scrollNext}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 rounded-full bg-white shadow-lg hover:bg-gray-50 hidden md:flex"
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      )}
    </div>
  );
}

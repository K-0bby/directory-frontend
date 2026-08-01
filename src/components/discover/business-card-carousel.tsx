"use client";
import { useCallback, useEffect, useState } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import type { Business as ApiBusiness } from "@/lib/api";
import {
  BusinessCard,
  type Business as BusinessCardBusiness,
} from "../ux/business-card";
import { Button } from "../ui/button";
import { CarouselDots } from "@/components/ui/carousel-dots";
import { processImages, resolveCoverUrl } from "@/lib/directory/image-utils";

interface BusinessCardCarouselProps {
  businesses: ApiBusiness[];
  title?: string;
}

export default function BusinessCardCarousel({
  businesses,
  title = "Explore Businesses near you",
}: BusinessCardCarouselProps) {
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

  // 1. FIX: Helper to transform API data into BusinessCard format
  const convertToBusinessCardBusiness = (
    business: ApiBusiness
  ): BusinessCardBusiness => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = business as any;

    let images: string[] = [];

    // Robust Image Handling — the explicit cover always wins over whichever
    // image happens to be first in `images`, keeping this carousel in sync
    // with what every other page shows for the same listing.
    if (raw.images && Array.isArray(raw.images) && raw.images.length > 0) {
      images = processImages(raw.images, [
        resolveCoverUrl(raw.cover),
        raw.primary_image,
        raw.cover_image,
      ]);
    } else if (business.image && typeof business.image === "string") {
      images = [business.image];
    }

    // Fallback logic
    images = images.filter((img) => img && img.trim() !== "");
    if (images.length === 0) {
      images = ["/images/no-image.jpg"];
    }

    // Map Fields
    return {
      id: business.id?.toString() || "",
      name: business.name || "",
      slug: business.slug || "",
      images: images, // The fix: passing array
      category: business.category || raw.categories?.[0]?.name || "General",
      rating:
        typeof business.rating === "number"
          ? business.rating
          : typeof business.rating === "string"
          ? parseFloat(business.rating) || 0
          : 0,
      reviewCount: String(
        raw.reviewCount ||
        raw.reviews_count ||
        raw.ratings_count ||
        "0"
      ),
      location: business.location || raw.address || "",
      verified: !!(raw.listing_verified ?? raw.is_verified ?? business.verified),
      discount: business.discount,
    };
  };

  // 2. FIX: Map over the transformed data
  const businessCardBusinesses = businesses.map(convertToBusinessCardBusiness);

  return (
    <div className="py-8 px-4 lg:px-16">
      {/* Header with Title and Navigation Buttons */}
      <div className="flex flex-row justify-between items-center mb-5">
        <h2 className="font-semibold text-2xl md:text-3xl">{title}</h2>

        {/* Navigation Buttons */}
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
      </div>

      {/* Carousel Container */}
      <div className="overflow-hidden pb-2" ref={emblaRef}>
        <div className="flex gap-4">
          {/* 3. FIX: Iterate over the transformed list */}
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

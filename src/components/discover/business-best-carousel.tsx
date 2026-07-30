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

interface BusinessBestCarouselProps {
  businesses: ApiBusiness[];
  title?: string;
}

export default function BusinessBestCarousel({
  businesses,
  title = "Today’s best deals just for you!",
}: BusinessBestCarouselProps) {
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

  // Helper to transform API data into the format BusinessCard expects
  const convertToBusinessCardBusiness = (
    business: ApiBusiness
  ): BusinessCardBusiness => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = business as any; // Cast to 'any' to safely check flexible API fields

    let images: string[] = [];

    // Handle Images Logic
    if (raw.images && Array.isArray(raw.images)) {
      // Check if it's an array of strings
      if (raw.images.every((img: unknown) => typeof img === "string")) {
        images = raw.images as string[];
      }
      // Check if it's an array of objects with media property
      // FIX: Typed 'img' to { media: string } to allow access without 'any' error
      else if (
        raw.images.every(
          (img: { original?: string; card?: string; webp?: string }) =>
            img && typeof img === "object" && "original" in img
        )
      ) {
        images = raw.images.map(
          (img: { original?: string; card?: string; webp?: string }) =>
            img.card || img.webp || img.original || "",
        );
      }
    } else if (business.image && typeof business.image === "string") {
      images = [business.image];
    }

    // Fallback for empty images
    images = images.filter((img) => img && img.trim() !== "");
    if (images.length === 0) {
      images = ["/images/no-image.jpg"];
    }

    // Map fields
    return {
      id: business.id?.toString() || "",
      name: business.name || "",
      slug: business.slug || "",
      images: images,
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
      // FIX: Removed 'openStatus' because it does not exist in the BusinessCard type
      discount: business.discount,
    };
  };

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
      <div className="overflow-hidden " ref={emblaRef}>
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

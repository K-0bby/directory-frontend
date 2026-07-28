/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Image from "next/image";
import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import BusinessSection from "@/components/business/business-section";
import { BusinessCard } from "@/components/business-card";
import { Button } from "@/components/ui/button";
import { DirectoryPageShell } from "@/components/directory/directory-page-shell";
import { useDirectoryListings } from "@/lib/directory/use-directory-listings";
import { mapBusiness, ProcessedBusiness } from "./map-business";

// BusinessSection expects the `Business` shape from @/lib/api where `image`
// is `string[]`. ProcessedBusiness uses a single string plus a separate
// `images[]`, so we cast through `any` (same as the previous adapter).
const adapt = (b: ProcessedBusiness): any => ({
  ...b,
  reviewCount: String(b.reviewCount),
});

export default function BusinessesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const filterCountry = searchParams.get("country");

  const { items, isLoading, detectedCountry } =
    useDirectoryListings<ProcessedBusiness>({
      endpoint: "/api/businesses",
      mapItem: mapBusiness,
      forwardParams: ["category_id", "category_slug", "country"],
    });

  const locationLabel = filterCountry
    ? `in ${filterCountry}`
    : detectedCountry
    ? "near you"
    : null;

  const heroTitle = locationLabel
    ? `Top Businesses ${locationLabel}`
    : "Top Businesses";

  const sortedItems = useMemo(
    () =>
      [...items].sort((a, b) => {
        // Verified businesses always appear before unverified
        if (a.verified !== b.verified) return a.verified ? -1 : 1;
        // Within the same verification group, highest rating first
        return b.rating - a.rating;
      }),
    [items]
  );

  const handleJoinAsVendor = () => {
    router.push("/claim");
  };

  return (
    <DirectoryPageShell<ProcessedBusiness>
      mainCategorySlug="business"
      context="businesses"
      items={sortedItems}
      isLoading={isLoading}
      detectedCountry={detectedCountry}
      mapItem={mapBusiness}
      groupBy={(b) => b.category}
      matchesCategory={(b, slug) => b.categorySlugs.includes(slug)}
      heroSize={8}
      visibleGroups={0}
      emptyMessage="No businesses found in this category."
      gridTitle="All businesses"
      renderHero={(heroItems) => (
        <BusinessSection
          businesses={heroItems.filter((b) => b.verified).map(adapt)}
          title={heroTitle}
        />
      )}
      renderGroup={(name, groupItems) => (
        <BusinessSection businesses={groupItems.map(adapt)} title={name} />
      )}
      renderFiltered={(filtered) => (
        <BusinessSection
          businesses={filtered.map(adapt)}
          title={filtered[0]?.category || "Filtered Results"}
        />
      )}
      renderCard={(b) => <BusinessCard business={adapt(b)} />}
      renderFooterCta={() => (
        <section className="py-12 px-4 lg:px-16 bg-white">
          <div className="flex flex-col lg:flex-row overflow-hidden rounded-2xl shadow-sm bg-[#0D7077] text-white">
            <div className="relative w-full lg:w-1/2 h-80 lg:h-auto">
              <Image
                src="/images/backgroundImages/business/vendor.jpg"
                alt="Vendor"
                fill
                className="object-cover"
                unoptimized
              />
            </div>
            <div className="flex flex-col justify-center w-full lg:w-1/2 p-8 lg:p-16 space-y-6">
              <h2 className="text-3xl md:text-5xl font-medium">
                Grow Your Business with Mefie
              </h2>
              <p className="text-lg opacity-90">
                Join a network of vendors reaching new audiences through Mefie.
              </p>
              <Button
                onClick={handleJoinAsVendor}
                className="bg-[#93C01F] hover:bg-[#7ea919] w-fit"
              >
                Join as a vendor
              </Button>
            </div>
          </div>
        </section>
      )}
    />
  );
}

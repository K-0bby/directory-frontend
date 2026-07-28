/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useMemo, Suspense, useEffect } from "react";
import ScrollableCategoryTabs from "@/components/scrollable-category-tabs";
import SearchHeader from "@/components/search-header";
import BusinessSection from "@/components/business/business-section";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import EventSectionCarousel from "@/components/event-section-carousel";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";

// --- Types ---
interface ApiImage {
  id?: number;
  original: string;
  thumb: string;
  webp: string;
}

interface ApiCategory {
  id: number;
  name: string;
  slug: string;
}

interface ApiListing {
  id: number;
  name: string;
  slug: string;
  type: string;
  listing_type?: string;
  rating: string | number;
  ratings_count: string | number;
  location?: string;
  address?: string;
  images: (ApiImage | string)[];
  categories: ApiCategory[];
  bio?: string;
  description?: string;
  start_date?: string;
  created_at?: string;
  is_verified?: boolean;
  image?: string;
  cover_image?: string;
  country?: string;
  date?: string;
}

interface ProcessedBusiness {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  images: string[];
  location: string;
  verified: boolean;
  rating: number;
  reviewCount: string;
  category: string;
  categorySlugs: string[];
  type: "business";
  country: string;
  createdAt: Date;
}

// --- Helpers ---
const getImageUrl = (url: string | undefined | null): string => {
  if (!url) return "/images/no-image.jpg";
  if (url.startsWith("http")) return url;
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://me-fie.co.uk";
  return `${API_URL}/${url.replace(/^\//, "")}`;
};

const formatDate = (dateString: string | undefined | null) => {
  if (!dateString) return "TBA";
  const date = new Date(dateString);
  return isNaN(date.getTime())
    ? "TBA"
    : date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
};

const classifyListing = (
  item: ApiListing,
): "business" | "event" | "community" => {
  const rawType = (item.type || item.listing_type || "")
    .toString()
    .toLowerCase();
  if (item.start_date || rawType === "event") return "event";
  if (rawType === "community") return "community";
  return "business";
};

export default function BusinessesContent() {
  const [businesses, setBusinesses] = useState<ProcessedBusiness[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showAllCategories, setShowAllCategories] = useState(false);

  const router = useRouter();

  const handleClickEvent = () => {
    router.push("/claim");
  };

  // --- Fetch Listings ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const API_URL =
          process.env.NEXT_PUBLIC_API_URL || "https://me-fie.co.uk";

        const response = await fetch(`${API_URL}/api/listings?per_page=100`, {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        });

        if (!response.ok) throw new Error("Failed to fetch listings");

        const json = await response.json();
        const data: ApiListing[] = json.data || json.listings || [];

        const businessesList: ProcessedBusiness[] = [];
        const eventsList: any[] = [];

        data.forEach((item) => {
          const rawImages = Array.isArray(item.images) ? item.images : [];

          const validImages = rawImages
            .filter((img): img is string | ApiImage => {
              if (typeof img === "string") return true;
              if (img && typeof img === "object" && "original" in img) {
                return !!(img as ApiImage).original;
              }
              return false;
            })
            .map((img) => {
              const mediaPath =
                typeof img === "string" ? img : (img as ApiImage).original;
              return getImageUrl(mediaPath);
            });

          if (validImages.length === 0) {
            if (item.image) validImages.push(getImageUrl(item.image));
            else if (item.cover_image)
              validImages.push(getImageUrl(item.cover_image));
            else validImages.push("/images/no-image.jpg");
          }

          const categorySlugs = item.categories?.map(c => c.slug) || ["general"];
const categoryName = item.categories?.[0]?.name || "General";
          const location = item.location || item.address || "Online";
          const listingType = classifyListing(item);

          const commonProps = {
            id: item.id.toString(),
            name: item.name,
            slug: item.slug,
            description: item.bio || item.description || "",
            image: validImages[0],
            images: validImages,
            location: location,
            verified: item.is_verified || false,
            rating: Number(item.rating) || 0,
            reviewCount: String(item.ratings_count) || "0",
            category: categoryName,
  categorySlugs: categorySlugs,
            type: listingType as "business",
            country: item.country || "Ghana",
            createdAt: item.created_at ? new Date(item.created_at) : new Date(),
          };

          if (listingType === "event") {
            const eventDate = item.start_date || item.date || item.created_at;
            eventsList.push({
              ...commonProps,
              type: "event",
              title: item.name,
              startDate: formatDate(eventDate),
              endDate: formatDate(eventDate),
              date: formatDate(eventDate),
            });
          } else if (listingType === "business") {
            businessesList.push({
              ...commonProps,
              type: "business" as const,
            });
          }
        });

        setBusinesses(businessesList);
        setEvents(eventsList);
      } catch (error) {
        console.error("Failed to fetch business page data", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // --- DEBUGGED FILTERING LOGIC ---
  // The logic now ensures a direct match against the slug provided by the tabs
const filteredData = useMemo(() => {
  if (selectedCategory === "all") return businesses;

  return businesses.filter((b) => {
    // Check if the selected slug exists ANYWHERE in the business categories
    return b.categorySlugs.includes(selectedCategory);
  });
}, [businesses, selectedCategory]);

  const groupedBusinesses = useMemo(() => {
    return businesses.reduce(
      (acc, b) => {
        if (!acc[b.category]) acc[b.category] = [];
        acc[b.category].push(b);
        return acc;
      },
      {} as Record<string, ProcessedBusiness[]>,
    );
  }, [businesses]);

  const categoriesToShow = Object.keys(groupedBusinesses);

  const adaptToBusinessSection = (
    processedBusiness: ProcessedBusiness,
  ): any => {
    return {
      ...processedBusiness,
      reviewCount: String(processedBusiness.reviewCount),
    };
  };

  if (isLoading) return <LoadingSkeleton />;

  return (
    <div className="bg-gray-50 min-h-screen">
      <ScrollableCategoryTabs
        mainCategorySlug="business"
        defaultValue="all"
        onChange={(val) => {
          setSelectedCategory(val); // Update state on tab change
        }}
        containerClassName="pt-4 pb-1"
      />

      <Suspense fallback={<div className="h-20" />}>
        <SearchHeader context="businesses" />
      </Suspense>

      <div className="pb-20">
        {filteredData.length > 0 ? (
          <>
            {selectedCategory === "all" ? (
              <>
                <BusinessSection
                  businesses={businesses
                    .slice(0, 8)
                    .map(adaptToBusinessSection)}
                  title="Today's best deals just for you!"
                />

                {categoriesToShow.slice(0, 3).map((name) => (
                  <BusinessSection
                    key={name}
                    businesses={groupedBusinesses[name].map(
                      adaptToBusinessSection,
                    )}
                    title={name}
                  />
                ))}

                {showAllCategories &&
                  categoriesToShow
                    .slice(3)
                    .map((name) => (
                      <BusinessSection
                        key={name}
                        businesses={groupedBusinesses[name].map(
                          adaptToBusinessSection,
                        )}
                        title={name}
                      />
                    ))}

                <div className="flex justify-center py-10">
                  <Button
                    onClick={() => setShowAllCategories(!showAllCategories)}
                    variant="outline"
                    className="border-[#9ACC23] text-[#9ACC23] hover:bg-[#9ACC23] hover:text-white"
                  >
                    {showAllCategories
                      ? "Show less"
                      : "Explore more businesses"}
                  </Button>
                </div>

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
                        Join a network of vendors reaching new audiences through
                        Mefie.
                      </p>
                      <Button
                        onClick={handleClickEvent}
                        className="bg-[#93C01F] hover:bg-[#7ea919] w-fit"
                      >
                        Join as a vendor
                      </Button>
                    </div>
                  </div>
                </section>

                <div className="py-12 px-4 lg:px-16">
                  <div className="flex justify-between items-center mb-8">
                    <h2 className="font-semibold text-xl md:text-4xl">
                      Events
                    </h2>
                    <Link href="/events" className="text-[#275782] font-medium">
                      Explore all
                    </Link>
                  </div>
                  <EventSectionCarousel events={events} />
                </div>
              </>
            ) : (
              <BusinessSection
                businesses={filteredData.map(adaptToBusinessSection)}
                title={filteredData[0]?.category || "Filtered Results"}
              />
            )}
          </>
        ) : (
          <div className="py-16 text-center text-gray-500 font-medium">
            No businesses found in this category.
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-8 px-4 lg:px-16 pt-8">
      <div className="flex gap-4">
        <Skeleton className="h-10 w-32 rounded-full" />
        <Skeleton className="h-10 w-32 rounded-full" />
      </div>
      <Skeleton className="h-14 w-full rounded-xl" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-80 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

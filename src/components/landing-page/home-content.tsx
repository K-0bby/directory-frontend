"use client";
import { useState, useEffect, useMemo } from "react";
import { useQueryState, parseAsString } from "nuqs";
import HeroSlider from "@/components/landing-page/hero-slider";
// import { Sort, SortOption } from "@/components/ux/sort";
import { BusinessCarousel } from "@/components/landing-page/business-carousel";
import { DirectoryEventCarousel } from "@/components/landing-page/directory-event-carousel";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Faqs } from "@/components/landing-page/faqs";
import { BusinessCard } from "../ux/business-card";
import { EventCard } from "@/components/ux/event-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";
import { CountryDropdown, Country } from "@/components/ui/country-dropdown";
import { countries as allCountries } from "country-data-list";
import { stripHtml } from "@/lib/utils";
import { ListingCoverMedia } from "@/components/directory/listing-cover-media";
import { processImages, resolveCoverUrl } from "@/lib/directory/image-utils";

// Types
export type Business = (typeof BusinessCard)["prototype"]["props"]["business"];
export type Event = (typeof EventCard)["prototype"]["props"]["event"] & {
  startDateRaw?: string;
};

export interface Community {
  id: string;
  title: string;
  description: string;
  image: string;
  slug: string;
}

interface TopCategory {
  id: number;
  name: string;
  slug: string;
  featured_image: string | null;
  is_top_category: boolean;
}

// --- API Interfaces ---
interface ApiImage {
  id?: number;
  original: string;
  thumb: string;
  webp: string;
  card?: string;
  mime_type?: string;
}

interface ApiCategory {
  name: string;
}

interface ApiListing {
  id: number;
  name: string;
  slug: string;
  type: string;
  listing_type: string;
  rating: string | number;
  ratings_count: string | number;
  address?: string;
  city?: string;
  country?: string;
  status: string;
  images: (ApiImage | string)[];
  cover?: ApiImage | null;
  primary_image?: string;
  cover_image?: string;
  categories: ApiCategory[];
  bio?: string;
  description?: string;
  listing_verified?: boolean;
  is_verified?: boolean;
  event_start_date?: string;
  event_end_date?: string;
  event_venue?: string;
  event_city?: string;
  event_country?: string;
  event_price?: string | null;
  event_currency?: string | null;
}

// --- UPDATED: Aggressive Classifier Logic ---
const classifyListing = (
  item: ApiListing,
): "business" | "event" | "community" => {
  // Get the raw type from item.type or item.listing_type
  const rawType = (item.type || item.listing_type || "")
    .toString()
    .trim()
    .toLowerCase();

  // 1. Check for events first (by date or explicit type)
  if (item.event_start_date || rawType === "event") {
    return "event";
  }

  // 2. Check for communities (only by type)
  if (rawType === "community") {
    return "community";
  }

  // 3. Default to business
  return "business";
};

export default function HomeContent() {
  const router = useRouter();
  // const [sortBy, setSortBy] = useState<SortOption>("name-asc");
  const [topCategories, setTopCategories] = useState<TopCategory[]>([]);
  const [isTopCatsLoading, setIsTopCatsLoading] = useState(true);
  const [detectedCountry, setDetectedCountry] = useState<string>("");
  const [selectedCountry, setSelectedCountry] = useQueryState(
    "country",
    parseAsString.withDefault(""),
  );
  const [countryOptions, setCountryOptions] = useState<Country[] | undefined>(
    undefined,
  );
  const [featuredBusinesses, setFeaturedBusinesses] = useState<Business[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [featuredCommunities, setFeaturedCommunities] = useState<Community[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);

  const handleClickEvent = () => {
    router.push("/claim");
  };

  useEffect(() => {
    fetch("/api/countries_dropdown", {
      headers: { Accept: "application/json" },
    })
      .then((r) => r.json())
      .then((json) => {
        const list: unknown[] = Array.isArray(json?.data)
          ? json.data
          : Array.isArray(json)
            ? json
            : [];

        const mapped: Country[] = list
          .map((entry): Country | null => {
            let name: string | undefined;
            let alpha2: string | undefined;
            let alpha3: string | undefined;

            if (typeof entry === "string") {
              name = entry;
            } else if (entry && typeof entry === "object") {
              const e = entry as Record<string, unknown>;
              name =
                (e.name as string) ||
                (e.country as string) ||
                (e.label as string);
              alpha2 =
                (e.alpha2 as string) ||
                (e.code as string) ||
                (e.iso2 as string) ||
                (e.country_code as string);
              alpha3 = (e.alpha3 as string) || (e.iso3 as string);
            }

            const match = (allCountries.all as Country[]).find(
              (c) =>
                (alpha2 && c.alpha2?.toLowerCase() === alpha2.toLowerCase()) ||
                (alpha3 && c.alpha3?.toLowerCase() === alpha3.toLowerCase()) ||
                (name && c.name?.toLowerCase() === name.toLowerCase()),
            );

            if (match) return match;
            if (name && alpha2) {
              return {
                alpha2,
                alpha3: alpha3 || "",
                countryCallingCodes: [],
                currencies: [],
                ioc: "",
                languages: [],
                name,
                status: "assigned",
              };
            }
            return null;
          })
          .filter((c): c is Country => c !== null);

        if (mapped.length > 0) setCountryOptions(mapped);
      })
      .catch(() => setCountryOptions([]));
  }, []);

  useEffect(() => {
    const fetchTopCategories = async () => {
      try {
        const res = await fetch("/api/categories?is_top=true");
        if (!res.ok) throw new Error("Failed to fetch top categories");
        const json = await res.json();
        setTopCategories(json.data || []);
      } catch {
        // silently degrade — section stays empty rather than breaking the page
      } finally {
        setIsTopCatsLoading(false);
      }
    };
    fetchTopCategories();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        const endpoint = selectedCountry
          ? `/api/all_listings_by_country_and_category?country=${encodeURIComponent(selectedCountry)}&per_page=12`
          : `/api/listings_by_geolocation?per_page=12`;

        const response = await fetch(endpoint, {
          headers: { Accept: "application/json" },
        });

        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`);

        const json = await response.json();
        const data: ApiListing[] = json.data || json.listings || [];

        const detected: string = json.meta?.detected_country ?? "";
        if (detected && !selectedCountry) setDetectedCountry(detected);

        const businesses: Business[] = [];
        const events: Event[] = [];
        const communities: Community[] = [];

        data.forEach((item) => {
          // Backend's explicit cover always wins over whatever happens to be
          // first in `images` — keeps the card in sync with what other pages
          // show for the same listing.
          const validImages = processImages(item.images, [
            resolveCoverUrl(item.cover),
            item.primary_image,
            item.cover_image,
          ]);

          const categoryName = item.categories?.[0]?.name || "General";
          const listingType = classifyListing(item);
          const location =
            listingType === "event"
              ? item.event_city || item.event_country || "Online"
              : item.city || item.country || "Online";

          // --- Distribute Data ---
          if (listingType === "community") {
            communities.push({
              id: item.id.toString(),
              title: item.name,
              description:
                item.bio || item.description || "Join our supportive network.",
              image: validImages[0],
              slug: item.slug,
            });
          } else if (listingType === "event") {
            const priceLabel = item.event_price
              ? `${item.event_currency || ""} ${item.event_price}`.trim()
              : "Free";
            events.push({
              id: item.id.toString(),
              name: item.name,
              slug: item.slug,
              category: categoryName,
              startDate: item.event_start_date
                ? new Date(item.event_start_date).toDateString()
                : "TBA",
              startDateRaw: item.event_start_date,
              endDate: item.event_end_date
                ? new Date(item.event_end_date).toDateString()
                : item.event_start_date
                  ? new Date(item.event_start_date).toDateString()
                  : "TBA",
              location,
              image: validImages[0],
              description: item.description || item.bio || "",
              verified: !!(item.listing_verified ?? item.is_verified),
              price: priceLabel,
            } as unknown as Event);
          } else {
            businesses.push({
              id: item.id.toString(),
              name: item.name,
              slug: item.slug,
              images: validImages,
              category: categoryName,
              rating: Number(item.rating) || 0,
              reviewCount: Number(item.ratings_count) || 0,
              location: location,
              verified: !!(item.listing_verified ?? item.is_verified),
            } as Business);
          }
        });

        setFeaturedBusinesses(businesses);
        setUpcomingEvents(events);
        setFeaturedCommunities(communities);
      } catch (error) {
        console.error("Failed to fetch home data", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedCountry]);

  const filteredAndSortedEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cutoff = new Date(today);
    cutoff.setDate(today.getDate() + 14);

    return upcomingEvents
      .filter((e) => {
        if (!e.startDateRaw) return false;
        const d = new Date(e.startDateRaw);
        return d >= today && d <= cutoff;
      })
      .sort((a, b) => {
        const ta = new Date(a.startDateRaw!).getTime();
        const tb = new Date(b.startDateRaw!).getTime();
        return ta - tb;
      });
  }, [upcomingEvents]);

  // --- Skeletons (Implemented with ShadCN) ---

  // 1. Vertical Skeleton (For Businesses and Events)
  const CardSkeleton = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col space-y-3 rounded-2xl border border-gray-100 bg-white overflow-hidden h-full"
        >
          {/* Image Placeholder */}
          <Skeleton className="h-[200px] w-full rounded-none" />
          <div className="p-4 space-y-3">
            {/* Badge */}
            <Skeleton className="h-5 w-20 rounded-full" />
            {/* Title */}
            <Skeleton className="h-6 w-3/4" />
            {/* Meta (Rating/Location) */}
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );

  // 2. Category Skeleton
  const CategorySkeleton = () => (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton
          key={i}
          className="w-[173px] h-[114px] md:w-[310px] md:h-[204px] rounded-2xl mx-auto"
        />
      ))}
    </div>
  );

  // 3. Horizontal Skeleton (For Communities)
  const CommunitySkeleton = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {Array.from({ length: 2 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-row h-[165px] w-full rounded-3xl border border-gray-100 bg-white overflow-hidden"
        >
          {/* Left Image */}
          <Skeleton className="h-full w-32 sm:w-48 rounded-none" />
          {/* Right Content */}
          <div className="flex flex-1 flex-col justify-center p-4 space-y-3">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-10 w-32 rounded-md mt-1" />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="overflow-x-hidden">
      <HeroSlider />

      {/* Explore by Category */}
      <div className="py-12 px-4 lg:px-16">
        <div className="flex flex-row justify-between items-center md:items-center gap-3 mb-8">
          <div className="flex flex-col space-y-2">
            <h2 className="font-semibold text-xl md:text-4xl">
              Explore Our Top Categories
            </h2>
            <p className="font-normal text-sm md:text-base">
              Find exactly what you&apos;re looking for
            </p>
          </div>
          {/* <div>
            <Sort value={sortBy} onChange={setSortBy} /> 
          </div> */}
        </div>
        {isTopCatsLoading ? (
          <CategorySkeleton />
        ) : topCategories.length > 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {topCategories.map((category) => (
              <Link
                key={category.id}
                href={`/categories/${category.slug}`}
                className="group relative overflow-hidden rounded-2xl w-[173px] h-[114px] md:w-[310px] md:h-[204px] aspect-4/3 hover:shadow-xl transition-all duration-300 mx-auto"
              >
                <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/30 to-transparent z-10" />
                <Image
                  src={category.featured_image || "/images/no-image.jpg"}
                  alt={category.name}
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="object-cover group-hover:scale-110 transition-transform duration-300"
                  unoptimized={true}
                />
                <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 z-20">
                  <h3 className="text-white font-medium text-base md:text-xl">
                    {category.name}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <p>No top categories available.</p>
          </div>
        )}
      </div>

      {/* Geo-context indicator — renders once a country is known */}
      {(detectedCountry || selectedCountry) && (
        <div className="px-4 lg:px-16 flex items-center gap-3 pt-6">
          <span className="text-sm text-gray-500">Showing results in</span>
          <CountryDropdown
            defaultValue={selectedCountry || detectedCountry}
            onChange={(country: Country) => setSelectedCountry(country.name)}
            options={countryOptions}
            slim
          />
        </div>
      )}

      {/* Featured Businesses */}
      {(isLoading || featuredBusinesses.length > 0) && (
        <div className="py-6 px-4 lg:py-16 lg:px-16">
          <div className="flex flex-row justify-between items-end md:items-center gap-3 mb-8">
            <div className="flex flex-col space-y-2">
              <h2 className="font-semibold text-xl md:text-4xl">
                Featured Businesses
              </h2>
              <p className="font-normal text-sm md:text-base">
                Discover top-rated businesses near you
              </p>
            </div>
            <Link href="/businesses" className="text-[#275782] font-medium">
              Explore all
            </Link>
          </div>
          {isLoading ? (
            <CardSkeleton />
          ) : (
            <BusinessCarousel businesses={featuredBusinesses} />
          )}
        </div>
      )}

      {/* Upcoming Events */}
      {(isLoading || filteredAndSortedEvents.length > 0) && (
        <div className="py-12 px-4 lg:py-12 lg:px-16">
          <div className="flex flex-row justify-between items-end md:items-center gap-3 mb-8">
            <div className="flex flex-col space-y-2">
              <h2 className="font-semibold text-xl md:text-4xl">
                Upcoming Events
              </h2>
              <p className="font-normal text-sm md:text-base">
                Don&apos;t miss these amazing cultural events
              </p>
            </div>
            <Link href="/events" className="text-[#275782] font-medium">
              Explore all
            </Link>
          </div>
          {isLoading ? (
            <CardSkeleton />
          ) : (
            <DirectoryEventCarousel events={filteredAndSortedEvents} />
          )}
        </div>
      )}

      {/* Community Section */}
      {(isLoading || featuredCommunities.length > 0) && (
        <div className="py-12 px-4 lg:px-16">
          <div className="flex flex-row justify-between items-center md:items-center gap-3 mb-10">
            <div className="flex flex-col space-y-2">
              <h2 className="font-semibold text-xl md:text-4xl">
                Communities You Can Explore
              </h2>
              <p className="font-normal text-sm md:text-base">
                Join supportive network that celebrates african heritage
              </p>
            </div>
          </div>
          {isLoading ? (
            <CommunitySkeleton />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 items-center gap-6">
              {featuredCommunities.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-row bg-white rounded-3xl shadow-sm border overflow-hidden h-full min-h-[165px]"
                >
                  <div className="relative w-32 sm:w-48 h-auto p-3 shrink-0">
                    <div className="relative w-full h-full rounded-xl overflow-hidden bg-gray-100">
                      <ListingCoverMedia
                        src={item.image}
                        alt={item.title}
                        sizes="(max-width: 640px) 128px, 192px"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col justify-center mt-1.5 p-1 md:p-3 flex-1">
                    <h4 className="text-lg md:text-2xl font-semibold text-gray-900 mb-2 md:mb-3 line-clamp-1">
                      {item.title}
                    </h4>
                    <p className="text-sm md:text-base text-gray-500 mb-2 md:mb-5 font-normal line-clamp-2">
                      {stripHtml(item.description)}
                    </p>
                    <Button
                      onClick={() => router.push(`/communities/${item.slug}`)}
                      className="hidden md:block bg-[#152B40] hover:bg-[#253754] text-white font-medium w-full rounded-md px-5 py-2"
                    >
                      View Community
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center justify-center mt-4">
            <Button
              onClick={() => router.push("/communities")}
              className="bg-transparent border border-[#93C01F] text-[#93C01F] hover:bg-[#93C01F] hover:text-white cursor-pointer"
            >
              Explore more communities
            </Button>
          </div>
        </div>
      )}

      {/* Vendor Section */}
      <div className="py-12 px-4 lg:px-16">
        <div className="flex flex-col lg:flex-row overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="relative w-full lg:w-1/2 h-80 lg:h-auto">
            <Image
              src="/images/backgroundImages/business/vendor.jpg"
              alt="Vendor"
              fill
              className="object-cover"
              unoptimized={true}
            />
          </div>
          <div className="flex flex-col justify-center bg-[#0D7077] text-white w-full lg:w-1/2 p-8 lg:p-16 space-y-6">
            <h2 className="text-3xl md:text-5xl font-medium leading-tight">
              Grow Your Business with Mefie
            </h2>
            <p className="text-base md:text-lg leading-relaxed">
              Join a network of vendors reaching new audiences.
            </p>
            <Button
              onClick={handleClickEvent}
              className="bg-[#93C01F] hover:bg-[#7ea919] text-white font-medium w-fit px-4 py-3 rounded-md cursor-pointer"
            >
              Join as a vendor
            </Button>
          </div>
        </div>
      </div>

      <div className="py-12 px-4 lg:px-16">
        <Faqs />
      </div>

      {/* CTA */}
      <div className="py-12 px-4 lg:px-16">
        <div className="relative flex flex-col justify-center items-center text-center bg-[#152B40] text-white rounded-3xl overflow-hidden h-[350px] shadow-sm px-20 lg:px-0">
          {/* Background patterns */}
          <div className="absolute -left-32 lg:-left-6 lg:-bottom-20">
            <Image
              src="/images/backgroundImages/bg-pattern.svg"
              alt="background pattern left"
              width={320}
              height={320}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-contain h-[150px] lg:h-[400px]"
              priority
            />
          </div>
          <div className="hidden lg:block absolute bottom-20 lg:-bottom-20 -right-24 lg:right-0">
            <Image
              src="/images/backgroundImages/bg-pattern-1.svg"
              alt="background pattern right"
              width={320}
              height={320}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-contain"
              priority
            />
          </div>
          <div className="block lg:hidden absolute bottom-16 -right-32">
            <Image
              src="/images/backgroundImages/mobile-pattern.svg"
              alt="background pattern right"
              width={320}
              height={320}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-contain h-[120px]"
              priority
            />
          </div>

          {/* Text content */}
          <h2 className="text-3xl md:text-5xl font-bold leading-tight mb-4">
            Ready to Grow Your Business?
          </h2>
          {/* <p className="text-base md:text-lg font-normal text-gray-100 mb-6">
            Join thousands of African businesses already listed on Mefie
            Directory
          </p> */}

          {/* CTA button */}
          <Button
            onClick={handleClickEvent}
            className="bg-[#93C01F] hover:bg-[#7ca818] text-white font-medium text-base px-4 py-2 rounded-md transition-all duration-200 mt-3"
          >
            List your business today
          </Button>
        </div>
      </div>
    </div>
  );
}

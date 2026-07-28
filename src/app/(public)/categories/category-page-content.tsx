"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { countries } from "country-data-list";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Country, CountryDropdown } from "@/components/ui/country-dropdown";
import { BusinessCard } from "@/components/business-card";
import { EventCard } from "@/components/event-card";
import CommunityCard from "@/components/communities/community-card";
import { processImages, formatDateTime } from "@/lib/directory/image-utils";
import { pickDisplayCategory, type ApiListing } from "@/lib/directory/types";
import type {
  CategoryLandingListingType,
  CategoryLandingResponse,
  CategoryLandingSection,
  CategoryLandingTypeView,
} from "@/types/category-landing";

const TYPES: CategoryLandingListingType[] = ["business", "community", "event"];

function titleCaseSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function canonicalHref(item: ApiListing): string {
  const type = item.type || item.listing_type || "business";
  if (type === "event") return `/events/${item.slug}`;
  if (type === "community") return `/communities/${item.slug}`;
  return `/businesses/${item.slug}`;
}

function listingImage(item: ApiListing): string {
  return processImages(item.images, [
    item.primary_image,
    item.image,
    item.cover_image,
  ])[0];
}

function listingCategory(item: ApiListing): string {
  return pickDisplayCategory(item.categories ?? [])?.name || "General";
}

function listingLocation(item: ApiListing): string {
  if ((item.type || item.listing_type) === "event") {
    return item.event_venue || item.event_city || item.event_country || "TBA";
  }

  return item.city || item.country || "Online";
}

function typeLabel(type: CategoryLandingListingType): string {
  if (type === "business") return "Businesses";
  if (type === "community") return "Communities";
  return "Events";
}

// Renders the matching shared card per listing type so category listings look
// identical to the rest of the site. `href` is passed explicitly because this
// page routes by listing type.
function ListingCard({ item }: { item: ApiListing }) {
  const type = (item.type ||
    item.listing_type ||
    "business") as CategoryLandingListingType;
  const href = canonicalHref(item);
  const verified = !!(item.listing_verified ?? item.is_verified);
  const description = item.bio || item.description || "";

  if (type === "event") {
    return (
      <EventCard
        href={href}
        event={{
          id: String(item.id),
          name: item.name,
          category: listingCategory(item),
          image: listingImage(item),
          location: listingLocation(item),
          description,
          slug: item.slug,
          startDate: item.event_start_date
            ? formatDateTime(item.event_start_date)
            : "",
          endDate: item.event_end_date
            ? formatDateTime(item.event_end_date)
            : "",
          verified,
        }}
      />
    );
  }

  if (type === "community") {
    return (
      <CommunityCard
        href={href}
        community={{
          id: String(item.id),
          slug: item.slug,
          name: item.name,
          description,
          imageUrl: listingImage(item),
          image: listingImage(item),
          tag: listingCategory(item),
          verified,
          type: "community",
          location: listingLocation(item),
        }}
      />
    );
  }

  return (
    <BusinessCard
      href={href}
      business={{
        id: String(item.id),
        name: item.name,
        category: listingCategory(item),
        images: [listingImage(item)],
        rating: Number(item.rating) || 0,
        reviewCount: Number(item.ratings_count) || 0,
        location: listingLocation(item),
        verified,
        slug: item.slug,
        reachBadge: item.reach_badge,
      }}
    />
  );
}

function SectionGrid({
  section,
  onSeeMore,
}: {
  section: CategoryLandingSection;
  onSeeMore: (type: CategoryLandingListingType) => void;
}) {
  if (section.total === 0) return null;

  return (
    <section className="px-4 py-10 lg:px-16">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        {/* <div>
          <h2 className="text-2xl font-semibold text-gray-900 lg:text-3xl">
            {section.title}
          </h2> */}
          <h2 className="text-2xl font-semibold text-gray-900 lg:text-3xl">
            Best {typeLabel(section.type)}
          </h2>

          {/* <p className="mt-1 text-sm text-gray-500">
            {section.total} {section.total === 1 ? "listing" : "listings"} found
          </p>
        </div> */}
        {section.has_more && (
          <Button
            type="button"
            variant="outline"
            onClick={() => onSeeMore(section.type)}
            className="w-fit rounded-full border-[#9ACC23] text-[#6D9418] hover:bg-[#9ACC23] hover:text-white"
          >
            See more {typeLabel(section.type).toLowerCase()}
          </Button>
        )}
      </div>

      <div className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-3 sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 lg:grid-cols-4">
        {section.items.map((item) => (
          <div
            key={`${section.type}-${item.id}`}
            className="w-[82vw] max-w-[340px] shrink-0 snap-start sm:w-auto sm:max-w-none sm:shrink"
          >
            <ListingCard item={item} />
          </div>
        ))}
      </div>
    </section>
  );
}

function CardSkeleton() {
  return (
    <div className="w-[82vw] max-w-[340px] shrink-0 snap-start overflow-hidden rounded-2xl border border-gray-100 bg-white sm:w-auto sm:max-w-none sm:shrink">
      <Skeleton className="h-48 w-full rounded-none" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-4 w-16 rounded-full" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
}

function ContentSkeleton() {
  return (
    <div className="space-y-2">
      {[0, 1, 2].map((i) => (
        <section key={i} className="px-4 py-10 lg:px-16">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <Skeleton className="h-7 w-56" />
              <Skeleton className="h-4 w-28" />
            </div>
            <Skeleton className="h-9 w-32 rounded-full" />
          </div>
          <div className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-3 sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 lg:grid-cols-4">
            {[0, 1, 2, 3].map((j) => (
              <CardSkeleton key={j} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <section className="px-4 pb-4 pt-8 lg:px-16">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-64 lg:h-12 lg:w-72" />
            <Skeleton className="h-5 w-full max-w-lg" />
          </div>
          <Skeleton className="h-11 w-full rounded-xl lg:w-[220px]" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          <Skeleton className="h-9 w-28 shrink-0 rounded-full" />
          <Skeleton className="h-9 w-24 shrink-0 rounded-full" />
          <Skeleton className="h-9 w-32 shrink-0 rounded-full" />
          <Skeleton className="h-9 w-24 shrink-0 rounded-full" />
          <Skeleton className="h-9 w-28 shrink-0 rounded-full" />
        </div>
      </section>
      <ContentSkeleton />
    </div>
  );
}

export default function CategoryPageContent() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<CategoryLandingResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const categorySlug = useMemo(() => {
    const segments = pathname?.split("/").filter(Boolean) ?? [];
    const index = segments.indexOf("categories");
    return index !== -1 ? segments[index + 1] || "" : "";
  }, [pathname]);

  const selectedSubcategory = searchParams.get("subcategory") || "";
  const selectedType = searchParams.get(
    "type",
  ) as CategoryLandingListingType | null;
  const selectedCountry = searchParams.get("country") || "";
  const currentPage = Number(searchParams.get("page") || "1");

  const writeParams = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      const qs = params.toString();
      const url = qs ? `${pathname}?${qs}` : pathname;
      router.replace(url, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    if (!categorySlug) return;

    const controller = new AbortController();

    async function fetchLanding() {
      let aborted = false;
      try {
        setIsLoading(true);
        setError(null);

        const params = new URLSearchParams({
          category_slug: categorySlug,
        });
        if (selectedSubcategory)
          params.set("subcategory_slug", selectedSubcategory);
        if (selectedType && TYPES.includes(selectedType))
          params.set("type", selectedType);
        if (selectedCountry) params.set("country", selectedCountry);
        if (selectedType) {
          params.set(
            "page",
            String(
              Number.isFinite(currentPage) && currentPage > 0 ? currentPage : 1,
            ),
          );
          params.set("per_page", "12");
        }

        const response = await fetch(
          `/api/category_landing?${params.toString()}`,
          {
            headers: { Accept: "application/json" },
            signal: controller.signal,
          },
        );

        if (!response.ok) throw new Error("Failed to load category listings");
        const json = (await response.json()) as CategoryLandingResponse;
        setData(json);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          aborted = true;
          return;
        }
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load category listings",
        );
        setData(null);
      } finally {
        if (!aborted) setIsLoading(false);
      }
    }

    fetchLanding();
    return () => controller.abort();
  }, [
    categorySlug,
    currentPage,
    selectedCountry,
    selectedSubcategory,
    selectedType,
  ]);

  const sections = data?.sections
    ? TYPES.map((type) => data.sections?.[type]).filter(
        (section): section is CategoryLandingSection =>
          !!section && section.total > 0,
      )
    : [];

  const typeView: CategoryLandingTypeView | undefined = data?.type_view;
  // Use the API-supplied name when available. Fall back to slug-derived text only
  // as a loading/skeleton placeholder — it loses special chars like "&" so it is
  // never used as the final display value once data is loaded.
  const readableCategory =
    data?.category?.name ??
    (error ? "This category" : titleCaseSlug(categorySlug));
  const availableCountryOptions = useMemo(() => {
    const allowedCountries = data?.available_countries ?? [];
    const allowedNames = new Set(allowedCountries);

    return countries.all.filter(
      (country: Country) =>
        allowedNames.has(country.name) &&
        country.emoji &&
        country.status !== "deleted" &&
        country.ioc !== "PRK",
    );
  }, [data?.available_countries]);

  useEffect(() => {
    if (!data || !selectedSubcategory) return;

    const isReturnedSubcategory = data.subcategories.some(
      (subcategory) => subcategory.slug === selectedSubcategory,
    );

    if (
      isReturnedSubcategory ||
      data.active_subcategory?.slug === selectedSubcategory
    )
      return;

    writeParams((params) => {
      params.delete("subcategory");
      params.delete("type");
      params.delete("page");
    });
  }, [data, selectedSubcategory, writeParams]);

  const handleSubcategoryChange = (slug: string) => {
    writeParams((params) => {
      if (slug) params.set("subcategory", slug);
      else params.delete("subcategory");
      params.delete("type");
      params.delete("page");
    });
  };

  const handleCountryChange = (country: Country | null) => {
    writeParams((params) => {
      if (country?.name) params.set("country", country.name);
      else params.delete("country");
      params.delete("page");
    });
  };

  const handleSeeMore = (type: CategoryLandingListingType) => {
    writeParams((params) => {
      params.set("type", type);
      params.set("page", "1");
    });
  };

  const handlePageChange = (page: number) => {
    writeParams((params) => {
      params.set("page", String(page));
    });
  };

  if (isLoading && !data) return <PageSkeleton />;

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <section className="px-4 pb-4 pt-8 lg:px-16">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium text-[#6D9418]">Top category</p>
            <h1 className="mt-2 text-3xl font-semibold text-gray-950 lg:text-5xl">
              {readableCategory}
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-gray-600 lg:text-base">
              Explore approved businesses, communities, and events connected to{" "}
              {readableCategory}.
            </p>
          </div>
          <div className="min-w-[220px]">
            <CountryDropdown
              defaultValue={
                selectedCountry || data?.meta?.detected_country || undefined
              }
              onChange={handleCountryChange}
              options={availableCountryOptions}
              placeholder="Select country"
              slim={false}
            />
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto whitespace-nowrap pb-2">
          <button
            type="button"
            onClick={() => handleSubcategoryChange("")}
            className={`shrink-0 rounded-full border px-5 py-2 text-sm font-medium transition ${
              !selectedSubcategory
                ? "border-[#9ACC23] bg-[#9ACC23] text-white"
                : "border-gray-200 bg-white text-gray-700 hover:border-[#9ACC23]"
            }`}
          >
            All {readableCategory}
          </button>
          {(data?.subcategories ?? []).map((subcategory) => (
            <button
              key={subcategory.slug || subcategory.id}
              type="button"
              onClick={() =>
                subcategory.slug && handleSubcategoryChange(subcategory.slug)
              }
              className={`shrink-0 rounded-full border px-5 py-2 text-sm font-medium transition ${
                selectedSubcategory === subcategory.slug
                  ? "border-[#9ACC23] bg-[#9ACC23] text-white"
                  : "border-gray-200 bg-white text-gray-700 hover:border-[#9ACC23]"
              }`}
            >
              {subcategory.name}
            </button>
          ))}
        </div>
      </section>

      {error ? (
        <div className="px-4 py-16 text-center text-gray-500 lg:px-16">
          {error}
        </div>
      ) : isLoading ? (
        <ContentSkeleton />
      ) : typeView ? (
        <section className="px-4 py-10 lg:px-16">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            {/* <div>
              <h2 className="text-2xl font-semibold text-gray-900 lg:text-3xl">
                {typeView.title}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {typeView.total} {typeView.total === 1 ? "listing" : "listings"} found
              </p>
            </div> */}
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                writeParams((params) => {
                  params.delete("type");
                  params.delete("page");
                });
              }}
              className="w-fit rounded-full"
            >
              Back to all types
            </Button>
          </div>

          {typeView.items.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {typeView.items.map((item) => (
                <ListingCard key={`${typeView.type}-${item.id}`} item={item} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center text-gray-500">
              No {typeLabel(typeView.type).toLowerCase()} found for this filter.
            </div>
          )}

          {typeView.last_page > 1 && (
            <div className="mt-10 flex items-center justify-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={typeView.current_page <= 1}
                onClick={() => handlePageChange(typeView.current_page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-gray-600">
                Page {typeView.current_page} of {typeView.last_page}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={typeView.current_page >= typeView.last_page}
                onClick={() => handlePageChange(typeView.current_page + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </section>
      ) : sections.length > 0 ? (
        sections.map((section) => (
          <SectionGrid
            key={section.type}
            section={section}
            onSeeMore={handleSeeMore}
          />
        ))
      ) : (
        <div className="px-4 py-20 lg:px-16">
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-16 text-center">
            <h2 className="text-2xl font-semibold text-gray-900">
              No listings found for this category yet.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-gray-500">
              Try another subcategory or country filter. We will show matching
              businesses, communities, and events here as soon as they are
              approved.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

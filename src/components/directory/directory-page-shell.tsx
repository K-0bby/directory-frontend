"use client";

import { ReactNode, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useQueryState, parseAsString } from "nuqs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import ScrollableCategoryTabs from "@/components/ux/scrollable-category-tabs";
import SearchHeader from "@/components/ux/search-header";
import { Country } from "@/components/ui/country-dropdown";
import { ApiListing } from "@/lib/directory/types";

export interface DirectoryPageShellProps<T> {
  /** Slug passed to `<ScrollableCategoryTabs mainCategorySlug=...>`. */
  mainCategorySlug: string;
  /** Context passed to `<SearchHeader>` and `<ScrollableCategoryTabs>`. */
  context: "businesses" | "events" | "communities";
  /** Mapped items produced by `useDirectoryListings`. */
  items: T[];
  isLoading: boolean;
  detectedCountry: string | null;
  /**
   * Map a raw API listing to the page item type.
   * Required for category-pill fetches from the geolocation endpoints.
   */
  mapItem?: (item: ApiListing) => T | null;

  /** Returns the group-by key for an item (category / tag name). */
  groupBy: (item: T) => string;
  /** Returns true if an item belongs to the selected category slug. */
  matchesCategory: (item: T, slug: string) => boolean;

  /** How many items to pass to the hero carousel. */
  heroSize: number;
  /** How many groups to render (all visible, no toggle). */
  visibleGroups: number;
  /** Message shown when `items` is empty. */
  emptyMessage: string;

  /** Initial number of cards to show in the paginated grid. */
  initialGridCount?: number;
  /** How many extra cards to reveal per "Show more" click. */
  gridLoadMoreStep?: number;
  /** Title displayed above the paginated grid. */
  gridTitle?: string;

  /** Render the hero carousel at the top of the "all" tab. */
  renderHero: (items: T[]) => ReactNode;
  /** Render a single category group section. */
  renderGroup: (title: string, items: T[]) => ReactNode;
  /** Render the single-category view (when a tab other than "all" is active). */
  renderFiltered: (items: T[]) => ReactNode;
  /** Render a single card in the paginated grid. Required for the grid. */
  renderCard?: (item: T) => ReactNode;
  /** Optional banner rendered between the grid and the footer. */
  renderMidBanner?: () => ReactNode;
  /** Optional footer CTA (e.g. "Ready to grow your business?"). */
  renderFooterCta?: () => ReactNode;
}

export function DirectoryPageShell<T>({
  mainCategorySlug,
  context,
  items,
  isLoading,
  detectedCountry,
  mapItem,
  groupBy,
  matchesCategory,
  heroSize,
  visibleGroups,
  emptyMessage,
  initialGridCount = 12,
  gridLoadMoreStep = 8,
  gridTitle = "All listings",
  renderHero,
  renderGroup,
  renderFiltered,
  renderCard,
  renderMidBanner,
  renderFooterCta,
}: DirectoryPageShellProps<T>) {
  // Store both id and slug in the URL so the backend can use whichever it supports.
  const [categoryIdParam, setCategoryIdParam] = useQueryState(
    "category_id",
    parseAsString,
  );
  const [categorySlugParam, setCategorySlugParam] = useQueryState(
    "category_slug",
    parseAsString,
  );
  const [filterCountry, setFilterCountry] = useQueryState(
    "country",
    parseAsString,
  );
  // Prefer slug for tab-pill active-state matching; fall back to id string.
  const selectedCategory = categorySlugParam || categoryIdParam || "all";
  const isCategorySelected = selectedCategory !== "all";

  const [searchQuery, setSearchQuery] = useQueryState(
    "q",
    parseAsString.withDefault(""),
  );
  const [dateFrom, setDateFrom] = useQueryState(
    "event_start_date",
    parseAsString.withDefault(""),
  );
  const [dateTo, setDateTo] = useQueryState(
    "event_end_date",
    parseAsString.withDefault(""),
  );
  // Derived directly from the URL-backed `country` param so it always stays
  // in sync with back/forward navigation, not just explicit dropdown changes.
  const selectedCountry = (filterCountry ?? "").toLowerCase();
  // Proper-cased country for API requests (category pills and backend geo filter).
  const activeCountry = filterCountry ?? "";

  // Items fetched when a category pill (non-"all") is selected.
  // Loading is derived from whether the current fetch key matches the last completed one —
  // no synchronous setState needed, so no cascading-render lint violation.
  const categoryFetchKey = isCategorySelected
    ? `${categoryIdParam ?? ""}|${categorySlugParam ?? ""}|${selectedCountry}`
    : "";
  const [fetchedKey, setFetchedKey] = useState("");
  const [topCategoryItems, setTopCategoryItems] = useState<T[]>([]);
  const [allCategoryItems, setAllCategoryItems] = useState<T[]>([]);
  const isCategoryLoading = isCategorySelected && !!mapItem && categoryFetchKey !== fetchedKey;

  useEffect(() => {
    if (!isCategorySelected || !mapItem) return;

    let cancelled = false;

    // Send both params — backend uses whichever it supports.
    const params = new URLSearchParams();
    if (categoryIdParam) params.set("category_id", categoryIdParam);
    if (categorySlugParam) params.set("category_slug", categorySlugParam);
    const hasCountry = !!selectedCountry;
    if (hasCountry) params.set("country", selectedCountry);

    Promise.all([
      fetch(
        hasCountry
          ? `/api/top_listings_by_country_and_category?${params}`
          : `/api/top_listings_by_category_and_geolocation?${params}`,
        { headers: { Accept: "application/json" } },
      ).then((r) => {
        if (!r.ok) throw new Error(`Top request failed (${r.status})`);
        return r.json();
      }),
      fetch(
        hasCountry
          ? `/api/all_listings_by_country_and_category?${params}`
          : `/api/all_listings_by_category_and_geolocation?${params}`,
        { headers: { Accept: "application/json" } },
      ).then((r) => {
        if (!r.ok) throw new Error(`All request failed (${r.status})`);
        return r.json();
      }),
    ])
      .then(([topJson, allJson]) => {
        if (cancelled) return;
        const mapper = mapItem;
        const topRaw: ApiListing[] = Array.isArray(topJson.data)
          ? topJson.data
          : Array.isArray(topJson.listings)
            ? topJson.listings
            : [];
        const allRaw: ApiListing[] = Array.isArray(allJson.data)
          ? allJson.data
          : Array.isArray(allJson.listings)
            ? allJson.listings
            : [];
        setTopCategoryItems(
          topRaw.flatMap((item) => { const r = mapper(item); return r !== null ? [r] : []; }),
        );
        setAllCategoryItems(
          allRaw.flatMap((item) => { const r = mapper(item); return r !== null ? [r] : []; }),
        );
      })
      .catch(() => {
        if (!cancelled) {
          setTopCategoryItems([]);
          setAllCategoryItems([]);
        }
      })
      .finally(() => {
        if (!cancelled) setFetchedKey(categoryFetchKey);
      });

    return () => { cancelled = true; };
  }, [isCategorySelected, categoryIdParam, categorySlugParam, selectedCountry, mapItem]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCategoryTabChange = useCallback(
    (slug: string, id: number | null) => {
      if (slug === "all") {
        setCategoryIdParam(null);
        setCategorySlugParam(null);
      } else {
        // Write both so the backend can use whichever it supports.
        if (id !== null) setCategoryIdParam(String(id));
        setCategorySlugParam(slug);
      }
    },
    [setCategoryIdParam, setCategorySlugParam],
  );

  const handleCountryChange = useCallback(
    (country: Country | null) => {
      const countryName = country?.name || "";
      // Update the URL so useDirectoryListings re-fetches with the new
      // country filter; `selectedCountry`/`activeCountry` are derived from
      // this same param, so they update automatically.
      setFilterCountry(countryName || null);
    },
    [setFilterCountry],
  );

  const headerFilteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const targetCountry = selectedCountry.trim().toLowerCase();

    return items.filter((item) => {
      const record = item as Record<string, unknown>;
      const textFields = [
        record.name,
        record.title,
        record.description,
        record.category,
        record.tag,
        record.location,
      ];

      const passesSearch =
        !q ||
        textFields.some((value) =>
          value?.toString().toLowerCase().includes(q),
        );
      if (!passesSearch) return false;

      if (targetCountry) {
        const itemCountry = record.country?.toString().toLowerCase();
        const itemLocation = record.location?.toString().toLowerCase();
        if (itemCountry !== targetCountry && !itemLocation?.includes(targetCountry)) return false;
      }

      // Client-side date filter (v2 pattern): ISO string comparison
      if (dateFrom || dateTo) {
        const raw = record.startDateRaw as string | undefined;
        if (raw) {
          if (dateFrom && raw < dateFrom) return false;
          if (dateTo && raw > dateTo) return false;
        }
      }

      return true;
    });
  }, [items, searchQuery, selectedCountry, dateFrom, dateTo]);

  const grouped = useMemo(() => {
    return headerFilteredItems.reduce<Record<string, T[]>>((acc, item) => {
      const key = groupBy(item);
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});
  }, [headerFilteredItems, groupBy]);

  const groupNames = useMemo(() => Object.keys(grouped), [grouped]);

  const filtered = useMemo(() => {
    if (selectedCategory === "all") return headerFilteredItems;
    return headerFilteredItems.filter((item) =>
      matchesCategory(item, selectedCategory),
    );
  }, [headerFilteredItems, selectedCategory, matchesCategory]);

  const usingCategoryFetch = isCategorySelected && !!mapItem;

  if (isLoading) return <DirectoryPageSkeleton />;

  return (
    <div className="bg-gray-50 min-h-screen">
      <ScrollableCategoryTabs
        mainCategorySlug={mainCategorySlug}
        context={context}
        country={activeCountry}
        defaultValue="all"
        value={selectedCategory}
        onCategoryChange={handleCategoryTabChange}
        containerClassName="pt-4 pb-1"
      />

      <Suspense fallback={<div className="h-20" />}>
        <SearchHeader
          context={context}
          detectedCountry={detectedCountry}
          onCountryChange={handleCountryChange}
          onSearchChange={setSearchQuery}
          onDateRangeChange={(start, end) => { setDateFrom(start); setDateTo(end); }}
        />
      </Suspense>

      <div className="pb-8">
        {isCategoryLoading ? (
          <div className="space-y-8 px-4 lg:px-16 pt-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-80 w-full rounded-2xl" />
              ))}
            </div>
          </div>
        ) : usingCategoryFetch && topCategoryItems.length === 0 && allCategoryItems.length === 0 ? (
          <div className="py-16 text-center text-gray-500 font-medium">
            {emptyMessage}
          </div>
        ) : !usingCategoryFetch && filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-500 font-medium">
            {emptyMessage}
          </div>
        ) : selectedCategory === "all" ? (
          <>
            {renderHero(filtered.slice(0, heroSize))}

            {groupNames.slice(0, visibleGroups).map((name) => (
              <div key={name}>{renderGroup(name, grouped[name])}</div>
            ))}

            {renderCard && (
              <PaginatedGrid<T>
                key={`all-${filtered.length}`}
                items={filtered}
                initialCount={initialGridCount}
                loadMoreStep={gridLoadMoreStep}
                title={gridTitle}
                renderCard={renderCard}
              />
            )}

            {renderMidBanner?.()}
            {renderFooterCta?.()}
          </>
        ) : usingCategoryFetch ? (
          <>
            {topCategoryItems.length > 0 && renderHero(topCategoryItems.slice(0, heroSize))}

            {renderCard ? (
              <PaginatedGrid<T>
                key={`cat-${categoryIdParam ?? categorySlugParam}-${allCategoryItems.length}`}
                items={allCategoryItems}
                initialCount={initialGridCount}
                loadMoreStep={gridLoadMoreStep}
                title={gridTitle}
                renderCard={renderCard}
              />
            ) : (
              renderFiltered(allCategoryItems)
            )}

            {renderMidBanner?.()}
            {renderFooterCta?.()}
          </>
        ) : renderCard ? (
          <PaginatedGrid<T>
            key={`${selectedCategory}-${filtered.length}`}
            items={filtered}
            initialCount={initialGridCount}
            loadMoreStep={gridLoadMoreStep}
            title={gridTitle}
            renderCard={renderCard}
          />
        ) : (
          renderFiltered(filtered)
        )}
      </div>
    </div>
  );
}

interface PaginatedGridProps<T> {
  items: T[];
  initialCount: number;
  loadMoreStep: number;
  title?: string;
  renderCard: (item: T) => ReactNode;
}

function PaginatedGrid<T>({
  items,
  initialCount,
  loadMoreStep,
  title,
  renderCard,
}: PaginatedGridProps<T>) {
  const [visibleCount, setVisibleCount] = useState(initialCount);
  const visible = items.slice(0, visibleCount);
  const hasMore = visibleCount < items.length;
  const remaining = items.length - visibleCount;

  return (
    <section className="py-10 px-4 lg:px-16">
      {title && (
        <h2 className="font-semibold text-2xl md:text-3xl mb-6">{title}</h2>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {visible.map((item, i) => (
          <div key={i}>{renderCard(item)}</div>
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-10">
          <Button
            onClick={() =>
              setVisibleCount((v) =>
                Math.min(v + loadMoreStep, items.length),
              )
            }
            variant="outline"
            className="border-[#9ACC23] text-[#9ACC23] hover:bg-[#9ACC23] hover:text-white"
          >
            Show more ({Math.min(loadMoreStep, remaining)} more)
          </Button>
        </div>
      )}
    </section>
  );
}

function DirectoryPageSkeleton() {
  return (
    <div className="space-y-8 px-4 lg:px-16 pt-8">
      <div className="flex gap-4 overflow-hidden">
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

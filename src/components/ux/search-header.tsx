"use client";

import { useState, useEffect, useMemo } from "react";
import { useQueryState, parseAsString, debounce } from "nuqs";
import { Calendar, ChevronDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format, parse } from "date-fns";
import SearchDropdown from "@/components/ux/search-dropdown";
import type { DateRange } from "react-day-picker";
import { CountryDropdown, Country } from "@/components/ui/country-dropdown";
import { countries as allCountries } from "country-data-list";
import { useIsMobile } from "@/lib/use-is-mobile";

type SearchContext = "discover" | "businesses" | "events" | "communities";

interface SearchHeaderProps {
  context?: SearchContext;
  detectedCountry?: string | null;
  onCountryChange?: (country: Country | null) => void;
  onSearchChange?: (query: string) => void;
  onDateRangeChange?: (start: string, end: string) => void;
}

const searchPlaceholders: Record<SearchContext, string> = {
  discover: "Search by listing name or keyword...",
  businesses: "Search by listing name or keyword...",
  events: "Search by listing name or keyword...",
  communities: "Search by listing name or keyword...",
};

interface ApiCategory {
  id?: number | string;
  slug?: string;
  name: string;
  type?: string;
}

interface CategoryOption {
  label: string;
  value: string;
}

const categoryEndpointByContext: Record<SearchContext, string[]> = {
  discover: [
    "/api/business_categories",
    "/api/event_categories",
    "/api/community_categories",
  ],
  businesses: ["/api/business_categories"],
  events: ["/api/event_categories"],
  communities: ["/api/community_categories"],
};

const slugifyCategory = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const normalizeCategories = (raw: unknown): CategoryOption[] => {
  const list: unknown[] = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as { data?: unknown[] } | null)?.data)
      ? ((raw as { data: unknown[] }).data ?? [])
      : [];

  const mapped: CategoryOption[] = [];
  const seen = new Set<string>();

  for (const entry of list) {
    if (!entry || typeof entry !== "object") continue;
    const item = entry as ApiCategory;
    const name = item.name?.toString().trim();
    if (!name) continue;

    const value =
      item.slug?.toString().trim() ||
      (item.id !== undefined ? String(item.id) : "") ||
      slugifyCategory(name);

    const key = `${value}::${name.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);

    mapped.push({
      label: name,
      value,
    });
  }

  return mapped;
};

export default function SearchHeader({
  context = "discover",
  detectedCountry,
  onCountryChange,
  onSearchChange,
  onDateRangeChange,
}: SearchHeaderProps) {
  const [categoryIdQ, setCategoryIdQ] = useQueryState(
    "category_id",
    parseAsString.withDefault(""),
  );
  const [countryQ, setCountryQ] = useQueryState(
    "country",
    parseAsString.withDefault(""),
  );
  const [, setQParam] = useQueryState(
    "q",
    parseAsString
      .withDefault("")
      .withOptions({ limitUrlUpdates: debounce(500) }),
  );
  const [eventStartDate, setEventStartDate] = useQueryState(
    "event_start_date",
    parseAsString.withDefault(""),
  );
  const [eventEndDate, setEventEndDate] = useQueryState(
    "event_end_date",
    parseAsString.withDefault(""),
  );

  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [countryOptions, setCountryOptions] = useState<Country[] | undefined>(
    undefined,
  );

  useEffect(() => {
    let cancelled = false;

    const fetchCategories = async () => {
      try {
        const endpoints = categoryEndpointByContext[context] || [];
        const results = await Promise.all(
          endpoints.map((endpoint) =>
            fetch(endpoint, {
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
              },
              cache: "no-store",
            })
              .then((r) => (r.ok ? r.json() : null))
              .catch(() => null),
          ),
        );

        if (cancelled) return;
        const merged = results.flatMap((json) => normalizeCategories(json));
        setCategories(merged);
      } catch {
        if (!cancelled) setCategories([]);
      }
    };

    fetchCategories();
    return () => {
      cancelled = true;
    };
  }, [context]);

  // Fetch countries that have listings from the Next.js proxy
  useEffect(() => {
    fetch(`/api/countries_dropdown`, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    })
      .then((r) => r.json())
      .then((json) => {
        const list: unknown[] = Array.isArray(json?.data)
          ? json.data
          : Array.isArray(json)
            ? json
            : [];

        // Normalize backend entries (could be strings or objects) and
        // map each to the Country shape using country-data-list so flags work.
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
      .catch(() => {
        setCountryOptions([]);
      });
  }, []);

  const handleSearchChange = (value: string) => {
    if (onSearchChange) {
      // In-memory filtering — no URL update, no navigation
      onSearchChange(value);
    } else {
      // Fallback: update URL param for pages that rely on it. The 500ms
      // debounce lives on the URL commit itself (nuqs `limitUrlUpdates`)
      // rather than a manual setTimeout.
      setQParam(value || null);
    }
  };

  const handleCountrySelect = (country: Country | null) => {
    if (onCountryChange) {
      onCountryChange(country);
    } else {
      setCountryQ(country?.name || null);
    }
  };

  const handleCategoryChange = (value: string) => {
    setCategoryIdQ(value === "all" ? null : value);
  };

  const isMobile = useIsMobile();
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  // Derived from the URL-backed event_start_date/event_end_date params so
  // the picker correctly reflects a shared/bookmarked/refreshed URL instead
  // of always starting empty.
  const selectedRange: DateRange | undefined = useMemo(() => {
    if (!eventStartDate && !eventEndDate) return undefined;
    return {
      from: eventStartDate
        ? parse(eventStartDate, "yyyy-MM-dd", new Date())
        : undefined,
      to: eventEndDate
        ? parse(eventEndDate, "yyyy-MM-dd", new Date())
        : undefined,
    };
  }, [eventStartDate, eventEndDate]);

  const handleDateRangeSelect = (range: DateRange | undefined) => {
    const start = range?.from ? format(range.from, "yyyy-MM-dd") : "";
    const end = range?.to ? format(range.to, "yyyy-MM-dd") : "";
    setEventStartDate(start || null);
    setEventEndDate(end || null);
    onDateRangeChange?.(start, end);
  };

  const handleClearDates = () => {
    setEventStartDate(null);
    setEventEndDate(null);
    onDateRangeChange?.("", "");
  };

  const showCountry = true;
  const showCategories = context !== "discover";
  const showDate = context === "discover" || context === "events";

  const currentCategory = categoryIdQ || "all";
  const currentCategoryLabel = useMemo(
    () =>
      categories.find((c) => c.value === currentCategory)?.label ||
      "All categories",
    [categories, currentCategory],
  );

  return (
    <div className="w-full bg-transparent">
      <div className="mx-auto px-6 lg:px-16 py-6">
        <div className="flex flex-row flex-wrap lg:flex-nowrap gap-3 items-center md:items-center">
          {/* Search Input with Dropdown */}
          <div className="w-full md:w-auto md:min-w-[300px]">
            <SearchDropdown
              onSearch={handleSearchChange}
              placeholder={searchPlaceholders[context]}
              context={context}
            />
          </div>

          {/* Country Select */}
          {showCountry && (
            <div className="md:w-auto min-w-[180px]">
              <CountryDropdown
                // Prefer the URL-selected country so the dropdown visibly
                // reflects the active filter across re-renders; fall back to
                // the geolocation-detected country on first load.
                defaultValue={countryQ || detectedCountry || undefined}
                onChange={handleCountrySelect}
                placeholder="Select country"
                slim={false}
                options={countryOptions}
              />
            </div>
          )}

          {/* Date Range Picker */}
          {showDate && (
            <div className="md:w-auto min-w-[140px]">
              {/* Shared trigger button */}
              {(() => {
                const triggerBtn = (
                  <Button
                    variant="outline"
                    onClick={
                      isMobile ? () => setDatePickerOpen(true) : undefined
                    }
                    className={`h-9 w-full rounded-full px-4 justify-start font-normal ${
                      selectedRange?.from
                        ? "border-[#275782] bg-[#275782]/5 text-[#275782]"
                        : "border-[#E2E8F0] text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <Calendar className="h-4 w-4 mr-2 shrink-0" />
                    <span className="whitespace-nowrap">
                      {selectedRange?.from
                        ? selectedRange.to
                          ? `${format(selectedRange.from, "MMM d")} – ${format(selectedRange.to, "MMM d, yyyy")}`
                          : `${format(selectedRange.from, "MMM d, yyyy")} – end`
                        : "Dates"}
                    </span>
                    <ChevronDown className="h-4 w-4 text-gray-400 ml-auto" />
                  </Button>
                );

                if (isMobile) {
                  return (
                    <>
                      {triggerBtn}
                      <Sheet
                        open={datePickerOpen}
                        onOpenChange={setDatePickerOpen}
                      >
                        <SheetContent
                          side="bottom"
                          className="rounded-t-2xl px-0 pb-6"
                        >
                          <SheetHeader className="px-5 pb-2">
                            <SheetTitle className="text-base font-semibold">
                              Select Date Range
                            </SheetTitle>
                          </SheetHeader>
                          <div className="flex justify-center overflow-x-auto px-4">
                            <CalendarComponent
                              mode="range"
                              numberOfMonths={1}
                              selected={selectedRange}
                              onSelect={handleDateRangeSelect}
                            />
                          </div>
                          <SheetFooter className="flex-row gap-2 px-5 pt-4">
                            <Button
                              variant="outline"
                              className="flex-1"
                              onClick={() => {
                                handleClearDates();
                                setDatePickerOpen(false);
                              }}
                            >
                              Clear
                            </Button>
                            <SheetClose asChild>
                              <Button className="flex-1 bg-[#93C01F] hover:bg-[#7ea319] text-white">
                                Done
                              </Button>
                            </SheetClose>
                          </SheetFooter>
                        </SheetContent>
                      </Sheet>
                    </>
                  );
                }

                return (
                  <Popover>
                    <PopoverTrigger asChild>{triggerBtn}</PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <CalendarComponent
                        mode="range"
                        numberOfMonths={2}
                        selected={selectedRange}
                        onSelect={handleDateRangeSelect}
                      />
                      {selectedRange?.from && (
                        <div className="border-t border-gray-100 px-3 pb-3">
                          <button
                            onClick={handleClearDates}
                            className="mt-2 w-full rounded-lg border border-gray-200 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50"
                          >
                            Clear dates
                          </button>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                );
              })()}
            </div>
          )}

          {/* Category Select */}
          {showCategories && (
            <div className="md:w-auto min-w-[140px]">
              <Select
                value={currentCategory}
                onValueChange={handleCategoryChange}
              >
                <SelectTrigger className="h-10 rounded-full border-[#E2E8F0] px-4">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">
                      {currentCategoryLabel}
                    </span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

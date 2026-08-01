"use client";

import { cn } from "@/lib/utils";
import { useCallback, useRef, useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export type CategoryTabItem = {
  label: string;
  value: string;
  id?: number;
  count?: number;
};

interface ApiCategory {
  id: number;
  name: string;
  slug?: string;
  children?: ApiCategory[];
  parent_id?: number | null;
  parent_slug?: string | null;
  type?: string;
}

/** Turn a category name into a URL-friendly slug */
export function slugifyCategory(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export interface ScrollableCategoryTabsProps {
  categories?: CategoryTabItem[];
  mainCategorySlug?: string;
  context?: "discover" | "businesses" | "events" | "communities";
  /**
   * Active country filter (proper-cased, e.g. "Ghana").
   * Empty string or omitted = the backend resolves geo from the forwarded client IP.
   */
  country?: string;
  value?: string;
  defaultValue?: string;
  className?: string;
  containerClassName?: string;
  onChange?: (value: string) => void;
  /** Fires with both the slug and the numeric category id (null for "all"). */
  onCategoryChange?: (slug: string, id: number | null) => void;
}

const EMPTY_CATEGORIES: CategoryTabItem[] = [];

export default function ScrollableCategoryTabs({
  categories = EMPTY_CATEGORIES,
  mainCategorySlug,
  context,
  country,
  value: controlledValue,
  defaultValue = "all",
  className,
  containerClassName,
  onChange,
  onCategoryChange,
}: ScrollableCategoryTabsProps) {
  const [displayCategories, setDisplayCategories] = useState<CategoryTabItem[]>(
    [],
  );
  const [internalValue, setInternalValue] = useState<string>(defaultValue);
  const [isLoading, setIsLoading] = useState(false);

  // Controlled mode: parent owns the value. Uncontrolled: internal state.
  const isControlled = controlledValue !== undefined;
  const activeValue = isControlled ? controlledValue : internalValue;

  const prevMainCategorySlug = useRef<string | undefined>(undefined);
  const prevContext = useRef<string | undefined>(undefined);
  const prevCountry = useRef<string>("");
  const prevCategoriesJson = useRef<string>("[]");

  useEffect(() => {
    if (categories.length > 0) {
      const json = JSON.stringify(categories);
      if (json !== prevCategoriesJson.current) {
        setDisplayCategories(categories);
        prevCategoriesJson.current = json;
      }
      return;
    }

    const endpointByContext: Record<string, string> = {
      businesses: "/api/business_categories",
      events: "/api/event_categories",
      communities: "/api/community_categories",
    };

    const allLabelByContext: Record<string, string> = {
      businesses: "All Business",
      events: "All Events",
      communities: "All Communities",
    };

    if (context && endpointByContext[context]) {
      const activeCountry = country ?? "";
      if (context === prevContext.current && activeCountry === prevCountry.current) return;

      const fetchContextCategories = async () => {
        setIsLoading(true);
        try {
          const url = activeCountry
            ? `${endpointByContext[context]}?country=${encodeURIComponent(activeCountry)}`
            : endpointByContext[context];
          const response = await fetch(url, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            cache: "no-store",
          });

          if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
          }

          const json = await response.json();
          const list: ApiCategory[] = Array.isArray(json)
            ? json
            : Array.isArray(json?.data)
              ? json.data
              : [];

          // Pills show only top-level (parent) categories.
          // parent_slug is null for root categories, set for subcategories.
          const parentCategories = list.filter((cat) => !cat.parent_slug);

          const seen = new Set<string>();
          const tabs: CategoryTabItem[] = [
            { label: allLabelByContext[context], value: "all" },
          ];

          parentCategories.forEach((cat) => {
            const name = cat?.name?.toString().trim();
            if (!name) return;
            const value =
              cat.slug?.toString().trim() ||
              (cat.id !== undefined ? String(cat.id) : "") ||
              slugifyCategory(name);
            if (seen.has(value)) return;
            seen.add(value);
            tabs.push({ label: name, value, id: cat.id });
          });

          setDisplayCategories(tabs);
          prevContext.current = context;
          prevCountry.current = activeCountry;
        } catch (error) {
          console.error("Fetch Failure:", error);
          setDisplayCategories([{ label: allLabelByContext[context], value: "all" }]);
        } finally {
          setIsLoading(false);
        }
      };

      fetchContextCategories();
      return;
    }

    if (!mainCategorySlug || mainCategorySlug === prevMainCategorySlug.current) {
      return;
    }

    const fetchSubCategories = async () => {
      setIsLoading(true);
      try {
        const API_URL =
          process.env.NEXT_PUBLIC_API_URL || "https://me-fie.co.uk";
        const response = await fetch(`${API_URL}/api/categories`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        });

        if (!response.ok)
          throw new Error(`Server returned ${response.status}`);

        const json = await response.json();
        const data: ApiCategory[] = Array.isArray(json)
          ? json
          : json.data || [];

        // Helper to get a stable value for a category
        const catValue = (cat: ApiCategory) =>
          cat.slug || slugifyCategory(cat.name);

        // Separate parents and build children map from parent_id
        const parents = data.filter((cat) => !cat.parent_id);
        const childrenByParent: Record<number, ApiCategory[]> = {};
        data.forEach((cat) => {
          if (cat.parent_id) {
            if (!childrenByParent[cat.parent_id])
              childrenByParent[cat.parent_id] = [];
            childrenByParent[cat.parent_id].push(cat);
          }
        });

        // Try to match mainCategorySlug to a parent category
        const mainCat = parents.find(
          (cat) =>
            cat.slug === mainCategorySlug ||
            slugifyCategory(cat.name) === mainCategorySlug,
        );

        const contextLabel =
          mainCategorySlug.charAt(0).toUpperCase() +
          mainCategorySlug.slice(1).replace(/-/g, " ");

        if (mainCat) {
          const children =
            mainCat.children ?? childrenByParent[mainCat.id] ?? [];
          if (children.length > 0) {
            const tabs: CategoryTabItem[] = [
              { label: `All ${mainCat.name}`, value: "all" },
              ...children.map((child) => ({
                label: child.name,
                value: catValue(child),
              })),
            ];
            setDisplayCategories(tabs);
          } else {
            setDisplayCategories([
              { label: `All ${mainCat.name}`, value: "all" },
            ]);
          }
        } else {
          // No matching parent — show all parent categories as tabs
          const tabs = parents.map((cat) => ({
            label: cat.name,
            value: catValue(cat),
          }));
          setDisplayCategories([
            { label: `All ${contextLabel}`, value: "all" },
            ...tabs,
          ]);
        }

        prevMainCategorySlug.current = mainCategorySlug;
      } catch (error) {
        console.error("Fetch Failure:", error);
        setDisplayCategories([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubCategories();
  }, [mainCategorySlug, categories, context, country]);

  const select = useCallback(
    (next: string) => {
      if (!isControlled) {
        setInternalValue(next);
      }
      if (onChange) onChange(next);
      if (onCategoryChange) {
        const found = displayCategories.find((c) => c.value === next);
        onCategoryChange(next, found?.id ?? null);
      }
    },
    [onChange, onCategoryChange, isControlled, displayCategories],
  );

  if (isLoading && displayCategories.length === 0) {
    return (
      <div className={cn("w-full", className)}>
        <div
          className={cn(
            "relative mt-1 pt-4 mx-auto px-6 lg:px-16",
            containerClassName,
          )}
        >
          <div className="flex w-full gap-2 overflow-x-auto h-12">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-9 w-24 rounded-full shrink-0" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      <div
        className={cn(
          "relative mt-1 pt-4 mx-auto px-6 lg:px-16",
          containerClassName,
        )}
      >
        <div
          className="flex w-full gap-2 overflow-x-auto whitespace-nowrap scrollbar-hide items-center h-12 no-scrollbar"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {displayCategories.map((cat) => {
            const isSelected = activeValue === cat.value;
            return (
              <button
                key={cat.value}
                type="button"
                onClick={() => select(cat.value)}
                style={{
                  backgroundColor: isSelected ? "#9ACC23" : "#ffffff",
                  color: isSelected ? "#ffffff" : "#374151",
                  borderColor: isSelected ? "#9ACC23" : "#f3f4f6",
                }}
                className={cn(
                  "rounded-full px-5 py-2 text-sm font-medium border transition-all shrink-0",
                  isSelected && "shadow-sm",
                )}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

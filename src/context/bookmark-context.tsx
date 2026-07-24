"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";

export type BookmarkItemType = "business" | "event" | "community";

interface BookmarkContextType {
  bookmarkedSlugs: string[];
  isLoading: boolean;
  toggleBookmark: (slug: string) => Promise<void>;
  deleteBookmarkById: (bookmarkId: string | number) => Promise<void>;
  isBookmarked: (slug: string) => boolean;
  refreshBookmarks: () => Promise<void>;
}

const BookmarkContext = createContext<BookmarkContextType | undefined>(
  undefined
);

export function BookmarkProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [bookmarkedSlugs, setBookmarkedSlugs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Helper to safely access Env Var on client
  const getApiUrl = () => process.env.NEXT_PUBLIC_API_URL || "https://me-fie.co.uk";

  // --- 1. Define refreshBookmarks FIRST (wrapped in useCallback) ---
  const refreshBookmarks = useCallback(async () => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${getApiUrl()}/api/my_bookmarks`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (response.ok) {
        const json = await response.json();
        // Handle various response structures (array of strings vs array of objects)
        // API returns { bookmarks: { data: [...] } } — fall through all known shapes
        const items = Array.isArray(json)
          ? json
          : json.bookmarks?.data || json.data || json.bookmarks || [];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const slugs = items.map((item: any) => {
          // If the API returns objects, try to find the slug property
          if (typeof item === "object" && item !== null) {
            // Prioritize getting the actual slug from the listing object
            if (item.listing && item.listing.slug) {
              return item.listing.slug;
            }
            return item.slug || item.listing_slug || String(item.id);
          }
          // If it's just a string/number, return as string
          return String(item);
        });

        setBookmarkedSlugs(slugs);
      }
    } catch (error) {
      console.error("Failed to sync bookmarks", error);
    } finally {
      setIsLoading(false);
    }
  }, []); // Empty dependency array ensures this doesn't trigger unnecessary re-renders

  // --- 2. Call useEffect SECOND ---
  // Deliberately gated on AuthProvider's own resolved isAuthenticated state
  // (not an independent localStorage read) — firing this in parallel with
  // AuthProvider's own token validation raced two authenticated requests
  // against a possibly-stale token, and the global 401 interceptor could
  // then redirect to login well after the user had already navigated to a
  // public listing page, making an expired session look like a bug in the
  // listing page itself.
  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      setBookmarkedSlugs([]);
      setIsLoading(false);
      return;
    }

    refreshBookmarks();
  }, [authLoading, isAuthenticated, refreshBookmarks]);

  // --- Toggle Bookmark ---
  const toggleBookmark = async (slugOrId: string) => {
    const token = localStorage.getItem("authToken");

    if (!token) {
      toast.error("Authentication required", {
        description: "Please login to bookmark items",
      });
      return;
    }

    // IMPORTANT: Check if what we have is actually a numeric ID
    // If it is, we need to fetch the actual slug first
    let actualSlug = slugOrId;
    
    // Check if it's a numeric ID (not just a string that can be converted to number)
    if (!isNaN(Number(slugOrId)) && slugOrId === String(Number(slugOrId))) {
      // It's a numeric ID, not a slug (e.g., "6", not "cafe-downtown")
      console.warn(`Received numeric ID (${slugOrId}), attempting to fetch slug...`);
      
      try {
        // First, fetch the listing details to get the slug
        const listingResponse = await fetch(
          `${getApiUrl()}/api/listings/${slugOrId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          }
        );
        
        if (listingResponse.ok) {
          const listingData = await listingResponse.json();
          // Try to get slug from various possible response structures
          actualSlug = listingData.slug || listingData.data?.slug || slugOrId;
          console.log(`Converted ID ${slugOrId} to slug: ${actualSlug}`);
        } else {
          console.warn(`Could not fetch listing for ID ${slugOrId}, using ID as fallback`);
        }
      } catch (error) {
        console.error("Failed to fetch listing details", error);
      }
    }

    // Optimistic Update
    const isCurrentlyBookmarked = bookmarkedSlugs.includes(actualSlug);
    setBookmarkedSlugs((prev) =>
      isCurrentlyBookmarked 
        ? prev.filter((s) => s !== actualSlug) 
        : [...prev, actualSlug]
    );

    try {
      // API: POST /api/listings/{slug}/bookmark/toggle
      const response = await fetch(
        `${getApiUrl()}/api/listings/${actualSlug}/bookmark/toggle`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({}),
        }
      );

      if (!response.ok) {
        // If 404, it means the Slug was invalid or not found
        if (response.status === 404) {
          throw new Error(
            `Listing not found. Received: "${slugOrId}", Used: "${actualSlug}". Please ensure you're using the correct slug.`
          );
        }
        throw new Error(`Failed to toggle bookmark: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      toast.success(
        result.message ||
          (isCurrentlyBookmarked
            ? "Removed from bookmarks"
            : "Added to bookmarks")
      );
      
      // Refresh bookmarks to ensure sync with server
      refreshBookmarks();
    } catch (error) {
      // Revert optimistic update
      setBookmarkedSlugs((prev) =>
        isCurrentlyBookmarked 
          ? [...prev, actualSlug] 
          : prev.filter((s) => s !== actualSlug)
      );
      console.error("Toggle bookmark error:", error);
      toast.error(
        error instanceof Error ? error.message : "Could not update bookmark"
      );
    }
  };

  const deleteBookmarkById = async (bookmarkId: string | number) => {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    try {
      const response = await fetch(
        `${getApiUrl()}/api/bookmark/${bookmarkId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) throw new Error("Failed to delete bookmark");

      toast.success("Bookmark removed");
      refreshBookmarks();
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete bookmark");
    }
  };

  const isBookmarked = (slug: string) => bookmarkedSlugs.includes(slug);

  return (
    <BookmarkContext.Provider
      value={{
        bookmarkedSlugs,
        isLoading,
        toggleBookmark,
        deleteBookmarkById,
        isBookmarked,
        refreshBookmarks,
      }}
    >
      {children}
    </BookmarkContext.Provider>
  );
}

export const useBookmark = () => {
  const context = useContext(BookmarkContext);
  if (context === undefined) {
    throw new Error("useBookmark must be used within a BookmarkProvider");
  }
  return context;
};
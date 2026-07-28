/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight, Heart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Image from "next/image";
import { useAuth } from "@/context/auth-context";
import { useBookmark } from "@/context/bookmark-context";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { InviteFriendModal } from "@/components/dashboard/invite-friend-modal";
import { BusinessCard } from "@/components/business-card";
import type { Business } from "@/components/business-card";
import { EventCard } from "@/components/event-card";
import type { Event } from "@/components/event-card";
import CommunityCard from "@/components/communities/community-card";
import type { CommunityCard as CommunityCardType } from "@/lib/data";

// --- API shape ---
interface ApiImage {
  id?: number;
  original?: string;
  thumb?: string;
  webp?: string;
  mime_type?: string;
}

interface ApiRawItem {
  id: number | string;
  slug?: string;
  title?: string;
  name?: string;
  type?: string;
  category?: { name: string } | string;
  categories?: { name: string }[];
  images?: (ApiImage | string)[];
  image?: string;
  cover_image?: string;
  location?: string;
  address?: string;
  city?: string;
  country?: string;
  is_verified?: boolean;
  description?: string;
  bio?: string;
  start_date?: string;
  end_date?: string;
  average_rating?: number | string;
  rating?: number | string;
  ratings_count?: number | string;
  reviews_count?: number | string;
  listing_verified?: number | boolean;
  // Images are returned in a `media` array, each with `original_url`
  media?: { original_url?: string; preview_url?: string; mime_type?: string }[];
  // Nested event object (present on event-type listings)
  event?: {
    event_start_date?: string;
    event_end_date?: string;
    event_city?: string;
    event_country?: string;
    event_location?: string;
    event_venue?: string;
  };
}

// --- Mapped union type for dispatch ---
type MappedItem =
  | { type: "business"; slug: string; data: Business }
  | { type: "event"; slug: string; data: Event }
  | { type: "community"; slug: string; data: CommunityCardType & { image?: string } };

// --- Image helper ---
const resolveImageUrl = (url: string | undefined | null): string => {
  if (!url) return "/images/no-image.jpg";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://me-fie.co.uk";
  return `${API_URL}/${url.replace(/^\//, "")}`;
};

const extractImage = (item: ApiRawItem): string => {
  // Primary source: media[].original_url (Spatie MediaLibrary format from API)
  if (Array.isArray(item.media) && item.media.length > 0) {
    const first = item.media[0];
    if (first?.original_url) return resolveImageUrl(first.original_url);
  }
  // Fallback: legacy images[] array
  const rawImages = Array.isArray(item.images) ? item.images : [];
  for (const img of rawImages) {
    if (typeof img === "string" && img) return resolveImageUrl(img);
    if (img && typeof img === "object") {
      const path = (img as ApiImage).original || (img as ApiImage).webp || (img as ApiImage).thumb;
      if (path) return resolveImageUrl(path);
    }
  }
  if (item.image) return resolveImageUrl(item.image);
  if (item.cover_image) return resolveImageUrl(item.cover_image);
  return "/images/no-image.jpg";
};

const extractCategory = (item: ApiRawItem): string => {
  if (Array.isArray(item.categories) && item.categories.length > 0) {
    return item.categories[0].name;
  }
  if (item.category && typeof item.category === "object" && "name" in item.category) {
    return (item.category as any).name;
  }
  if (typeof item.category === "string" && item.category) return item.category;
  // Bookmark API doesn't include categories — fall back to listing type
  if (item.type) return item.type.charAt(0).toUpperCase() + item.type.slice(1);
  return "General";
};

const extractLocation = (item: ApiRawItem): string => {
  const parts = [item.city, item.country].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : item.location || item.address || "Online";
};

// --- Map raw API item to typed card data ---
// Items in json.bookmarks.data ARE the listings directly (no wrapper object).
const mapToCard = (item: ApiRawItem): MappedItem => {
  const slug = item.slug || String(item.id);
  const name = item.name || item.title || "Untitled";
  const category = extractCategory(item);
  const image = extractImage(item);
  const location = extractLocation(item);
  // API uses listing_verified (1/0) not is_verified
  const verified = !!(item.listing_verified || (item as any).is_verified);

  if (item.type === "event") {
    const eventLocation =
      item.event?.event_location ||
      item.event?.event_venue ||
      [item.event?.event_city, item.event?.event_country].filter(Boolean).join(", ") ||
      location;
    const data: Event = {
      id: String(item.id),
      name,
      category,
      image,
      location: eventLocation,
      description: item.bio || item.description || "",
      slug,
      startDate: item.event?.event_start_date || item.start_date || "",
      endDate: item.event?.event_end_date || item.end_date || "",
      verified,
    };
    return { type: "event" as const, slug, data };
  }

  if (item.type === "community") {
    const data: CommunityCardType & { image?: string } = {
      id: String(item.id),
      slug,
      name,
      description: item.bio || item.description || "",
      imageUrl: image,
      image,
      tag: category,
      verified,
      type: "community",
      location,
    };
    return { type: "community" as const, slug, data };
  }

  // Default: business
  const data: Business = {
    id: String(item.id),
    slug,
    name,
    category,
    images: [image],
    rating: Number(item.average_rating || item.rating) || 0,
    reviewCount: (item.ratings_count ?? item.reviews_count ?? 0) as string | number,
    location,
    verified,
  };
  return { type: "business" as const, slug, data };
};

// --- Card dispatcher ---
function ListingCard({ item }: { item: MappedItem }) {
  if (item.type === "event") return <EventCard event={item.data} />;
  if (item.type === "community") return <CommunityCard community={item.data} />;
  return <BusinessCard business={item.data} />;
}

// --- Main Component ---
export default function Bookmarks() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { bookmarkedSlugs, isLoading: contextLoading } = useBookmark();
  const [allItems, setAllItems] = useState<MappedItem[]>([]);
  const [isJoiningVendor] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  useEffect(() => {
    const fetchBookmarks = async () => {
      if (authLoading) return;

      const token = localStorage.getItem("authToken");
      if (!user || !token) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://me-fie.co.uk";
        const response = await fetch(`${API_URL}/api/my_bookmarks`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });

        if (!response.ok) throw new Error("Failed to fetch bookmarks");

        const json = await response.json();

        let rawData: ApiRawItem[] = [];
        if (json.bookmarks && Array.isArray(json.bookmarks.data)) {
          rawData = json.bookmarks.data;
        } else if (Array.isArray(json.data)) {
          rawData = json.data;
        } else if (Array.isArray(json.bookmarks)) {
          rawData = json.bookmarks;
        } else if (Array.isArray(json)) {
          rawData = json;
        }

        setAllItems(rawData.map(mapToCard));
      } catch (e) {
        console.error("Error fetching bookmarks:", e);
        setAllItems([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookmarks();
  }, [user, authLoading]);

  // Show all fetched items while context is still loading to avoid a false empty state.
  // Once context loads, filter out items the user has since unbookmarked via the card button.
  const bookmarks = useMemo(() => {
    if (contextLoading) return allItems;
    if (bookmarkedSlugs.length === 0) return allItems; // context loaded but empty → trust page fetch
    return allItems.filter((item) => bookmarkedSlugs.includes(item.slug));
  }, [allItems, bookmarkedSlugs, contextLoading]);

  const totalItems = bookmarks.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = bookmarks.slice(startIndex, startIndex + itemsPerPage);

  const handleClickEvent = () => {
    if (user) {
      router.push("/claim");
    } else {
      router.push("/auth/login?redirect=/claim");
    }
  };

  return (
    <div className="px-1 lg:px-8 py-6 space-y-8 pb-20">
      <div className="space-y-5 mt-4 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#C9D9E8] rounded-xl p-8 flex flex-col justify-between min-h-[200px]">
            <div className="space-y-2 max-w-sm">
              <h4 className="text-lg font-semibold text-gray-900">
                Grow your business with Mefie
              </h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                Showcase your products, connect with customers, and expand your
                business in a thriving digital marketplace.
              </p>
            </div>
            <button
              onClick={handleClickEvent}
              disabled={isJoiningVendor}
              className="bg-white rounded-lg py-2 px-3 text-gray-900 hover:bg-gray-50 w-fit mt-10 border border-gray-200 shadow-sm cursor-pointer flex items-center gap-2"
            >
              {isJoiningVendor && <Loader2 className="h-4 w-4 animate-spin" />}
              {isJoiningVendor ? "Joining..." : "Join as a vendor"}
            </button>
          </div>

          <div className="bg-[#275782] rounded-xl p-8 flex flex-col justify-between min-h-[200px] relative overflow-hidden">
            <div className="relative z-10 space-y-2 max-w-sm">
              <h4 className="text-lg font-semibold text-white">
                Invite a friend and help them discover Mefie and both of you get
                a reward.
              </h4>
            </div>
            <div className="absolute right-0 bottom-0 opacity-20 md:opacity-100">
              <Image
                src="/images/backgroundImages/present.svg"
                alt="Gift Box"
                width={220}
                height={220}
                className="object-contain"
              />
            </div>
            <button
              onClick={() => setInviteOpen(true)}
              className="bg-white rounded-lg py-2 px-3 text-gray-900 hover:bg-gray-50 w-fit mt-10 border border-gray-200 shadow-sm cursor-pointer"
            >
              Invite a friend
            </button>
          </div>
        </div>
      </div>

      <InviteFriendModal open={inviteOpen} onOpenChange={setInviteOpen} />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bookmarks</h1>
          <p className="text-gray-500 mt-1">
            All your saved bookmarks are lodged here!
          </p>
        </div>
      </div>

      {/* Sort */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">My Collection</h2>
            <p className="text-gray-500 text-sm mt-1">
              This has been grouped based on your picks
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select defaultValue="newest">
              <SelectTrigger className="w-52 bg-white">
                <span className="text-gray-500 mr-2">Sort by</span>
                <SelectValue placeholder="Newest" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest Saved</SelectItem>
                <SelectItem value="oldest">Oldest Saved</SelectItem>
                <SelectItem value="rating">A-Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Cards grid */}
      {isLoading || contextLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-[380px] bg-gray-100 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentItems.length > 0 ? (
            currentItems.map((item) => (
              <ListingCard key={item.slug} item={item} />
            ))
          ) : (
            <div className="col-span-full py-20 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <div className="flex flex-col items-center justify-center">
                <Heart className="w-12 h-12 text-gray-300 mb-3" />
                <h3 className="text-lg font-medium text-gray-900">
                  No bookmarks yet
                </h3>
                <p className="text-gray-500">
                  Items you bookmark will appear here.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && !contextLoading && bookmarks.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between pt-8 gap-4 border-t border-gray-100 mt-4">
          <p className="text-sm text-gray-500">
            Showing{" "}
            <span className="font-semibold text-gray-900">
              {startIndex + 1}–{Math.min(startIndex + itemsPerPage, totalItems)}
            </span>{" "}
            from <span className="font-bold text-gray-900">{totalItems}</span>{" "}
            data
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full h-10 w-10 border-gray-200 hover:bg-gray-50"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="flex gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  className={cn(
                    "rounded-full h-10 w-10 p-0 font-medium",
                    currentPage === page
                      ? "bg-[#93C01F] hover:bg-[#82ab1b] text-white"
                      : "bg-transparent text-gray-700 hover:bg-gray-100",
                  )}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full h-10 w-10 border-gray-200 hover:bg-gray-50"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

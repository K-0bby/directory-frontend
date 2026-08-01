/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import {
  Bookmark,
  TrendingDown,
  TrendingUp,
  Mail,
  Calendar,
  MapPin,
  Star,
} from "lucide-react";
import StatCard from "@/components/dashboard/stat-cards";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { InviteFriendModal } from "@/components/dashboard/invite-friend-modal";
import { ListingCoverMedia } from "@/components/directory/listing-cover-media";

// --- Types ---
interface ListingItem {
  id: string;
  title: string;
  type: "event" | "business" | "community";
  category: string;
  image: string;
  location: string;
  verified: boolean;
  description?: string;
  date?: string;
  rating?: number;
  reviews?: string;
  slug?: string;
}

interface ApiImage {
  id?: number;
  media: string;
  media_type?: string;
  card?: string;
  webp?: string;
  original?: string;
}

interface ApiRawItem {
  id: number | string;
  slug: string;
  title?: string;
  name?: string;
  type?: string;
  category?: { name: string } | string;
  categories?: { name: string }[]; // Array support
  images?: (ApiImage | string)[];
  /** Explicit cover image, when the vendor has set one — authoritative over `images[0]`. */
  cover?: ApiImage | null;
  image?: string;
  primary_image?: string;
  cover_image?: string;
  location?: string;
  listing_verified?: boolean;
  is_verified?: boolean;
  description?: string;
  bio?: string;
  start_date?: string;
  rating?: number | string;
  reviews_count?: number | string;
}

// --- 1. ROBUST IMAGE HELPER ---
const getImageUrl = (url: string | undefined | null): string => {
  if (!url) return "/images/no-image.jpg";
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://me-fie.co.uk";
  return `${API_URL}/${url.replace(/^\//, "")}`;
};

// --- 2. LISTING CARD (Updated Design) ---
const ListingCard = ({ item }: { item: ListingItem }) => {
  const linkPath =
    item.type === "event"
      ? `/events/${item.slug || item.id}`
      : item.type === "community"
      ? `/communities/${item.slug || item.id}`
      : `/discover/${item.slug || item.id}`;

  return (
    <Link
      href={linkPath}
      className="group bg-white rounded-2xl overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border border-gray-100 h-full flex flex-col"
    >
      {/* Image Container */}
      <div className="relative w-full aspect-4/3 overflow-hidden bg-gray-100">
        <ListingCoverMedia
          src={item.image}
          alt={item.title}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />

        {/* Dark Gradient Overlay */}
        <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/20 to-transparent opacity-80" />

        {/* Bottom: Name & Badge */}
        <div className="absolute bottom-0 left-0 right-0 p-4 z-20 flex flex-col justify-end">
          <div className="flex justify-between items-end gap-2 w-full">
            {/* Title Section */}
            <div className="flex flex-col gap-1 min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-lg text-white line-clamp-1">
                  {item.title}
                </h3>
                {item.verified && (
                  <Image
                    src="/images/icons/verify.svg"
                    alt="Verified"
                    width={16}
                    height={16}
                    className="shrink-0"
                  />
                )}
              </div>
            </div>

            {/* Badge Section */}
            <Badge className="shrink-0 bg-white/90 text-gray-900 hover:bg-white border-0 px-2.5 py-1 text-xs font-medium">
              {item.category}
            </Badge>
          </div>
        </div>
      </div>

      {/* Content Body */}
      <div className="p-4 flex flex-col flex-1">
        {/* Description */}
        {item.description ? (
          <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">
            {item.description}
          </p>
        ) : (
          <p className="text-sm text-gray-400 italic">
            No description available
          </p>
        )}

        <div className="mt-auto pt-3 flex flex-col">
          {/* Rating Row */}
          <div className="flex items-center gap-1.5">
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={cn(
                    "w-3.5 h-3.5",
                    i < Math.floor(item.rating || 0)
                      ? "fill-yellow-400 text-yellow-400"
                      : "fill-gray-100 text-gray-200"
                  )}
                />
              ))}
            </div>
            <span className="text-xs font-medium text-gray-700">
              {item.rating?.toFixed(1)}
            </span>
            <span className="text-xs text-gray-400">({item.reviews})</span>
          </div>

          {/* Location & Date Row */}
          <div className="flex items-center justify-between text-xs text-gray-500 border-t border-gray-50 pt-3 mt-1">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-gray-400" />
              <span className="line-clamp-1 max-w-[140px]">
                {item.location}
              </span>
            </div>

            {item.date && (
              <div className="flex items-center gap-1.5 text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
                <Calendar className="w-3.5 h-3.5" />
                <span className="font-medium">{item.date}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};

// --- Skeleton ---
const CardSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {[1, 2, 3].map((i) => (
      <div
        key={i}
        className="h-[380px] bg-gray-100 animate-pulse rounded-2xl border border-gray-200"
      />
    ))}
  </div>
);

export default function CustomerHome() {
  const { user } = useAuth();
  const router = useRouter();

  const [bookmarks, setBookmarks] = useState<ListingItem[]>([]);
  const [eventsNearMe, setEventsNearMe] = useState<ListingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem("authToken");
        if (!token) return;

        const API_URL =
          process.env.NEXT_PUBLIC_API_URL || "https://me-fie.co.uk";

        const [bookmarksRes, eventsRes] = await Promise.all([
          fetch(`${API_URL}/api/my_bookmarks`, {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          }),
          fetch(`${API_URL}/api/events/recommended`, {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          }),
        ]);

        if (bookmarksRes.ok) {
          const json = await bookmarksRes.json();
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

          const mappedBookmarks: ListingItem[] = rawData.map((item) => {
            let validParamsType: "business" | "event" | "community" =
              "business";
            const typeStr = item.type?.toLowerCase();
            if (typeStr === "event" || typeStr === "community") {
              validParamsType = typeStr;
            }

            // --- CATEGORY FIX (Prioritize Array) ---
            let categoryName = "General";
            if (Array.isArray(item.categories) && item.categories.length > 0) {
              categoryName = item.categories[0].name;
            } else if (
              item.category &&
              typeof item.category === "object" &&
              "name" in item.category
            ) {
              categoryName = (item.category as any).name;
            } else if (typeof item.category === "string") {
              categoryName = item.category;
            }

            // --- DESCRIPTION FIX ---
            const descriptionText = item.description || item.bio || "";

            // --- IMAGE FIX ---
            const rawImages = Array.isArray(item.images) ? item.images : [];
            const validImages = rawImages
              .filter((img: any) => {
                if (typeof img === "string") return true;
                return !!(img && typeof img === "object" && img.original);
              })
              .map((img: any) => {
                const mediaPath =
                  typeof img === "string"
                    ? img
                    : img.card || img.webp || img.original || img.media;
                return getImageUrl(mediaPath);
              });

            if (validImages.length === 0) {
              if (item.image) validImages.push(getImageUrl(item.image));
              else if (item.cover_image)
                validImages.push(getImageUrl(item.cover_image));
            }

            // The explicit cover always wins over whichever image happens to
            // be first in `images` — keeps this widget in sync with what
            // every other page shows for the same listing.
            const explicitCover =
              item.cover?.card ||
              item.cover?.webp ||
              item.cover?.original ||
              item.primary_image;
            const finalImage = explicitCover
              ? getImageUrl(explicitCover)
              : validImages.length > 0
                ? validImages[0]
                : "/images/no-image.jpg";

            return {
              id: item.id.toString(),
              slug: item.slug || item.id.toString(),
              title: item.title || item.name || "Untitled",
              type: validParamsType,
              category: categoryName,
              image: finalImage,
              location: item.location || "Online",
              verified: !!(item.listing_verified ?? item.is_verified),
              description: descriptionText,
              date: item.start_date
                ? `${new Date(item.start_date).toLocaleDateString()}`
                : undefined,
              rating: Number(item.rating) || 0,
              reviews: item.reviews_count ? String(item.reviews_count) : "0",
            };
          });
          setBookmarks(mappedBookmarks);
        }

        if (eventsRes.ok) {
          const json = await eventsRes.json();
          const rawData: ApiRawItem[] = json.data || [];

          const mappedEvents: ListingItem[] = rawData.map((item) => {
            let categoryName = "Event";
            // Same Category Logic for Events
            if (Array.isArray(item.categories) && item.categories.length > 0) {
              categoryName = item.categories[0].name;
            } else if (
              item.category &&
              typeof item.category === "object" &&
              "name" in item.category
            ) {
              categoryName = (item.category as any).name;
            } else if (typeof item.category === "string") {
              categoryName = item.category;
            }

            const rawImages = Array.isArray(item.images) ? item.images : [];
            const validImages = rawImages
              .filter((img: any) => {
                if (typeof img === "string") return true;
                return !!(img && typeof img === "object" && img.original);
              })
              .map((img: any) => {
                const mediaPath =
                  typeof img === "string"
                    ? img
                    : img.card || img.webp || img.original;
                return getImageUrl(mediaPath);
              });

            if (validImages.length === 0) {
              if (item.image) validImages.push(getImageUrl(item.image));
              else if (item.cover_image)
                validImages.push(getImageUrl(item.cover_image));
            }

            // The explicit cover always wins over whichever image happens to
            // be first in `images` — keeps this widget in sync with what
            // every other page shows for the same listing.
            const explicitCover =
              item.cover?.card ||
              item.cover?.webp ||
              item.cover?.original ||
              item.primary_image;
            const finalImage = explicitCover
              ? getImageUrl(explicitCover)
              : validImages.length > 0
                ? validImages[0]
                : "/images/no-image.jpg";

            return {
              id: item.id.toString(),
              slug: item.slug || item.id.toString(),
              title: item.title || item.name || "Untitled Event",
              type: "event",
              category: categoryName,
              image: finalImage,
              location: item.location || "TBD",
              verified: !!(item.listing_verified ?? item.is_verified),
              description: item.description || item.bio || "",
              date: item.start_date
                ? `${new Date(item.start_date).toLocaleDateString()}`
                : undefined,
            };
          });
          setEventsNearMe(mappedEvents);
        }
      } catch (error) {
        console.error("Failed to load dashboard data", error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  return (
    <div className="px-1 lg:px-8 py-3 space-y-8 pb-20">
      {/* Header Intro */}
      <div className="flex flex-col md:flex-row lg:items-center justify-between">
        <div className="mb-4">
          <h4 className="text-2xl font-semibold text-gray-900">
            Welcome back, {user?.name || "User"}!
          </h4>
          <p className="text-base text-gray-500">
            Here is what&apos;s happening with your listings
          </p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Bookmarks"
          icon={Bookmark}
          statValue={bookmarks.length}
          trend={5}
          trendIconUp={TrendingUp}
          trendIconDown={TrendingDown}
        />
        <StatCard
          title="Inquiries Received"
          icon={Mail}
          statValue={45}
          trend={18}
          trendIconUp={TrendingUp}
          trendIconDown={TrendingDown}
        />
        <StatCard
          title="Events"
          icon={Calendar}
          statValue={eventsNearMe.length}
          trend={-8}
          trendIconUp={TrendingUp}
          trendIconDown={TrendingDown}
        />
      </div>

      {/* Progress & Rewards Section */}
      <div className="space-y-5 mt-4">
        <h3 className="text-xl font-semibold text-gray-900">
          Progress & Rewards
        </h3>
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
            <Button
              onClick={() => router.push("/claim")}
              className="bg-white text-gray-900 hover:bg-gray-50 w-fit mt-10 border border-gray-200 shadow-sm"
            >
              Join as a vendor
            </Button>
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
            <Button
              className="bg-white text-gray-900 hover:bg-gray-100 w-fit mt-6 relative z-10"
              onClick={() => setInviteOpen(true)}
            >
              Invite a friend
            </Button>
          </div>
        </div>
      </div>

      <InviteFriendModal open={inviteOpen} onOpenChange={setInviteOpen} />

      {/* Saved Bookmarks Section */}
      <div className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">
              Saved Bookmarks
            </h3>
            <p className="text-base text-gray-500">
              All your favourite listings in one place
            </p>
          </div>
          <Link
            href="/dashboard/bookmarks"
            className="text-sm text-[#5F8B0A] hover:underline font-medium"
          >
            See more bookmarks
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <CardSkeleton />
          ) : bookmarks.length > 0 ? (
            bookmarks
              .slice(0, 3)
              .map((item) => <ListingCard key={item.id} item={item} />)
          ) : (
            <div className="col-span-full py-12 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <Bookmark className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <h3 className="text-gray-900 font-medium">No bookmarks yet</h3>
              <p className="text-gray-500 text-sm">
                Save listings to see them here.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Events Near Me Section */}
      <div className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">
              Events near me
            </h3>
            <p className="text-base text-gray-500">
              This has been grouped based on your picks
            </p>
          </div>
          <Link
            href="/events"
            className="text-sm text-[#5F8B0A] hover:underline font-medium"
          >
            Explore Events
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <CardSkeleton />
          ) : eventsNearMe.length > 0 ? (
            eventsNearMe.map((item) => (
              <ListingCard key={item.id} item={item} />
            ))
          ) : (
            <div className="col-span-full py-12 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <h3 className="text-gray-900 font-medium">
                No events found nearby
              </h3>
              <p className="text-gray-500 text-sm">
                Check back later for upcoming events.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

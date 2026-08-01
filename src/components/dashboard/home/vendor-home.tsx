/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Bookmark,
  TrendingDown,
  Eye,
  Loader2,
  Bell,
  TrendingUp,
  Mail,
  ChevronRight,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import StatCard from "@/components/dashboard/stat-cards";
import RecentActivityCard from "@/components/dashboard/recent-activity";
import { Chart } from "@/components/dashboard/bar-chart";
import { ListingsTable } from "@/components/dashboard/listing/listing-table";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { useRolePath } from "@/hooks/useRolePath";
import { toast } from "sonner";
import { processImages, resolveCoverUrl } from "@/lib/directory/image-utils";

interface ListingImage {
  id: number;
  original: string;
  thumb: string;
  webp: string;
  card?: string;
  mime_type?: string;
}

interface Category {
  id: number;
  name: string;
}

interface ApiListing {
  id?: number;
  name: string;
  slug: string;
  bio: string;
  address: string;
  country: string;
  city: string;
  status: string;
  creator_status?: string;
  type?: string;
  images: ListingImage[];
  /** Explicit cover image, when the vendor has set one — authoritative over `images[0]`. */
  cover?: ListingImage | null;
  primary_image?: string;
  cover_image?: string;
  categories: Category[];
  rating: number;
  ratings_count: number;
  views_count: number;
  bookmarks_count: number;
  listing_verified?: boolean;
  is_verified?: boolean;
}

interface ApiResponse {
  data: ApiListing[];
  meta?: unknown;
}

// Extended Table Item
interface ListingsTableItem {
  id: string;
  slug: string;
  name: string;
  image: string;
  allImages: string[];
  category: string;
  location: string;
  status: "published" | "pending" | "drafted" | "rejected" | "suspended" | "ended";
  type: string;
  verified: boolean;
  views: number;
  comments: number;
  bookmarks: number;
  rating: number;
  description?: string;
}

export default function VendorHome() {
  const router = useRouter();

  // const recentActivity = [
  //   {
  //     id: "1",
  //     initials: "AK",
  //     color: "bg-blue-500",
  //     title: "New Review Received",
  //     description:
  //       "@Ama K. left a review on Jollof Palace Restaurant: ‘Best Ghanaian food in Accra!’",
  //     timestamp: "Yesterday at 5:30 PM",
  //   },
  //   {
  //     id: "2",
  //     initials: "KW",
  //     color: "bg-orange-400",
  //     title: "New Inquiry Received",
  //     description:
  //       "@Kwame Mensah sent you a message about Event Catering Services",
  //     timestamp: "September 4, 2025 at 5:30 PM",
  //   },
  //   {
  //     id: "3",
  //     initials: "TF",
  //     color: "bg-purple-500",
  //     title: "Listing Published",
  //     description:
  //       "Your new listing Afro Hair Studio has been approved and is now live.",
  //     timestamp: "Today at 5:30 PM",
  //   },
  // ];

  const { user, loading: authLoading } = useAuth();
  const { listingDetail } = useRolePath();

  const [listings, setListings] = useState<ListingsTableItem[]>([]);
  const [loading, setLoading] = useState(true);

  // --- Aggregate Stats ---
  const [totalViews, setTotalViews] = useState<number | null>(null);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [totalBookmarks, setTotalBookmarks] = useState<number | null>(null);
  const [viewsChartData, setViewsChartData] = useState<Record<string, string | number>[] | null>(null);

  // --- Action States ---
  const [deleteListingId, setDeleteListingId] = useState<string | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchListings = useCallback(async () => {
    try {
      setLoading(true);

      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("Authentication required");

      const response = await fetch(`/api/listing/my_listings`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 401) throw new Error("Session expired");
        throw new Error("Failed to fetch listings");
      }

      const data: ApiResponse = await response.json();

      // Handle: { data: [...] }  OR  { data: { data: [...] } }  OR  { listings: [...] }
      let rawListings: ApiListing[] = [];
      if (Array.isArray(data?.data)) {
        rawListings = data.data;
      } else if (Array.isArray((data as any)?.data?.data)) {
        rawListings = (data as any).data.data;
      } else if (Array.isArray((data as any)?.listings)) {
        rawListings = (data as any).listings;
      }

      const transformedListings: ListingsTableItem[] = rawListings.map(
        (listing) => {
          // 1. Image Logic — the explicit cover always wins over whichever
          // image happens to be first in `images`, keeping this widget in
          // sync with what every other page shows for the same listing.
          const validImages = processImages(listing.images, [
            resolveCoverUrl(listing.cover),
            listing.primary_image,
            listing.cover_image,
          ]);
          const coverImage = validImages[0];

          const categoryText = listing.categories?.[0]?.name || "Uncategorized";
          const location =
            [listing.city, listing.country].filter(Boolean).join(", ") ||
            "Online";

          // 2. Status Mapping
          let status: "published" | "pending" | "drafted" | "rejected" | "suspended" | "ended" = "drafted";
          const backendStatus = (listing.creator_status || listing.status || "").toLowerCase();

          if (["published", "active", "approved"].includes(backendStatus)) {
            status = "published";
          } else if (backendStatus === "pending") {
            status = "pending";
          } else if (backendStatus === "in_review") {
            status = "pending";
          } else if (["rejected", "suspended", "ended"].includes(backendStatus)) {
            status = backendStatus as "rejected" | "suspended" | "ended";
          }

          // 3. Type Logic (FIXED)
          // We check 'listing.type' first.
          // If missing, we assume 'business' is the safe default, BUT we check categories first.
          let resolvedType = listing.type;

          if (!resolvedType && listing.categories?.length > 0) {
            // Try to find if a category matches a known type
            const catName = listing.categories[0].name.toLowerCase();
            if (["community", "event"].includes(catName)) {
              resolvedType = catName;
            }
          }

          return {
            id: listing.id?.toString() ?? listing.slug,
            slug: listing.slug,
            name: listing.name,
            image: coverImage,
            allImages: validImages,
            category: categoryText,
            location: location,
            status: status,
            type: resolvedType || "business",
            verified: !!(listing.listing_verified ?? listing.is_verified ?? false),
            views: listing.views_count || 0,
            comments: listing.ratings_count || 0,
            bookmarks: listing.bookmarks_count || 0,
            rating: Number(listing.rating) || 0,
            description: listing.bio,
          };
        },
      );

      setListings(transformedListings);

      // --- Compute aggregate stats ---
      const views = transformedListings.reduce((sum, l) => sum + l.views, 0);
      const bookmarks = transformedListings.reduce((sum, l) => sum + l.bookmarks, 0);
      const ratedListings = transformedListings.filter((l) => l.rating > 0);
      const avg =
        ratedListings.length > 0
          ? Math.round(
              (ratedListings.reduce((sum, l) => sum + l.rating, 0) /
                ratedListings.length) *
                10,
            ) / 10
          : 0;

      setTotalViews(views);
      setTotalBookmarks(bookmarks);
      setAvgRating(avg);

      // --- Fetch detailed views per listing for chart ---
      fetchListingViews(rawListings, token!);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load listings");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchListingViews = async (apiListings: ApiListing[], token: string) => {
    try {
      const viewsPromises = apiListings.map((listing) =>
        fetch(`/api/listing/${listing.slug}/views`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        })
          .then((res) => (res.ok ? res.json() : null))
          .catch(() => null),
      );

      const results = await Promise.all(viewsPromises);

      // Aggregate view data by month across all listings
      const monthlyMap: Record<string, { views: number; clicks: number }> = {};

      results.forEach((result) => {
        if (!result) return;
        const viewData = Array.isArray(result) ? result : result.data;
        if (!Array.isArray(viewData)) return;

        viewData.forEach((entry: { month?: string; date?: string; views?: number; clicks?: number }) => {
          const key = entry.month || entry.date || "Unknown";
          if (!monthlyMap[key]) monthlyMap[key] = { views: 0, clicks: 0 };
          monthlyMap[key].views += entry.views || 0;
          monthlyMap[key].clicks += entry.clicks || 0;
        });
      });

      const chartData = Object.entries(monthlyMap).map(([month, vals]) => ({
        month,
        views: vals.views,
        clicks: vals.clicks,
      }));

      if (chartData.length > 0) {
        setViewsChartData(chartData);
      }
    } catch (err) {
      console.error("Failed to fetch listing views:", err);
    }
  };

  useEffect(() => {
    if (!authLoading && user) fetchListings();
  }, [user, authLoading, fetchListings]);

  const handleEdit = (listing: ListingsTableItem) => {
    router.push(
      `/dashboard/my-listing/edit?type=${listing.type}&slug=${listing.slug}`,
    );
  };

  const handleDelete = async () => {
    if (!deleteListingId) return;
    setIsDeleting(true);

    try {
      const token = localStorage.getItem("authToken");
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://me-fie.co.uk";
      const listingToDelete = listings.find((l) => l.id === deleteListingId);

      if (!listingToDelete) {
        toast.error("Listing not found for deletion");
        return;
      }

      const identifier = listingToDelete.slug || listingToDelete.id;

      const res = await fetch(`${API_URL}/api/listing/${identifier}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Delete failed with status: ${res.status}`,
        );
      }

      toast.success("Listing deleted successfully");
      setListings((prev) => prev.filter((l) => l.id !== deleteListingId));
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete listing",
      );
    } finally {
      setIsDeleting(false);
      setDeleteListingId(null);
      setDeleteConfirmName("");
    }
  };
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#93C01F]" />
      </div>
    );
  }

  return (
    <div className="px-1 lg:px-8 py-3 space-y-6">
      {/* Header Intro */}
      <div className="flex flex-col md:flex-row lg:items-center justify-between">
        <div className="mb-4">
          <h4 className="text-2xl font-semibold ">
            Welcome back,{" "}
            <span className="capitalize">
              {/* Prioritize first_name, fallback to first part of full name */}
              {user?.first_name || user?.name?.split(" ")[0] || "User"}
            </span>
            !
          </h4>
          <p className="text-base font-normal">
            Here is what&apos;s happening with your listings
          </p>
        </div>
        {/* TEST TOAST BUTTONS - Remove after testing */}
        {/* <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => toast.success("Success message test", { description: "This is a success toast" })}
            className="cursor-pointer"
          >
            Test Success Toast
          </Button>
          <Button 
            variant="outline" 
            onClick={() => toast.error("Error message test", { description: "This is an error toast" })}
            className="cursor-pointer"
          >
            Test Error Toast
          </Button>
        </div> */}
        {/* END TEST TOAST BUTTONS */}
      </div>

      {/* Dashboard Content */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-3">
        {/* Stat cards */}
        <StatCard
          title="Total Views"
          icon={Eye}
          statValue={totalViews}
          trend={null}
          trendIconUp={TrendingUp}
          trendIconDown={TrendingDown}
        />

        <StatCard
          title="Inquiries Received"
          icon={Mail}
          statValue={null}
          trend={null}
          trendIconUp={TrendingUp}
          trendIconDown={TrendingDown}
        />
        <StatCard
          title="Average Rating"
          icon={Bell}
          statValue={avgRating}
          trend={null}
          trendIconUp={TrendingUp}
          trendIconDown={TrendingDown}
        />

        <StatCard
          title="Bookmarks"
          icon={Bookmark}
          statValue={totalBookmarks}
          trend={null}
          trendIconUp={TrendingUp}
          trendIconDown={TrendingDown}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <RecentActivityCard items={[]} />
        {/* Chart */}
        <div>
          <div className="w-full rounded-2xl border border-[#E3E8EF] bg-white p-6 shadow-xs">
            <h2 className="text-xl font-semibold text-[#0F1A2A] mb-10">
              Engagement breakdown
            </h2>
            <Chart
              type="bar"
              data={viewsChartData}
              xAxisKey="month"
              stacked
              dataKeys={[
                { key: "views", label: "Views", color: "#93C01F" },
                { key: "clicks", label: "Clicks", color: "#1F6FEB" },
              ]}
            />
          </div>
        </div>
      </div>

      {/* My listing */}
      <div>
        <div className="w-full rounded-2xl border border-[#E3E8EF] bg-white p-6 shadow-xs">
          <div className="flex justify-between">
            <h2 className="text-xl font-semibold text-[#0F1A2A] mb-10">
              My Listings
            </h2>
            <div className="text-sm pr-3 cursor-pointer">
              <Button
                variant="link"
                onClick={() => router.push("/dashboard/my-listing")}
                className="text-[#93C01F] cursor-pointer hover:no-underline"
              >
                View all{" "}
                <span>
                  <ChevronRight className="w-4 h-4" />
                </span>
              </Button>
            </div>
          </div>

          {/* Table */}
          {listings.length > 0 ? (
            <ListingsTable
              listings={listings}
              showPagination={true}
              itemsPerPage={4}
              onViewClick={(listing) => router.push(listingDetail(listing.slug))}
              onEditClick={handleEdit}
              onDeleteClick={(id: string) => setDeleteListingId(id)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-xl bg-gray-50">
              <p className="text-gray-500">No listings yet</p>
            </div>
          )}
        </div>
      </div>

      <AlertDialog
        open={!!deleteListingId}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteListingId(null);
            setDeleteConfirmName("");
          }
        }}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold">
              Delete listing
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 text-sm text-gray-500">
                <p>
                  This will permanently delete{" "}
                  <span className="font-semibold text-gray-900">
                    {listings.find((l) => l.id === deleteListingId)?.name}
                  </span>
                  . This action{" "}
                  <span className="font-semibold text-gray-900">
                    cannot be undone
                  </span>
                  .
                </p>
                <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-red-700 text-xs leading-relaxed">
                  All associated data — images, services, reviews, and
                  stats — will be permanently removed.
                </div>
                <div className="space-y-1.5">
                  <p>
                    To confirm, type{" "}
                    <span className="font-semibold text-gray-900 font-mono">
                      {listings.find((l) => l.id === deleteListingId)?.name}
                    </span>{" "}
                    below:
                  </p>
                  <Input
                    value={deleteConfirmName}
                    onChange={(e) => setDeleteConfirmName(e.target.value)}
                    placeholder="Enter listing name"
                    className="h-9 text-sm"
                    onKeyDown={(e) => {
                      if (
                        e.key === "Enter" &&
                        deleteConfirmName ===
                          listings.find((l) => l.id === deleteListingId)?.name
                      ) {
                        handleDelete();
                      }
                    }}
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={
                isDeleting ||
                deleteConfirmName !==
                  listings.find((l) => l.id === deleteListingId)?.name
              }
              className="bg-red-600 hover:bg-red-700 disabled:opacity-40"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

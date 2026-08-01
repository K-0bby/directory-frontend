"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, SpinnerGap } from "@phosphor-icons/react";

import { ListingsTable } from "@/components/dashboard/listing/listing-table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useAuth } from "@/context/auth-context";
import { toast } from "sonner";
import { useRolePath } from "@/hooks/useRolePath";
import { Input } from "@/components/ui/input";
import { processImages, resolveCoverUrl } from "@/lib/directory/image-utils";

// --- Interfaces ---

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
  slug?: string;
  type?: "mainCategory" | "subCategory" | "tag";
  parent_name?: string | null;
  parent_slug?: string | null;
}

interface ApiListing {
  id?: number;
  name: string;
  slug: string;
  bio: string;
  address: string;
  country: string;
  city: string;
  event_country?: string | null;
  event_city?: string | null;
  event_location_type?: string | null;
  status: string;
  creator_status?: string;
  type?: string;
  images: ListingImage[];
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

interface ApiMeta {
  current_page?: number;
  last_page?: number;
  total?: number;
  next_cursor?: string | null;
  prev_cursor?: string | null;
  per_page?: number;
}

interface ApiResponse {
  data: ApiListing[];
  meta?: ApiMeta;
  links?: {
    next?: string | null;
    prev?: string | null;
  };
}

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

interface NestedApiResponse {
  data: ApiResponse;
}

interface LegacyListingsResponse {
  listings: ApiListing[];
}

const isApiListingArray = (value: unknown): value is ApiListing[] =>
  Array.isArray(value);

const isApiResponse = (value: unknown): value is ApiResponse =>
  typeof value === "object" &&
  value !== null &&
  "data" in value &&
  isApiListingArray((value as ApiResponse).data);

const isNestedApiResponse = (value: unknown): value is NestedApiResponse =>
  typeof value === "object" &&
  value !== null &&
  "data" in value &&
  isApiResponse((value as NestedApiResponse).data);

const isLegacyListingsResponse = (
  value: unknown,
): value is LegacyListingsResponse =>
  typeof value === "object" &&
  value !== null &&
  "listings" in value &&
  isApiListingArray((value as LegacyListingsResponse).listings);

const GENERIC_CATEGORY_SLUGS = new Set([
  "business",
  "businesses",
  "event",
  "events",
  "community",
  "communities",
  "online",
]);

const isGenericTypeCategory = (category: Category): boolean => {
  const name = category.name.trim().toLowerCase();
  const slug = category.slug?.trim().toLowerCase();

  return GENERIC_CATEGORY_SLUGS.has(name) || !!(slug && GENERIC_CATEGORY_SLUGS.has(slug));
};

const getTypeParentLabel = (listingType?: string): string | null => {
  const type = listingType?.trim().toLowerCase();
  if (type === "event") return "Events";
  if (type === "business") return "Businesses";
  if (type === "community") return "Communities";
  return null;
};

const formatCategoryPath = (
  categories: Category[] = [],
  listingType?: string,
): string => {
  const usableCategories = categories.filter(
    (category) => !isGenericTypeCategory(category),
  );
  const typeParent = getTypeParentLabel(listingType);

  if (usableCategories.length === 0) {
    return typeParent ? `${typeParent} / Uncategorized` : "Uncategorized";
  }

  const subCategory =
    usableCategories.find((category) => category.type === "subCategory") ??
    usableCategories.find((category) => !!category.parent_slug);

  if (subCategory) {
    const parent =
      subCategory.parent_name ??
      usableCategories.find(
        (category) => category.slug === subCategory.parent_slug,
      )?.name;

    return parent || typeParent
      ? `${parent ?? typeParent} / ${subCategory.name}`
      : subCategory.name;
  }

  const mainCategory =
    usableCategories.find((category) => category.type === "mainCategory") ??
    usableCategories.find((category) => !category.parent_slug) ??
    usableCategories[0];

  return typeParent && mainCategory.name !== typeParent
    ? `${typeParent} / ${mainCategory.name}`
    : mainCategory.name;
};

const formatListingLocation = (listing: ApiListing): string =>
  listing.country ||
  listing.event_country ||
  listing.city ||
  listing.event_city ||
  (listing.event_location_type &&
  listing.event_location_type.toLowerCase() !== "online"
    ? listing.event_location_type
    : "") ||
  "Country not set";

export default function MyListingsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { listingCreate, listingEdit, listingDetail } = useRolePath();

  const [listings, setListings] = useState<ListingsTableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [currentCursor, setCurrentCursor] = useState<string | null>(null);
  const [pageCursors, setPageCursors] = useState<Record<number, string | null>>(
    { 1: null },
  );
  const [deleteListingId, setDeleteListingId] = useState<string | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchListings = useCallback(async (page = 1, cursor?: string | null) => {
    try {
      setLoading(true);

      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("Authentication required");

      const params = new URLSearchParams({
        page: String(page),
        per_page: "10",
      });

      if (cursor) params.set("cursor", cursor);

      const response = await fetch(`/api/listing/my_listings?${params}`, {
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

      const data: unknown = await response.json();
      // Handle: { data: [...] }  OR  { data: { data: [...] } }  OR  { listings: [...] }
      let rawListings: ApiListing[] = [];
      let meta: ApiMeta | undefined;
      let links: ApiResponse["links"];
      if (isApiResponse(data)) {
        rawListings = data.data;
        meta = data.meta;
        links = data.links;
      } else if (isNestedApiResponse(data)) {
        rawListings = data.data.data;
        meta = data.data.meta;
        links = data.data.links;
      } else if (isLegacyListingsResponse(data)) {
        rawListings = data.listings;
      }

      if (meta) {
        setCurrentPage(meta.current_page ?? page);
        setTotalPages(meta.last_page ?? 1);
      }

      const nextCursorFromUrl = links?.next
        ? new URL(links.next).searchParams.get("cursor")
        : null;

      setNextCursor(meta?.next_cursor ?? nextCursorFromUrl);

      const transformedListings: ListingsTableItem[] = rawListings.map(
        (listing) => {
          // The explicit cover always wins over whichever image happens to
          // be first in `images` — keeps this table in sync with what every
          // other page shows.
          const validImages = processImages(listing.images, [
            resolveCoverUrl(listing.cover),
            listing.primary_image,
            listing.cover_image,
          ]);
          const coverImage = validImages[0];
          const orderedImages = validImages;

          const categoryText = formatCategoryPath(
            listing.categories,
            listing.type,
          );
          const location = formatListingLocation(listing);

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

          let resolvedType = listing.type;
          if (!resolvedType && listing.categories?.length > 0) {
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
            allImages: orderedImages,
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
    } catch (err) {
      console.error(err);
      toast.error("Failed to load listings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) fetchListings(currentPage, currentCursor);
  }, [user, authLoading, fetchListings, currentPage, currentCursor]);

  const hasNextPage = totalPages > currentPage || !!nextCursor;

  const handlePreviousPage = () => {
    setCurrentPage((page) => {
      const previousPage = Math.max(1, page - 1);
      setCurrentCursor(pageCursors[previousPage] ?? null);
      return previousPage;
    });
  };

  const handleNextPage = () => {
    if (!hasNextPage) return;

    setCurrentPage((page) => {
      const nextPage = page + 1;
      if (nextCursor) {
        setPageCursors((prev) => ({ ...prev, [nextPage]: nextCursor }));
        setCurrentCursor(nextCursor);
      } else {
        setCurrentCursor(pageCursors[nextPage] ?? null);
      }
      return nextPage;
    });
  };

  const handleDelete = async () => {
    if (!deleteListingId) return;
    setIsDeleting(true);

    try {
      const token = localStorage.getItem("authToken");
      const listingToDelete = listings.find((l) => l.id === deleteListingId);

      if (!listingToDelete) {
        toast.error("Listing not found for deletion");
        return;
      }

      const identifier = listingToDelete.slug || listingToDelete.id;

      const res = await fetch(`/api/listing/${identifier}`, {
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
        <SpinnerGap className="w-8 h-8 animate-spin text-[#93C01F]" />
      </div>
    );
  }

  return (
    <div className="px-1 lg:px-8 py-3 space-y-6">
      <div className="flex flex-col md:flex-row lg:items-center justify-between">
        <div className="mb-4">
          <h4 className="text-2xl font-semibold">My Listings</h4>
          <p className="text-sm text-gray-500 mt-1">Manage your listings</p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="bg-[#93C01F] hover:bg-[#93C01F]/80 gap-2">
              <Plus className="w-4 h-4" /> Add new listing
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {["business", "event", "community"].map((type, index) => (
              <DropdownMenuItem
                key={type}
                onClick={() => router.push(listingCreate(type))}
                className="capitalize cursor-pointer"
              >
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#93C01F] text-white text-xs font-medium">
                  {index + 1}
                </span>
                {type} Listing
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {listings.length > 0 ? (
        <>
          <ListingsTable
            listings={listings}
            showPagination
            itemsPerPage={10}
            pagination={{
              currentPage,
              totalPages: totalPages > 1 ? totalPages : undefined,
              hasNextPage,
              onPrevious: handlePreviousPage,
              onNext: handleNextPage,
            }}
            onViewClick={(listing) => router.push(listingDetail(listing.slug))}
            onEditClick={(listing) =>
              router.push(listingEdit(listing.type, listing.slug))
            }
            onDeleteClick={(id: string) => setDeleteListingId(id)}
            onWhatWeDoClick={(listing) =>
              router.push(`${listingDetail(listing.slug)}?tab=services`)
            }
          />
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-xl bg-gray-50">
          <p className="text-gray-500">No listings yet</p>
        </div>
      )}

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
              {isDeleting ? "Deleting..." : "Delete listing"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

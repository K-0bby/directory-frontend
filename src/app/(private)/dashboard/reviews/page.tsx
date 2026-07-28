"use client";

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Star,
} from "lucide-react";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { useAuth } from "@/context/auth-context";
import { normalizeRole } from "@/lib/roles";
// import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
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

// --- Types ---

interface Review {
  id: string;
  slug: string;
  customer: {
    name: string;
    avatar: string;
    id: string;
  };
  listing: {
    name: string;
    id: string;
    slug: string;
  };
  vendor: string;
  review: string;
  rating: number;
  dateSubmitted: string;
  status: "visible" | "hidden";
  isDeleted: boolean;
}

interface RawReview {
  id: number | string;
  slug?: string;
  listing_id: number | string;
  user_id: number | string;
  rating: number;
  comment: string;
  created_at?: string;
  status?: string;
  deleted_at?: string | null;
  is_hidden?: boolean;
  user?: {
    id: number | string;
    first_name: string;
    last_name: string;
    email: string;
    avatar?: string;
    profile_photo_url?: string;
  };
  listing?: {
    id: number | string;
    name?: string;
    title?: string;
    slug?: string;
  };
}

interface UserData {
  id: string | number;
  name: string;
  avatar?: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  email?: string;
  profile_photo_url?: string;
}

interface ApiResponse {
  data?: {
    ratings?: RawReview[];
    meta?: {
      current_page?: number;
      last_page?: number;
      per_page?: number;
    };
    summary?: {
      total_listings?: number;
      total_reviews?: number;
      overall_average_rating?: number;
    };
  };
  items?: RawReview[];
  last_page?: number;
  totalPages?: number;
}

export default function ReviewsPage() {
  const { user: authUser, loading: authLoading } = useAuth();
  const isCustomer = authUser ? normalizeRole(authUser.role) === "customer" : false;
  const isVendor = authUser ? normalizeRole(authUser.role) === "vendor" : false;
  const router = useRouter();

  // --- State ---
  const [data, setData] = useState<Review[]>([]);
  const [displayData, setDisplayData] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [ratingFilter, setRatingFilter] = useState("All");
  const [date, setDate] = useState<DateRange | undefined>(undefined);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; slug: string } | null>(null);

  const itemsPerPage = 10;

  // --- Helper: Auth Token ---
  const getAuthToken = useCallback((): string | null => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("authToken");
    }
    return null;
  }, []);

  type UserResponseData = {
    data?: UserData;
    user?: UserData;
    id?: string | number;
    first_name?: string;
    last_name?: string;
    name?: string;
    username?: string;
    email?: string;
    avatar?: string;
    profile_photo_url?: string;
  };

  // --- Helper: Extract User Name ---
  const extractUserName = useCallback(
    (userData: UserResponseData | null | undefined): string => {
      if (!userData) return "Unknown User";
      const rawUser = userData.data || userData.user || userData;
      if (rawUser.first_name || rawUser.last_name) {
        return `${rawUser.first_name || ""} ${rawUser.last_name || ""}`.trim();
      }
      if (rawUser.name) return rawUser.name;
      return (
        rawUser.username ||
        (typeof rawUser.email === "string"
          ? rawUser.email.split("@")[0]
          : "Unknown User")
      );
    },
    [],
  );

  // --- Helper: Extract User Avatar ---
  const extractUserAvatar = useCallback(
    (userData: UserResponseData | null | undefined): string => {
      if (!userData) return "";
      const rawUser = userData.data || userData.user || userData;
      return rawUser.avatar || rawUser.profile_photo_url || "";
    },
    [],
  );

  // --- Helper: Format Date String ---
  const formatDateString = useCallback(
    (dateString: string | undefined): string => {
      if (!dateString) {
        // console.log("No date string provided for created_at");
        return "N/A";
      }

      // console.log(`Formatting created_at date string: "${dateString}"`);

      try {
        let date = new Date(dateString);

        if (isNaN(date.getTime())) {
          // Try removing timezone if present (some APIs return with timezone)
          const cleanDateStr = dateString.split("+")[0].split(".")[0];
          date = new Date(cleanDateStr);

          if (isNaN(date.getTime())) {
            // Try as timestamp
            const timestamp = Date.parse(dateString);
            if (!isNaN(timestamp)) {
              date = new Date(timestamp);
            }
          }
        }

        if (!isNaN(date.getTime())) {
          // Return formatted date
          return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          });
        } else {
          // console.warn(`Could not parse created_at date: ${dateString}`);
          return "Invalid Date";
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (error) {
        // console.error(`Error formatting created_at date ${dateString}:`, error);
        return "Error";
      }
    },
    [],
  );

  // --- Helper: Data Mapping ---
  const extractReviewsFromResponse = useCallback(
    async (apiData: unknown): Promise<Review[]> => {
      if (!apiData || typeof apiData !== "object") return [];
      const response = apiData as ApiResponse;
      const rawItems: RawReview[] = (
        Array.isArray(response)
          ? response
          : response.data?.ratings || response.data || response.items || []
      ) as RawReview[];

      // console.log("=== DEBUG: Raw API Response ===");
      // console.log("Total items:", rawItems.length);

      // if (rawItems.length > 0) {
      //   const firstItem = rawItems[0];
      //   console.log("First item created_at value:", firstItem.created_at);
      //   console.log("First item created_at type:", typeof firstItem.created_at);
      // }

      const reviews = rawItems.map((item) => {
        const userId =
          item.user_id?.toString() || item.user?.id?.toString() || "unknown";
        const listingId = item.listing_id.toString();

        let userName = "Unknown User";
        let userAvatar = "";

        if (item.user) {
          userName = extractUserName(item.user);
          userAvatar = extractUserAvatar(item.user);
        } else if (authUser) {
          // Fallback to the authenticated user (e.g. for /api/my_ratings)
          userName = `${authUser.first_name || ""} ${authUser.last_name || ""}`.trim() || authUser.name || "Unknown User";
          userAvatar = authUser.avatar || authUser.profile_photo_url || authUser.image || "";
        }

        let status: "visible" | "hidden" = "visible";
        if (item.is_hidden) {
          status = "hidden";
        } else if (item.status) {
          const s = item.status.toLowerCase();
          if (s === "hidden") status = "hidden";
        }

        const isDeleted = !!item.deleted_at;

        // FIXED: Use created_at as per backend developer
        const rawDateString = item.created_at;

        // console.log(`Item ${item.id}:`, {
        //   id: item.id,
        //   created_at: item.created_at,
        //   formattedDate: formatDateString(item.created_at)
        // });

        const listingName =
          item.listing?.name || item.listing?.title || `Listing #${listingId}`;

        return {
          id: item.id.toString(),
          slug: item.slug || item.id.toString(),
          customer: {
            id: userId,
            name: userName,
            avatar: userAvatar,
          },
          listing: {
            id: listingId,
            name: listingName,
            slug: item.listing?.slug || "",
          },
          vendor: "Vendor Name",
          review: item.comment || "No content provided",
          rating: item.rating || 0,
          dateSubmitted: formatDateString(rawDateString),
          status,
          isDeleted,
        };
      });

      // console.log("Mapped reviews with dates:", reviews.map(r => ({
      //   id: r.id,
      //   dateSubmitted: r.dateSubmitted
      // })));
      return reviews;
    },
    [extractUserName, extractUserAvatar, formatDateString, authUser],
  );

  // --- API Fetch ---
  useEffect(() => {
    const fetchData = async () => {
      if (authLoading) return;
      if (!authUser) return;

      setIsLoading(true);
      setError(null);

      try {
        const token = getAuthToken();

        let apiStatus = "";
        if (statusFilter !== "All") {
          apiStatus = statusFilter.toLowerCase();
        }

        let apiRating = "";
        if (ratingFilter !== "All") {
          apiRating = ratingFilter;
        }

        const queryParams = new URLSearchParams({
          page: currentPage.toString(),
          limit: itemsPerPage.toString(),
          search: search,
        });

        if (apiStatus) queryParams.append("status", apiStatus);
        if (apiRating) queryParams.append("rating", apiRating);

        if (date?.from) {
          queryParams.append("date_from", format(date.from, "yyyy-MM-dd"));
        }
        if (date?.to) {
          queryParams.append("date_to", format(date.to, "yyyy-MM-dd"));
        }

        // console.log(`Fetching from: ${API_URL}/api/ratings?${queryParams}`);

        const endpoint = isCustomer ? "my_ratings" : isVendor ? "vendor_ratings" : "ratings";

        const response = await fetch(
          `/api/${endpoint}?${queryParams}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
              "Content-Type": "application/json",
            },
          },
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch reviews: ${response.statusText}`);
        }

        const json = await response.json();

        // DEBUG: Log the full response structure
        // console.log("=== API RESPONSE DEBUG ===");
        // console.log("Full response keys:", Object.keys(json));

        // if (json.data && Array.isArray(json.data)) {
        //   console.log(`Found ${json.data.length} items in data array`);
        //   if (json.data.length > 0) {
        //     const firstItem = json.data[0];
        //     console.log("First item created_at:", firstItem.created_at);

        //     // Check if created_at exists and is not null
        //     if (firstItem.created_at === null || firstItem.created_at === undefined) {
        //       console.warn("WARNING: created_at is null or undefined in first item!");
        //       console.log("First item full structure:", firstItem);
        //     } else {
        //       console.log("created_at value type:", typeof firstItem.created_at);
        //       console.log("created_at value:", firstItem.created_at);
        //     }
        //   }
        // }

        const reviews = await extractReviewsFromResponse(json);
        setData(isCustomer ? reviews.filter((r) => r.status !== "hidden") : reviews);

        const pageData = json as ApiResponse;
        const total = pageData.data?.meta?.last_page || pageData.last_page || pageData.totalPages || 1;
        setTotalPages(total);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (err) {
        // console.error("Fetch error:", err);
        setError("Failed to load data");
        setData([]);
      } finally {
        setIsLoading(false);
      }
    };

    const timeoutId = setTimeout(() => {
      fetchData();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [authUser, authLoading, isCustomer, currentPage, search, statusFilter, ratingFilter, date, getAuthToken, extractReviewsFromResponse, isVendor]);

  // --- Client-Side Safety Filter ---
  useEffect(() => {
    let filtered = [...data];

    if (statusFilter === "Deleted") {
      filtered = filtered.filter((item) => item.isDeleted);
    } else if (statusFilter !== "All") {
      filtered = filtered.filter((item) => item.status === statusFilter.toLowerCase());
    }

    if (ratingFilter !== "All") {
      filtered = filtered.filter(
        (item) => item.rating === parseInt(ratingFilter),
      );
    }

    if (search) {
      const lowerSearch = search.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.customer.name.toLowerCase().includes(lowerSearch) ||
          item.review.toLowerCase().includes(lowerSearch) ||
          item.listing.name.toLowerCase().includes(lowerSearch),
      );
    }

    setDisplayData(filtered);
  }, [data, statusFilter, ratingFilter, search]);

  // --- Handlers ---
  const handleCustomerDelete = useCallback(
    async (reviewId: string, reviewSlug: string) => {
      try {
        const token = getAuthToken();
        const response = await fetch(`/api/rating/${reviewSlug}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });
        if (!response.ok) throw new Error("Failed to delete review");
        // Soft delete — remove from customer's view immediately
        setData((prev) => prev.filter((r) => r.id !== reviewId));
        toast.success("Review deleted successfully");
      } catch {
        toast.error("Failed to delete review");
      }
    },
    [getAuthToken],
  );

  const handleStatusChange = useCallback(
    async (reviewId: string, reviewSlug: string, action: "hide" | "unhide" | "delete") => {
      try {
        const token = getAuthToken();

        if (action === "delete") {
          const response = await fetch(`/api/rating/${reviewSlug}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          });
          if (!response.ok) throw new Error("Failed to delete review");
          setData((prev) => prev.filter((r) => r.id !== reviewId));
          toast.success("Review deleted successfully");
        } else if (action === "hide") {
          const response = await fetch(`/api/rating/${reviewSlug}/hide`, {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
              "Content-Type": "application/json",
            },
          });
          if (!response.ok) throw new Error("Failed to hide review");
          setData((prev) =>
            prev.map((r) =>
              r.id === reviewId ? { ...r, status: "hidden" as const } : r,
            ),
          );
          toast.success("Review hidden successfully");
        } else {
          const response = await fetch(`/api/rating/${reviewSlug}/unhide`, {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
              "Content-Type": "application/json",
            },
          });
          if (!response.ok) throw new Error("Failed to restore review");
          setData((prev) =>
            prev.map((r) =>
              r.id === reviewId ? { ...r, status: "visible" as const } : r,
            ),
          );
          toast.success("Review restored successfully");
        }
      } catch (error) {
        console.error(error);
        toast.error(`Failed to ${action} review`);
      }
    },
    [getAuthToken],
  );

  const handlePageChange = (page: number) => setCurrentPage(page);

  const handlePrevious = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNext = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxPagesToShow = 4;
    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4);
      } else if (currentPage >= totalPages - 2) {
        pages.push(totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(
          currentPage - 1,
          currentPage,
          currentPage + 1,
          currentPage + 2,
        );
      }
    }
    return pages;
  };

  const getStatusBadge = (status: string) => {
    if (status === "visible") {
      return (
        <Badge className="bg-[#548235] hover:bg-[#548235]/90 text-white gap-1 pl-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-white block" /> Visible
        </Badge>
      );
    }
    if (status === "hidden") {
      return (
        <Badge className="bg-gray-400 hover:bg-gray-500 text-white gap-1 pl-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-white block" /> Hidden
        </Badge>
      );
    }
    return (
      <Badge className="bg-gray-500 hover:bg-gray-600 text-white gap-1 pl-1.5">
        {status}
      </Badge>
    );
  };

  const getDeletedBadge = () => (
    <Badge className="bg-red-100 hover:bg-red-100 text-red-700 border border-red-200 gap-1 pl-1.5">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500 block" /> Deleted by user
    </Badge>
  );

  // const getInitials = (name: string) => {
  //   return name
  //     .split(" ")
  //     .map((n) => n[0])
  //     .slice(0, 2)
  //     .join("")
  //     .toUpperCase();
  // };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? "text-yellow-400 fill-yellow-400"
                : "text-gray-300"
            }`}
          />
        ))}
        {/* <span className="text-sm text-gray-600 ml-1">({rating})</span> */}
      </div>
    );
  };

  return (
    <div className="p-2 lg:p-6 space-y-6 min-h-screen">
      <h1 className="text-3xl font-semibold text-gray-900">Reviews</h1>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-md text-sm border border-red-100">
          {error}
        </div>
      )}

      {/* Filters - hidden for customers */}
      {!isCustomer && (
        <div className="flex flex-col xl:flex-row gap-4">
          <div className="relative flex w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search reviews..."
              className="pl-9 bg-white"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <div className="flex flex-wrap gap-3">
            {/* Status Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="text-gray-600 font-normal min-w-[100px] justify-between"
                >
                  {statusFilter === "All" ? "Status" : statusFilter}{" "}
                  <ChevronDown className="w-4 h-4 ml-2 text-gray-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setStatusFilter("All")}>
                  All
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("Visible")}>
                  Visible
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("Hidden")}>
                  Hidden
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("Deleted")}>
                  Deleted by user
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Rating Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="text-gray-600 font-normal min-w-[100px] justify-between"
                >
                  {ratingFilter === "All" ? "Rating" : `${ratingFilter} Stars`}{" "}
                  <ChevronDown className="w-4 h-4 ml-2 text-gray-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setRatingFilter("All")}>
                  All
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setRatingFilter("5")}>
                  5 Stars
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setRatingFilter("4")}>
                  4 Stars
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setRatingFilter("3")}>
                  3 Stars
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setRatingFilter("2")}>
                  2 Stars
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setRatingFilter("1")}>
                  1 Star
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Date Range Picker */}
            <DateRangePicker
              value={date}
              onChange={setDate}
              placeholder="Pick a date range"
              align="end"
            />
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-200">
            <TableRow>
              {/* <TableHead className="w-[200px]">Customer</TableHead> */}
              <TableHead>Listing Name</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead className="w-[300px]">Review</TableHead>
              <TableHead>Date Submitted </TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-8 text-gray-500"
                >
                  Loading reviews...
                </TableCell>
              </TableRow>
            ) : displayData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-8 text-gray-500"
                >
                  No reviews found matching your filters.
                </TableCell>
              </TableRow>
            ) : (
              displayData.map((item) => (
                <TableRow key={item.id} className="hover:bg-gray-50">
                  {/* <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={item.customer.avatar} />
                        <AvatarFallback>
                          {getInitials(item.customer.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-gray-900">
                        {item.customer.name}
                      </span>
                    </div>
                  </TableCell> */}
                  <TableCell className="text-gray-600">
                    {item.listing.name}
                  </TableCell>
                  <TableCell>{renderStars(item.rating)}</TableCell>
                  <TableCell className="max-w-[250px]">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className="text-gray-500 truncate cursor-default">
                          {item.review}
                        </p>
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        className="max-w-xs whitespace-normal text-sm"
                      >
                        {item.review}
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {item.dateSubmitted}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {item.isDeleted && getDeletedBadge()}
                      {getStatusBadge(item.status)}
                    </div>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-400"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {isVendor ? (
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(
                                `/dashboard/my-listing/${item.listing.slug}?review=${item.slug}`,
                              )
                            }
                          >
                            Reply to Review
                          </DropdownMenuItem>
                        ) : isCustomer ? (
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() =>
                              setDeleteTarget({ id: item.id, slug: item.slug })
                            }
                          >
                            Delete Review
                          </DropdownMenuItem>
                        ) : (
                          <>
                            {item.status !== "hidden" && (
                              <DropdownMenuItem
                                onClick={() =>
                                  handleStatusChange(item.id, item.slug, "hide")
                                }
                              >
                                Hide
                              </DropdownMenuItem>
                            )}
                            {item.status === "hidden" && (
                              <DropdownMenuItem
                                onClick={() =>
                                  handleStatusChange(item.id, item.slug, "unhide")
                                }
                              >
                                Unhide
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() =>
                                setDeleteTarget({ id: item.id, slug: item.slug })
                              }
                            >
                              Delete Review
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {!isLoading && displayData.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <span className="text-sm text-gray-600">
            Showing page {currentPage} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePrevious}
              disabled={currentPage === 1}
              className="h-8 w-8 rounded-full border-gray-200"
            >
              <ChevronLeft className="w-4 h-4 text-gray-500" />
            </Button>

            <div className="flex gap-1">
              {getPageNumbers().map((page) => (
                <Button
                  key={page}
                  size="icon"
                  variant={currentPage === page ? "default" : "ghost"}
                  onClick={() => handlePageChange(page)}
                  className={`h-8 w-8 rounded-full ${
                    currentPage === page
                      ? "bg-[#93C01F] hover:bg-[#93C01F]/90 text-white"
                      : "text-gray-600"
                  }`}
                >
                  {page}
                </Button>
              ))}
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={handleNext}
              disabled={currentPage === totalPages}
              className="h-8 w-8 rounded-full border-gray-200"
            >
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Review</AlertDialogTitle>
            <AlertDialogDescription>
              {isCustomer
                ? "Are you sure you want to delete this review? It will be removed from public view. Any reply attached to it will also be hidden."
                : "Are you sure you want to delete this review? This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (deleteTarget) {
                  if (isCustomer) {
                    handleCustomerDelete(deleteTarget.id, deleteTarget.slug);
                  } else {
                    handleStatusChange(deleteTarget.id, deleteTarget.slug, "delete");
                  }
                  setDeleteTarget(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

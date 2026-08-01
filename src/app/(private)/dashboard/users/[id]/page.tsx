"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import {
  ArrowLeft,
  ChevronDown,
  MoreVertical,
  Tag,
  MessageSquare,
  ArrowUpCircle,
  AlertCircle,
  Eye,
  Bookmark,
  Star,
  CheckCircle,
  Clock,
  Download,
  Trash2,
  Edit,
  CreditCard,
  MoreHorizontal,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";

// --- Types ---
interface ActivityItem {
  id: string;
  type: "listing" | "review" | "upgrade";
  title: string;
  description: string;
  timestamp: string;
}

interface ListingItem {
  id: string;
  name: string;
  location: string;
  type: "Business" | "Event";
  views: number;
  comments: number;
  bookmarks: number;
  rating: number;
  createdDate: string;
  status: "Published" | "Pending review" | "Drafted";
  image: string;
}

interface ReviewItem {
  id: string;
  reviewerName: string;
  reviewerAvatar: string;
  date: string;
  rating: number;
  comment: string;
}

interface BillingItem {
  id: string;
  plan: string;
  date: string;
  amount: number;
  status: "Paid" | "Pending review";
}

interface UserDetails {
  first_name: string;
  last_name: string;
  id: string;
  name: string;
  email: string;
  phone: string;
  listings: number;
  plan: string;
  status: string;
  avatar: string;
  bio: string;
  recentActivity: ActivityItem[];
  stats: {
    published: number;
    inquiries: number;
    reviews: number;
    revenue: number;
  };
  listingsList: ListingItem[];
  reviewsList: ReviewItem[];
  billingHistory: BillingItem[];
  billingInfo: {
    currentPlan: string;
    cycle: string;
    amount: number;
    cardLast4: string;
    cardExpiry: string;
  };
}

// API Types (Backend Response Shape)
interface ApiListing {
  id: number | string;
  title?: string;
  name?: string;
  location?: string;
  type?: "Business" | "Event";
  views_count?: number;
  comments_count?: number;
  bookmarks_count?: number;
  rating?: number;
  created_at?: string;
  status?: string;
  image?: string;
}

interface ApiReview {
  id: number | string;
  user?: {
    name?: string;
    avatar?: string;
  };
  created_at?: string;
  rating?: number;
  comment?: string;
}

interface ApiBilling {
  id: number | string;
  plan_name?: string;
  created_at?: string;
  amount?: string | number;
  status?: string;
}

interface ApiActivity {
  id: number | string;
  type?: "listing" | "review" | "upgrade";
  title?: string;
  description?: string;
  created_at?: string;
  timestamp?: string;
}

interface ApiUserResponse {
  id: number | string;
  name?: string;
  first_name?: string; 
  last_name?: string;
  email?: string;
  // UPDATE: Added 'phone' to the interface
  phone?: string; 
  phone_number?: string;
  phoneNumber?: string;
  listings_count?: number;
  numberOfListings?: number;
  plan?: string;
  status?: string;
  avatar?: string;
  profile_photo_url?: string;
  business_description?: string;
  bio?: string;
  activities?: ApiActivity[];
  listings?: ApiListing[];
  reviews?: ApiReview[];
  billing_history?: ApiBilling[];
  stats?: {
    published?: number;
    inquiries?: number;
    reviews?: number;
    revenue?: number;
  };
  billing_cycle?: string;
  subscription_amount?: string | number;
  card_last_four?: string;
  card_expiry?: string;
}

export default function UserDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const { user: authUser, loading: authLoading } = useAuth();

  // State
  const [activeTab, setActiveTab] = useState("Overview");
  const [user, setUser] = useState<UserDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog States
  const [deleteUserDialogOpen, setDeleteUserDialogOpen] = useState(false);
  const [deleteCardDialogOpen, setDeleteCardDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // --- Logic: Date Formatter Helper ---
  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "Invalid Date";
    }
  };

  // --- Logic: Data Transformation ---
  const transformUserData = useCallback(
    (apiData: ApiUserResponse): UserDetails => {
      // 1. Map Listings
      const rawListings = Array.isArray(apiData.listings)
        ? apiData.listings
        : [];
      const mappedListings: ListingItem[] = rawListings.map((item) => ({
        id: item.id?.toString() || "",
        name: item.name || item.title || "Untitled Listing",
        location: item.location || "Unknown Location",
        type: item.type || "Business",
        views: Number(item.views_count) || 0,
        comments: Number(item.comments_count) || 0,
        bookmarks: Number(item.bookmarks_count) || 0,
        rating: Number(item.rating) || 0,
        createdDate: formatDate(item.created_at),
        status: (item.status as ListingItem["status"]) || "Drafted",
        image: item.image || "",
      }));

      // 2. Map Reviews
      const rawReviews = Array.isArray(apiData.reviews) ? apiData.reviews : [];
      const mappedReviews: ReviewItem[] = rawReviews.map((item) => ({
        id: item.id?.toString() || "",
        reviewerName: item.user?.name || "Anonymous",
        reviewerAvatar: item.user?.avatar || "",
        date: formatDate(item.created_at),
        rating: Number(item.rating) || 5,
        comment: item.comment || "",
      }));

      // 3. Map Billing History
      const rawBilling = Array.isArray(apiData.billing_history)
        ? apiData.billing_history
        : [];
      const mappedBilling: BillingItem[] = rawBilling.map((item) => ({
        id: item.id?.toString() || "",
        plan: item.plan_name || "Basic",
        date: formatDate(item.created_at),
        amount: Number(item.amount) || 0,
        status: (item.status as BillingItem["status"]) || "Pending review",
      }));

      // 4. Map Activity
      const rawActivities = Array.isArray(apiData.activities)
        ? apiData.activities
        : [];
      const mappedActivities: ActivityItem[] = rawActivities.map((act) => ({
        id: act.id?.toString() || "",
        type: (act.type as ActivityItem["type"]) || "listing",
        title: act.title || "Activity Logged",
        description: act.description || "",
        timestamp: formatDate(act.created_at || act.timestamp),
      }));

      // 5. Calculate Stats
      const stats = {
        published:
          apiData.stats?.published ??
          mappedListings.filter((l) => l.status === "Published").length,
        inquiries: apiData.stats?.inquiries ?? 0,
        reviews: apiData.stats?.reviews ?? mappedReviews.length,
        revenue: apiData.stats?.revenue ?? 0,
      };

      // 6. Name Parsing
      let fullName = apiData.name;
      if (!fullName && (apiData.first_name || apiData.last_name)) {
        fullName = `${apiData.first_name || ''} ${apiData.last_name || ''}`.trim();
      }
      if (!fullName) {
        fullName = "Unknown User";
      }
      const [parsedFirst, ...rest] = fullName.split(" ");
      const parsedLast = rest.join(" ");

      return {
        id: apiData.id?.toString() || "",
        first_name: apiData.first_name || parsedFirst || "",
        last_name: apiData.last_name || parsedLast || "",
        name: fullName,
        email: apiData.email || "",
        // UPDATE: Check 'phone' first, then 'phone_number', then 'phoneNumber'
        phone:
          apiData.phone ||
          apiData.phone_number ||
          apiData.phoneNumber ||
          "No phone number provided",
        listings:
          apiData.listings_count ??
          apiData.numberOfListings ??
          mappedListings.length,
        plan: apiData.plan || "Free",
        status: apiData.status || "Active",
        avatar: apiData.avatar || apiData.profile_photo_url || "",
        bio:
          apiData.business_description ||
          apiData.bio ||
          "No description provided.",
        recentActivity: mappedActivities,
        stats: stats,
        listingsList: mappedListings,
        reviewsList: mappedReviews,
        billingHistory: mappedBilling,
        billingInfo: {
          currentPlan: apiData.plan || "Free",
          cycle: apiData.billing_cycle || "Monthly",
          amount: Number(apiData.subscription_amount) || 0,
          cardLast4: apiData.card_last_four || "",
          cardExpiry: apiData.card_expiry || "",
        },
      };
    },
    []
  );

  // --- API Fetching ---
  useEffect(() => {
    const fetchUserData = async () => {
      if (authLoading) return;

      if (!authUser) {
        setError("You must be logged in to view this page.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem("authToken");
        const id = params.id;

        if (!id) throw new Error("Invalid User ID in URL");

        const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://me-fie.co.uk";

        const response = await fetch(`${API_URL}/api/users/${id}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          if (response.status === 404) throw new Error("User not found");
          if (response.status === 401) throw new Error("Unauthorized access");
          throw new Error(`API Error: ${response.statusText}`);
        }

        const json = await response.json();
        const rawData = json.data || json;

        if (!rawData) throw new Error("No data received from API");

        const mappedUser = transformUserData(rawData as ApiUserResponse);
        setUser(mappedUser);
      } catch (err: unknown) {
        console.error("Fetch Error:", err);
        setError(
          err instanceof Error ? err.message : "An unknown error occurred"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [params.id, authUser, authLoading, transformUserData]);

  // --- Actions ---

  const handleEditUser = () => {
    if (user?.id) {
      router.push(`/dashboard/users/${user.id}/edit`);
    }
  };

  const handleDeleteUser = async () => {
    if (!user?.id) return;
    setIsDeleting(true);

    try {
      const token = localStorage.getItem("authToken");
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://me-fie.co.uk";

      const response = await fetch(`${API_URL}/api/users/${user.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete user");
      }

      setDeleteUserDialogOpen(false);
      router.push("/dashboard/users");
    } catch (error) {
      console.error("Delete failed", error);
      alert("Failed to delete user. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditPaymentMethod = () => {
    if (!user?.id) return;
    router.push(`/dashboard/users/${user.id}/billing/payment-method`);
  };

  const handleDeletePaymentMethod = async () => {
    setIsDeleting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setDeleteCardDialogOpen(false);
      if (user) {
        setUser({
          ...user,
          billingInfo: { ...user.billingInfo, cardLast4: "", cardExpiry: "" },
        });
      }
    } catch (error) {
      console.error("Failed to delete card", error);
    } finally {
      setIsDeleting(false);
    }
  };

  // --- Helpers ---
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "fill-gray-100 text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  const getStatusBadgeStyles = (status: string) => {
    switch (status) {
      case "Published":
        return "bg-[#548235] text-white";
      case "Pending review":
        return "bg-[#F2C94C] text-white";
      case "Drafted":
        return "bg-gray-200 text-gray-700 border border-gray-300";
      default:
        return "bg-gray-200 text-gray-700";
    }
  };

  const renderActivityIcon = (type: string) => {
    const baseClasses =
      "w-10 h-10 rounded-full flex items-center justify-center shrink-0";
    switch (type) {
      case "listing":
        return (
          <div className={`${baseClasses} bg-[#93C01F]`}>
            <Tag className="w-5 h-5 text-white" />
          </div>
        );
      case "review":
        return (
          <div className={`${baseClasses} bg-[#5D5FEF]`}>
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
        );
      case "upgrade":
        return (
          <div className={`${baseClasses} bg-[#F2994A]`}>
            <ArrowUpCircle className="w-5 h-5 text-white" />
          </div>
        );
      default:
        return (
          <div className={`${baseClasses} bg-gray-400`}>
            <Tag className="w-5 h-5 text-white" />
          </div>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#93C01F]"></div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-gray-500 mb-6">{error || "User not found"}</p>
          <Button onClick={() => router.back()} variant="outline">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      {/* --- Responsive Header Section --- */}
      <div className="border-b border-gray-200 pt-8 pb-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between mb-8 gap-6">
            {/* User Info Block */}
            <div className="flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-6 flex-1 text-center md:text-left px-4">
              <div className="relative">
                <button
                  onClick={() => router.back()}
                  className="absolute -left-12 top-2 p-2 rounded-full hover:bg-gray-100 transition-colors hidden lg:block"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <Avatar className="w-20 h-20 md:w-16 md:h-16 border border-gray-100 shadow-sm">
                  <AvatarImage
                    src={user.avatar}
                    alt={user.name}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-gray-200 text-gray-500 text-xl">
                    {user.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>

              <div className="mt-0.5 space-y-2 md:space-y-1 w-full">
                <h1 className="text-2xl font-bold text-gray-900">
                  {`${user.first_name} ${user.last_name}`}
                </h1>

                <div className="flex flex-wrap justify-center md:justify-start items-center gap-x-3 gap-y-2 text-sm text-gray-500">
                  <span className="text-gray-500 hidden md:inline">Email:</span>
                  <Link
                    href={`mailto:${user.email}`}
                    className="text-[#93C01F] hover:underline"
                  >
                    {user.email}
                  </Link>
                  <span className="hidden md:inline text-gray-300">•</span>
                  <span className="whitespace-nowrap">
                    <span className="md:hidden font-medium">Phone: </span>
                    {user.phone}
                  </span>
                  <span className="hidden md:inline text-gray-300">•</span>
                  <span className="whitespace-nowrap">
                    Listings:{" "}
                    <span className="text-gray-900 font-medium">
                      {user.listings}
                    </span>
                  </span>
                  <span className="hidden md:inline text-gray-300">•</span>
                  <span className="bg-[#5ea0d6] text-white text-xs px-2.5 py-0.5 rounded-md font-medium">
                    {user.plan}
                  </span>
                  <span className="hidden md:inline text-gray-300">•</span>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-md font-medium ${
                      user.status === "Active"
                        ? "bg-[#E9F5D6] text-[#5F8B0A]"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {user.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions Block */}
            <div className="w-full md:w-auto flex justify-center md:justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-normal gap-2 rounded-lg px-6 w-full md:w-auto justify-between md:justify-start"
                  >
                    More Actions <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={handleEditUser}>
                    <Edit className="w-4 h-4 mr-2" /> Edit User
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setDeleteUserDialogOpen(true)}
                    className="text-red-600 focus:text-red-600 focus:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Delete User
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="w-full overflow-x-auto no-scrollbar">
            <div className="flex gap-8 border-b border-gray-100 min-w-max">
              {["Overview", "Listings", "Reviews", "Billing"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-4 text-sm font-medium transition-all relative whitespace-nowrap px-1 ${
                    activeTab === tab
                      ? "text-[#93C01F]"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab}
                  {activeTab === tab && (
                    <div className="absolute -bottom-0.5 left-0 w-full h-[3px] bg-[#93C01F] rounded-t-full" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* === OVERVIEW TAB === */}
        {activeTab === "Overview" && (
          <>
            <Card className="px-6 py-4 border border-gray-200 shadow-xs rounded-xl bg-white">
              <h2 className="text-lg font-bold text-gray-900 mb-3">
                Business Description
              </h2>
              <p className="text-gray-500 text-sm leading-relaxed">
                {user.bio}
              </p>
            </Card>
            <Card className="border border-gray-200 shadow-xs rounded-xl bg-white overflow-hidden">
              <div className="px-6 pb-2 pt-6 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">
                  Recent Activity
                </h2>
                <button className="text-gray-400 hover:text-gray-600">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
              <div className="flex flex-col">
                {user.recentActivity.length > 0 ? (
                  user.recentActivity.map((activity, index) => (
                    <div
                      key={activity.id || index}
                      className={`flex gap-4 p-6 hover:bg-gray-50 transition-colors ${
                        index !== user.recentActivity.length - 1
                          ? "border-b border-gray-100"
                          : ""
                      }`}
                    >
                      {renderActivityIcon(activity.type)}
                      <div className="flex-1">
                        <h3 className="text-gray-900 font-medium text-sm mb-1">
                          {activity.title}
                        </h3>
                        <p className="text-gray-500 text-sm mb-1.5">
                          {activity.description}
                        </p>
                        <p className="text-gray-400 text-xs">
                          {activity.timestamp}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-gray-500 text-sm">
                    No recent activity found.
                  </div>
                )}
              </div>
            </Card>
          </>
        )}

        {/* === LISTINGS TAB === */}
        {activeTab === "Listings" && (
          <div className="space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 px-2 md:px-4">
              <div className="text-center md:text-left bg-gray-50 md:bg-transparent p-4 md:p-0 rounded-lg">
                <h3 className="text-2xl md:text-3xl font-bold text-gray-900">
                  {user.stats.published}
                </h3>
                <div className="flex flex-col md:flex-row items-center gap-2 mt-1 justify-center md:justify-start">
                  <div className="w-3 h-3 rounded-full bg-gray-200 hidden md:block" />
                  <span className="text-gray-500 text-xs md:text-sm">
                    Listings published
                  </span>
                </div>
              </div>
              <div className="text-center md:text-left bg-gray-50 md:bg-transparent p-4 md:p-0 rounded-lg">
                <h3 className="text-2xl md:text-3xl font-bold text-gray-900">
                  {user.stats.inquiries}
                </h3>
                <div className="flex flex-col md:flex-row items-center gap-2 mt-1 justify-center md:justify-start">
                  <div className="w-3 h-3 rounded-full bg-[#F2994A] hidden md:block" />
                  <span className="text-gray-500 text-xs md:text-sm">
                    Inquires received
                  </span>
                </div>
              </div>
              <div className="text-center md:text-left bg-gray-50 md:bg-transparent p-4 md:p-0 rounded-lg">
                <h3 className="text-2xl md:text-3xl font-bold text-gray-900">
                  {user.stats.reviews}
                </h3>
                <div className="flex flex-col md:flex-row items-center gap-2 mt-1 justify-center md:justify-start">
                  <div className="w-3 h-3 rounded-full bg-[#5ea0d6] hidden md:block" />
                  <span className="text-gray-500 text-xs md:text-sm">
                    Reviews received
                  </span>
                </div>
              </div>
              <div className="text-center md:text-left bg-gray-50 md:bg-transparent p-4 md:p-0 rounded-lg">
                <h3 className="text-2xl md:text-3xl font-bold text-gray-900">
                  {formatCurrency(user.stats.revenue)}
                </h3>
                <div className="flex flex-col md:flex-row items-center gap-2 mt-1 justify-center md:justify-start">
                  <div className="w-3 h-3 rounded-full bg-[#548235] hidden md:block" />
                  <span className="text-gray-500 text-xs md:text-sm">
                    Revenue accumulated
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg text-gray-500 mb-4 px-1">
                Listings Overview
              </h3>
              <div className="rounded-xl border border-gray-200 shadow-sm bg-white overflow-hidden">
                <div className="overflow-x-auto">
                  <Table className="min-w-[800px]">
                    <TableHeader className="bg-gray-50/50">
                      <TableRow>
                        <TableHead className="w-[300px]">
                          Listing Name
                        </TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Stats Summary</TableHead>
                        <TableHead>Created Date</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {user.listingsList.length > 0 ? (
                        user.listingsList.map((listing) => (
                          <TableRow
                            key={listing.id}
                            className="hover:bg-gray-50/50"
                          >
                            <TableCell className="py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0" />
                                <span className="font-medium text-gray-900 truncate">
                                  {listing.name}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-gray-600">
                              {listing.location}
                            </TableCell>
                            <TableCell className="text-gray-600">
                              {listing.type}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-4 text-gray-500 text-xs">
                                <span className="flex items-center gap-1">
                                  <Eye className="w-3.5 h-3.5" />
                                  {listing.views}
                                </span>
                                <span className="flex items-center gap-1">
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  {listing.comments}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Bookmark className="w-3.5 h-3.5" />
                                  {listing.bookmarks}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Star className="w-3.5 h-3.5" />
                                  {listing.rating}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-gray-600">
                              {listing.createdDate}
                            </TableCell>
                            <TableCell>
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 w-fit ${getStatusBadgeStyles(
                                  listing.status
                                )}`}
                              >
                                {listing.status === "Published" && (
                                  <div className="w-1.5 h-1.5 rounded-full bg-white/80" />
                                )}
                                {listing.status}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            className="text-center py-8 text-gray-500"
                          >
                            No listings found for this user.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* === REVIEWS TAB === */}
        {activeTab === "Reviews" && (
          <Card className="border border-gray-200 shadow-sm rounded-xl bg-white">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">
                Vendor Reviews
              </h3>
              <p className="text-gray-500 text-sm mt-1">
                Overall Rating: 4.6/5.0 ({user.reviewsList.length} reviews)
              </p>
            </div>

            <div className="p-8">
              {/* Rating Chart */}
              <div className="flex items-center gap-8 mb-10">
                <div className="text-5xl font-normal text-gray-900">4.6</div>
                <div className="flex-1 space-y-2">
                  {[
                    { star: "5 Stars", pct: "75%", width: "75%" },
                    { star: "4 Stars", pct: "18%", width: "18%" },
                    { star: "3 Stars", pct: "7%", width: "7%" },
                    { star: "2 Stars", pct: "0%", width: "0%" },
                    { star: "1 Stars", pct: "0%", width: "0%" },
                  ].map((row) => (
                    <div
                      key={row.star}
                      className="flex items-center gap-4 text-sm"
                    >
                      <span className="w-12 text-gray-600">{row.star}</span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#93C01F] rounded-full"
                          style={{ width: row.width }}
                        />
                      </div>
                      <span className="w-8 text-right text-gray-600">
                        {row.pct}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <hr className="border-gray-100 mb-8" />

              {/* Review List */}
              <div className="space-y-8">
                {user.reviewsList.length > 0 ? (
                  user.reviewsList.map((review) => (
                    <div key={review.id} className="flex gap-4">
                      <Avatar className="w-10 h-10 bg-[#548235] text-white">
                        <AvatarImage src={review.reviewerAvatar} />
                        <AvatarFallback>
                          {review.reviewerName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">
                          {review.reviewerName}
                        </h4>
                        <p className="text-xs text-gray-500 mb-2">
                          {review.date}
                        </p>
                        <div className="mb-2">{renderStars(review.rating)}</div>
                        <p className="text-sm text-gray-600">
                          {review.comment}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center">
                    No reviews available.
                  </p>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* === BILLING TAB === */}
        {activeTab === "Billing" && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Current Plan Card */}
              <Card className="p-6 border border-gray-200 shadow-sm rounded-xl">
                <h3 className="text-xl font-normal text-gray-900 mb-1">
                  Current Plan
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  Your billing will show here
                </p>

                <div className="bg-gray-50 rounded-lg p-4 flex justify-between items-center border border-gray-100">
                  <div>
                    <p className="text-gray-700 font-medium">
                      Current billing cycle{" "}
                      <span className="text-[#93C01F]">
                        ({user.billingInfo.currentPlan})
                      </span>
                    </p>
                    <p className="text-gray-500 text-sm mt-1">
                      {user.billingInfo.cycle}
                    </p>
                  </div>
                  <span className="text-[#93C01F] font-medium text-lg">
                    ${user.billingInfo.amount.toFixed(2)}
                  </span>
                </div>
              </Card>

              {/* Payment Methods Card (Updated with Dropdown) */}
              <Card className="p-6 border border-gray-200 shadow-sm rounded-xl">
                <h3 className="text-xl font-normal text-gray-900 mb-1">
                  Payment Methods
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  Manage your payment method
                </p>

                {user.billingInfo.cardLast4 ? (
                  <div className="bg-gray-50 rounded-lg p-4 flex justify-between items-center border border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-8 bg-white border border-gray-200 rounded flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-blue-800" />
                      </div>
                      <div>
                        <p className="text-gray-900 text-sm font-medium">
                          Visa ending {user.billingInfo.cardLast4}
                        </p>
                        <p className="text-gray-500 text-xs">
                          Expires {user.billingInfo.cardExpiry}
                        </p>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-400 hover:text-gray-600 hover:bg-gray-200"
                        >
                          <MoreHorizontal className="w-5 h-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={handleEditPaymentMethod}>
                          <Pencil className="mr-2 h-4 w-4" /> Edit Card
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeleteCardDialogOpen(true)}
                          className="text-red-600 focus:text-red-600 focus:bg-red-50"
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete Card
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-8 text-center border border-gray-100 border-dashed">
                    <p className="text-gray-500 text-sm">
                      No payment method added.
                    </p>
                    <Button
                      variant="link"
                      className="text-[#93C01F] p-0 h-auto mt-2"
                    >
                      Add Payment Method
                    </Button>
                  </div>
                )}
              </Card>
            </div>

            {/* Billing History */}
            <Card className="border border-gray-200 shadow-sm rounded-xl overflow-hidden bg-white">
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-xl font-normal text-gray-900">
                  Billing History
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  View your payments and invoices.
                </p>
              </div>

              <div className="overflow-x-auto">
                <Table className="min-w-[600px]">
                  <TableHeader className="bg-gray-50/50">
                    <TableRow>
                      <TableHead>Plan</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {user.billingHistory.length > 0 ? (
                      user.billingHistory.map((bill) => (
                        <TableRow key={bill.id} className="hover:bg-gray-50/50">
                          <TableCell className="text-gray-600 py-4">
                            {bill.plan}
                          </TableCell>
                          <TableCell className="text-gray-600">
                            {bill.date}
                          </TableCell>
                          <TableCell className="text-gray-900 font-medium">
                            ${bill.amount}
                          </TableCell>
                          <TableCell>
                            {bill.status === "Paid" ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#548235] text-white text-xs font-medium">
                                <CheckCircle className="w-3 h-3" /> Paid
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#F2C94C] text-white text-xs font-medium">
                                <Clock className="w-3 h-3" /> Pending review
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-gray-400 hover:text-gray-600"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center py-8 text-gray-500"
                        >
                          No billing history found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Delete User Confirmation Dialog */}
      <AlertDialog
        open={deleteUserDialogOpen}
        onOpenChange={setDeleteUserDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User Account?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              user account <strong>{user.name}</strong> and remove their data
              from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Card Confirmation Dialog */}
      <AlertDialog
        open={deleteCardDialogOpen}
        onOpenChange={setDeleteCardDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Payment Method?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove the card ending in{" "}
              <strong>{user.billingInfo.cardLast4}</strong>? This may affect
              upcoming automated billing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePaymentMethod}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={isDeleting}
            >
              {isDeleting ? "Removing..." : "Remove Card"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  useQueryState,
  parseAsString,
  parseAsInteger,
  parseAsStringEnum,
} from "nuqs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Search,
  Eye,
  RefreshCcw,
  User,
  MapPin,
  Tag,
  Gem,
  Phone,
  Mail,
  Globe,
  Facebook,
  Instagram,
  Twitter,
  Youtube,
  Music2,
  MessageCircle,
} from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/context/auth-context";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { RichTextDisplay } from "@/components/ui/rich-text-editor";
import { ListingReadiness } from "@/lib/listing-form-v2";

// --- Types ---
type TabType = "all" | "approved" | "pending" | "draft" | "suspended" | "rejected" | "archived";

interface Listing {
  id: string;
  slug: string;
  name: string;
  vendor: string;
  vendorAvatar?: string;
  category: string;
  location: string;
  type: string;
  approval: "Approved" | "Pending" | "Draft" | "Rejected" | "Suspended" | "Archived";
  image: string;
  images?: string[];
  plan?: "Basic" | "Pro" | "Premium";
  description?: string;
  userInfo?: {
    name: string;
    email?: string;
  };
  contactInfo?: {
    phone?: string;
    email?: string;
    website?: string;
    socials?: {
      facebook?: string;
      instagram?: string;
      twitter?: string;
      tiktok?: string;
      youtube?: string;
      whatsapp?: string;
    };
  };
  verified: boolean;
  readiness?: ListingReadiness;
  reviewSubmittedAt?: string | null;
}

interface RawListing {
  id?: string | number;
  slug?: string;
  name?: string;
  title?: string;
  vendor?: string;
  listing_verified?: boolean;
  is_verified?: boolean;
  business_name?: string;
  vendorAvatar?: string;
  vendor_image?: string;
  category?: string;
  location?: string;
  address?: string;
  type?: string;
  status?: string;
  image?: string;
  thumbnail?: string;
  primary_image?: string;
  cover_image?: string;
  plan?: string;
  description?: string;
  bio?: string;
  primary_phone?: string;
  email?: string;
  website?: string;
  socials?: any;
  user?: {
    id?: number;
    first_name?: string;
    last_name?: string;
    email?: string;
    name?: string;
  };
  categories?: Array<{
    id: number;
    name: string;
    parent_id: string | null;
    type: string;
    description: string;
  }>;
  images?: Array<{
    id: number;
    original: string;
    thumb: string;
    webp: string;
    card?: string;
    file_size?: number;
    mime_type?: string;
    created_at: string;
    updated_at: string;
  }>;
  cover?: {
    id: number;
    original: string;
    thumb: string;
    webp: string;
    card?: string;
  } | null;
  city?: string;
  country?: string;
  submission_readiness?: ListingReadiness;
  archived?: boolean;
}

interface ApiResponse {
  items?: RawListing[];
  data?: RawListing[];
  results?: RawListing[];
  listings?: RawListing[];
  last_page?: number;
  totalPages?: number;
  links?: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
  meta?: {
    path: string;
    per_page: number;
    next_cursor: string | null;
    prev_cursor: string | null;
    totalPages?: number;
    last_page?: number;
  };
}

export default function Listings() {
  const router = useRouter();
  const { user: authUser, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useQueryState(
    "tab",
    parseAsStringEnum<TabType>([
      "all",
      "approved",
      "pending",
      "draft",
      "suspended",
      "rejected",
      "archived",
    ]).withDefault("all"),
  );
  const [allData, setAllData] = useState<Listing[]>([]);
  const [displayData, setDisplayData] = useState<Listing[]>([]);
  const [statusFilter, setStatusFilter] = useQueryState(
    "status",
    parseAsString.withDefault("all"),
  );
  const [typeFilter, setTypeFilter] = useQueryState(
    "type",
    parseAsString.withDefault("all"),
  );
  const [search, setSearch] = useQueryState(
    "search",
    parseAsString.withDefault(""),
  );
  // The input stays bound to `search` (instant feedback); only the fetch waits
  // for typing to settle, so a search term costs one request instead of one
  // per keystroke (which was tripping the API's 20/min rate limit).
  const debouncedSearch = useDebouncedValue(search);
  const [currentPage, setCurrentPage] = useQueryState(
    "page",
    parseAsInteger.withDefault(1),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [, setError] = useState<string | null>(null);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);

  const itemsPerPage = 10;

  // --- Helpers ---
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const extractListingsFromResponse = (data: unknown): Listing[] => {
    if (!data) return [];

    let rawItems: RawListing[] = [];

    if (Array.isArray(data)) {
      rawItems = data as RawListing[];
    } else {
      const payload = data as ApiResponse;
      if (Array.isArray(payload.items)) rawItems = payload.items;
      else if (Array.isArray(payload.data)) rawItems = payload.data;
      else if (Array.isArray(payload.results)) rawItems = payload.results;
      else if (Array.isArray(payload.listings)) rawItems = payload.listings;
      else if (Array.isArray(payload)) rawItems = payload;
    }

    const getImageUrl = (url: string | undefined): string => {
      if (!url) return "/images/no-image.jpg";
      if (url.startsWith("http://") || url.startsWith("https://")) {
        return url;
      }
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://me-fie.co.uk";
      return `${API_URL}/${url.replace(/^\//, "")}`;
    };

    return rawItems.map((item) => {
      let vendorName = "Unknown Vendor";
      let userInfo: { name: string; email?: string } | undefined = undefined;

      if (item.user) {
        if (item.user.first_name && item.user.last_name) {
          vendorName = `${item.user.first_name} ${item.user.last_name}`;
          userInfo = { name: vendorName, email: item.user.email };
        } else if (item.user.name) {
          vendorName = item.user.name;
          userInfo = { name: vendorName, email: item.user.email };
        } else if (item.user.email) {
          vendorName = item.user.email.split("@")[0];
          userInfo = { name: vendorName, email: item.user.email };
        }
      } else if (item.vendor || item.business_name) {
        vendorName = item.vendor || item.business_name || "Unknown Vendor";
      }

      // The explicit cover always wins over whichever image happens to be
      // first in `images` — keeps this table in sync with what every other
      // page shows for the same listing.
      let imageUrl = "/images/no-image.jpg";
      const explicitCover =
        item.cover?.card ||
        item.cover?.webp ||
        item.cover?.original ||
        item.primary_image ||
        item.cover_image;
      if (explicitCover) {
        imageUrl = getImageUrl(explicitCover);
      } else if (item.images && item.images.length > 0) {
        const validImage = item.images.find((img) => !!img.original);
        if (validImage) {
          imageUrl = getImageUrl(validImage.original);
        }
      } else if (item.image || item.thumbnail) {
        imageUrl = getImageUrl(item.image || item.thumbnail);
      }

      let category = "General";
      if (item.categories && item.categories.length > 0) {
        const mainCategories = item.categories.filter(
          (cat) => cat.parent_id === null,
        );
        if (mainCategories.length > 0) {
          category = mainCategories.map((cat) => cat.name).join(", ");
        } else {
          category = item.categories[0].name;
        }
      } else if (item.category) {
        category = item.category;
      }

      let location = "Accra, Ghana";
      if (item.city && item.country) {
        location = `${item.city}, ${item.country}`;
      } else if (item.address) {
        location = item.address;
      } else if (item.location) {
        location = item.location;
      }

      const rawStatus = item.status?.toLowerCase() || "pending";
      let approval: "Approved" | "Pending" | "Draft" | "Rejected" | "Suspended" | "Archived" =
        "Pending";

      if (item.archived) approval = "Archived";
      else if (rawStatus === "approved" || rawStatus === "published")
        approval = "Approved";
      else if (rawStatus === "rejected") approval = "Rejected";
      else if (rawStatus === "suspended") approval = "Suspended";
      else if (rawStatus === "draft") approval = "Draft";

      const socialsData = Array.isArray(item.socials)
        ? item.socials[0]
        : item.socials || {};

      return {
        id: item.id?.toString() || Math.random().toString(),
        slug: item.slug || item.id?.toString() || "no-slug",
        name: item.name || item.title || "Untitled Listing",
        vendor: vendorName,
        vendorAvatar: item.vendorAvatar || item.vendor_image || "",
        category: category,
        location: location,
        type: item.type || "business",
        approval: approval,
        image: imageUrl,
        images: item.images
          ? item.images
              .filter((img) => !!img.original)
              .map((img) => getImageUrl(img.original))
          : imageUrl
            ? [imageUrl]
            : [],
        plan: (item.plan || "Basic") as "Basic" | "Pro" | "Premium",
        description: item.bio || item.description || "",
        userInfo: userInfo,
        contactInfo: {
          phone: item.primary_phone,
          email: item.email,
          website: item.website,
          socials: {
            facebook: socialsData?.facebook,
            instagram: socialsData?.instagram,
            twitter: socialsData?.twitter,
            tiktok: socialsData?.tiktok,
            youtube: socialsData?.youtube,
            whatsapp: socialsData?.whatsapp,
          },
        },
        verified: !!(item.listing_verified ?? item.is_verified),
        readiness: item.submission_readiness,
        reviewSubmittedAt: item.submission_readiness?.review_submitted_at ?? null,
      };
    });
  };

  const loadAllData = useCallback(async () => {
    if (authLoading) return;
    if (!authUser) {
      setError("Authentication required to view listings");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("authToken");
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://me-fie.co.uk";

      const params = new URLSearchParams({
        page: currentPage.toString(),
        per_page: itemsPerPage.toString(),
      });

      if (debouncedSearch) params.append("search", debouncedSearch);
      if (typeFilter !== "all") params.append("type", typeFilter);
      if (activeTab === "all" && statusFilter !== "all") params.append("status", statusFilter);

      const endpointMap: Record<string, string> = {
        all: "admin/all_listings",
        approved: "admin/approved_listings",
        pending: "admin/pending_listings",
        draft: "admin/drafted_listings",
        archived: "admin/archived_listings",
        suspended: "admin/suspended_listings",
        rejected: "admin/rejected_listings",
      };
      const endpoint = activeTab === "all" && statusFilter === "archived"
        ? "admin/archived_listings"
        : endpointMap[activeTab] || "admin/all_listings";
      if (activeTab === "approved") params.set("status", "approved");

      const response = await fetch(
        `${API_URL}/api/${endpoint}?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const json = await response.json();
      let listingsData: RawListing[] = [];
      if (json.data && Array.isArray(json.data)) {
        listingsData = json.data;
      } else if (Array.isArray(json)) {
        listingsData = json;
      } else if (json.items && Array.isArray(json.items)) {
        listingsData = json.items;
      } else if (json.listings && Array.isArray(json.listings)) {
        listingsData = json.listings;
      }

      const listings = extractListingsFromResponse(listingsData);
      setAllData(listings);

      const meta = json.meta || {};
      const total =
        meta.last_page ||
        meta.totalPages ||
        json.last_page ||
        json.totalPages ||
        1;
      setTotalPages(total);
    } catch (error) {
      console.error("Fetch Error:", error);
      setError(
        error instanceof Error ? error.message : "Failed to load listings",
      );
      setAllData([]);
    } finally {
      setIsLoading(false);
    }
  }, [
    authUser,
    authLoading,
    activeTab,
    currentPage,
    debouncedSearch,
    statusFilter,
    typeFilter,
  ]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  useEffect(() => {
    const safeAllData = Array.isArray(allData) ? allData : [];

    let filteredData = safeAllData;

    if (activeTab === "pending") {
      filteredData = safeAllData.filter((item) => item.approval === "Pending");
      filteredData = [...filteredData].sort((a, b) => {
        const aTime = a.reviewSubmittedAt ? new Date(a.reviewSubmittedAt).getTime() : Number.MAX_SAFE_INTEGER;
        const bTime = b.reviewSubmittedAt ? new Date(b.reviewSubmittedAt).getTime() : Number.MAX_SAFE_INTEGER;
        return aTime - bTime;
      });
    } else if (activeTab === "draft") {
      filteredData = safeAllData.filter((item) => item.approval === "Draft");
    } else if (activeTab === "suspended") {
      filteredData = safeAllData.filter((item) => item.approval === "Suspended");
    } else if (activeTab === "rejected") {
      filteredData = safeAllData.filter((item) => item.approval === "Rejected");
    } else if (activeTab === "archived") {
      filteredData = safeAllData.filter((item) => item.approval === "Archived");
    } else {
      if (statusFilter !== "all") {
        const status = statusFilter.toLowerCase();
        if (status === "published") {
          filteredData = filteredData.filter(
            (item) => item.approval === "Approved",
          );
        } else if (status === "pending") {
          filteredData = filteredData.filter(
            (item) => item.approval === "Pending",
          );
        } else if (status === "rejected") {
          filteredData = filteredData.filter(
            (item) => item.approval === "Rejected",
          );
        } else if (status === "draft") {
          filteredData = filteredData.filter((item) => item.approval === "Draft");
        } else if (status === "suspended") {
          filteredData = filteredData.filter((item) => item.approval === "Suspended");
        } else if (status === "archived") {
          filteredData = filteredData.filter((item) => item.approval === "Archived");
        }
      }

      if (typeFilter !== "all") {
        filteredData = filteredData.filter(
          (item) => item.type.toLowerCase() === typeFilter.toLowerCase(),
        );
      }
    }

    setDisplayData(filteredData);
  }, [allData, activeTab, statusFilter, typeFilter]);

  const handlePageChange = (page: number) => setCurrentPage(page);
  const handlePrevious = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };
  const handleNext = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const getStatusColor = (status: string) => {
    if (status === "Approved") return "bg-[#E9F5D6] text-[#5F8B0A]";
    if (status === "Pending") return "bg-yellow-100 text-yellow-700";
    if (status === "Suspended") return "bg-orange-100 text-orange-700";
    return "bg-red-100 text-red-800";
  };

  // Open the preview immediately from list data, then hydrate the full record
  // (bio/description, socials, services…) from /show, which the list endpoint
  // does not include.
  const openPreview = async (item: Listing) => {
    setSelectedListing(item);
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`/api/listing/${item.slug}/show`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) return;
      const json = await res.json();
      const raw = json.data || json.listing || json;
      const [full] = extractListingsFromResponse([raw]);
      if (full) {
        setSelectedListing((prev) =>
          prev && prev.slug === item.slug ? { ...prev, ...full } : prev,
        );
      }
    } catch {
      // Keep the list-level preview if the fetch fails.
    }
  };

  const getApprovalBadgeVariant = (status: string) => {
    switch (status) {
      case "Approved":
        return "default";
      case "Pending":
        return "secondary";
      case "Rejected":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxPagesToShow = 4;
    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) pages.push(1, 2, 3, 4);
      else if (currentPage >= totalPages - 2)
        pages.push(totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      else
        pages.push(
          currentPage - 1,
          currentPage,
          currentPage + 1,
          currentPage + 2,
        );
    }
    return pages;
  };

  // --- SOCIAL ICON HELPER ---
  const SocialLink = ({
    href,
    icon: Icon,
    label,
  }: {
    href?: string;
    icon: any;
    label: string;
  }) => {
    if (!href) return null;
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#93C01F] transition-colors p-2 bg-gray-50 rounded-lg hover:bg-gray-100"
      >
        <Icon className="w-4 h-4" />
        <span className="truncate max-w-[150px]">{label}</span>
      </a>
    );
  };

  return (
    <div className="p-2 lg:p-6 space-y-6">
      <h1 className="text-3xl font-semibold">Listings</h1>

      {/* Tabs */}
      <div className="flex flex-wrap gap-3">
        {[
          { key: "all", label: "All" },
          { key: "approved", label: "Approved" },
          { key: "pending", label: "Pending" },
          { key: "draft", label: "Draft" },
          { key: "suspended", label: "Suspended" },
          { key: "rejected", label: "Rejected" },
          { key: "archived", label: "Archived" },
        ].map((tab) => (
          <Button
            key={tab.key}
            variant={activeTab === tab.key ? "default" : "outline"}
            className={`rounded-lg shadow-none px-6 ${
              activeTab === tab.key
                ? "bg-[#93C01F] hover:bg-[#7ea919] text-white border-[#93C01F]"
                : "border-gray-200 text-gray-500"
            }`}
            onClick={() => {
              setActiveTab(tab.key as TabType);
              setCurrentPage(1);
            }}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* --- LISTINGS VIEW --- */}
      <>
          {/* Filters Section */}
          <div className="p-1 space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative w-full md:w-1/3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search listings..."
                  className="rounded-lg pl-9 shadow-none"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex gap-3">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="rounded-lg shadow-none w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="rounded-lg shadow-none w-[150px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="community">Community</SelectItem>
                    <SelectItem value="event">Event</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Table */}
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-200">
                    <TableHead className="font-semibold">
                      Listing Name
                    </TableHead>
                    <TableHead className="font-semibold">Vendor</TableHead>
                    <TableHead className="font-semibold">
                      Category & Location
                    </TableHead>
                    <TableHead className="font-semibold">Type</TableHead>
                    <TableHead className="font-semibold">
                      Approval Status
                    </TableHead>
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
                        Loading listings...
                      </TableCell>
                    </TableRow>
                  ) : displayData.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center py-8 text-gray-500"
                      >
                        No listings found
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayData.map((item) => (
                      <TableRow
                        key={item.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => openPreview(item)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage
                                src={item.image}
                                className="object-cover"
                              />
                              <AvatarFallback>
                                {getInitials(item.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{item.name}</span>
                            {item.verified && (
                              <Image
                                src="/images/icons/verify.svg"
                                alt="Verified"
                                width={16}
                                height={16}
                              />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{item.vendor}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <span>{item.category}</span>
                            <span className="text-gray-400">•</span>
                            <span className="text-gray-600">
                              {item.location}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="capitalize">{item.type}</span>
                        </TableCell>

                        {/* --- STATIC APPROVAL STATUS BADGE --- */}
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Badge
                            variant={getApprovalBadgeVariant(item.approval)}
                            className={`flex w-fit items-center gap-1 ${
                              item.approval === "Approved"
                                ? "bg-green-600 hover:bg-green-700"
                                : ""
                            }`}
                          >
                            {item.approval}
                          </Badge>
                          {item.approval === "Pending" && item.readiness && <div className="mt-2 space-y-1"><p className={`text-xs ${item.readiness.is_complete ? "text-green-700" : "text-amber-700"}`}>{item.readiness.is_complete ? "Ready" : `${item.readiness.missing_count} blocker(s)`}</p>{item.readiness.changed_since_review_began && <p className="text-xs font-medium text-blue-700">Changed since review began{item.readiness.review_content_updated_at ? ` · ${new Date(item.readiness.review_content_updated_at).toLocaleString()}` : ""}</p>}{item.reviewSubmittedAt && <p className="text-[11px] text-gray-400">Submitted {new Date(item.reviewSubmittedAt).toLocaleString()}</p>}</div>}
                        </TableCell>

                        {/* --- ACTIONS MENU: View Details → details page --- */}
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() =>
                                  router.push(`/dashboard/listings/${item.slug}`)
                                }
                                className="cursor-pointer"
                              >
                                <Eye className="mr-1 h-4 w-4" /> View Details
                              </DropdownMenuItem>
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
            {!isLoading && displayData.length > 0 && (
              <div className="flex items-center justify-between pt-4">
                <span className="text-sm text-gray-600">
                  Showing page {currentPage} of {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handlePrevious}
                    disabled={currentPage === 1}
                    className="h-8 w-8 border rounded-full"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                  <div className="flex items-center gap-1 border rounded-full px-1">
                    {getPageNumbers().map((page) => (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "ghost"}
                        size="icon"
                        onClick={() => handlePageChange(page)}
                        className={`h-8 w-8 rounded-full ${
                          currentPage === page
                            ? "bg-[#93C01F] text-white hover:bg-[#93C01F]/90"
                            : "hover:bg-gray-100 text-gray-700"
                        }`}
                      >
                        {page}
                      </Button>
                    ))}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleNext}
                    disabled={currentPage === totalPages}
                    className="h-8 w-8 border rounded-full"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </>

      {/* --- PREVIEW SIDEBAR (SHEET) --- */}
      <Sheet
        open={!!selectedListing}
        onOpenChange={(open) => !open && setSelectedListing(null)}
      >
        <SheetContent className="w-[400px] sm:w-[540px] p-0 overflow-y-auto">
          {selectedListing &&
            (() => {
              const socials = selectedListing.contactInfo?.socials;
              const hasSocials = !!(
                socials?.facebook ||
                socials?.instagram ||
                socials?.twitter ||
                socials?.tiktok ||
                socials?.youtube ||
                socials?.whatsapp
              );
              const website = selectedListing.contactInfo?.website;
              const websiteLabel = website
                ? website.replace(/^https?:\/\//, "").replace(/\/$/, "")
                : "";
              return (
                <>
                  {/* Header */}
                  <div className="p-6 pb-2 border-b border-gray-100">
                    <div
                      className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer hover:text-gray-900 mb-2"
                      onClick={() => setSelectedListing(null)}
                    >
                      <ChevronLeft className="w-4 h-4" /> Listings
                    </div>
                    <SheetTitle className="text-2xl font-bold flex items-center gap-0.5">
                      {selectedListing.name}
                      {selectedListing.verified && (
                        <Image
                          src="/images/icons/verify.svg"
                          alt="Verified"
                          width={20}
                          height={20}
                        />
                      )}
                    </SheetTitle>
                  </div>

                  {/* Content */}
                  <div className="p-6 space-y-8">
                    {/* Info Grid */}
                    <div className="grid grid-cols-[24px_1fr_auto] gap-y-6 gap-x-3 items-center text-sm">
                      <RefreshCcw className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-500">Status</span>
                      <div className="justify-self-end">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                            selectedListing.approval,
                          )}`}
                        >
                          {selectedListing.approval}
                        </span>
                      </div>

                      <User className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-500">Vendor</span>
                      <div className="justify-self-end flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage
                            src={selectedListing.vendorAvatar}
                            className="object-cover"
                          />
                          <AvatarFallback className="text-[10px]">
                            {getInitials(selectedListing.vendor)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-gray-900">
                          {selectedListing.vendor}
                        </span>
                      </div>

                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-500">Location</span>
                      <div className="justify-self-end font-medium text-gray-900">
                        {selectedListing.location}
                      </div>

                      <Tag className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-500">Type</span>
                      <div className="justify-self-end font-medium text-gray-900 capitalize">
                        {selectedListing.type}
                      </div>

                      <Gem className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-500">Plan</span>
                      <div className="justify-self-end">
                        <span className="bg-[#548235] text-white px-2.5 py-0.5 rounded-full text-xs font-medium">
                          {selectedListing.plan || "Basic"}
                        </span>
                      </div>

                      {selectedListing.userInfo && (
                        <>
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-500">Owner</span>
                          <div className="justify-self-end font-medium text-gray-900">
                            {selectedListing.userInfo.name}
                            {selectedListing.userInfo.email && (
                              <div className="text-xs text-gray-500">
                                {selectedListing.userInfo.email}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                      <h3 className="font-semibold text-gray-900">
                        Listing Description
                      </h3>
                      <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-600 leading-relaxed border border-gray-100 whitespace-pre-line">
                        {selectedListing.description ? (
                          <RichTextDisplay html={selectedListing.description} />
                        ) : (
                          <span className="text-gray-400">
                            No description provided.
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Tabs: Media & Contact */}
                    <Tabs defaultValue="media" className="w-full">
                      <div className="border-b border-gray-200 w-full">
                        <TabsList className="w-full justify-start h-auto p-0 bg-transparent gap-4">
                          <TabsTrigger
                            value="media"
                            className="rounded-none border-b-2 border-transparent bg-transparent px-4 py-3 text-sm font-medium text-gray-500 shadow-none transition-none hover:text-gray-700 data-[state=active]:border-b-[#93C01F] data-[state=active]:bg-transparent data-[state=active]:text-[#93C01F] data-[state=active]:shadow-none"
                          >
                            Media
                          </TabsTrigger>
                          <TabsTrigger
                            value="contact"
                            className="rounded-none border-b-2 border-transparent bg-transparent px-4 py-3 text-sm font-medium text-gray-500 shadow-none transition-none hover:text-gray-700 data-[state=active]:border-b-[#93C01F] data-[state=active]:bg-transparent data-[state=active]:text-[#93C01F] data-[state=active]:shadow-none"
                          >
                            Contact Info
                          </TabsTrigger>
                        </TabsList>
                      </div>

                      <div className="mt-4">
                        <TabsContent value="media" className="mt-0">
                          <div className="grid grid-cols-2 gap-4">
                            {selectedListing.images &&
                            selectedListing.images.length > 0 ? (
                              selectedListing.images.slice(0, 4).map((img, index) => (
                                <div
                                  key={index}
                                  className="aspect-square bg-gray-100 rounded-lg relative overflow-hidden"
                                >
                                  <Image
                                    src={img}
                                    alt={`Media ${index + 1}`}
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 768px) 100vw, 50vw"
                                    unoptimized
                                  />
                                </div>
                              ))
                            ) : (
                              <div className="col-span-2 text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                <p className="text-gray-400 text-sm">
                                  No media uploaded
                                </p>
                              </div>
                            )}
                          </div>
                        </TabsContent>

                        <TabsContent value="contact" className="mt-0">
                          <div className="space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
                            {selectedListing.contactInfo?.phone && (
                              <div className="flex items-center gap-3">
                                <Phone className="w-4 h-4 text-gray-500" />
                                <span className="text-sm text-gray-700">
                                  {selectedListing.contactInfo.phone}
                                </span>
                              </div>
                            )}
                            {selectedListing.contactInfo?.email && (
                              <div className="flex items-center gap-3">
                                <Mail className="w-4 h-4 text-gray-500" />
                                <span className="text-sm text-gray-700">
                                  {selectedListing.contactInfo.email}
                                </span>
                              </div>
                            )}
                            {website && (
                              <div className="flex items-center gap-3">
                                <Globe className="w-4 h-4 text-gray-500" />
                                <a
                                  href={
                                    website.startsWith("http")
                                      ? website
                                      : `https://${website}`
                                  }
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-sm text-blue-600 hover:underline truncate"
                                >
                                  {websiteLabel}
                                </a>
                              </div>
                            )}
                            {!selectedListing.contactInfo?.phone &&
                              !selectedListing.contactInfo?.email &&
                              !website &&
                              !hasSocials && (
                                <div className="text-center py-4 text-gray-400 text-sm">
                                  No contact information available
                                </div>
                              )}

                            {hasSocials && (
                              <div className="pt-2 border-t border-gray-200 mt-2">
                                <p className="text-xs font-semibold text-gray-500 mb-2 uppercase">
                                  Social Links
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                  <SocialLink href={socials?.facebook} icon={Facebook} label="Facebook" />
                                  <SocialLink href={socials?.instagram} icon={Instagram} label="Instagram" />
                                  <SocialLink href={socials?.twitter} icon={Twitter} label="Twitter" />
                                  <SocialLink href={socials?.tiktok} icon={Music2} label="TikTok" />
                                  <SocialLink href={socials?.youtube} icon={Youtube} label="YouTube" />
                                  <SocialLink href={socials?.whatsapp} icon={MessageCircle} label="WhatsApp" />
                                </div>
                              </div>
                            )}
                          </div>
                        </TabsContent>
                      </div>
                    </Tabs>

                    {/* Open full details page */}
                    <Button
                      onClick={() =>
                        router.push(`/dashboard/listings/${selectedListing.slug}`)
                      }
                      className="w-full bg-[#93C01F] hover:bg-[#7ea919] text-white gap-2"
                    >
                      <Eye className="w-4 h-4" /> View full details
                    </Button>
                  </div>
                </>
              );
            })()}
        </SheetContent>
      </Sheet>
    </div>
  );
}

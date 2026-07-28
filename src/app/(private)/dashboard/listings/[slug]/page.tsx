/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/context/auth-context";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RichTextDisplay } from "@/components/ui/rich-text-editor";
import { ListingImageGallery } from "@/components/dashboard/listing/listing-image-gallery";
import { ListingReadiness } from "@/lib/listing-form-v2";
import { formatEventDateRange, formatEventTimeRange } from "@/lib/directory/event-formatting";
import { AddressMinimap } from "@mapbox/search-js-react";
import type { Feature, GeoJsonProperties, Point } from "geojson";
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
  ChevronLeft,
  User,
  Users,
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
  Calendar,
  Clock,
  Ticket,
  Briefcase,
  Eye,
  Bookmark,
  Star,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Trash2,
  Loader2,
} from "lucide-react";

// --- Types ---
interface OpeningHour {
  day_of_week: string;
  open_time: string;
  close_time: string;
}
interface ServiceItem {
  slug: string;
  name: string;
  image?: string | null;
  description?: string | null;
}
interface ApiEventTicketType {
  id?: number;
  slug: string;
  name: string;
  description?: string | null;
  price: string | number;
  sort_order?: number;
  is_active?: boolean;
}

interface EventInfo {
  slug?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  venue?: string | null;
  venue_address?: string | null;
  city?: string | null;
  country?: string | null;
  price?: string | number | null;
  currency?: string | null;
  location_type?: string | null;
  timezone?: string | null;
  timezone_label?: string | null;
  spans_multiple_days?: boolean;
  is_all_day?: boolean;
  online_access_policy?: string | null;
  online_access_instructions?: string | null;
  online_url?: string | null;
  attendance_type?: string | null;
  admission_availability?: string | null;
  registration_url?: string | null;
  pricing_mode?: string | null;
  purchase_method?: string | null;
  purchase_instructions?: string | null;
  ticket_url?: string | null;
  ticket_provider?: string | null;
  ticket_release_at?: string | null;
  ticket_availability_message?: string | null;
  ticket_types?: ApiEventTicketType[];
  price_range?: { min: number; max: number } | null;
}
interface ListingDetail {
  id: string;
  slug: string;
  name: string;
  vendor: string;
  vendorAvatar?: string;
  category: string;
  subcategory?: string;
  location: string;
  type: string;
  approval: "Approved" | "Pending" | "Draft" | "Rejected" | "Suspended" | "Archived";
  status: string;
  image: string;
  images: string[];
  plan: string;
  description: string; // HTML (from `bio`)
  verified: boolean;
  businessRegNum?: string | null;
  claimStatus?: string | null;
  statusReason?: string | null;
  stats: {
    views: number;
    uniqueVisitors: number;
    bookmarks: number;
    rating: number;
    ratingsCount: number;
  };
  event?: EventInfo;
  services: ServiceItem[];
  openingHours: OpeningHour[];
  userInfo?: { name: string; email?: string };
  contactInfo: {
    phone?: string;
    secondaryPhone?: string;
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
  readiness?: ListingReadiness;
  reviewSubmittedAt?: string | null;
  raw: any;
  archived: boolean;
}

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

const getImageUrl = (url: string | undefined): string => {
  if (!url) return "/images/no-image.jpg";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  // Backend returns bare S3 keys e.g. "staging/services/uuid.png"
  return `https://mefie-bucket.s3.eu-north-1.amazonaws.com/${url.replace(/^\//, "")}`;
};

// Maps a raw single-listing payload into the shape this page renders.
const mapListing = (item: any): ListingDetail => {
  let vendorName = "Unknown Vendor";
  let userInfo: { name: string; email?: string } | undefined;
  if (item.user) {
    if (item.user.first_name && item.user.last_name) {
      vendorName = `${item.user.first_name} ${item.user.last_name}`;
    } else if (item.user.name) {
      vendorName = item.user.name;
    } else if (item.user.email) {
      vendorName = item.user.email.split("@")[0];
    }
    userInfo = { name: vendorName, email: item.user.email };
  } else if (item.vendor || item.business_name) {
    vendorName = item.vendor || item.business_name;
  }

  const images: string[] = Array.isArray(item.images)
    ? item.images
        .filter((img: any) => !!(img.original || img))
        .map((img: any) => getImageUrl(img.original || img))
    : [];
  const image =
    images[0] ||
    getImageUrl(item.image || item.thumbnail) ||
    "/images/no-image.jpg";

  let category = "General";
  let subcategory = "";
  if (Array.isArray(item.categories) && item.categories.length > 0) {
    const mains = item.categories.filter(
      (c: any) => c.parent_slug == null || c.type === "mainCategory",
    );
    const subs = item.categories.filter(
      (c: any) => c.parent_slug != null && c.type !== "mainCategory",
    );
    category = (mains.length > 0 ? mains : item.categories)
      .map((c: any) => c.name)
      .join(", ");
    subcategory = subs.map((c: any) => c.name).join(", ");
  } else if (item.category) {
    category = item.category;
  }

  // Events carry their location under event_* fields; businesses/communities
  // use the top-level address/city/country instead.
  let location = "";
  if (item.type === "event") {
    location = [
      item.event_venue,
      item.event_venue_address,
      item.event_city,
      item.event_country,
    ]
      .filter(Boolean)
      .join(", ");
  } else if (item.city && item.country) {
    location = `${item.city}, ${item.country}`;
  } else if (item.address) {
    location = item.address;
  } else if (item.country) {
    location = item.country;
  } else if (item.location) {
    location = item.location;
  }

  const rawStatus = (item.status || "pending").toLowerCase();
  let approval: ListingDetail["approval"] = "Pending";
  if (item.archived) approval = "Archived";
  else if (rawStatus === "approved" || rawStatus === "published")
    approval = "Approved";
  else if (rawStatus === "draft") approval = "Draft";
  else if (rawStatus === "rejected") approval = "Rejected";
  else if (rawStatus === "suspended") approval = "Suspended";

  const socials = Array.isArray(item.socials)
    ? item.socials[0] || {}
    : item.socials || {};

  const services: ServiceItem[] = Array.isArray(item.services)
    ? item.services.map((s: any) => ({
        slug: s.slug,
        name: s.name,
        image: s.image ? getImageUrl(s.image) : null,
        description: s.description,
      }))
    : [];

  const openingHours: OpeningHour[] = Array.isArray(item.opening_hours)
    ? item.opening_hours.map((h: any) => ({
        day_of_week: h.day_of_week,
        open_time: h.open_time,
        close_time: h.close_time,
      }))
    : [];

  const eventData = item.event || {};
  const event: EventInfo | undefined =
    item.type === "event"
      ? {
          slug: eventData.slug,
          start_date: eventData.event_start_date ?? item.event_start_date,
          end_date: eventData.event_end_date ?? item.event_end_date,
          start_time: eventData.event_start_time ?? item.event_start_time,
          end_time: eventData.event_end_time ?? item.event_end_time,
          venue: eventData.event_venue ?? item.event_venue,
          venue_address: eventData.event_venue_address ?? item.event_venue_address,
          city: eventData.event_city ?? item.event_city,
          country: eventData.event_country ?? item.event_country,
          price: eventData.event_price ?? item.event_price,
          currency: eventData.event_currency ?? item.event_currency,
          location_type: eventData.event_location_type ?? item.event_location_type,
          timezone: eventData.timezone,
          timezone_label: eventData.timezone_label,
          spans_multiple_days: eventData.spans_multiple_days,
          is_all_day: Boolean(eventData.is_all_day),
          online_access_policy: eventData.online_access_policy,
          online_access_instructions: eventData.online_access_instructions,
          online_url: eventData.event_online_url,
          attendance_type: eventData.attendance_type,
          admission_availability: eventData.admission_availability,
          registration_url: eventData.registration_url,
          pricing_mode: eventData.pricing_mode,
          purchase_method: eventData.purchase_method,
          purchase_instructions: eventData.purchase_instructions,
          ticket_url: eventData.event_ticket_url,
          ticket_provider: eventData.ticket_provider,
          ticket_release_at: eventData.ticket_release_at,
          ticket_availability_message: eventData.ticket_availability_message,
          ticket_types: eventData.ticket_types,
          price_range: eventData.price_range,
        }
      : undefined;

  return {
    id: item.id?.toString() || "",
    slug: item.slug || item.id?.toString() || "",
    name: item.name || item.title || "Untitled Listing",
    vendor: vendorName,
    vendorAvatar: item.vendorAvatar || item.vendor_image || "",
    category,
    subcategory: subcategory || undefined,
    location,
    type: item.type || "business",
    approval,
    status: rawStatus,
    image,
    images: images.length > 0 ? images : image ? [image] : [],
    plan: item.plan || "Basic",
    description: item.bio || item.description || "",
    verified: !!(item.listing_verified ?? item.is_verified),
    businessRegNum: item.business_reg_num,
    claimStatus: item.claim_status,
    statusReason: item.status_reason,
    stats: {
      views: item.views_count ?? 0,
      uniqueVisitors: item.unique_visitors_count ?? 0,
      bookmarks: item.bookmarks_count ?? 0,
      rating: item.rating ?? 0,
      ratingsCount: item.ratings_count ?? 0,
    },
    event,
    services,
    openingHours,
    userInfo,
    contactInfo: {
      phone: item.primary_phone,
      secondaryPhone: item.secondary_phone,
      email: item.email,
      website: item.website,
      socials: {
        facebook: socials?.facebook,
        instagram: socials?.instagram,
        twitter: socials?.twitter,
        tiktok: socials?.tiktok,
        youtube: socials?.youtube,
        whatsapp: socials?.whatsapp,
      },
    },
    readiness: item.submission_readiness,
    reviewSubmittedAt: item.submission_readiness?.review_submitted_at ?? null,
    raw: item,
    archived: Boolean(item.archived),
  };
};

// const getStatusColor = (status: string) => {
//   if (status === "Approved") return "bg-[#E9F5D6] text-[#5F8B0A]";
//   if (status === "Pending") return "bg-yellow-100 text-yellow-700";
//   if (status === "Suspended") return "bg-orange-100 text-orange-700";
//   return "bg-red-100 text-red-800";
// };

// "in_person" -> "In Person"
const formatSnakeCase = (value?: string | null) =>
  (value ?? "")
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

function SocialLink({
  href,
  icon: Icon,
  label,
}: {
  href?: string;
  icon: any;
  label: string;
}) {
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
}

// Compact key/value row used inside the Address & Details cards.
function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: any;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-gray-50 last:border-0 text-sm">
      <span className="flex items-center gap-2 text-gray-500 shrink-0">
        <Icon className="w-4 h-4 text-gray-400" />
        {label}
      </span>
      <span className="font-medium text-gray-900 text-right truncate">
        {children}
      </span>
    </div>
  );
}

export default function ListingDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const slug = String(params.slug);
  const { loading: authLoading } = useAuth();

  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [pendingVerify, setPendingVerify] = useState<boolean | null>(null);
  const [moderationAction, setModerationAction] = useState<"approved" | "rejected" | "suspended" | "pending" | null>(null);
  const [moderationReason, setModerationReason] = useState("");
  const [pastEventOverride, setPastEventOverride] = useState(false);
  const [archiveReason, setArchiveReason] = useState("");
  const [statusHistory, setStatusHistory] = useState<Array<{ id: number; from_status: string; to_status: string; reason?: string | null; source: string; past_event_override?: boolean; created_at: string; changed_by?: { name?: string } }>>([]);

  const loadListing = useCallback(async () => {
    if (authLoading) return;
    setIsLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`/api/admin/listings/${slug}`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Failed to load listing");
      const json = await res.json();
      const raw = json.data || json.listing || json;
      const mapped = mapListing(raw);
      setListing(mapped);
      setIsVerified(mapped.verified);
      setStatusHistory(json.status_history?.data ?? json.status_history ?? []);
    } catch {
      setNotFound(true);
    } finally {
      setIsLoading(false);
    }
  }, [slug, authLoading]);

  useEffect(() => {
    loadListing();
  }, [loadListing]);

  const handleStatusUpdate = async (
    newStatus: "approved" | "rejected" | "suspended" | "pending",
    reason?: string,
  ) => {
    if (!listing) return;
    setIsUpdatingStatus(true);
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`/api/listing/${listing.slug}/update_status`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ status: newStatus, status_reason: reason || null, admin_past_event_override: pastEventOverride }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (err.readiness) setListing((current) => current ? { ...current, readiness: err.readiness, raw: { ...current.raw, submission_readiness: err.readiness } } : current);
        const messages = err.errors ? Object.values(err.errors as Record<string, string[]>).flat() : [];
        throw new Error(messages[0] || err.message || "Failed to update status");
      }
      const uiStatus =
        newStatus === "approved"
          ? "Approved"
          : newStatus === "rejected"
            ? "Rejected"
            : newStatus === "suspended" ? "Suspended" : "Pending";
      setListing((prev) => (prev ? { ...prev, approval: uiStatus } : prev));
      toast.success(`Listing ${newStatus}`);
      setModerationAction(null);
      setModerationReason("");
      setPastEventOverride(false);
      await loadListing();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update status",
      );
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleModerationConfirm = async () => {
    if (!moderationAction) return;
    if (["rejected", "suspended", "pending"].includes(moderationAction) && !moderationReason.trim()) {
      toast.error("A reason is required for this moderation action.");
      return;
    }
    await handleStatusUpdate(moderationAction, moderationReason.trim());
  };

  const handleDelete = async () => {
    if (!listing) return;
    setIsDeleting(true);
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`/api/listing/${listing.slug}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ reason: archiveReason.trim() }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.message || "Failed to archive listing");
      toast.success("Listing archived successfully");
      router.push("/dashboard/listings");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to archive listing",
      );
      setIsDeleting(false);
      setShowDelete(false);
    }
  };

  const handleRestoreArchive = async () => {
    if (!listing || !archiveReason.trim()) return;
    setIsDeleting(true);
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`/api/admin/listings/${listing.slug}/restore`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ reason: archiveReason.trim() }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "Failed to restore listing");
      toast.success("Listing restored successfully");
      setShowDelete(false);
      setArchiveReason("");
      await loadListing();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to restore listing");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleVerifyConfirm = async () => {
    if (!listing || pendingVerify === null) return;
    const value = pendingVerify;
    setPendingVerify(null);
    setIsVerifying(true);
    setIsVerified(value);
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`/api/listing/${listing.slug}/verify_listing`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ listing_verified: value }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          (err as any).message || "Failed to update verification",
        );
      }
      setListing((prev) => (prev ? { ...prev, verified: value } : prev));
      toast.success(
        value ? "Listing verified successfully" : "Verification removed",
      );
    } catch (error) {
      setIsVerified(!value);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update verification",
      );
    } finally {
      setIsVerifying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading listing...
      </div>
    );
  }

  if (notFound || !listing) {
    return (
      <div className="p-6 space-y-4">
        <button
          onClick={() => router.push("/dashboard/listings")}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Listings
        </button>
        <div className="text-center py-20 text-gray-400">
          Listing not found.
        </div>
      </div>
    );
  }

  const s = listing.contactInfo.socials || {};
  const hasSocials = !!(
    s.facebook ||
    s.instagram ||
    s.twitter ||
    s.tiktok ||
    s.youtube ||
    s.whatsapp
  );
  const website = listing.contactInfo.website;
  const websiteLabel = website
    ? website.replace(/^https?:\/\//, "").replace(/\/$/, "")
    : "";
  const ev = listing.event;
  const hasPastEventBlocker = listing.readiness?.blockers.some((blocker) => blocker.code === "past_event_submission_blocked") ?? false;
  const latitude = Number(listing.raw.latitude);
  const longitude = Number(listing.raw.longitude);
  const mapFeature: Feature<Point, GeoJsonProperties> | null = Number.isFinite(latitude) && Number.isFinite(longitude)
    ? { type: "Feature", geometry: { type: "Point", coordinates: [longitude, latitude] }, properties: { name: listing.location || listing.name } }
    : null;
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "";

  const TypeIcon =
    listing.type === "event"
      ? Ticket
      : listing.type === "community"
        ? Users
        : Briefcase;

  const statTiles = [
    {
      icon: Eye,
      label: "Views",
      value: listing.stats.views.toLocaleString(),
      tint: "bg-[#F4F9E8] text-[#5F8B0A]",
    },
    {
      icon: User,
      label: "Unique visitors",
      value: listing.stats.uniqueVisitors.toLocaleString(),
      tint: "bg-blue-50 text-blue-600",
    },
    {
      icon: Bookmark,
      label: "Bookmarks",
      value: listing.stats.bookmarks.toLocaleString(),
      tint: "bg-amber-50 text-amber-600",
    },
    {
      icon: Star,
      label: `Rating (${listing.stats.ratingsCount})`,
      value: String(listing.stats.rating),
      tint: "bg-purple-50 text-purple-600",
    },
  ];

  return (
    <div className="p-2 lg:p-6 max-w-6xl mx-auto space-y-8">
      {/* Back */}
      <button
        onClick={() => router.push("/dashboard/listings")}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900"
      >
        <ChevronLeft className="w-4 h-4" /> Back to Listings
      </button>

      {/* Hero: image gallery (left) + info column (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Left: carousel + description + stats */}
        <div className="lg:col-span-3 space-y-5">
          <ListingImageGallery
            images={listing.images}
            alt={listing.name}
            verified={isVerified}
          />

          {/* Description */}
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-900 text-sm">Description</h3>
            <div className="bg-gray-50 p-4 rounded-xl text-sm text-gray-600 leading-relaxed border border-gray-100">
              {listing.description ? (
                <RichTextDisplay html={listing.description} />
              ) : (
                <span className="text-gray-400">No description provided.</span>
              )}
            </div>
          </div>

          {/* Stat tiles */}
          <div className="grid grid-cols-2 gap-3">
            {statTiles.map((tile) => (
              <div
                key={tile.label}
                className="flex items-center gap-3 p-3.5 rounded-xl border border-gray-100 bg-white"
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${tile.tint}`}
                >
                  <tile.icon className="w-4.5 h-4.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-base font-bold text-gray-900 leading-none">
                    {tile.value}
                  </p>
                  <p className="text-xs text-gray-500 truncate mt-1">
                    {tile.label}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Services — compact, paired 2-up grid like the Overview tiles */}
          {listing.services.length > 0 && (
            <div className="rounded-xl border border-gray-100 bg-white p-4">
              <h3 className="font-semibold text-gray-900 text-sm mb-3 flex items-center gap-2">
                {/* <Briefcase className="w-4 h-4 text-[#93C01F]" /> Services */}
                Services
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {listing.services.map((svc) => (
                  <div
                    key={svc.slug}
                    className="flex items-start gap-2.5 p-2.5 rounded-lg border border-gray-100"
                  >
                    <div className="w-11 h-11 rounded-md overflow-hidden bg-gray-100 shrink-0 relative">
                      {svc.image ? (
                        <Image
                          src={svc.image}
                          alt={svc.name}
                          fill
                          className="object-cover"
                          sizes="44px"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <Briefcase className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {svc.name}
                      </p>
                      {svc.description && (
                        <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
                          {svc.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: title, manage actions, address & details */}
        <div className="lg:col-span-2 space-y-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-1.5">
              {listing.name}
              {isVerified && (
                <Image
                  src="/images/icons/verify.svg"
                  alt="Verified"
                  width={20}
                  height={20}
                />
              )}
            </h1>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              {/* <span
                className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(
                  listing.approval,
                )}`}
              >
                {listing.approval}
              </span> */}
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 capitalize">
                <TypeIcon className="w-3 h-3" />
                {listing.type}
              </span>
            </div>
          </div>

          {/* Sidebar slot: moderation actions + verify toggle */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 space-y-5">
            <div className="rounded-xl border bg-gray-50 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div><p className="text-xs text-gray-500">Moderation status</p><p className="font-semibold">{listing.approval}{listing.approval === "Approved" ? " · Published" : ""}</p></div>
                {listing.readiness?.changed_since_review_began && <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800">Changed since review began</span>}
              </div>
              {listing.reviewSubmittedAt && <p className="text-xs text-gray-500">Submitted {new Date(listing.reviewSubmittedAt).toLocaleString()}</p>}
              {listing.readiness && <div><p className="text-sm font-medium">{listing.readiness.is_complete ? "Ready for approval" : `${listing.readiness.missing_count} required item(s) need attention`}</p>
                {listing.readiness.blockers.length > 0 && <div className="mt-2 space-y-2">{listing.readiness.blockers.map((blocker) => <div key={blocker.code} className="rounded-md border border-amber-200 bg-amber-50 p-2 text-sm text-amber-900"><span className="font-medium capitalize">{blocker.step.replaceAll("_", " ")}:</span> {blocker.message}</div>)}</div>}
                {listing.readiness.recommendations.length > 0 && <div className="mt-3 border-t pt-2"><p className="text-xs font-medium text-gray-600">Optional recommendations</p>{listing.readiness.recommendations.map((item) => <p key={item.code} className="mt-1 text-xs text-gray-500">• {item.message}</p>)}</div>}
              </div>}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm mb-3">
                Manage Listing
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                {listing.status === "pending" && <Button
                  onClick={() => setModerationAction("approved")}
                  disabled={isUpdatingStatus || (!listing.readiness?.is_complete && !(hasPastEventBlocker && listing.readiness?.missing_count === 1))}
                  className="bg-[#93C01F] hover:bg-[#7ea919] text-white gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Approve & publish
                </Button>}
                {listing.status === "approved" && <Button
                  onClick={() => setModerationAction("suspended")}
                  disabled={isUpdatingStatus}
                  variant="outline" className="text-orange-700 gap-1.5"
                >
                  <AlertTriangle className="w-4 h-4" />
                  Suspend
                </Button>}
                {listing.status === "pending" && <Button
                  onClick={() => setModerationAction("rejected")}
                  disabled={isUpdatingStatus}
                  variant="outline" className="text-red-700 gap-1.5"
                >
                  <XCircle className="w-4 h-4" />
                  Reject
                </Button>}
                {listing.status === "suspended" && <Button onClick={() => setModerationAction("pending")} disabled={isUpdatingStatus} className="gap-1.5"><CheckCircle2 className="h-4 w-4" />Restore to review</Button>}
                {(listing.status === "draft" || listing.status === "rejected") && <p className="text-sm text-gray-500">{listing.status === "draft" ? "Awaiting creator submission." : "Awaiting creator corrections and resubmission."}</p>}

              </div>
            </div>

            <div className="border-t border-gray-100 pt-4 flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium text-gray-900">
                  Verify Listing
                </Label>
                <p className="text-xs text-gray-500">
                  Show a verified badge on this listing
                </p>
              </div>
              <Switch
                checked={pendingVerify !== null ? pendingVerify : isVerified}
                onCheckedChange={(checked) => setPendingVerify(checked)}
                disabled={isVerifying || listing.status !== "approved" || listing.archived}
                className="data-[state=checked]:bg-[#93C01F]"
              />
            </div>
            <div className="border-t border-gray-100 pt-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Archive administration</p>
              {listing.archived ? (
                <Button onClick={() => { setArchiveReason(""); setShowDelete(true); }} variant="outline">Restore archived listing</Button>
              ) : ["draft", "rejected"].includes(listing.status) ? (
                <Button onClick={() => { setArchiveReason(""); setShowDelete(true); }} variant="outline" className="text-red-600"><Trash2 className="mr-2 h-4 w-4" />Archive listing</Button>
              ) : (
                <p className="text-sm text-gray-500">Only Draft or Rejected listings can be archived.</p>
              )}
            </div>
          </div>

          {/* Listing Details */}
          <div className="rounded-xl border border-gray-100 bg-white p-4">
            <h3 className="font-semibold text-gray-900 text-sm mb-1">
              Listing Details
            </h3>
            <InfoRow icon={Gem} label="Subscription">
              <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#548235]/10 text-[#548235]">
                {listing.plan || "Basic"} plan
              </span>
            </InfoRow>

            {listing.type === "event" && ev && (ev.start_date || ev.end_date) && (
              <InfoRow icon={Calendar} label="Date">
                {formatEventDateRange({ startDate: ev.start_date, endDate: ev.end_date, spansMultipleDays: ev.spans_multiple_days })}
              </InfoRow>
            )}
            {listing.type === "event" && ev && (ev.start_time || ev.end_time) && (
              <InfoRow icon={Clock} label="Time">
                {formatEventTimeRange({
                  startDate: ev.start_date,
                  endDate: ev.end_date,
                  startTime: ev.start_time,
                  endTime: ev.end_time,
                  spansMultipleDays: ev.spans_multiple_days,
                  timezoneLabel: ev.timezone_label,
                })}
              </InfoRow>
            )}

            {/* Venue (events) or Location (business/community) — a single
                row so the address never appears twice. `listing.location`
                is already derived from the right source fields per type. */}
            <InfoRow
              icon={MapPin}
              label={listing.type === "event" ? "Venue" : "Location"}
            >
              {listing.location || "—"}
            </InfoRow>

            {listing.type === "event" && ev?.location_type && (
              <InfoRow icon={Globe} label="Format">
                {formatSnakeCase(ev.location_type)}
              </InfoRow>
            )}

            <InfoRow icon={Tag} label="Category">
              {listing.category}
            </InfoRow>
            {listing.subcategory && (
              <InfoRow icon={Tag} label="Sub category">
                {listing.subcategory}
              </InfoRow>
            )}
            {website && (
              <InfoRow icon={Globe} label="Website">
                <a
                  href={
                    website.startsWith("http") ? website : `https://${website}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {websiteLabel}
                </a>
              </InfoRow>
            )}

            {listing.type === "event" &&
              ev &&
              ev.price != null &&
              ev.price !== "" && (
                <InfoRow icon={Ticket} label="Price">
                  {ev.currency ? `${ev.currency} ` : ""}
                  {ev.price}
                </InfoRow>
              )}

            {listing.businessRegNum && (
              <InfoRow icon={Briefcase} label="Business reg. no.">
                {listing.businessRegNum}
              </InfoRow>
            )}
            {listing.claimStatus && (
              <InfoRow icon={CheckCircle2} label="Claim status">
                <span className="capitalize">{listing.claimStatus}</span>
              </InfoRow>
            )}
          </div>

          {/* Type-specific V2 moderation details */}
          <div className="rounded-xl border border-gray-100 bg-white p-4">
            <h3 className="font-semibold text-gray-900 text-sm mb-2">{listing.type === "business" ? "Business operations" : listing.type === "community" ? "Community participation" : "Event access & ticketing"}</h3>
            {listing.type === "business" && <>
              <InfoRow icon={Briefcase} label="Operating presence">{formatSnakeCase(listing.raw.business_presence_type) || "—"}</InfoRow>
              <InfoRow icon={Globe} label="Service reach">{formatSnakeCase(listing.raw.business_service_reach) || "—"}</InfoRow>
              {Array.isArray(listing.raw.service_countries) && <InfoRow icon={Globe} label="Service countries">{listing.raw.service_countries.map((country: { name: string }) => country.name).join(", ") || "—"}</InfoRow>}
              <InfoRow icon={Clock} label="Availability">{formatSnakeCase(listing.raw.business_hours_mode) || "—"}</InfoRow>
            </>}
            {listing.type === "community" && <>
              <InfoRow icon={Users} label="Location scope">{formatSnakeCase(listing.raw.community_location_scope) || "—"}</InfoRow>
              <div className="border-t py-3"><p className="text-xs text-gray-500">Participation method</p><p className="mt-1 whitespace-pre-wrap text-sm text-gray-900">{listing.raw.community_participation_method || "—"}</p></div>
            </>}
            {listing.type === "event" && ev && <>
              <InfoRow icon={Globe} label="Timezone">{ev.timezone ? `${ev.timezone}${ev.timezone_label ? ` (${ev.timezone_label})` : ""}` : "—"}</InfoRow>
              <InfoRow icon={Calendar} label="Schedule type">{ev.is_all_day ? "All-day" : "Timed"}</InfoRow>
              <InfoRow icon={Globe} label="Online access policy">{formatSnakeCase(ev.online_access_policy) || "—"}</InfoRow>
              {ev.online_url && <InfoRow icon={Globe} label="Public access URL"><a href={ev.online_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Open link</a></InfoRow>}
              {ev.online_access_instructions && <div className="border-t py-3"><p className="text-xs text-gray-500">Access instructions</p><p className="mt-1 whitespace-pre-wrap text-sm">{ev.online_access_instructions}</p></div>}
              <InfoRow icon={Ticket} label="Attendance">{formatSnakeCase(ev.attendance_type) || "—"}</InfoRow>
              {ev.admission_availability && <InfoRow icon={Ticket} label="Admission availability">{formatSnakeCase(ev.admission_availability)}</InfoRow>}
              {ev.attendance_type === "paid" && ev.pricing_mode === "fixed" && ev.price != null && ev.price !== "" && <InfoRow icon={Ticket} label="Price">{ev.currency ? `${ev.currency} ` : ""}{ev.price}</InfoRow>}
              {ev.pricing_mode === "multiple" && ev.price_range && <InfoRow icon={Ticket} label="Price range">{ev.currency ? `${ev.currency} ` : ""}{ev.price_range.min === ev.price_range.max ? ev.price_range.min : `${ev.price_range.min} – ${ev.price_range.max}`}</InfoRow>}
              {ev.pricing_mode === "multiple" && ev.ticket_types && ev.ticket_types.filter((t) => t.is_active !== false).length > 0 && (
                <div className="border-t py-3">
                  <p className="text-xs text-gray-500 mb-1.5">Ticket types</p>
                  <div className="space-y-1">
                    {ev.ticket_types.filter((t) => t.is_active !== false).map((t) => (
                      <div key={t.slug} className="flex items-center justify-between text-sm">
                        <span>{t.name}</span>
                        <span className="font-medium text-gray-900">{ev.currency ? `${ev.currency} ` : ""}{t.price}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {ev.pricing_mode === "varies" && <InfoRow icon={Ticket} label="Price">Varies</InfoRow>}
              {ev.attendance_type === "paid" && ev.purchase_method && <InfoRow icon={Ticket} label="Purchase method">{formatSnakeCase(ev.purchase_method)}</InfoRow>}
              {ev.registration_url && <InfoRow icon={Ticket} label="Registration"><a href={ev.registration_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Open registration</a></InfoRow>}
              {ev.purchase_method === "external_url" && ev.ticket_url && <InfoRow icon={Ticket} label="Ticket URL"><a href={ev.ticket_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Open tickets</a></InfoRow>}
              {ev.ticket_provider && <InfoRow icon={Ticket} label="Ticket provider">{ev.ticket_provider}</InfoRow>}
              {ev.purchase_instructions && <div className="border-t py-3"><p className="text-xs text-gray-500">Purchase instructions</p><p className="mt-1 whitespace-pre-wrap text-sm">{ev.purchase_instructions}</p></div>}
              {ev.ticket_availability_message && <div className="border-t py-3"><p className="text-xs text-gray-500">Ticket availability message</p><p className="mt-1 text-sm">{ev.ticket_availability_message}</p></div>}
              {ev.admission_availability === "coming_soon" && ev.ticket_release_at && <InfoRow icon={Ticket} label="Release time">{new Date(ev.ticket_release_at).toLocaleString()}</InfoRow>}
            </>}
            {mapFeature && mapboxToken && <div className="mt-3 h-40 overflow-hidden rounded-lg border"><AddressMinimap show feature={mapFeature} accessToken={mapboxToken} /></div>}
          </div>

          {statusHistory.length > 0 && <div className="rounded-xl border border-gray-100 bg-white p-4"><h3 className="font-semibold text-gray-900 text-sm mb-3">Status history</h3><div className="space-y-3">{statusHistory.map((entry) => <div key={entry.id} className="border-l-2 border-gray-200 pl-3 text-sm"><p className="font-medium capitalize">{entry.from_status} → {entry.to_status}</p>{entry.past_event_override && <p className="text-xs font-medium text-amber-700">Past-event exception used</p>}{entry.reason && <p className="text-gray-600">{entry.reason}</p>}<p className="text-xs text-gray-400">{entry.changed_by?.name ? `${entry.changed_by.name} · ` : ""}{formatSnakeCase(entry.source)} · {new Date(entry.created_at).toLocaleString()}</p></div>)}</div></div>}

          {/* Social Links */}
          {hasSocials && (
            <div className="rounded-xl border border-gray-100 bg-white p-4">
              <h3 className="font-semibold text-gray-900 text-sm mb-3">
                Social Links
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <SocialLink
                  href={s.facebook}
                  icon={Facebook}
                  label="Facebook"
                />
                <SocialLink
                  href={s.instagram}
                  icon={Instagram}
                  label="Instagram"
                />
                <SocialLink href={s.twitter} icon={Twitter} label="Twitter" />
                <SocialLink href={s.tiktok} icon={Music2} label="TikTok" />
                <SocialLink href={s.youtube} icon={Youtube} label="YouTube" />
                <SocialLink
                  href={s.whatsapp}
                  icon={MessageCircle}
                  label="WhatsApp"
                />
              </div>
            </div>
          )}

          {/* Opening Hours */}
          {listing.openingHours.length > 0 && (
            <div className="rounded-xl border border-gray-100 bg-white p-4">
              <h3 className="font-semibold text-gray-900 text-sm mb-1 flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#93C01F]" /> Opening Hours
              </h3>
              <div className="divide-y divide-gray-50">
                {listing.openingHours.map((h) => (
                  <div
                    key={h.day_of_week}
                    className="flex items-center justify-between py-2.5 text-sm"
                  >
                    <span className="text-gray-500">{h.day_of_week}</span>
                    <span className="font-medium text-gray-900">
                      {h.open_time?.slice(0, 5)} – {h.close_time?.slice(0, 5)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Vendor Details */}
          <div className="rounded-xl border border-gray-100 bg-white p-4">
            <h3 className="font-semibold text-gray-900 text-sm mb-1">
              Vendor Details
            </h3>
            <InfoRow icon={User} label="Name">
              <span className="inline-flex items-center gap-2">
                <Avatar className="h-5 w-5">
                  <AvatarImage
                    src={listing.vendorAvatar}
                    className="object-cover"
                  />
                  <AvatarFallback className="text-[10px]">
                    {getInitials(listing.vendor)}
                  </AvatarFallback>
                </Avatar>
                {listing.vendor}
              </span>
            </InfoRow>
            {listing.userInfo && (
              <InfoRow icon={User} label="Owner">
                {listing.userInfo.name}
              </InfoRow>
            )}
            {listing.contactInfo.email && (
              <InfoRow icon={Mail} label="Email">
                {listing.contactInfo.email}
              </InfoRow>
            )}
            {listing.contactInfo.phone && (
              <InfoRow icon={Phone} label="Phone">
                {listing.contactInfo.phone}
              </InfoRow>
            )}
            {listing.contactInfo.secondaryPhone && (
              <InfoRow icon={Phone} label="Secondary phone">
                {listing.contactInfo.secondaryPhone}
              </InfoRow>
            )}
          </div>
        </div>
      </div>

      {/* Moderation confirmation */}
      <AlertDialog open={moderationAction !== null} onOpenChange={(open) => { if (!open) { setModerationAction(null); setModerationReason(""); setPastEventOverride(false); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{moderationAction === "approved" ? "Approve and publish this listing?" : moderationAction === "rejected" ? "Reject this listing?" : moderationAction === "suspended" ? "Suspend this listing?" : "Restore this listing to review?"}</AlertDialogTitle>
            <AlertDialogDescription>{moderationAction === "approved" ? "The listing is complete and will become publicly discoverable." : moderationAction === "pending" ? "The listing will return to Pending review and will not be republished automatically." : "The creator will see this reason and receive a notification."}</AlertDialogDescription>
          </AlertDialogHeader>
          {moderationAction && moderationAction !== "approved" && <div className="space-y-2"><Label htmlFor="moderation-reason">Reason</Label><textarea id="moderation-reason" value={moderationReason} onChange={(event) => setModerationReason(event.target.value)} maxLength={1000} className="min-h-28 w-full rounded-md border p-3 text-sm" placeholder={moderationAction === "rejected" ? "Explain exactly what the creator must correct." : moderationAction === "pending" ? "Record why the suspension can be lifted." : "Explain why the listing is being suspended."} /><p className="text-right text-xs text-gray-400">{moderationReason.length}/1000</p></div>}
          {moderationAction === "approved" && hasPastEventBlocker && <label className="flex items-start gap-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950"><input type="checkbox" checked={pastEventOverride} onChange={(event) => setPastEventOverride(event.target.checked)} className="mt-1" /><span><strong>Use past-event publication exception.</strong><br />This exception is audited and bypasses only the past-event blocker. Every other requirement must still be complete.</span></label>}
          <AlertDialogFooter><AlertDialogCancel disabled={isUpdatingStatus}>Cancel</AlertDialogCancel><AlertDialogAction onClick={(event) => { event.preventDefault(); handleModerationConfirm(); }} disabled={isUpdatingStatus || (moderationAction !== "approved" && !moderationReason.trim())} className={moderationAction === "rejected" ? "bg-red-600 hover:bg-red-700" : moderationAction === "suspended" ? "bg-orange-600 hover:bg-orange-700" : "bg-[#93C01F] hover:bg-[#7ea919]"}>{isUpdatingStatus ? "Saving…" : moderationAction === "approved" ? "Approve & publish" : moderationAction === "pending" ? "Restore to review" : moderationAction === "rejected" ? "Reject listing" : "Suspend listing"}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Archive / restore confirmation */}
      <AlertDialog
        open={showDelete}
        onOpenChange={(o) => !o && setShowDelete(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{listing.archived ? "Restore this archived listing?" : "Archive this listing?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {listing.archived ? "The listing will return to its previous Draft or Rejected status." : "The listing will be hidden but its media and audit history will be preserved."} <strong>{listing.name}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2"><Label htmlFor="archive-reason">Administrative reason</Label><textarea id="archive-reason" value={archiveReason} onChange={(event) => setArchiveReason(event.target.value)} maxLength={1000} className="min-h-24 w-full rounded-md border p-3 text-sm" /><p className="text-right text-xs text-gray-400">{archiveReason.length}/1000</p></div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (listing.archived) handleRestoreArchive();
                else handleDelete();
              }}
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeleting || !archiveReason.trim()}
            >
              {isDeleting ? "Saving..." : listing.archived ? "Restore listing" : "Archive listing"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Verify confirmation */}
      <AlertDialog
        open={pendingVerify !== null}
        onOpenChange={(o) => !o && setPendingVerify(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingVerify ? "Verify this listing?" : "Remove verification?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingVerify
                ? `This will mark "${listing.name}" as a verified listing. A verification badge will appear on its public card.`
                : `This will remove the verification badge from "${listing.name}". The listing will remain approved and visible.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingVerify(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleVerifyConfirm}
              className={
                pendingVerify
                  ? "bg-[#93C01F] hover:bg-[#7ea919]"
                  : "bg-orange-500 hover:bg-orange-600"
              }
            >
              {pendingVerify
                ? "Yes, verify listing"
                : "Yes, remove verification"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

"use client";

import { use, useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowBendUpLeft,
  PencilSimple,
  MapPin,
  Tag,
  Users,
  Check,
  Copy,
  X,
  BookmarkSimple,
  Star,
  Trash,
  Plus,
  SpinnerGap,
  UploadSimple,
  Briefcase,
  Eye,
  Globe,
  Calendar,
  Clock,
  Ticket,
  Diamond,
  CheckCircle,
  FacebookLogo,
  InstagramLogo,
  XLogo,
  TiktokLogo,
  YoutubeLogo,
  WhatsappLogo,
} from "@phosphor-icons/react";
import { useAuth } from "@/context/auth-context";
import { useRolePath } from "@/hooks/useRolePath";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { RichTextDisplay } from "@/components/ui/rich-text-editor";
import { ListingImageGallery } from "@/components/dashboard/listing/listing-image-gallery";
import { TicketTypeEditor } from "@/components/dashboard/listing/form/ticket-type-editor";
import { formatEventDateRange, formatEventTimeRange } from "@/lib/directory/event-formatting";

// --- Types ---

type PageProps = {
  params: Promise<{ slug: string }>;
};

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
  parent_slug?: string | null;
  type?: string;
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

interface ApiEventPayload {
  slug?: string;
  event_start_date?: string | null;
  event_end_date?: string | null;
  event_start_time?: string | null;
  event_end_time?: string | null;
  event_venue?: string | null;
  event_venue_address?: string | null;
  event_city?: string | null;
  event_country?: string | null;
  event_price?: string | number | null;
  event_currency?: string | null;
  event_location_type?: string | null;
  timezone?: string | null;
  timezone_label?: string | null;
  spans_multiple_days?: boolean;
  is_all_day?: boolean;
  online_access_policy?: string | null;
  online_access_instructions?: string | null;
  event_online_url?: string | null;
  attendance_type?: string | null;
  admission_availability?: string | null;
  registration_url?: string | null;
  pricing_mode?: string | null;
  purchase_method?: string | null;
  purchase_instructions?: string | null;
  event_ticket_url?: string | null;
  ticket_provider?: string | null;
  ticket_release_at?: string | null;
  ticket_availability_message?: string | null;
  ticket_types?: ApiEventTicketType[];
  price_range?: { min: number; max: number } | null;
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

interface ApiOpeningHour {
  day_of_week: string;
  open_time: string;
  close_time: string;
}

interface ApiSocials {
  facebook?: string | null;
  instagram?: string | null;
  twitter?: string | null;
  tiktok?: string | null;
  youtube?: string | null;
  whatsapp?: string | null;
}

interface ApiListing {
  id: number;
  name: string;
  slug: string;
  bio: string;
  address: string;
  country: string;
  city: string;
  status: string;
  type?: string;
  plan?: string;
  business_reg_num?: string | null;
  claim_status?: string | null;
  primary_phone?: string;
  secondary_phone?: string;
  email?: string;
  website?: string;
  images: ListingImage[];
  /** Explicit cover image, when the vendor has set one — authoritative over `images[0]`. */
  cover?: ListingImage | null;
  primary_image?: string;
  cover_image?: string;
  categories: Category[];
  opening_hours?: ApiOpeningHour[];
  socials?: ApiSocials[] | ApiSocials;
  rating: number;
  ratings_count: number;
  views_count: number;
  bookmarks_count: number;
  user?: {
    first_name?: string;
    last_name?: string;
    email?: string;
  };
  event_start_date?: string | null;
  event_end_date?: string | null;
  event_start_time?: string | null;
  event_end_time?: string | null;
  event_venue?: string | null;
  event_venue_address?: string | null;
  event_city?: string | null;
  event_country?: string | null;
  event_price?: string | number | null;
  event_currency?: string | null;
  event_location_type?: string | null;
  event_timezone?: string | null;
  event_timezone_label?: string | null;
  event?: ApiEventPayload;
  business_presence_type?: string | null;
  business_service_reach?: string | null;
  service_countries?: Array<{ code: string; name: string }>;
  submission_readiness?: {
    changed_since_review_began: boolean;
    review_content_updated_at: string | null;
    missing_count: number;
  };
}

interface Service {
  id: number | string;
  slug?: string;
  name: string;
  description: string;
  image?: string | null;
}

// A row in the "Add Services" multi-row form.
interface ServiceRow {
  name: string;
  description: string;
  imageFile: File | null;
  imagePreview: string | null;
}

const EMPTY_SERVICE_ROW: ServiceRow = {
  name: "",
  description: "",
  imageFile: null,
  imagePreview: null,
};

interface ListingDetail {
  id: string;
  slug: string;
  name: string;
  bio: string;
  address: string;
  location: string;
  status: "published" | "pending" | "drafted";
  type: string;
  category: string;
  subcategory?: string;
  plan: string;
  businessRegNum?: string | null;
  claimStatus?: string | null;
  contactInfo: {
    website?: string;
  };
  openingHours: ApiOpeningHour[];
  socials: ApiSocials;
  event?: EventInfo;
  coverImage: string;
  allImages: string[];
  views: number;
  bookmarks: number;
  rating: number;
  ratingsCount: number;
  businessPresence?: string | null;
  businessReach?: string | null;
  serviceCountries: Array<{ code: string; name: string }>;
  reviewChanged: boolean;
  reviewChangedAt?: string | null;
  missingCount: number;
}

interface ApiReview {
  id: number | string;
  slug: string;
  rating: number;
  comment: string | null;
  status: "visible" | "hidden";
  vendor_reply: string | null;
  vendor_reply_at: string | null;
  created_at: string;
  user: {
    first_name: string;
    last_name: string;
  } | null;
}

// --- Helpers ---

const getImageUrl = (url: string | undefined | null): string => {
  if (!url) return "/images/no-image.jpg";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  // Backend returns bare S3 keys e.g. "staging/services/uuid.jpeg"
  return `https://mefie-bucket.s3.eu-north-1.amazonaws.com/${url.replace(/^\//, "")}`;
};

const getStatusColor = (status: string) => {
  if (status === "published") return "bg-[#E9F5D6] text-[#5F8B0A]";
  if (status === "pending") return "bg-yellow-100 text-yellow-700";
  return "bg-gray-100 text-gray-600";
};

const getStatusLabel = (status: string) => {
  if (status === "published") return "Published";
  if (status === "pending") return "In review";
  return "Draft";
};

// "in_person" -> "In Person"
const formatSnakeCase = (value?: string | null) =>
  (value ?? "")
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

// Compact key/value row used inside the Listing Details card.
function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

function SocialLink({
  href,
  icon: Icon,
  label,
}: {
  href?: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

// --- Main Component ---

export default function ListingDetailPage({ params }: PageProps) {
  const { slug } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loading: authLoading } = useAuth();
  const { myListings, listingEdit } = useRolePath();

  const highlightReviewSlug = searchParams.get("review");

  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Reviews state
  const [reviews, setReviews] = useState<ApiReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [replyingToSlug, setReplyingToSlug] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  // "Add Services" multi-row form, now opened from a button as a modal
  const [addServicesOpen, setAddServicesOpen] = useState(false);
  const [serviceRows, setServiceRows] = useState<ServiceRow[]>([
    { ...EMPTY_SERVICE_ROW },
  ]);
  const [isSubmittingServices, setIsSubmittingServices] = useState(false);
  const rowFileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  // Single-service edit dialog (triggered from the Services list below)
  const [editOpen, setEditOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [editData, setEditData] = useState({ name: "", description: "" });
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const [deletingServiceSlug, setDeletingServiceSlug] = useState<string | null>(
    null,
  );
  const [isDeletingService, setIsDeletingService] = useState(false);

  const fetchListing = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");

      const res = await fetch(`/api/listing/${slug}/show`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      if (!res.ok) throw new Error("Failed to fetch listing");

      const json = await res.json();
      const data: ApiListing = json.data || json;

      const rawImages = data.images || [];
      const validImages = rawImages
        .filter((img) => !!(img.card || img.webp || img.original))
        .map((img) => getImageUrl(img.card || img.webp || img.original));

      // The explicit cover always wins over whichever image happens to be
      // first in `images` — keeps this page in sync with what every other
      // page shows for the same listing. Built with the same
      // card/webp/original precedence as validImages above, so the string
      // filter below reliably de-dupes the cover instead of listing it twice.
      const explicitCover =
        data.cover?.card ||
        data.cover?.webp ||
        data.cover?.original ||
        data.primary_image ||
        data.cover_image;
      const coverUrl = explicitCover ? getImageUrl(explicitCover) : undefined;
      const orderedValidImages = coverUrl
        ? [coverUrl, ...validImages.filter((url) => url !== coverUrl)]
        : validImages;

      const backendStatus = (data.status || "").toLowerCase();
      let status: "published" | "pending" | "drafted" = "drafted";
      if (["published", "active", "approved"].includes(backendStatus))
        status = "published";
      else if (backendStatus === "pending") status = "pending";

      let resolvedType = data.type || "";
      if (!resolvedType && data.categories?.length > 0) {
        const catName = data.categories[0].name.toLowerCase();
        if (["community", "event"].includes(catName)) resolvedType = catName;
      }
      resolvedType = resolvedType || "business";

      // Category / sub-category split (mirrors the admin listing page).
      let category = "Uncategorized";
      let subcategory = "";
      if (Array.isArray(data.categories) && data.categories.length > 0) {
        const mains = data.categories.filter(
          (c) => c.parent_slug == null || c.type === "mainCategory",
        );
        const subs = data.categories.filter(
          (c) => c.parent_slug != null && c.type !== "mainCategory",
        );
        category = (mains.length > 0 ? mains : data.categories)
          .map((c) => c.name)
          .join(", ");
        subcategory = subs.map((c) => c.name).join(", ");
      }

      // Events carry their location under event_* fields; businesses/
      // communities use the top-level address/city/country instead.
      let location = "";
      if (resolvedType === "event") {
        location = [
          data.event_venue,
          data.event_venue_address,
          data.event_city,
          data.event_country,
        ]
          .filter(Boolean)
          .join(", ");
      } else if (data.city && data.country) {
        location = `${data.city}, ${data.country}`;
      } else if (data.address) {
        location = data.address;
      } else if (data.country) {
        location = data.country;
      }
      location = location || "Online";

      const eventData: ApiEventPayload = data.event || {};
      const event: EventInfo | undefined =
        resolvedType === "event"
          ? {
              slug: eventData.slug,
              start_date: eventData.event_start_date ?? data.event_start_date,
              end_date: eventData.event_end_date ?? data.event_end_date,
              start_time: eventData.event_start_time ?? data.event_start_time,
              end_time: eventData.event_end_time ?? data.event_end_time,
              venue: eventData.event_venue ?? data.event_venue,
              venue_address: eventData.event_venue_address ?? data.event_venue_address,
              city: eventData.event_city ?? data.event_city,
              country: eventData.event_country ?? data.event_country,
              price: eventData.event_price ?? data.event_price,
              currency: eventData.event_currency ?? data.event_currency,
              location_type: eventData.event_location_type ?? data.event_location_type,
              timezone: eventData.timezone ?? data.event_timezone,
              timezone_label: eventData.timezone_label ?? data.event_timezone_label,
              spans_multiple_days: eventData.spans_multiple_days ?? !!(data.event_start_date && data.event_end_date && data.event_start_date !== data.event_end_date),
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

      const openingHours: ApiOpeningHour[] = Array.isArray(data.opening_hours)
        ? data.opening_hours
        : [];

      const socials: ApiSocials = Array.isArray(data.socials)
        ? data.socials[0] || {}
        : data.socials || {};

      setListing({
        id: data.id.toString(),
        slug: data.slug,
        name: data.name,
        bio: data.bio || "",
        address: data.address || "",
        location,
        status,
        type: resolvedType,
        category,
        subcategory: subcategory || undefined,
        plan: data.plan || "Basic",
        businessRegNum: data.business_reg_num,
        claimStatus: data.claim_status,
        contactInfo: {
          website: data.website,
        },
        openingHours,
        socials,
        event,
        coverImage: orderedValidImages[0] || "/images/no-image.jpg",
        allImages: orderedValidImages,
        views: data.views_count || 0,
        bookmarks: data.bookmarks_count || 0,
        rating: Number(data.rating) || 0,
        ratingsCount: data.ratings_count || 0,
        businessPresence: data.business_presence_type,
        businessReach: data.business_service_reach,
        serviceCountries: data.service_countries ?? [],
        reviewChanged: Boolean(data.submission_readiness?.changed_since_review_began),
        reviewChangedAt: data.submission_readiness?.review_content_updated_at,
        missingCount: data.submission_readiness?.missing_count ?? 0,
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to load listing details");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  const fetchReviews = useCallback(async () => {
    setReviewsLoading(true);
    try {
      const res = await fetch(`/api/listing/${slug}/ratings`, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) return;
      const json = await res.json();
      setReviews(Array.isArray(json.data) ? json.data : []);
    } catch {
      // silent — reviews are supplemental
    } finally {
      setReviewsLoading(false);
    }
  }, [slug]);

  const handleReplySubmit = async (ratingSlug: string) => {
    if (!replyText.trim()) {
      toast.error("Reply cannot be empty");
      return;
    }
    setIsSubmittingReply(true);
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`/api/rating/${ratingSlug}/reply`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ vendor_reply: replyText }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to post reply");
      }

      const updated = await res.json();
      const updatedReview: ApiReview = updated.data ?? updated;

      setReviews((prev) =>
        prev.map((r) =>
          r.slug === ratingSlug
            ? {
                ...r,
                vendor_reply: updatedReview.vendor_reply,
                vendor_reply_at: updatedReview.vendor_reply_at,
              }
            : r,
        ),
      );
      setReplyingToSlug(null);
      setReplyText("");
      toast.success("Reply posted successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to post reply");
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const fetchServices = useCallback(async () => {
    try {
      const token = localStorage.getItem("authToken");

      const res = await fetch(`/api/listings/${slug}/services`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (!res.ok) return;

      const json = await res.json();
      setServices(
        Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [],
      );
    } catch {
      // Silent — services are optional
    }
  }, [slug]);

  useEffect(() => {
    if (!authLoading) {
      fetchListing();
      fetchServices();
      fetchReviews();
    }
  }, [authLoading, fetchListing, fetchServices, fetchReviews]);

  // Scroll to and highlight a specific review when arriving via ?review= param
  useEffect(() => {
    if (!highlightReviewSlug || reviews.length === 0) return;
    // The review card renders once in the mobile tree and once in the
    // desktop tree (only one is visible at a time), so pick the visible copy.
    const matches = document.querySelectorAll(
      `[id="review-${highlightReviewSlug}"]`,
    );
    const el = Array.from(matches).find(
      (c) => (c as HTMLElement).offsetParent !== null,
    ) as HTMLElement | undefined;
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("ring-2", "ring-[#93C01F]", "ring-offset-2");
    const timer = setTimeout(() => {
      el.classList.remove("ring-2", "ring-[#93C01F]", "ring-offset-2");
    }, 2500);
    return () => clearTimeout(timer);
  }, [highlightReviewSlug, reviews]);

  // Uploads a File to S3 via the presigned-URL flow and returns the S3 key.
  const uploadServiceImage = useCallback(
    async (file: File): Promise<string | null> => {
      const token = localStorage.getItem("authToken");
      const presignRes = await fetch(`/api/listings/${slug}/services/presign`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          filename: file.name,
          mime_type: file.type,
          size: file.size,
        }),
      });
      if (!presignRes.ok) throw new Error("Could not get upload URL");
      const { upload_url, key } = await presignRes.json();

      const s3Res = await fetch(upload_url, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!s3Res.ok) throw new Error("Image upload to storage failed");
      return key;
    },
    [slug],
  );

  // --- Multi-row "Add Services" form (inside the modal) ---

  const openAddServices = () => {
    setServiceRows([{ ...EMPTY_SERVICE_ROW }]);
    setAddServicesOpen(true);
  };

  const addServiceRow = () =>
    setServiceRows((prev) => [...prev, { ...EMPTY_SERVICE_ROW }]);

  const removeServiceRow = (index: number) =>
    setServiceRows((prev) => prev.filter((_, i) => i !== index));

  const updateServiceRow = (index: number, patch: Partial<ServiceRow>) =>
    setServiceRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );

  const handleRowImageFile = (index: number, files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error(`"${file.name}" exceeds the 5 MB limit and was not added.`);
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      updateServiceRow(index, {
        imageFile: file,
        imagePreview: reader.result as string,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleAddServices = async () => {
    const validRows = serviceRows.filter((r) => r.name.trim());
    if (validRows.length === 0) {
      toast.error("Add at least one service with a name");
      return;
    }
    setIsSubmittingServices(true);
    try {
      const token = localStorage.getItem("authToken");
      for (const row of validRows) {
        const imageKey = row.imageFile
          ? await uploadServiceImage(row.imageFile)
          : null;

        const res = await fetch(`/api/listings/${slug}/services`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            name: row.name.trim(),
            description: row.description,
            image_key: imageKey,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || err.error || "Failed to add service");
        }
      }

      toast.success(
        validRows.length > 1
          ? `${validRows.length} services added successfully`
          : "Service added successfully",
      );
      setServiceRows([{ ...EMPTY_SERVICE_ROW }]);
      setAddServicesOpen(false);
      fetchServices();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to add services",
      );
    } finally {
      setIsSubmittingServices(false);
    }
  };

  // --- Single-service edit dialog ---

  const openEditService = (service: Service) => {
    setEditingService(service);
    setEditData({ name: service.name, description: service.description || "" });
    setEditImageFile(null);
    setEditImagePreview(service.image ? getImageUrl(service.image) : null);
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingService?.slug) return;
    if (!editData.name.trim()) {
      toast.error("Service name is required");
      return;
    }
    setIsSavingEdit(true);
    try {
      const token = localStorage.getItem("authToken");
      const payload: Record<string, unknown> = {
        name: editData.name.trim(),
        description: editData.description,
      };
      // Only touch the image when the user picked a new one, so the backend
      // keeps the existing image otherwise.
      if (editImageFile) {
        payload.image_key = await uploadServiceImage(editImageFile);
      }

      const res = await fetch(`/api/services/${editingService.slug}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || err.error || "Failed to update service");
      }

      toast.success("Service updated successfully");
      setEditOpen(false);
      fetchServices();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update service",
      );
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteService = async (serviceSlug: string) => {
    setDeletingServiceSlug(serviceSlug);
    setIsDeletingService(true);
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`/api/services/${serviceSlug}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });
      if (!res.ok) throw new Error("Failed to delete service");
      toast.success("Service deleted");
      fetchServices();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete service",
      );
    } finally {
      setIsDeletingService(false);
      setDeletingServiceSlug(null);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const token = localStorage.getItem("authToken");

      const res = await fetch(`/api/listing/${slug}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      if (!res.ok) throw new Error("Failed to delete listing");
      toast.success("Listing deleted successfully");
      router.push(myListings);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleCopy = async () => {
    const pathByType: Record<string, string> = {
      event: "events",
      community: "communities",
    };
    const segment = pathByType[listing?.type ?? ""] ?? "businesses";
    const url = `${window.location.origin}/${segment}/${listing?.slug}`;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else {
        // Fallback for non-secure contexts
        const el = document.createElement("textarea");
        el.value = url;
        el.style.position = "fixed";
        el.style.opacity = "0";
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
      }
      setCopied(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  // --- Loading ---
  if (loading || authLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <SpinnerGap className="w-8 h-8 animate-spin text-[#93C01F]" />
      </div>
    );
  }

  // --- Not found ---
  if (!listing) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-gray-500">Listing not found</p>
        <Button onClick={() => router.push(myListings)} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to My Listings
        </Button>
      </div>
    );
  }

  const validRowCount = serviceRows.filter((r) => r.name.trim()).length;
  const ev = listing.event;
  const TypeIcon =
    listing.type === "event"
      ? Ticket
      : listing.type === "community"
        ? Users
        : Briefcase;
  const hasSocials = !!(
    listing.socials.facebook ||
    listing.socials.instagram ||
    listing.socials.twitter ||
    listing.socials.tiktok ||
    listing.socials.youtube ||
    listing.socials.whatsapp
  );

  const addServicesForm = (
    <div className="space-y-4">
      <div className="space-y-3 max-h-[520px] overflow-y-auto pr-0.5">
        {serviceRows.map((row, index) => (
          <div
            key={index}
            className="relative rounded-xl border border-gray-100 p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#5F8B0A] uppercase tracking-wide">
                Service {index + 1}
              </span>
              {serviceRows.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeServiceRow(index)}
                  className="p-1 text-gray-400 hover:text-red-600 rounded"
                  title="Remove this service"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <Input
              placeholder="e.g. Wedding Photography, Logo Design…"
              value={row.name}
              onChange={(e) =>
                updateServiceRow(index, { name: e.target.value })
              }
              className="bg-white h-10"
            />

            <Textarea
              placeholder="Describe what this service includes, pricing, turnaround time… (optional)"
              rows={2}
              value={row.description}
              onChange={(e) =>
                updateServiceRow(index, { description: e.target.value })
              }
              className="bg-white resize-none text-sm"
            />

            {row.imagePreview ? (
              <div className="relative w-full aspect-video rounded-lg overflow-hidden group border border-gray-200">
                <Image
                  src={row.imagePreview}
                  alt="Service image preview"
                  fill
                  className="object-cover"
                />
                <button
                  type="button"
                  onClick={() =>
                    updateServiceRow(index, {
                      imageFile: null,
                      imagePreview: null,
                    })
                  }
                  className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div
                className="relative border-2 border-dashed border-gray-200 rounded-lg p-4 text-center hover:border-[#93C01F] hover:bg-[#93C01F]/5 transition-all cursor-pointer group"
                onClick={() => rowFileInputRefs.current[index]?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleRowImageFile(index, e.dataTransfer.files);
                }}
              >
                <UploadSimple className="w-5 h-5 text-gray-300 group-hover:text-[#93C01F] mx-auto mb-1.5 transition-colors" />
                <p className="text-xs text-gray-500">
                  <span className="text-[#93C01F] font-medium">
                    Click to upload
                  </span>{" "}
                  or drag &amp; drop{" "}
                  <span className="text-gray-400">(optional)</span>
                </p>
              </div>
            )}
            <input
              ref={(el) => {
                rowFileInputRefs.current[index] = el;
              }}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleRowImageFile(index, e.target.files)}
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addServiceRow}
        className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-[#93C01F] hover:text-[#93C01F] hover:bg-[#93C01F]/5 transition-all"
      >
        <Plus className="w-4 h-4" />
        Add another service
      </button>
    </div>
  );

  const galleryBlock = (
    <ListingImageGallery images={listing.allImages} alt={listing.name} />
  );

  const descriptionBlock = (
    <div className="space-y-2">
      <h3 className="font-semibold text-gray-900 text-sm">
        About this listing
      </h3>
      <div className="bg-gray-50 p-4 rounded-xl text-sm text-gray-600 leading-relaxed border border-gray-100">
        {listing.bio ? (
          <RichTextDisplay html={listing.bio} />
        ) : (
          <span className="text-gray-400">No description provided.</span>
        )}
      </div>
    </div>
  );

  const servicesBlock = (
    <div className="rounded-xl border border-gray-100 bg-white p-4">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-[#93C01F]" /> Services
        </h3>
        <Button
          size="sm"
          className="bg-[#93C01F] hover:bg-[#82ab1b] gap-1.5 h-8"
          onClick={openAddServices}
        >
          <Plus className="w-3.5 h-3.5" />
          Add Service
        </Button>
      </div>

      {services.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          {services.map((service) => (
            <div
              key={service.id}
              className="flex items-start gap-2.5 p-2.5 rounded-lg border border-gray-100"
            >
              <div className="w-11 h-11 rounded-md overflow-hidden bg-gray-100 shrink-0 relative">
                {service.image ? (
                  <Image
                    src={getImageUrl(service.image)}
                    alt={service.name}
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
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {service.name}
                  </p>
                  <div className="flex items-center gap-0.5 shrink-0 -mt-1 -mr-1">
                    <button
                      type="button"
                      className="p-1 text-gray-400 hover:text-[#93C01F] rounded"
                      onClick={() => openEditService(service)}
                    >
                      <PencilSimple className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      className="p-1 text-gray-400 hover:text-red-500 rounded"
                      onClick={() =>
                        service.slug && handleDeleteService(service.slug)
                      }
                      disabled={
                        isDeletingService &&
                        deletingServiceSlug === service.slug
                      }
                    >
                      {isDeletingService &&
                      deletingServiceSlug === service.slug ? (
                        <SpinnerGap className="w-3 h-3 animate-spin" />
                      ) : (
                        <Trash className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>
                {service.description && (
                  <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
                    {service.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-10 mt-2 border-2 border-dashed border-gray-100 rounded-xl">
          <Briefcase className="w-8 h-8 text-gray-200 mb-2" />
          <p className="text-gray-600 text-sm font-medium">
            No services yet
          </p>
          <p className="text-gray-400 text-xs mt-1 text-center max-w-xs">
            Tap &ldquo;Add Service&rdquo; to showcase what you offer.
          </p>
        </div>
      )}
    </div>
  );

  const reviewsBlock = (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Star className="w-4 h-4 text-[#93C01F]" /> Customer Reviews
        </h3>
        {reviews.length > 0 && (
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-yellow-400" weight="fill" />
              <span className="font-semibold text-gray-900">
                {listing.rating.toFixed(1)}
              </span>{" "}
              avg
            </span>
            <span className="text-gray-200">|</span>
            <span>
              <span className="font-semibold text-gray-900">
                {reviews.length}
              </span>{" "}
              review{reviews.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>

      {reviewsLoading ? (
        <div className="flex items-center justify-center py-10">
          <SpinnerGap className="w-6 h-6 animate-spin text-[#93C01F]" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 border-2 border-dashed border-gray-100 rounded-xl">
          <Star className="w-9 h-9 text-gray-200 mb-3" />
          <p className="text-gray-600 text-sm font-medium">No reviews yet</p>
          <p className="text-gray-400 text-xs mt-1 text-center max-w-xs">
            Reviews from customers will appear here once they start coming in.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => {
            const reviewerName = review.user
              ? `${review.user.first_name} ${review.user.last_name}`.trim()
              : "Anonymous";
            const isReplying = replyingToSlug === review.slug;
            const alreadyReplied = !!review.vendor_reply;

            return (
              <div
                key={review.id}
                id={`review-${review.slug}`}
                className="border border-gray-100 rounded-xl p-4 space-y-3 bg-white"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                      <span className="text-xs font-semibold text-gray-500">
                        {reviewerName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {reviewerName}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-3 h-3 ${
                              star <= Math.round(review.rating ?? 0)
                                ? "text-yellow-400"
                                : "text-gray-200"
                            }`}
                            weight="fill"
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] text-gray-400 shrink-0">
                    {review.created_at
                      ? new Date(review.created_at).toLocaleDateString(
                          "en-GB",
                          {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          },
                        )
                      : ""}
                  </span>
                </div>

                {review.comment && (
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {review.comment}
                  </p>
                )}

                {review.vendor_reply && (
                  <div className="bg-gray-50 rounded-lg p-3 border-l-2 border-[#93C01F]/40">
                    <p className="text-xs font-semibold text-gray-700 mb-1">
                      Your reply
                      {review.vendor_reply_at && (
                        <span className="font-normal text-gray-400 ml-2">
                          ·{" "}
                          {new Date(
                            review.vendor_reply_at,
                          ).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {review.vendor_reply}
                    </p>
                  </div>
                )}

                {!alreadyReplied && !isReplying && (
                  <button
                    type="button"
                    onClick={() => {
                      setReplyingToSlug(review.slug);
                      setReplyText("");
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-[#93C01F] transition-colors"
                  >
                    <ArrowBendUpLeft className="w-3.5 h-3.5" />
                    Reply
                  </button>
                )}

                {isReplying && (
                  <div className="space-y-2.5 pt-1">
                    <Textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Write a reply to this review…"
                      rows={3}
                      maxLength={500}
                      className="resize-none text-sm bg-gray-50 border-gray-200 focus-visible:ring-[#93C01F]"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-gray-400">
                        {replyText.length}/500
                      </span>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs"
                          disabled={isSubmittingReply}
                          onClick={() => {
                            setReplyingToSlug(null);
                            setReplyText("");
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          className="h-8 text-xs bg-[#93C01F] hover:bg-[#82ab1b] gap-1"
                          disabled={isSubmittingReply || !replyText.trim()}
                          onClick={() => handleReplySubmit(review.slug)}
                        >
                          {isSubmittingReply ? (
                            <SpinnerGap className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            "Post Reply"
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const titleBlock = (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 leading-tight">
          {listing.name}
        </h1>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 capitalize">
            <TypeIcon className="w-3 h-3" />
            {listing.type}
          </span>
          <span
            className={`w-fit px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(listing.status)}`}
          >
            {getStatusLabel(listing.status)}
          </span>
          {listing.reviewChanged && (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
              Changed since review began{listing.reviewChangedAt ? ` · ${new Date(listing.reviewChangedAt).toLocaleDateString()}` : ""}
            </span>
          )}
          {listing.status === "pending" && listing.missingCount > 0 && (
            <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
              Needs attention · {listing.missingCount}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleCopy}
          title="Copy listing link"
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-600" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => router.push(listingEdit(listing.type, listing.slug))}
          title="Edit listing"
        >
          <PencilSimple className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={() => setShowDeleteDialog(true)}
          title="Delete listing"
        >
          <Trash className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  const statsBlock = (
    <div className="grid grid-cols-2 gap-3">
      <div className="flex items-center gap-3 p-3.5 rounded-xl border border-gray-100 bg-white">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-[#F4F9E8] text-[#5F8B0A]">
          <Eye className="w-4.5 h-4.5" />
        </div>
        <div className="min-w-0">
          <p className="text-base font-bold text-gray-900 leading-none">
            {listing.views.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 truncate mt-1">Views</p>
        </div>
      </div>
      <div className="flex items-center gap-3 p-3.5 rounded-xl border border-gray-100 bg-white">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-amber-50 text-amber-600">
          <BookmarkSimple className="w-4.5 h-4.5" />
        </div>
        <div className="min-w-0">
          <p className="text-base font-bold text-gray-900 leading-none">
            {listing.bookmarks.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 truncate mt-1">Bookmarks</p>
        </div>
      </div>
      <div className="flex items-center gap-3 p-3.5 rounded-xl border border-gray-100 bg-white">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-purple-50 text-purple-600">
          <Star className="w-4.5 h-4.5" weight="fill" />
        </div>
        <div className="min-w-0">
          <p className="text-base font-bold text-gray-900 leading-none">
            {listing.rating.toFixed(1)}
          </p>
          <p className="text-xs text-gray-500 truncate mt-1">Rating</p>
        </div>
      </div>
      <div className="flex items-center gap-3 p-3.5 rounded-xl border border-gray-100 bg-white">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-blue-50 text-blue-600">
          <Star className="w-4.5 h-4.5" />
        </div>
        <div className="min-w-0">
          <p className="text-base font-bold text-gray-900 leading-none">
            {listing.ratingsCount}
          </p>
          <p className="text-xs text-gray-500 truncate mt-1">Reviews</p>
        </div>
      </div>
    </div>
  );

  const listingDetailsBlock = (
    <div className="rounded-xl border border-gray-100 bg-white p-4">
      <h3 className="font-semibold text-gray-900 text-sm mb-1">
        Listing Details
      </h3>
      <InfoRow icon={Diamond} label="Subscription">
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

      <InfoRow
        icon={MapPin}
        label={listing.type === "event" ? "Venue" : "Location"}
      >
        {listing.location}
      </InfoRow>

      {listing.type === "business" && listing.businessPresence && (
        <InfoRow icon={Globe} label="Operating presence">{formatSnakeCase(listing.businessPresence)}</InfoRow>
      )}
      {listing.type === "business" && listing.businessReach && (
        <InfoRow icon={MapPin} label="Service reach">
          {listing.businessReach === "worldwide" ? "Worldwide" : listing.businessReach === "selected_countries" ? listing.serviceCountries.map((country) => country.name).join(", ") || "Selected countries" : "Headquarters country"}
        </InfoRow>
      )}

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
      {listing.contactInfo.website && (
        <InfoRow icon={Globe} label="Website">
          <a
            href={
              listing.contactInfo.website.startsWith("http")
                ? listing.contactInfo.website
                : `https://${listing.contactInfo.website}`
            }
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 hover:underline"
          >
            {listing.contactInfo.website
              .replace(/^https?:\/\//, "")
              .replace(/\/$/, "")}
          </a>
        </InfoRow>
      )}

      {listing.type === "event" && ev && (
        <InfoRow icon={Ticket} label="Attendance">
          {formatSnakeCase(ev.attendance_type) || "—"}
        </InfoRow>
      )}
      {listing.type === "event" && ev?.admission_availability && (
        <InfoRow icon={Ticket} label="Admission availability">
          {formatSnakeCase(ev.admission_availability)}
        </InfoRow>
      )}
      {listing.type === "event" && ev?.attendance_type === "paid" && ev.pricing_mode === "fixed" && ev.price != null && ev.price !== "" && (
        <InfoRow icon={Ticket} label="Price">
          {ev.currency ? `${ev.currency} ` : ""}
          {ev.price}
        </InfoRow>
      )}
      {listing.type === "event" && ev?.pricing_mode === "multiple" && ev.price_range && (
        <InfoRow icon={Ticket} label="Price range">
          {ev.currency ? `${ev.currency} ` : ""}
          {ev.price_range.min === ev.price_range.max ? ev.price_range.min : `${ev.price_range.min} – ${ev.price_range.max}`}
        </InfoRow>
      )}
      {listing.type === "event" && ev?.pricing_mode === "varies" && (
        <InfoRow icon={Ticket} label="Price">Varies</InfoRow>
      )}
      {listing.type === "event" && ev?.attendance_type === "paid" && ev.purchase_method && (
        <InfoRow icon={Ticket} label="Purchase method">
          {formatSnakeCase(ev.purchase_method)}
        </InfoRow>
      )}
      {listing.type === "event" && ev?.purchase_method === "external_url" && ev.ticket_url && (
        <InfoRow icon={Ticket} label="Ticket URL">
          <a href={ev.ticket_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Open tickets</a>
        </InfoRow>
      )}
      {listing.type === "event" && ev?.ticket_provider && (
        <InfoRow icon={Ticket} label="Ticket provider">{ev.ticket_provider}</InfoRow>
      )}
      {listing.type === "event" && ev?.registration_url && (
        <InfoRow icon={Ticket} label="Registration">
          <a href={ev.registration_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Open registration</a>
        </InfoRow>
      )}

      {listing.businessRegNum && (
        <InfoRow icon={Briefcase} label="Business reg. no.">
          {listing.businessRegNum}
        </InfoRow>
      )}
      {listing.claimStatus && (
        <InfoRow icon={CheckCircle} label="Claim status">
          <span className="capitalize">{listing.claimStatus}</span>
        </InfoRow>
      )}
      {listing.type === "event" && ev?.purchase_instructions && (
        <div className="border-t py-3">
          <p className="text-xs text-gray-500">Purchase instructions</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-gray-900">{ev.purchase_instructions}</p>
        </div>
      )}
      {listing.type === "event" && ev?.ticket_availability_message && (
        <div className="border-t py-3">
          <p className="text-xs text-gray-500">Ticket availability message</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-gray-900">{ev.ticket_availability_message}</p>
        </div>
      )}
    </div>
  );

  const ticketTypesBlock = listing.type === "event" && ev?.pricing_mode === "multiple" && ev.slug && (
    <div className="rounded-xl border border-gray-100 bg-white p-4">
      <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2 mb-2">
        <Ticket className="w-4 h-4 text-[#93C01F]" /> Ticket types
      </h3>
      <TicketTypeEditor listingSlug={listing.slug} eventSlug={ev.slug} />
    </div>
  );

  const socialLinksBlock = hasSocials && (
    <div className="rounded-xl border border-gray-100 bg-white p-4">
      <h3 className="font-semibold text-gray-900 text-sm mb-3">
        Social Links
      </h3>
      <div className="grid grid-cols-2 gap-2">
        <SocialLink
          href={listing.socials.facebook}
          icon={FacebookLogo}
          label="Facebook"
        />
        <SocialLink
          href={listing.socials.instagram}
          icon={InstagramLogo}
          label="Instagram"
        />
        <SocialLink
          href={listing.socials.twitter}
          icon={XLogo}
          label="Twitter"
        />
        <SocialLink
          href={listing.socials.tiktok}
          icon={TiktokLogo}
          label="TikTok"
        />
        <SocialLink
          href={listing.socials.youtube}
          icon={YoutubeLogo}
          label="YouTube"
        />
        <SocialLink
          href={listing.socials.whatsapp}
          icon={WhatsappLogo}
          label="WhatsApp"
        />
      </div>
    </div>
  );

  const openingHoursBlock = listing.openingHours.length > 0 && (
    <div className="rounded-xl border border-gray-100 bg-white p-4">
      <h3 className="font-semibold text-gray-900 text-sm mb-1 flex items-center gap-2">
        Opening Hours
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
  );

  return (
    <div className="px-1 lg:px-8 py-4 space-y-8 max-w-6xl mx-auto">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={myListings}>My Listings</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="font-medium truncate max-w-[200px]">
              {listing.name}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Mobile: Image -> Description -> Name/tags -> Analytics -> Listing Details -> Services -> Reviews */}
      <div className="lg:hidden space-y-5">
        {galleryBlock}
        {descriptionBlock}
        {titleBlock}
        {statsBlock}
        {listingDetailsBlock}
        {socialLinksBlock}
        {openingHoursBlock}
        {servicesBlock}
        {ticketTypesBlock}
        {reviewsBlock}
      </div>

      {/* Desktop: image gallery (left) + info column (right) */}
      <div className="hidden lg:grid lg:grid-cols-5 gap-8">
        {/* Left: gallery, description, services, reviews */}
        <div className="lg:col-span-3 space-y-5">
          {galleryBlock}
          {descriptionBlock}
          {servicesBlock}
          {ticketTypesBlock}
          {reviewsBlock}
        </div>

        {/* Right: title, stats, listing details */}
        <div className="lg:col-span-2 space-y-5">
          {titleBlock}
          {statsBlock}
          {listingDetailsBlock}
          {socialLinksBlock}
          {openingHoursBlock}
        </div>
      </div>

      {/* Add Services Dialog */}
      <Dialog
        open={addServicesOpen}
        onOpenChange={(open) => {
          if (!open) setServiceRows([{ ...EMPTY_SERVICE_ROW }]);
          setAddServicesOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Add Services
            </DialogTitle>
            <p className="text-xs text-gray-400">
              Showcase what you offer — add as many as you like, then publish
              them together.
            </p>
          </DialogHeader>

          {addServicesForm}

          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setAddServicesOpen(false)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700"
            >
              Cancel
            </Button>
            <Button
              className="bg-[#93C01F] hover:bg-[#82ab1b]"
              onClick={handleAddServices}
              disabled={isSubmittingServices || validRowCount === 0}
            >
              {isSubmittingServices ? (
                <SpinnerGap className="w-4 h-4 animate-spin" />
              ) : validRowCount > 1 ? (
                `Publish ${validRowCount} Services`
              ) : (
                "Publish Service"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Service Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Edit Service
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">
                Service Name <span className="text-red-400">*</span>
              </label>
              <Input
                placeholder="e.g. Wedding Photography, Logo Design…"
                value={editData.name}
                onChange={(e) =>
                  setEditData((p) => ({ ...p, name: e.target.value }))
                }
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">
                Description
              </label>
              <Textarea
                placeholder="Describe what this service includes, pricing, turnaround time…"
                rows={3}
                value={editData.description}
                onChange={(e) =>
                  setEditData((p) => ({ ...p, description: e.target.value }))
                }
                className="resize-none text-sm"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-gray-700">
                  Image{" "}
                  <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                {editImagePreview && (
                  <button
                    type="button"
                    className="text-xs text-red-400 hover:text-red-600 transition-colors"
                    onClick={() => {
                      setEditImageFile(null);
                      setEditImagePreview(null);
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>

              {editImagePreview ? (
                <div className="relative w-full aspect-video rounded-xl overflow-hidden group border border-gray-200">
                  <Image
                    src={editImagePreview}
                    alt="Service image preview"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  <button
                    type="button"
                    onClick={() => editFileInputRef.current?.click()}
                    className="absolute bottom-2 right-2 text-[10px] bg-black/50 text-white px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div
                  className="relative border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-[#93C01F] hover:bg-[#93C01F]/5 transition-all cursor-pointer group"
                  onClick={() => editFileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0];
                    if (!file) return;
                    if (file.size > 5 * 1024 * 1024) {
                      toast.error(
                        `"${file.name}" exceeds the 5 MB limit and was not added.`,
                      );
                      return;
                    }
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setEditImageFile(file);
                      setEditImagePreview(reader.result as string);
                    };
                    reader.readAsDataURL(file);
                  }}
                >
                  <UploadSimple className="w-7 h-7 text-gray-300 group-hover:text-[#93C01F] mx-auto mb-2 transition-colors" />
                  <p className="text-sm text-gray-500">
                    <span className="text-[#93C01F] font-medium">
                      Click to upload
                    </span>{" "}
                    or drag &amp; drop
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    PNG, JPG, WEBP · up to 5 MB
                  </p>
                </div>
              )}
              <input
                ref={editFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 5 * 1024 * 1024) {
                    toast.error(
                      `"${file.name}" exceeds the 5 MB limit and was not added.`,
                    );
                    return;
                  }
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    setEditImageFile(file);
                    setEditImagePreview(reader.result as string);
                  };
                  reader.readAsDataURL(file);
                }}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setEditOpen(false)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700"
            >
              Cancel
            </Button>
            <Button
              className="bg-[#93C01F] hover:bg-[#82ab1b]"
              onClick={handleSaveEdit}
              disabled={isSavingEdit || !editData.name.trim()}
            >
              {isSavingEdit ? (
                <SpinnerGap className="w-4 h-4 animate-spin" />
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this listing?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{listing.name}</strong>. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

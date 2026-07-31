/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import "mapbox-gl/dist/mapbox-gl.css";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound, useRouter, useSearchParams } from "next/navigation";
import mapboxgl from "mapbox-gl";
import {
  MapPin,
  Star,
  FacebookLogo,
  InstagramLogo,
  XLogo,
  YoutubeLogo,
  SpinnerGap,
  Clock,
  // WarningCircle,
  TiktokLogo,
  WhatsappLogo,
  CaretRight, // Added for link-style appearance
  NavigationArrow,
} from "@phosphor-icons/react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ReviewsSection } from "@/components/ux/review-button";

// Imported Components
import { MediaGallery, Lightbox } from "@/components/ux/media-gallery";
import { HeroCarousel } from "@/components/ux/hero-slide";
import { BookmarkButton } from "@/components/ux/bookmark-button";
import { RichTextDisplay } from "@/components/ui/rich-text-editor";
import { useAuth } from "@/context/auth-context";
import { ClaimEligibility, getClaimEligibility } from "@/lib/api";
import { format12Hour, formatEventDateRange, formatEventTimeRange, formatShortDate } from "@/lib/directory/event-formatting";

// --- API Interfaces ---
interface ApiImage {
  id?: number;
  original?: string;
  thumb?: string;
  webp?: string;
  card?: string;
  mime_type?: string;
  file_size?: number;
  size?: string;
}

interface ApiSocialItem {
  id: number;
  listing_id: number;
  facebook?: string;
  instagram?: string;
  twitter?: string;
  tiktok?: string;
  youtube?: string;
  whatsapp?: string;
}

interface ApiReplyData {
  id: number;
  user_id: number;
  comment: string;
  created_at: string;
  user?: {
    name?: string;
    avatar?: string;
  };
}

interface ApiRatingData {
  id: number;
  slug?: string;
  listing_id: number;
  user_id: number;
  rating: number;
  comment: string;
  status?: string;
  created_at?: string;
  vendor_reply?: string | null;
  vendor_reply_at?: string | null;
  user?: {
    name?: string;
    first_name?: string;
    last_name?: string;
    avatar?: string;
    profile_photo_url?: string;
    username?: string;
    email?: string;
  };
  replies?: ApiReplyData[];
}

interface ReviewReply {
  id: number | string;
  author: string;
  date: string;
  comment: string;
  avatar?: string;
}

interface ApiReview {
  id: number | string;
  user?: string;
  author?: string;
  rating: number;
  comment: string;
  created_at?: string;
  date?: string;
  avatar?: string;
  replies?: ReviewReply[];
}

interface OpeningHour {
  day_of_week: string;
  open_time: string;
  close_time: string;
}

interface ApiEventData {
  id?: number;
  event_start_date?: string;
  event_end_date?: string;
  event_start_time?: string;
  event_end_time?: string;
  event_venue?: string;
  event_city?: string;
  event_country?: string;
  event_location_type?: string;
  event_type?: string;
  event_price?: string | number;
  event_currency?: string;
  is_free?: boolean;
  formatted_price?: string;
  event_ticket_url?: string;
  event_online_url?: string;
  starts_at?: string;
  ends_at?: string;
  timezone?: string;
  timezone_label?: string;
  starts_at_utc?: string;
  ends_at_utc?: string;
  spans_multiple_days?: boolean;
  online_access_policy?: string;
  online_access_instructions?: string;
  attendance_type?: string;
  admission_availability?: string;
  registration_url?: string;
  pricing_mode?: string;
  purchase_method?: string;
  purchase_instructions?: string;
  ticket_provider?: string;
  ticket_release_at?: string;
  ticket_availability_message?: string;
  ticket_types?: ApiEventTicketType[];
  price_range?: { min: number; max: number };
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

interface ApiListingData {
  id: number;
  name: string;
  slug: string;
  bio?: string;
  description?: string;
  address?: string;
  country?: string;
  city?: string;
  location?: string;
  primary_phone?: string;
  secondary_phone?: string;
  email?: string;
  website?: string;
  google_plus_code?: string;
  latitude?: number;
  longitude?: number;
  rating?: number | string;
  reviews_count?: number | string;
  listing_verified?: boolean;
  is_verified?: boolean;
  claim_status?: string;
  images?: (ApiImage | string)[];
  cover?: ApiImage | null;
  primary_image?: string;
  cover_image?: string;
  socials?: ApiSocialItem[];
  services?: any[];
  faqs?: FAQItem[];
  reviews?: ApiReview[];
  experience?: ExperienceItem[];
  pricing?: PricingItem[];
  type?: string;
  opening_hours?: OpeningHour[];
  event?: ApiEventData;
}

// --- UI Interfaces ---
interface PageProps {
  params: Promise<{ slug: string; categorySlug?: string }>;
  type?: "business" | "event" | "community" | "discover";
}

interface SocialLinks {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  youtube?: string;
  tiktok?: string;
  whatsapp?: string;
}

interface Provider {
  id: number;
  name: string;
  slug: string;
  listingType?: string;
  description: string;
  location?: string;
  country?: string;
  verified?: boolean;
  claim_status?: string;
  reviews?: number | string;
  rating: number | string;
  phone?: string;
  email?: string;
  website?: string;
  socials?: SocialLinks;
  latitude?: number;
  longitude?: number;
  eventData?: ApiEventData;
}

interface GalleryItem {
  type: "image" | "video";
  src: string;
  poster?: string;
  alt?: string;
}

interface ExperienceItem {
  title: string;
  description: string;
}

interface FAQItem {
  question: string;
  answer: string;
}

interface ReviewItem {
  id?: number | string;
  slug?: string;
  author: string;
  rating: number;
  date: string;
  comment: string;
  avatar?: string;
  vendor_reply?: string | null;
  vendor_reply_at?: string | null;
  replies?: ReviewReply[];
}

interface PricingItem {
  price: string;
  label: string;
}

interface TemplateContent {
  services: string[];
  pricing: PricingItem[];
  experience: ExperienceItem[];
  faqs: FAQItem[];
  reviews: ReviewItem[];
  gallery: GalleryItem[];
  hours: OpeningHour[];
}

// --- Helper Functions ---
const getImageUrl = (url: string | undefined | null): string => {
  if (!url) return "/images/no-image.jpg";
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://me-fie.co.uk";
  return `${API_URL}/${url.replace(/^\//, "")}`;
};

const formatMoney = (price: string | number | undefined, currency?: string): string => {
  if (price === undefined || price === null || price === "") return "";
  const amount = Number(price);
  if (Number.isNaN(amount)) return "";
  const code = (currency || "").toUpperCase();
  return code ? `${code} ${amount.toFixed(2)}` : amount.toFixed(2);
};

const formatDateTime = (dateString?: string) => {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  } catch {
    return "";
  }
};

const extractUserName = (userData: any): string => {
  if (!userData) return "Unknown User";
  const rawUser = userData.data || userData.user || userData;
  let fullName = rawUser.name;
  if (!fullName && (rawUser.first_name || rawUser.last_name)) {
    fullName = `${rawUser.first_name || ""} ${rawUser.last_name || ""}`.trim();
  }
  if (!fullName) {
    fullName =
      rawUser.username || rawUser.email?.split("@")[0] || "Unknown User";
  }
  return fullName;
};

const isVideoFile = (url: string): boolean => {
  return /\.(mp4|webm|ogg|mov|quicktime)$/i.test(url);
};

// --- Helper Components ---

const Divider = () => <div className="w-full h-px bg-gray-200 my-6" />;

/**
 * REDESIGNED SOCIAL ICON COMPONENT
 * Displays a professional "link card" with brand colors, icon, and name.
 */
const SocialIcon = ({
  href,
  icon: Icon,
  brandColor,
  name,
}: {
  href: string;
  icon: React.ElementType;
  brandColor: string;
  name: string;
}) => (
  <Link
    href={href}
    target="_blank"
    rel="noreferrer"
    className="group flex items-center justify-between p-2.5 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:border-gray-200 transition-all hover:shadow-sm"
  >
    <div className="flex items-center gap-3">
      <div
        className="flex items-center justify-center w-9 h-9 rounded-lg bg-white shadow-sm group-hover:scale-110 transition-transform"
        style={{ color: brandColor }}
      >
        <Icon className="h-5 w-5" weight="fill" />
      </div>
      <span className="text-sm font-semibold text-gray-700 group-hover:text-gray-900 transition-colors">
        {name}
      </span>
    </div>
    <CaretRight
      size={14}
      weight="bold"
      className="text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all"
    />
  </Link>
);

// --- Sub-Components (Stateless) ---

function ProviderHeader({
  provider,
  rating,
  // type,
}: {
  provider: Provider;
  rating: number;
  type?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [isClamped, setIsClamped] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const checkClamp = () => {
      const el = textRef.current;
      if (!el) return;
      setIsClamped(el.scrollHeight > el.clientHeight + 1);
    };
    checkClamp();
    window.addEventListener("resize", checkClamp);
    return () => window.removeEventListener("resize", checkClamp);
  }, [provider.description]);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between p-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-semibold text-gray-900">
            {provider.name}
          </h1>
          {provider.verified && (
            <Image
              src="/images/icons/verify.svg"
              alt="Verified"
              width={20}
              height={20}
            />
          )}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            {provider.location ??
              provider.country ??
              "Available internationally"}
          </span>
          <span className="flex items-center gap-1 font-black text-gray-800">
            <Star className="h-4 w-4 text-yellow-400" weight="fill" />
            {rating.toFixed(1)}
            {provider.reviews && provider.reviews !== "0" && (
              <span className="text-gray-400 font-light">
                ({provider.reviews} reviews)
              </span>
            )}
          </span>
          {provider.eventData?.starts_at && (
            <span className="flex items-center gap-1 text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full text-xs font-medium">
              {formatDateTime(provider.eventData.starts_at)}
            </span>
          )}
        </div>
        <div className="mt-3 max-w-2xl">
          <div
            className="overflow-hidden transition-all duration-500 ease-linear"
            style={{ maxHeight: expanded ? "2000px" : "4.5rem" }}
          >
            <div ref={textRef} className={expanded ? "" : "line-clamp-3"}>
              <RichTextDisplay
                html={provider.description}
                className="text-base"
              />
            </div>
          </div>
          {(isClamped || expanded) && (
            <div className="flex justify-end">
              <button
                onClick={() => setExpanded(!expanded)}
                className="mt-1 text-sm font-medium text-[#93C01F] hover:underline focus:outline-none"
              >
                {expanded ? "Read less" : "Read more"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProviderTabs({
  template,
  providerName,
  galleryItems,
  listingSlug,
  previewMode = false,
}: {
  template: TemplateContent;
  providerName: string;
  galleryItems: GalleryItem[];
  listingSlug: string;
  previewMode?: boolean;
}) {
  const { reviews } = {
    reviews: template.reviews || [],
  };

  return (
    <div className="mt-6 px-4 pb-4">
      <Tabs defaultValue="portfolio" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto rounded-full no-scrollbar">
          {["Portfolio", "Reviews"].map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab.toLowerCase()}
              className="rounded-full text-base font-normal px-6"
            >
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="portfolio" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Gallery</CardTitle>
            </CardHeader>
            <CardContent>
              <MediaGallery items={galleryItems} providerName={providerName} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reviews" className="mt-6">
          <Card>
            <div className="px-6 py-1">
              <ReviewsSection
                reviews={reviews as any}
                listingSlug={listingSlug}
                readOnly={previewMode}
              />
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SidebarLocation({ provider }: { provider: Provider }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [isLoading, setIsLoading] = useState(() => {
    if (typeof window === "undefined") return true;
    return process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ? true : false;
  });
  const [error, setError] = useState<string | null>(null);

  // --- ADD THIS LOGIC HERE ---
  // Generate Google Maps Directions URL
  const directionsUrl =
    provider.latitude && provider.longitude
      ? `https://www.google.com/maps/dir/?api=1&destination=${provider.latitude},${provider.longitude}`
      : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
          provider.name + " " + (provider.location || provider.country || ""),
        )}`;

  useEffect(() => {
    if (!mapContainer.current) return;
    const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
    if (!token) return;
    mapboxgl.accessToken = token;

    const initMap = async () => {
      try {
        let lng: number;
        let lat: number;
        if (provider.latitude && provider.longitude) {
          lng = provider.longitude;
          lat = provider.latitude;
        } else {
          const query = encodeURIComponent(
            provider.name + " " + (provider.location || provider.country || ""),
          );
          const res = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?access_token=${token}&limit=1`,
          );
          const data = await res.json();
          if (data.features?.[0]) {
            [lng, lat] = data.features[0].center;
          } else {
            setError("Location not found");
            setIsLoading(false);
            return;
          }
        }

        if (map.current) {
          map.current.remove();
        }
        map.current = new mapboxgl.Map({
          container: mapContainer.current!,
          style: "mapbox://styles/mapbox/streets-v12",
          center: [lng, lat],
          zoom: 14,
          interactive: false,
        });
        new mapboxgl.Marker({ color: "#93C01F" })
          .setLngLat([lng, lat])
          .addTo(map.current);
        map.current.on("load", () => {
          setIsLoading(false);
        });
      } catch {
        setError("Failed to load map");
        setIsLoading(false);
      }
    };
    initMap();
    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [
    provider.latitude,
    provider.longitude,
    provider.name,
    provider.location,
    provider.country,
  ]);

  return (
    <Card>
      <CardContent className="pt-0.5">
        <h4 className="text-lg font-black text-gray-900">Location</h4>
        <div className="mt-3 relative h-40 w-full overflow-hidden rounded-xl bg-gray-100">
          {isLoading && !error && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
              Loading...
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
              {error}
            </div>
          )}
          <div
            ref={mapContainer}
            className="absolute inset-0 w-full h-full"
            style={{ minHeight: "160px" }}
          />
        </div>
        <p className="mt-3 text-xs text-gray-500">
          {provider.location ?? provider.country ?? "Available internationally"}
        </p>

        {/* --- ADD THIS LINK HERE --- */}
        <Link
          href={directionsUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-5 flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-[#93C01F] text-[#93C01F] text-sm font-bold hover:bg-[#93C01F] hover:text-white transition-all group"
        >
          <NavigationArrow
            size={18}
            weight="fill"
            className="group-hover:rotate-12 transition-transform"
          />
          Get Directions
        </Link>
      </CardContent>
    </Card>
  );
}

function SidebarEventDetails({ eventData }: { eventData: ApiEventData }) {
  const locationType = eventData.event_location_type;
  const locationLabel =
    locationType === "in_person"
      ? "In Person"
      : locationType === "online"
        ? "Online"
        : locationType === "hybrid"
          ? "Hybrid"
          : null;

  const venueParts = [
    eventData.event_venue,
    eventData.event_city,
    eventData.event_country,
  ]
    .filter(Boolean)
    .join(", ");

  const dateRange = formatEventDateRange({
    startDate: eventData.event_start_date,
    endDate: eventData.event_end_date,
    spansMultipleDays: eventData.spans_multiple_days,
  });
  const timeRange = formatEventTimeRange({
    startDate: eventData.event_start_date,
    endDate: eventData.event_end_date,
    startTime: eventData.event_start_time,
    endTime: eventData.event_end_time,
    spansMultipleDays: eventData.spans_multiple_days,
    timezoneLabel: eventData.timezone_label,
  });

  const activeTicketTypes = (eventData.ticket_types ?? []).filter((ticketType) => ticketType.is_active !== false);
  const isAvailabilityBlocked = eventData.admission_availability === "coming_soon"
    || eventData.admission_availability === "closed"
    || eventData.admission_availability === "sold_out";

  return (
    <Card>
      <CardContent className="pt-4 space-y-4">
        <h4 className="text-lg font-black text-gray-900">Event Details</h4>

        {/* Date */}
        {eventData.event_start_date && (
          <div className="flex items-start gap-3">
            {/* <span className="text-xl">📅</span> */}
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">
                Date
              </p>
              <p className="text-sm font-semibold text-gray-800">{dateRange}</p>
            </div>
          </div>
        )}

        {/* Time */}
        {eventData.event_start_time && (
          <div className="flex items-start gap-3">
            {/* <span className="text-xl">🕐</span> */}
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">
                Time
              </p>
              <p className="text-sm font-semibold text-gray-800">{timeRange}</p>
            </div>
          </div>
        )}

        {/* Location type + venue */}
        {(locationLabel || venueParts) && (
          <div className="flex items-start gap-3">
            {/* <span className="text-xl">📍</span> */}
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">
                Location
              </p>
              {locationLabel && (
                <span
                  className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mb-1 ${
                    locationType === "online"
                      ? "bg-blue-50 text-blue-700"
                      : locationType === "hybrid"
                        ? "bg-purple-50 text-purple-700"
                        : "bg-green-50 text-green-700"
                  }`}
                >
                  {locationLabel}
                </span>
              )}
              {venueParts && (
                <p className="text-sm font-semibold text-gray-800">
                  {venueParts}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Price — shown regardless of availability so visitors know what admission costs/cost */}
        {eventData.attendance_type === "paid" && (
          <div className="flex items-start gap-3">
            <div className="w-full">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">
                Tickets
              </p>
              {eventData.pricing_mode === "multiple" ? (
                <>
                  {eventData.price_range && (
                    <p className="text-sm font-semibold text-gray-800">
                      From {formatMoney(eventData.price_range.min, eventData.event_currency)}
                    </p>
                  )}
                  {activeTicketTypes.length > 0 && (
                    <ul className="mt-1.5 space-y-1">
                      {activeTicketTypes.map((ticketType) => (
                        <li key={ticketType.slug} className="flex items-center justify-between gap-3 text-xs text-gray-600">
                          <span>{ticketType.name}</span>
                          <span className="font-medium text-gray-800">{formatMoney(ticketType.price, eventData.event_currency)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : eventData.pricing_mode === "varies" ? (
                <p className="text-sm font-semibold text-gray-800">Prices vary</p>
              ) : (
                eventData.formatted_price &&
                eventData.formatted_price.toLowerCase() !== "free" && (
                  <p className="text-sm font-semibold text-gray-800">
                    {eventData.formatted_price}
                  </p>
                )
              )}
            </div>
          </div>
        )}

        {/* Availability state — informational, suppresses the admission action below */}
        {isAvailabilityBlocked && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-semibold text-amber-800">
              {eventData.admission_availability === "coming_soon"
                ? "Tickets Coming Soon"
                : eventData.admission_availability === "sold_out"
                  ? "Sold Out"
                  : "Registration Closed"}
            </p>
            {eventData.ticket_availability_message && (
              <p className="text-xs text-amber-700 mt-1">{eventData.ticket_availability_message}</p>
            )}
            {eventData.admission_availability === "coming_soon" && eventData.ticket_release_at && (
              <p className="text-xs text-amber-700 mt-1">Available {formatShortDate(eventData.ticket_release_at)}</p>
            )}
          </div>
        )}

        {/* Admission action — how to actually register, buy, or reserve a spot */}
        {!isAvailabilityBlocked && (
          <>
            {eventData.attendance_type === "free_registration_required" && eventData.registration_url && (
              <Link
                href={eventData.registration_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[#93C01F] text-white text-sm font-bold hover:bg-[#82ab1b] transition-colors"
              >
                Register
              </Link>
            )}

            {eventData.attendance_type === "paid" && eventData.purchase_method === "external_url" && eventData.event_ticket_url && (
              <div className="space-y-1">
                <Link
                  href={eventData.event_ticket_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[#93C01F] text-white text-sm font-bold hover:bg-[#82ab1b] transition-colors"
                >
                  Get Tickets
                </Link>
                {eventData.ticket_provider && (
                  <p className="text-xs text-gray-400 text-center">via {eventData.ticket_provider}</p>
                )}
              </div>
            )}

            {eventData.attendance_type === "paid" && eventData.purchase_method === "pay_at_venue" && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs font-semibold text-gray-800">Pay at Venue</p>
                {eventData.purchase_instructions && (
                  <p className="text-xs text-gray-600 mt-1">{eventData.purchase_instructions}</p>
                )}
              </div>
            )}

            {eventData.attendance_type === "paid" && eventData.purchase_method === "contact_organizer" && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs font-semibold text-gray-800">Contact the Organizer to Purchase</p>
                <p className="text-xs text-gray-600 mt-1">
                  {eventData.purchase_instructions || "Use the contact details below to reserve or purchase admission."}
                </p>
              </div>
            )}
          </>
        )}

        {/* Online access — how attendees actually receive the joining details */}
        {(locationType === "online" || locationType === "hybrid") && (
          <>
            {eventData.online_access_policy === "public_link" && eventData.event_online_url && (
              <Link
                href={eventData.event_online_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors"
              >
                🖥️ Join Online
              </Link>
            )}
            {eventData.online_access_policy === "sent_after_registration" && (
              <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
                Online access details will be provided by the organizer or ticket provider after registration or ticket purchase.
              </p>
            )}
            {eventData.online_access_policy === "shared_later" && (
              <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
                {eventData.online_access_instructions || "The online joining link will be shared closer to the event."}
              </p>
            )}
            {eventData.online_access_policy === "public_link" && eventData.online_access_instructions && (
              <p className="text-xs text-gray-500">{eventData.online_access_instructions}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function SidebarInfo({
  provider,
  pricing,
  // services,
  hours,
  previewMode = false,
}: {
  provider: Provider;
  pricing: PricingItem[];
  // services: string[];
  hours: OpeningHour[];
  previewMode?: boolean;
}) {
  const socialLinks = provider.socials || {};
  const hasContact = !!(
    provider.phone ||
    provider.email ||
    Object.values(socialLinks).some((v) => v)
  );
  const hasHours = !!(hours && hours.length > 0);
  // Explicit status comparison — claim_status is always a non-empty string
  // ("unclaimed", "claimed", ...), so `!provider.claim_status` was always false
  // and silently hid the claim CTA on every listing, regardless of status.
  const isClaimed = provider.claim_status === "claimed";

  const { user } = useAuth();
  const router = useRouter();
  const [eligibility, setEligibility] = useState<ClaimEligibility | null>(null);

  useEffect(() => {
    // Nothing to check while logged out — showClaimButton already short-circuits
    // on `!user` in that case, so there's no need to reset state here. Also
    // skipped entirely in preview mode — there's no claim state to check for
    // a listing manager looking at their own not-yet-published listing.
    if (previewMode || !user || !provider.slug) return;

    let cancelled = false;
    const token = localStorage.getItem("authToken") || undefined;
    getClaimEligibility(provider.slug, token)
      .then((data) => {
        if (!cancelled) setEligibility(data);
      })
      .catch(() => {
        if (!cancelled) setEligibility(null);
      });

    return () => {
      cancelled = true;
    };
  }, [user, provider.slug, previewMode]);

  // An email claim awaiting its OTP can be resumed — the verify page jumps
  // straight to the code-entry step for this case.
  const hasResumableClaim =
    eligibility?.active_case?.status === "awaiting_email_verification" &&
    eligibility?.active_case?.method === "email";

  // Logged-out visitors always see the CTA (it sends them to login first); once
  // authenticated, defer to the backend's explicit eligibility check.
  const showClaimButton =
    !user || eligibility?.claimable === true || hasResumableClaim;
  // Already-claimed listings always get the CTA too — even if the live
  // eligibility check hasn't resolved yet (or says not-claimable for some
  // other reason), the destination page has its own eligibility gate and
  // explains why if it genuinely can't be challenged.
  const showClaimSection = !previewMode && (showClaimButton || isClaimed);
  const claimButtonLabel = hasResumableClaim
    ? "Continue claim verification"
    : isClaimed
      ? "Request Ownership Review"
      : "Claim business";

  const handleClaimBusiness = () => {
    if (user) {
      router.push(`/claim/${provider.slug}/verify`);
    } else {
      router.push(`/auth/login?redirect=/claim/${provider.slug}/verify`);
    }
  };

  // Nothing to show in this card at all — don't render an empty white box.
  if (
    pricing.length === 0 &&
    !hasHours &&
    !hasContact &&
    !provider.website &&
    !showClaimSection
  ) {
    return null;
  }

  return (
    <Card>
      <CardContent className="pt-0.5">
        {pricing.length > 0 && (
          <>
            <div className="text-2xl font-bold text-gray-900">
              {pricing[0]?.price}
            </div>
            <div className="text-xs text-gray-400">{pricing[0]?.label}</div>
          </>
        )}

        {hasHours && (
          <div className="mt-6">
            <h5 className="text-lg font-black text-gray-900 flex items-center gap-2 mb-3">
              <Clock className="h-5 w-5 text-[#93C01F]" weight="bold" />{" "}
              Business Hours
            </h5>
            <div className="space-y-2">
              {hours.map((h, idx) => (
                <div
                  key={idx}
                  className="flex justify-between text-sm py-1 border-b border-gray-50 last:border-0"
                >
                  <span className="text-gray-500 font-medium">
                    {h.day_of_week}
                  </span>
                  <span className="text-gray-900 font-semibold">
                    {format12Hour(h.open_time)} - {format12Hour(h.close_time)}
                  </span>
                </div>
              ))}
            </div>
            <Divider />
          </div>
        )}

        {hasContact && (
          <>
            <h5 className="text-lg font-black text-black">Contact</h5>
            <div className="mt-3 space-y-4 text-sm text-gray-600">
              {provider.phone && (
                <div className="flex items-center gap-10">
                  <h6 className="text-base font-medium text-black min-w-12">
                    Phone
                  </h6>
                  <Link
                    href={`tel:${provider.phone}`}
                    className="font-medium text-gray-900 hover:underline focus:underline outline-none"
                  >
                    {provider.phone}
                  </Link>
                </div>
              )}
              {provider.email && (
                <div className="flex items-center gap-10">
                  <h6 className="text-base font-medium text-black min-w-12">
                    Email
                  </h6>
                  <Link
                    href={`mailto:${provider.email}`}
                    className="font-medium text-gray-900 truncate hover:underline focus:underline outline-none"
                  >
                    {provider.email}
                  </Link>
                </div>
              )}

              {provider.socials &&
                Object.values(socialLinks).some((v) => v) && (
                  <div className="flex flex-col gap-4 mt-2">
                    <h6 className="text-base font-medium text-black">
                      Socials:
                    </h6>
                    <div className="grid grid-cols-1 gap-2.5">
                      {socialLinks.whatsapp && (
                        <SocialIcon
                          href={socialLinks.whatsapp}
                          icon={WhatsappLogo}
                          brandColor="#25D366"
                          name="WhatsApp"
                        />
                      )}
                      {socialLinks.facebook && (
                        <SocialIcon
                          href={socialLinks.facebook}
                          icon={FacebookLogo}
                          brandColor="#1877F2"
                          name="Facebook"
                        />
                      )}
                      {socialLinks.instagram && (
                        <SocialIcon
                          href={socialLinks.instagram}
                          icon={InstagramLogo}
                          brandColor="#E4405F"
                          name="Instagram"
                        />
                      )}
                      {socialLinks.twitter && (
                        <SocialIcon
                          href={socialLinks.twitter}
                          icon={XLogo}
                          brandColor="#000000"
                          name="X (Twitter)"
                        />
                      )}
                      {socialLinks.youtube && (
                        <SocialIcon
                          href={socialLinks.youtube}
                          icon={YoutubeLogo}
                          brandColor="#FF0000"
                          name="YouTube"
                        />
                      )}
                      {socialLinks.tiktok && (
                        <SocialIcon
                          href={socialLinks.tiktok}
                          icon={TiktokLogo}
                          brandColor="#010101"
                          name="TikTok"
                        />
                      )}
                    </div>
                  </div>
                )}
            </div>
          </>
        )}

        {hasContact && (provider.website || showClaimSection) && <Divider />}

        {provider.website && (
          <>
            <div className="flex flex-col gap-1">
              <h6 className="text-base font-medium text-gray-900">Website</h6>
              <Link
                href={provider.website}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-600 hover:underline text-sm truncate"
              >
                {provider.website}
              </Link>
            </div>
            {showClaimSection && <Divider />}
          </>
        )}

        {showClaimSection && (
          <div className="mt-4">
            <Button
              onClick={handleClaimBusiness}
              className="w-full bg-[#93C01F] hover:bg-[#82ab1b] text-white"
            >
              {claimButtonLabel}
            </Button>
          </div>
        )}

        {/* Always shown, independent of eligibility — this is a quiet, permanent
            "is this listing wrong / not yours?" affordance (same as Google/Yelp
            always showing an "Own this business?" link regardless of claim
            status). The actual eligibility gate lives on the destination page.
            Hidden in preview mode — meaningless for a vendor previewing their
            own listing. */}
        {!previewMode && (
          <p className="text-xs text-gray-400 mt-5 text-center">
            Own this listing?{" "}
            <button
              type="button"
              onClick={handleClaimBusiness}
              className="text-[#93C01F] font-medium hover:underline"
            >
              Claim your listing
            </button>
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// --- Listing Gallery (mobile: slider, desktop: Airbnb-style bento) ---

function ListingBentoGallery({
  images,
  alt,
  slug,
  previewMode = false,
}: {
  images: GalleryItem[];
  alt: string;
  slug: string;
  previewMode?: boolean;
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const items = images.filter((i) => i.type === "image");
  if (!items.length) return null;

  const openAt = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const [main, t1, t2, t3, t4] = items;
  const extraCount = Math.max(0, items.length - 5);
  const count = Math.min(items.length, 5);

  // Helper: single thumbnail cell — itemIndex is the position in `items` for lightbox
  const thumb = (
    img: GalleryItem,
    itemIndex: number,
    key: number,
    isLast = false,
    extraClass = "",
  ) => (
    <div
      key={key}
      className={cn("relative overflow-hidden cursor-pointer", extraClass)}
      onClick={() => openAt(itemIndex)}
    >
      <Image
        src={img.src}
        alt={alt}
        fill
        className="object-cover transition-transform duration-700 hover:scale-[1.02]"
        unoptimized
      />
      {isLast && extraCount > 0 && (
        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center hover:bg-black/60 transition-colors">
          <span className="text-white font-bold text-2xl">+{extraCount}</span>
          <span className="text-white/80 text-xs mt-0.5">more photos</span>
        </div>
      )}
    </div>
  );

  // The tall main image that spans 2 rows
  const mainCell = (
    <div
      className="relative overflow-hidden row-span-2 cursor-pointer"
      onClick={() => openAt(0)}
    >
      <Image
        src={main.src}
        alt={alt}
        fill
        className="object-cover transition-transform duration-700 hover:scale-[1.02]"
        unoptimized
        priority
      />
    </div>
  );

  const desktopGrid = () => {
    // 1 image — full width hero
    if (count === 1) {
      return (
        <div
          className="relative h-full overflow-hidden cursor-pointer"
          onClick={() => openAt(0)}
        >
          <Image
            src={main.src}
            alt={alt}
            fill
            className="object-cover"
            unoptimized
            priority
          />
        </div>
      );
    }

    // 2 images — side by side
    if (count === 2) {
      return (
        <div
          className="grid h-full gap-[3px]"
          style={{ gridTemplateColumns: "3fr 2fr" }}
        >
          <div
            className="relative overflow-hidden cursor-pointer"
            onClick={() => openAt(0)}
          >
            <Image
              src={main.src}
              alt={alt}
              fill
              className="object-cover transition-transform duration-700 hover:scale-[1.02]"
              unoptimized
              priority
            />
          </div>
          {thumb(t1, 1, 1)}
        </div>
      );
    }

    // 3 images — main tall left, 2 stacked right
    if (count === 3) {
      return (
        <div
          className="grid h-full gap-[3px]"
          style={{
            gridTemplateColumns: "3fr 2fr",
            gridTemplateRows: "1fr 1fr",
          }}
        >
          {mainCell}
          {thumb(t1, 1, 1)}
          {thumb(t2, 2, 2)}
        </div>
      );
    }

    // 4 images — main tall left, t1+t2 top row, t3 full bottom
    if (count === 4) {
      return (
        <div
          className="grid h-full gap-[3px]"
          style={{
            gridTemplateColumns: "3fr 1.25fr 1.25fr",
            gridTemplateRows: "1fr 1fr",
          }}
        >
          {mainCell}
          {thumb(t1, 1, 1)}
          {thumb(t2, 2, 2)}
          {thumb(t3, 3, 3, false, "col-span-2")}
        </div>
      );
    }

    // 5+ images — main tall left, 2×2 right grid
    return (
      <div
        className="grid h-full gap-[3px]"
        style={{
          gridTemplateColumns: "3fr 1.25fr 1.25fr",
          gridTemplateRows: "1fr 1fr",
        }}
      >
        {mainCell}
        {thumb(t1, 1, 1)}
        {thumb(t2, 2, 2)}
        {thumb(t3, 3, 3)}
        {thumb(t4, 4, 4, true)}
      </div>
    );
  };

  return (
    <>
      {/* ── Mobile: carousel ── */}
      <div className="relative md:hidden">
        <HeroCarousel items={items} alt={alt} />
        {!previewMode && (
          <div className="absolute top-3 right-3 z-20">
            <BookmarkButton slug={slug} iconOnly />
          </div>
        )}
      </div>

      {/* ── Desktop: bento ── */}
      <div className="hidden md:block relative">
        <div className="w-full h-[500px] bg-gray-200">{desktopGrid()}</div>
        {!previewMode && (
          <div className="absolute top-4 right-4 z-20">
            <BookmarkButton slug={slug} iconOnly />
          </div>
        )}
      </div>

      {/* ── Lightbox ── */}
      <Lightbox
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        items={items}
        currentIndex={lightboxIndex}
        onNavigate={setLightboxIndex}
      />
    </>
  );
}

// --- Main Page Component ---

export default function UniversalSlugPage({
  params,
  type = "business",
}: PageProps) {
  const resolvedParams = React.use(params);
  const { categorySlug, slug } = resolvedParams;
  // Set by the dashboard wizard's "Preview as visitor" dialog (an iframe onto
  // this exact route) to suppress interactions that don't make sense for a
  // listing manager looking at their own not-yet-published listing. Purely
  // cosmetic — /show has no access control, so this isn't a security gate.
  const previewMode = useSearchParams().get("preview") === "1";

  const [loading, setLoading] = useState(true);
  const [providerData, setProviderData] = useState<Provider | null>(null);
  const [template, setTemplate] = useState<TemplateContent | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://me-fie.co.uk";

      try {
        const listingResponse = await fetch(
          `${API_URL}/api/listing/${slug}/show`,
          {
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
          },
        );

        if (listingResponse.ok) {
          const json = await listingResponse.json();
          const listingData: ApiListingData = json.data;

          let ratingsData: ApiRatingData[] = [];

          if (listingData.slug || slug) {
            const listingKey = listingData.slug || slug;
            const ratingsResponse = await fetch(
              `/api/listing/${listingKey}/ratings`,
              { headers: { Accept: "application/json" } },
            );

            if (ratingsResponse.ok) {
              const ratingsJson = await ratingsResponse.json();
              ratingsData = ratingsJson.data || [];
            }
          }

          let socialLinks: SocialLinks = {};
          if (listingData.socials && listingData.socials.length > 0) {
            // Use the last (most recent) embedded social record as a base
            const socialData =
              listingData.socials[listingData.socials.length - 1];
            socialLinks = {
              facebook: socialData.facebook,
              instagram: socialData.instagram,
              twitter: socialData.twitter,
              youtube: socialData.youtube,
              tiktok: socialData.tiktok,
              whatsapp: socialData.whatsapp,
            };
          }

          try {
            const token = localStorage.getItem("authToken");
            const socialsHeaders: Record<string, string> = {
              Accept: "application/json",
            };
            if (token) socialsHeaders["Authorization"] = `Bearer ${token}`;
            const socialsRes = await fetch(
              `${API_URL}/api/listing/${slug}/socials`,
              { headers: socialsHeaders },
            );
            if (socialsRes.ok) {
              const socialsJson = await socialsRes.json();
              const raw = socialsJson.data || socialsJson;
              // Use last (most recent) record; dedicated endpoint always overrides embedded data
              const list = Array.isArray(raw) ? raw : [raw];
              const s = list[list.length - 1] || {};
              socialLinks = {
                facebook: s.facebook || undefined,
                instagram: s.instagram || undefined,
                twitter: s.twitter || undefined,
                youtube: s.youtube || undefined,
                tiktok: s.tiktok || undefined,
                whatsapp: s.whatsapp || undefined,
              };
            }
          } catch {}

          const provider: Provider = {
            id: listingData.id,
            name: listingData.name,
            slug: listingData.slug,
            listingType: listingData.type,
            description:
              listingData.bio ||
              listingData.description ||
              "No description provided.",
            location:
              listingData.type === "event"
                ? listingData.event?.event_venue ||
                  listingData.event?.event_city ||
                  listingData.address ||
                  listingData.city
                : listingData.address ||
                  listingData.city ||
                  listingData.location,
            country:
              listingData.type === "event"
                ? listingData.event?.event_country || listingData.country
                : listingData.country,
            verified: !!(
              listingData.listing_verified ?? listingData.is_verified
            ),
            claim_status: listingData.claim_status,
            reviews: listingData.reviews_count
              ? listingData.reviews_count.toString()
              : "0",
            rating: listingData.rating || 0,
            phone: listingData.primary_phone,
            email: listingData.email,
            website: listingData.website,
            socials: socialLinks,
            latitude: listingData.latitude,
            longitude: listingData.longitude,
            eventData:
              listingData.type === "event" ? listingData.event : undefined,
          };

          const rawImages = listingData.images || [];
          const gallery: GalleryItem[] = rawImages.map((img) => {
            if (typeof img === "object" && (img.card || img.webp || img.original)) {
              const src = getImageUrl(img.card || img.webp || img.original);
              return {
                type: isVideoFile(src) ? "video" : "image",
                src: src,
                alt: provider.name,
              };
            }
            if (typeof img === "string") {
              const src = getImageUrl(img);
              return {
                type: isVideoFile(src) ? "video" : "image",
                src: src,
                alt: provider.name,
              };
            }
            return {
              type: "image",
              src: "/images/no-image.jpg",
              alt: "Placeholder",
            };
          });

          // The explicit cover always wins over whichever image happens to be
          // first in `images` — keeps this page in sync with what listing
          // cards elsewhere show for the same listing. Built with the same
          // card/webp/original precedence as the gallery entries above, so
          // the string match below reliably finds the cover in `gallery`
          // instead of appending it as a duplicate.
          const explicitCover =
            listingData.cover?.card ||
            listingData.cover?.webp ||
            listingData.cover?.original ||
            listingData.primary_image ||
            listingData.cover_image;
          if (explicitCover) {
            const coverSrc = getImageUrl(explicitCover);
            const coverIndex = gallery.findIndex((g) => g.src === coverSrc);
            if (coverIndex > 0) {
              const [cover] = gallery.splice(coverIndex, 1);
              gallery.unshift(cover);
            } else if (coverIndex === -1) {
              gallery.unshift({
                type: "image",
                src: coverSrc,
                alt: provider.name,
              });
            }
          }

          // The canonical media shape excludes videos from `images` (they must
          // never reach image components) — surface gallery videos explicitly.
          const canonicalGallery = (listingData as {
            gallery?: { kind?: string; original?: string; poster?: string; alt_text?: string }[];
          }).gallery;
          (canonicalGallery ?? [])
            .filter((m) => m.kind === "video" && m.original)
            .forEach((m) => {
              gallery.push({
                type: "video",
                src: getImageUrl(m.original as string),
                poster: m.poster ? getImageUrl(m.poster) : undefined,
                alt: m.alt_text || provider.name,
              });
            });
          if (gallery.length === 0) {
            gallery.push({
              type: "image",
              src: "/images/no-image.jpg",
              alt: provider.name,
            });
          }

          const mappedReviews: ReviewItem[] = ratingsData
            .filter((r) => r.status !== "hidden")
            .map((rating) => ({
              id: rating.id,
              slug: rating.slug,
              author: extractUserName(rating.user),
              rating: rating.rating,
              date: rating.created_at
                ? new Date(rating.created_at).toLocaleDateString()
                : "Recent",
              comment: rating.comment,
              avatar: rating.user?.avatar || "",
              vendor_reply: rating.vendor_reply ?? null,
              vendor_reply_at: rating.vendor_reply_at ?? null,
              replies:
                rating.replies?.map((r) => ({
                  id: r.id,
                  author: r.user?.name || "User",
                  comment: r.comment,
                  date: new Date(r.created_at).toLocaleDateString(),
                  avatar: r.user?.avatar || "",
                })) || [],
            }));

          const servicesList =
            listingData.services?.map((s: any) =>
              typeof s === "string" ? s : s.name,
            ) || [];

          setProviderData(provider);
          setTemplate({
            services: servicesList,
            pricing: listingData.pricing || [],
            experience: listingData.experience || [],
            faqs: listingData.faqs || [],
            reviews: mappedReviews,
            gallery: gallery,
            hours: listingData.opening_hours || [],
          });
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <SpinnerGap className="h-8 w-8 animate-spin text-[#93C01F]" />
      </div>
    );
  }

  if (!providerData || !template) {
    return notFound();
  }

  const rating = Number(providerData.rating) || 0;

  const resolvedType = providerData.listingType || type;
  const sectionLink =
    resolvedType === "event"
      ? "/events"
      : resolvedType === "community"
        ? "/communities"
        : resolvedType === "business"
          ? "/businesses"
          : "/discover";
  const sectionLabel =
    resolvedType === "event"
      ? "Events"
      : resolvedType === "community"
        ? "Communities"
        : resolvedType === "business"
          ? "Businesses"
          : "Discover";

  const formatCategoryLabel = (slug: string) =>
    slug
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

  return (
    <div className="min-h-screen pb-24 pt-24 bg-gray-50/30">
      <div className="mx-auto w-full max-w-7xl px-4 lg:px-0">
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              {previewMode ? <BreadcrumbPage>Home</BreadcrumbPage> : <BreadcrumbLink href="/">Home</BreadcrumbLink>}
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {previewMode ? <BreadcrumbPage>{sectionLabel}</BreadcrumbPage> : <BreadcrumbLink href={sectionLink}>{sectionLabel}</BreadcrumbLink>}
            </BreadcrumbItem>
            {categorySlug && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  {previewMode ? (
                    <BreadcrumbPage>{formatCategoryLabel(categorySlug)}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink href={`/categories/${categorySlug}`}>
                      {formatCategoryLabel(categorySlug)}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </>
            )}
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{providerData.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 px-4 lg:grid-cols-12 lg:px-0">
        <main className="lg:col-span-8 space-y-6">
          <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
            <ListingBentoGallery
              images={template.gallery}
              alt={providerData.name}
              slug={providerData.slug}
              previewMode={previewMode}
            />

            <ProviderHeader
              provider={providerData}
              rating={rating}
              type={type}
            />

            <ProviderTabs
              template={template}
              providerName={providerData.name}
              galleryItems={template.gallery}
              listingSlug={providerData.slug}
              previewMode={previewMode}
            />
          </div>

          {/* What We Do — only shown when services exist */}
          {template.services.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold">
                  What We Do
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {template.services.map((service, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100 hover:border-[#93C01F]/30 hover:bg-[#93C01F]/5 transition-colors"
                    >
                      <div className="mt-0.5 w-5 h-5 rounded-full bg-[#93C01F]/15 flex items-center justify-center shrink-0">
                        <div className="w-2 h-2 rounded-full bg-[#93C01F]" />
                      </div>
                      <span className="text-sm text-gray-700 leading-relaxed">
                        {service}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </main>

        <aside className="lg:col-span-4 space-y-6">
          <SidebarLocation provider={providerData} />
          {providerData.eventData && (
            <SidebarEventDetails eventData={providerData.eventData} />
          )}
          <SidebarInfo
            provider={providerData}
            pricing={template.pricing}
            // services={template.services}
            hours={template.hours}
            previewMode={previewMode}
          />
        </aside>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, use } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Bookmark,
  MapPin,
  Calendar,
  Clock,
  Ticket,
  Share2,
  Facebook,
  Instagram,
  Twitter,
  Youtube,
  Loader2,
} from "lucide-react";
import { stripHtml } from "@/lib/utils";

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
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/auth-context";

// Imported Components
import { MediaGallery } from "@/components/media-gallery";
import { HeroCarousel } from "@/components/hero-slide";
import { ReviewsSection } from "@/components/review-button";

// --- Type Definitions ---

type PageProps = {
  params: Promise<{ slug: string }>;
};

interface SocialLinks {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  youtube?: string;
}

interface EventItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  date: string; // ISO string
  time: string;
  location: string;
  venue: string;
  price: string;
  organizer: string;
  image: string;
  gallery: Array<{ type: "image" | "video"; src: string; alt?: string }>;
  isVerified?: boolean;
  socials?: SocialLinks;
  website?: string;
  ticketLink?: string;
  tags?: string[];
}

// --- Helper Components ---

const Divider = () => <div className="w-full h-px bg-gray-200 my-6" />;

const SocialIcon = ({
  href,
  icon: Icon,
}: {
  href: string;
  icon: React.ElementType;
}) => (
  <Link
    href={href}
    target="_blank"
    rel="noreferrer"
    className="text-gray-700 hover:text-gray-900 transition-colors"
  >
    <Icon className="h-4 w-4" />
  </Link>
);

// --- Sub-Components ---

function EventHeader({ event }: { event: EventItem }) {
  const eventDate = new Date(event.date);
  const formattedDate = isNaN(eventDate.getTime())
    ? event.date
    : eventDate.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge className="bg-[#93C01F] hover:bg-[#7fa818] border-none text-white font-medium">
          {event.category}
        </Badge>
        {event.isVerified && (
          <Badge
            variant="outline"
            className="border-blue-200 bg-blue-50 text-blue-700 gap-1 font-normal"
          >
            <Image
              src="/images/icons/verify.svg"
              alt="Verified"
              width={14}
              height={14}
            />
            Verified Event
          </Badge>
        )}
      </div>

      <h1 className="text-3xl font-bold text-gray-900 md:text-4xl leading-tight">
        {event.title}
      </h1>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 text-sm text-gray-600 mt-1">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-[#93C01F]" />
          <span className="font-medium">{formattedDate}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-[#93C01F]" />
          <span className="font-medium">{event.time}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-[#93C01F]" />
          <span className="font-medium">
            {event.venue}, {event.location}
          </span>
        </div>
      </div>
    </div>
  );
}

function EventTabs({ event }: { event: EventItem }) {
  return (
    <div className="mt-6 px-4 pb-4">
      <Tabs defaultValue="details" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto rounded-full no-scrollbar">
          <TabsTrigger
            value="details"
            className="rounded-full px-6 text-base font-normal"
          >
            Event Details
          </TabsTrigger>
          <TabsTrigger
            value="gallery"
            className="rounded-full px-6 text-base font-normal"
          >
            Gallery
          </TabsTrigger>
          <TabsTrigger
            value="reviews"
            className="rounded-full px-6 text-base font-normal"
          >
            Reviews
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                About this event
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600 leading-relaxed whitespace-pre-wrap text-sm sm:text-base">
                {stripHtml(event.description)}
              </p>

              {event.tags && event.tags.length > 0 && (
                <div className="pt-4 border-t mt-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">
                    Tags
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {event.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="bg-gray-100 text-gray-600 hover:bg-gray-200"
                      >
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gallery" className="mt-6">
          <Card>
            <CardContent className="pt-6">
              {event.gallery && event.gallery.length > 0 ? (
                <MediaGallery
                  items={event.gallery}
                  providerName={event.title}
                />
              ) : (
                <p className="text-gray-500 text-sm text-center py-8">
                  No gallery images available.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reviews" className="mt-6">
          <Card>
            <div className="p-4">
              <ReviewsSection reviews={[]} listingSlug={event.slug}/>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SidebarTicket({ event }: { event: EventItem }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-gray-500 uppercase font-medium tracking-wide">
              Ticket Price
            </p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">
              {event.price}
            </h3>
          </div>
          <div className="h-10 w-10 rounded-full bg-[#EBF8C9] flex items-center justify-center">
            <Ticket className="h-5 w-5 text-[#5F8B0A]" />
          </div>
        </div>

        <Button className="w-full bg-[#93C01F] hover:bg-[#82ab1b] font-semibold h-11 text-base">
          Get Tickets
        </Button>

        <p className="text-[10px] text-center text-gray-400 mt-3 flex items-center justify-center gap-1">
          Secure checkout powered by Me-Fie
        </p>
      </CardContent>
    </Card>
  );
}

function SidebarOrganizer({ event }: { event: EventItem }) {
  const socialLinks = event.socials || {};

  return (
    <Card>
      <CardContent className="pt-6">
        <h4 className="text-lg font-bold text-gray-900 mb-4">Organizer</h4>

        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-full bg-gray-100 overflow-hidden border border-gray-200 shrink-0">
            <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-xl bg-[#F8F9FA]">
              {event.organizer.charAt(0)}
            </div>
          </div>
          <div className="overflow-hidden">
            <h5 className="font-semibold text-gray-900 truncate">
              {event.organizer}
            </h5>
            {event.website && (
              <Link
                href={event.website}
                target="_blank"
                className="text-xs text-[#93C01F] hover:underline block truncate"
              >
                Visit website
              </Link>
            )}
          </div>
        </div>

        <Divider />

        <h5 className="text-sm font-semibold text-gray-900 mb-3">
          Connect with us
        </h5>
        <div className="flex gap-4">
          {socialLinks.facebook && (
            <SocialIcon href={socialLinks.facebook} icon={Facebook} />
          )}
          {socialLinks.instagram && (
            <SocialIcon href={socialLinks.instagram} icon={Instagram} />
          )}
          {socialLinks.twitter && (
            <SocialIcon href={socialLinks.twitter} icon={Twitter} />
          )}
          {socialLinks.youtube && (
            <SocialIcon href={socialLinks.youtube} icon={Youtube} />
          )}
        </div>

        <div className="mt-6 pt-6 border-t">
          <Button
            variant="outline"
            className="w-full gap-2 text-gray-600 hover:text-gray-900"
          >
            <Share2 className="h-4 w-4" />
            Share Event
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SidebarMap({ event }: { event: EventItem }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <h4 className="text-lg font-bold text-gray-900 mb-3">Location</h4>
        <div className="relative h-48 overflow-hidden rounded-xl bg-gray-100 border border-gray-200">
          <iframe
            src={`https://maps.google.com/maps?q=${encodeURIComponent(
              event.venue + " " + event.location
            )}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
            className="absolute inset-0 w-full h-full border-0"
            loading="lazy"
            allowFullScreen
          />
        </div>
        <div className="mt-3">
          <p className="text-sm font-semibold text-gray-900">{event.venue}</p>
          <p className="text-xs text-gray-500 mt-0.5">{event.location}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// --- Main Page (Client Component) ---

export default function EventSlugPage({ params }: PageProps) {
  // Unwrap params (Next.js 15+)
  const { slug } = use(params);

  const { user, loading: authLoading } = useAuth();
  const [event, setEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Fetch Logic ---
  useEffect(() => {
    async function fetchEventDetails() {
      // 1. Wait for Auth context to initialize (even if user is null)
      if (authLoading) return;

      setLoading(true);
      setError(null);

      try {
        // 2. Get Token from LocalStorage
        const token = localStorage.getItem("authToken");
        const headers: HeadersInit = {
          Accept: "application/json",
          "Content-Type": "application/json",
        };

        // Add Auth header if token exists
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://me-fie.co.uk";

        // 3. Make API Call
        const response = await fetch(`${API_URL}/api/events/${slug}`, {
          method: "GET",
          headers,
        });

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Event not found");
          }
          throw new Error("Failed to load event details");
        }

        const json = await response.json();
        const data = json.data || json;

        // 4. Data Mapping (Safely handle backend response)
        const mappedEvent: EventItem = {
          id: data.id?.toString() || "",
          title: data.title || data.name || "Untitled Event",
          slug: data.slug || slug,
          description: data.description || "",
          category:
            typeof data.category === "object"
              ? data.category.name
              : data.category || "General",

          date: data.start_date || data.date || new Date().toISOString(),
          time: data.start_time || data.time || "TBD",

          location: data.city || data.location || "Location TBD",
          venue: data.venue || data.address || "Venue TBD",

          price:
            data.price_range || (data.price ? `GHS ${data.price}` : ""),
          ticketLink: data.ticket_link || "",

          organizer: data.organizer?.name || data.organizer || "Me-Fie Events",

          image:
            data.cover_image ||
            data.image ||
            "/images/no-image.jpg",
          gallery: Array.isArray(data.gallery)
            ? data.gallery.map((img: unknown) =>
                typeof img === "string"
                  ? { type: "image", src: img, alt: data.title }
                  : img
              )
            : [],

          isVerified: Boolean(data.is_verified),

          website: data.website || "",
          tags: data.tags || [],
          socials: {
            facebook: data.socials?.facebook || "",
            instagram: data.socials?.instagram || "",
            twitter: data.socials?.twitter || "",
            youtube: data.socials?.youtube || "",
          },
        };

        setEvent(mappedEvent);
      } catch (err) {
        console.error("Error fetching event:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchEventDetails();
  }, [slug, authLoading, user]);

  // --- Loading State ---
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50/30">
        <Loader2 className="h-10 w-10 animate-spin text-[#93C01F] mb-4" />
        <p className="text-gray-500">Loading event details...</p>
      </div>
    );
  }

  // --- Error State ---
  if (error || !event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Event Not Found
        </h2>
        <p className="text-gray-600 mb-6">
          {error || "We couldn't find the event you're looking for."}
        </p>
        <Link href="/events">
          <Button>Back to Events</Button>
        </Link>
      </div>
    );
  }

  // Fallback for gallery (Main image + any gallery items)
  const displayGallery =
    event.gallery.length > 0
      ? event.gallery
      : [{ type: "image" as const, src: event.image, alt: event.title }];

  return (
    <div className="min-h-screen pb-24 pt-24 bg-gray-50/30">
      <div className="mx-auto w-full max-w-7xl px-4 lg:px-0">
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/events">Events</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="font-medium text-gray-900">
                {event.title}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 px-4 lg:grid-cols-12 lg:px-0">
        {/* Main Content (Left) */}
        <main className="lg:col-span-8">
          <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
            {/* Hero Image Section */}
            <div className="relative w-full h-[300px] sm:h-[400px]">
              <HeroCarousel items={displayGallery} alt={event.title} />

              {/* Floating Bookmark Button */}
              <div className="absolute top-4 right-6 flex gap-2 z-10">
                <Button
                  size="sm"
                  className="border border-white/60 bg-white/80 text-gray-700 shadow-sm transition hover:bg-white backdrop-blur-md"
                >
                  <Bookmark className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </div>
            </div>

            <EventHeader event={event} />
            <EventTabs event={event} />
          </div>
        </main>

        {/* Sidebar (Right) */}
        <aside className="lg:col-span-4 space-y-6">
          <SidebarTicket event={event} />
          <SidebarOrganizer event={event} />
          <SidebarMap event={event} />
        </aside>
      </div>
    </div>
  );
}

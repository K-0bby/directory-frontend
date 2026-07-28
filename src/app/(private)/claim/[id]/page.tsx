/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  Star,
  //   Clock,
  Globe,
  Phone,
  Mail,
  Facebook,
  Instagram,
  Twitter,
  Youtube,
  MessageCircle,
  Loader2,
  Store,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { stripHtml } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { toast } from "sonner";

// Components from your library
import { HeroCarousel } from "@/components/hero-slide";
import { ClaimEligibility, getClaimEligibility } from "@/lib/api";

// --- Types ---
interface ApiImage {
  id?: number;
  original?: string;
  thumb?: string;
  webp?: string;
  mime_type?: string;
  file_size?: number;
  size?: string;
}

interface ApiSocialItem {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  tiktok?: string;
  youtube?: string;
  whatsapp?: string;
}

interface OpeningHour {
  day_of_week: string;
  open_time: string;
  close_time: string;
}

interface ListingData {
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
  rating?: number | string;
  reviews_count?: number | string;
  is_verified?: boolean;
  claim_status?: string;
  type?: string;
  images?: (ApiImage | string)[];
  socials?: ApiSocialItem[];
  services?: any[];
  opening_hours?: OpeningHour[];
}

// --- Helpers ---
const getImageUrl = (
  imageEntry: ApiImage | string | undefined | null,
): string => {
  if (!imageEntry) return "/images/no-image.jpg";
  let url = "";
  if (
    typeof imageEntry === "object" &&
    imageEntry !== null &&
    "original" in imageEntry &&
    typeof imageEntry.original === "string"
  ) {
    url = imageEntry.original;
  } else if (typeof imageEntry === "string") {
    url = imageEntry;
  }
  if (!url) return "/images/no-image.jpg";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://me-fie.co.uk";
  return `${API_URL}/${url.replace(/^\//, "")}`;
};

const format12Hour = (time: string) => {
  if (!time) return "";
  const [hours, minutes] = time.split(":");
  let h = parseInt(hours, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${minutes} ${ampm}`;
};

const SocialIcon = ({ href, icon: Icon }: { href: string; icon: any }) => (
  <Link
    href={href}
    target="_blank"
    rel="noreferrer"
    className="p-2 bg-gray-50 rounded-full text-gray-600 hover:bg-[#93C01F] hover:text-white transition-all"
  >
    <Icon className="h-4 w-4" />
  </Link>
);

export default function ClaimListingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const listingId = params?.id as string;
  const { user, loading: authLoading } = useAuth();

  const [listing, setListing] = useState<ListingData | null>(null);
  const [eligibility, setEligibility] = useState<ClaimEligibility | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!listingId) return;

    const fetchListing = async () => {
      setIsLoading(true);
      try {
        const API_URL =
          process.env.NEXT_PUBLIC_API_URL || "https://me-fie.co.uk";
        const token = localStorage.getItem("authToken");

        const response = await fetch(
          `${API_URL}/api/listing/${listingId}/show`,
          {
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
              ...(token && { Authorization: `Bearer ${token}` }),
            },
          },
        );

        if (!response.ok) throw new Error("Failed to fetch listing");

        const json = await response.json();
        setListing(json.data || json);

        if (token) {
          try {
            const eligibilityData = await getClaimEligibility(listingId, token);
            setEligibility(eligibilityData);
          } catch {
            // Eligibility is a progressive enhancement here — the verify page
            // re-checks it explicitly, so a transient failure isn't fatal.
          }
        }
      } catch (error) {
        console.error("Error fetching listing:", error);
        toast.error("Failed to load listing details.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchListing();
  }, [listingId]);

  const handleClaim = () => {
    const identifier = listing?.slug || listingId;
    router.push(`/claim/${identifier}/verify`);
  };

  if (authLoading || !user) return null;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-10 w-10 animate-spin text-[#93C01F]" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Store className="w-16 h-16 text-gray-200" />
        <h2 className="text-xl font-semibold">Listing not found</h2>
        <Button
          variant="default"
          className="bg-[#93C01F]"
          onClick={() => router.push("/claim")}
        >
          Back to directory
        </Button>
      </div>
    );
  }

  const galleryItems = (listing.images || []).map((img) => ({
    type: "image" as const,
    src: getImageUrl(img),
    alt: listing.name,
  }));

  if (galleryItems.length === 0) {
    galleryItems.push({
      type: "image",
      src: "/images/no-image.jpg",
      alt: "Placeholder",
    });
  }

  const rating = Number(listing.rating) || 0;
  const reviewsCount = Number(listing.reviews_count) || 0;
  const socials = listing.socials?.[0] || ({} as ApiSocialItem);
  // Explicit status comparison — claim_status is always a non-empty string
  // ("unclaimed", "claimed", ...), so truthiness alone would always read as claimed.
  const isClaimed = listing.claim_status === "claimed";
  const isClaimable = eligibility?.claimable === true;

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20 pt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Back Navigation */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded-xl transition-colors group shadow-none cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-[#93C01F] group-hover:-translate-x-0.5 transition-transform" />
              <span className="text-sm font-medium text-gray-600">Back</span>
            </button>
            <div className="w-px h-6 bg-gray-200 hidden sm:block" />
            <Breadcrumb className="hidden sm:block">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/claim" className="text-gray-500 hover:text-[#93C01F] transition-colors">Claim Directory</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-semibold text-gray-900 max-w-[250px] truncate">{listing.name}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          {isClaimable && (
            <Button
              onClick={handleClaim}
              size="sm"
              className="bg-[#93C01F] hover:bg-[#7ea919] text-white rounded-lg shadow-sm"
            >
              {isClaimed ? "Request Ownership Review" : "Claim Business"}
            </Button>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-8 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        {/* Left Column: Main Info */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
            <div className="relative aspect-video md:aspect-21/9 w-full">
              <HeroCarousel items={galleryItems} alt={listing.name} />
              {/* Gradient overlay for badge readability */}
              <div className="absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-black/30 to-transparent pointer-events-none" />
              <div className="absolute bottom-4 left-4 z-10">
                {isClaimed ? (
                  <Badge className="bg-white/90 text-gray-700 backdrop-blur-md border-none px-3.5 py-1.5 flex items-center gap-1.5 shadow-lg text-xs font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-500" /> Claimed
                  </Badge>
                ) : (
                  <Badge className="bg-[#93C01F] text-white border-none px-3.5 py-1.5 shadow-lg text-xs font-semibold">
                    Available to Claim
                  </Badge>
                )}
              </div>
            </div>

            <div className="p-6 md:p-8">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-3">
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
                    {listing.name}
                    {listing.is_verified && (
                      <Image
                        src="/images/icons/verify.svg"
                        alt="Verified"
                        width={22}
                        height={22}
                      />
                    )}
                  </h1>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                    <span className="flex items-center gap-1.5 font-medium text-gray-600">
                      <MapPin className="w-4 h-4 text-[#93C01F] shrink-0" />
                      {listing.address || listing.city ||
                        listing.location ||
                        "Location Not Specified"}
                    </span>
                    <span className="flex items-center gap-1.5 font-bold text-gray-900">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      {rating.toFixed(1)}
                      <span className="font-normal text-gray-400">
                        ({reviewsCount} {reviewsCount === 1 ? "review" : "reviews"})
                      </span>
                    </span>
                    <Badge
                      variant="secondary"
                      className="uppercase text-[10px] tracking-widest font-bold bg-gray-100"
                    >
                      {listing.type || "Listing"}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="w-full h-px bg-gray-100 my-6" />

              <div>
                <Tabs defaultValue="about" className="w-full">
                  <TabsList className="w-full justify-start h-auto p-1 bg-gray-100 rounded-full gap-2">
                    <TabsTrigger value="about" className="rounded-full px-5 py-2 text-sm font-bold text-gray-400 data-[state=active]:bg-white data-[state=active]:text-[#93C01F] data-[state=active]:border data-[state=active]:border-[#93C01F] data-[state=active]:shadow-sm border border-transparent transition-all">
                      About
                    </TabsTrigger>
                    <TabsTrigger value="services" className="rounded-full px-5 py-2 text-sm font-bold text-gray-400 data-[state=active]:bg-white data-[state=active]:text-[#93C01F] data-[state=active]:border data-[state=active]:border-[#93C01F] data-[state=active]:shadow-sm border border-transparent transition-all">
                      Services
                    </TabsTrigger>
                    <TabsTrigger value="hours" className="rounded-full px-5 py-2 text-sm font-bold text-gray-400 data-[state=active]:bg-white data-[state=active]:text-[#93C01F] data-[state=active]:border data-[state=active]:border-[#93C01F] data-[state=active]:shadow-sm border border-transparent transition-all">
                      Hours
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="about" className="py-6">
                    <div className="prose prose-slate max-w-none">
                      <p className="text-gray-600 leading-relaxed whitespace-pre-line text-base">
                        {stripHtml(listing.bio || listing.description) ||
                          "No description provided for this listing."}
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="services" className="py-6">
                    {listing.services && listing.services.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {listing.services.map((s: any, i: number) => (
                          <div
                            key={i}
                            className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100"
                          >
                            <div className="w-2 h-2 rounded-full bg-[#93C01F]" />
                            <span className="text-sm font-medium text-gray-700">
                              {typeof s === "string" ? s : s.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 italic">
                        No services listed.
                      </p>
                    )}
                  </TabsContent>

                  <TabsContent value="hours" className="py-6">
                    {listing.opening_hours &&
                    listing.opening_hours.length > 0 ? (
                      <div className="max-w-md space-y-3">
                        {listing.opening_hours.map((h, i) => (
                          <div
                            key={i}
                            className="flex justify-between items-center p-3 rounded-lg border border-gray-50 hover:bg-gray-50 transition-colors"
                          >
                            <span className="font-semibold text-gray-700">
                              {h.day_of_week}
                            </span>
                            <span className="text-sm font-medium text-gray-500 bg-white px-3 py-1 rounded-full border">
                              {format12Hour(h.open_time)} —{" "}
                              {format12Hour(h.close_time)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 italic">
                        Hours not specified.
                      </p>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Sidebar */}
        <div className="lg:col-span-4 space-y-4">
          {/* Interactive Map */}
          {(listing.address || listing.city) && (
            <Card className="rounded-2xl border border-gray-200/80 bg-white shadow-sm overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Location
                </CardTitle>
              </CardHeader>
              <div className="relative h-44 mx-4 rounded-xl overflow-hidden">
                <iframe
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(
                    listing.name +
                      " " +
                      (listing.address || listing.city || ""),
                  )}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                  allowFullScreen
                  loading="lazy"
                  className="absolute inset-0 w-full h-full border-0"
                />
              </div>
              <div className="px-5 py-3">
                <p className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                  {listing.address || listing.city}
                </p>
              </div>
            </Card>
          )}

          {/* Claim Action Card */}
          <Card className="rounded-2xl shadow-sm border-2 border-[#93C01F]/20 overflow-hidden">
            <div className="bg-linear-to-br from-[#93C01F]/5 to-[#93C01F]/10 p-6 text-center border-b border-[#93C01F]/10">
              <div className="w-10 h-10 rounded-full bg-[#93C01F]/10 flex items-center justify-center mx-auto mb-3">
                <ShieldCheck className="w-5 h-5 text-[#93C01F]" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">
                {isClaimed ? "Managed listing" : "Own this business?"}
              </h3>
            </div>
            <CardContent className="p-5 text-center space-y-4">
              <p className="text-sm text-gray-500 leading-relaxed">
                {isClaimed
                  ? "This listing already has a manager. If that's not correct, you can request a review."
                  : "Claim it now to update your information and respond to customer reviews."}
              </p>
              <Button
                onClick={handleClaim}
                disabled={!isClaimable}
                className={`w-full py-5 rounded-xl text-sm font-bold transition-all transform active:scale-[0.98] ${
                  !isClaimable
                    ? "bg-gray-100 text-gray-400"
                    : "bg-[#93C01F] hover:bg-[#7ea919] text-white shadow-md shadow-[#93C01F]/20 hover:shadow-lg hover:shadow-[#93C01F]/30"
                }`}
              >
                {isClaimed
                  ? "Request Ownership Review"
                  : isClaimable
                    ? "Start Claiming Process"
                    : eligibility?.reason || "Not available"}
              </Button>

              {isClaimed && (
                <div className="mt-3 text-center">
                  <Link
                    href={`/claim/${listing.slug || listingId}/verify`}
                    className="text-[10px] text-gray-400 flex items-center justify-center gap-1 transition-colors capitalize font-bold tracking-tight"
                  >
                    <AlertCircle className="h-3 w-3" />
                    Is this listing managed by the wrong person?{" "}
                    <span className="text-[#93C01F] hover:underline hover:underline-offset-2">
                      Request a review
                    </span>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contact Details */}
          <Card className="rounded-2xl border border-gray-200/80 bg-white shadow-sm overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Contact Details
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 space-y-0.5">
              {listing.primary_phone && (
                <div className="flex items-center gap-1 group">
                  <div className="p-2.5 rounded-lg group-hover:bg-[#93C01F]/10 transition-colors">
                    <Phone className="w-4 h-4 text-gray-400 group-hover:text-[#93C01F]" />
                  </div>
                  <span className="text-sm font-semibold text-gray-700">
                    {listing.primary_phone}
                  </span>
                </div>
              )}
              {listing.email && (
                <div className="flex items-center gap-1 group">
                  <div className="p-2.5 rounded-lg group-hover:bg-[#93C01F]/10 transition-colors">
                    <Mail className="w-4 h-4 text-gray-400 group-hover:text-[#93C01F]" />
                  </div>
                  <span className="text-sm font-semibold text-gray-700 truncate">
                    {listing.email}
                  </span>
                </div>
              )}
              {listing.website && (
                <div className="flex items-center gap-1 group">
                  <div className="p-2.5 rounded-lg group-hover:bg-[#93C01F]/10 transition-colors">
                    <Globe className="w-4 h-4 text-gray-400 group-hover:text-[#93C01F]" />
                  </div>
                  <Link
                    href={listing.website}
                    target="_blank"
                    className="text-sm font-bold text-emerald-600 hover:underline"
                  >
                    Visit My Website
                  </Link>
                </div>
              )}

              {/* Socials Integration */}
              {Object.values(socials).some((v) => v) && (
                <div className="pt-4 mt-4 border-t flex items-center gap-3">
                  {socials.facebook && (
                    <SocialIcon href={socials.facebook} icon={Facebook} />
                  )}
                  {socials.instagram && (
                    <SocialIcon href={socials.instagram} icon={Instagram} />
                  )}
                  {socials.twitter && (
                    <SocialIcon href={socials.twitter} icon={Twitter} />
                  )}
                  {socials.youtube && (
                    <SocialIcon href={socials.youtube} icon={Youtube} />
                  )}
                  {socials.whatsapp && (
                    <SocialIcon
                      href={socials.whatsapp}
                      icon={MessageCircle}
                    />
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

    </div>
  );
}

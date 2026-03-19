"use client";

import { forwardRef, useImperativeHandle, useEffect, useState } from "react";
import { toast } from "sonner";
import { ListingFormHandle } from "@/app/dashboard/vendor/my-listing/create/new-listing-content";
import { Card, CardContent } from "@/components/ui/card";
import {
  Pencil,
  Loader2,
  MapPin,
  Mail,
  Clock,
  Tag,
  Globe,
  Calendar,
  Facebook,
  Instagram,
  Music2,
  Twitter,
  Youtube,
} from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useListing } from "@/context/listing-form-context";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Props {
  listingSlug: string;
  // Optional: allow passing a callback to go back to specific steps
  onEditStep?: (step: number) => void;
}

// Interface matching your API response
interface ApiListingData {
  name: string;
  type: string;
  primary_image: string | null;
  images?: { media: string }[];
  categories: { name: string }[];
  address: string | null;
  city: string | null;
  country: string | null;
  email: string | null;
  website?: string | null;
  socials?: {
    facebook: string | null;
    instagram: string | null;
    twitter: string | null;
    tiktok: string | null;
    youtube: string | null;
  }[];
  opening_hours: {
    day_of_week: string;
    open_time: string;
    close_time: string;
  }[];
  bio: string | null;
  event_start_date: string | null;
  event_end_date: string | null;
  event_start_time: string | null;
  event_end_time: string | null;
}

export const ReviewSubmitStep = forwardRef<ListingFormHandle, Props>(
  ({ listingSlug }, ref) => {
    const { media } = useListing(); // Fallback for local media if API hasn't processed it yet
    const [listingData, setListingData] = useState<ApiListingData | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    // 1. Fetch real data from API to ensure accuracy before publishing
    useEffect(() => {
      const fetchReviewData = async () => {
        try {
          const token = localStorage.getItem("authToken");
          const API_URL = process.env.API_URL || "https://me-fie.co.uk";

          // Using GET request as per your docs to fetch the data
          const res = await fetch(
            `${API_URL}/api/listing/${listingSlug}/show`,
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
              },
            },
          );

          if (res.ok) {
            const json = await res.json();
            setListingData(json.data);
          }
        } catch (error) {
          console.error("Failed to load review data", error);
        } finally {
          setLoading(false);
        }
      };

      if (listingSlug) {
        fetchReviewData();
      }
    }, [listingSlug]);

    // 2. Handle the final "Publish" action
    useImperativeHandle(ref, () => ({
      async submit() {
        try {
          // Show success toast
          toast.success("Listing Submitted Successfully!");

          // Route to dashboard
          router.push("/dashboard/vendor/my-listing");

          return true;
        } catch (error) {
          console.error(error);
          toast.error("Failed to submit listing");
          return false;
        }
      },
    }));

    if (loading) {
      return (
        <div className="h-64 flex items-center justify-center text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading details...
        </div>
      );
    }

    const isEvent = listingData?.type === "event";

    const displayWebsite = listingData?.website;

    const socials = listingData?.socials?.[0];

    // Prepare Display Data (Prefer API data, fallback to "Not provided")
    const displayImage =
      listingData?.primary_image ||
      // Look for the first image in the images array from API
      listingData?.images?.[0]?.media ||
      // Fallback to local state if API hasn't returned anything yet
      (media.coverPhoto instanceof File
        ? URL.createObjectURL(media.coverPhoto)
        : typeof media.coverPhoto === "string"
          ? media.coverPhoto
          : null);

    // Process additional images for gallery
    const galleryImages = listingData?.images?.slice(0, 3) || [];

    const locationStr =
      [listingData?.city, listingData?.country].filter(Boolean).join(", ") ||
      "Location pending";
    const categoryStr =
      listingData?.categories?.map((c) => c.name).join(", ") || "Uncategorized";

    return (
      <div className="space-y-6 px-4 py-6">
        <div>
          <h2 className="text-xl font-semibold mb-1">Preview & Publish</h2>
          <p className="text-sm text-muted-foreground">
            Review your details before publishing
          </p>
        </div>

        {/* Cover Photo Section */}
        <div className="space-y-3">
          <div className="relative w-full h-64 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
            {displayImage ? (
              <Image
                src={displayImage}
                alt="Cover"
                className="w-full h-full object-cover"
                width={800}
                height={400}
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                <span>No cover photo uploaded</span>
              </div>
            )}
            <Button
              size="icon"
              variant="secondary"
              className="absolute top-4 right-4 rounded-full h-10 w-10 shadow-sm"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </div>

          {/* Additional Images Grid */}
          <div className="grid grid-cols-3 gap-3 h-24">
            {[0, 1, 2].map((i) => {
              const imgSrc = galleryImages[i]?.media;
              return (
                <div
                  key={i}
                  className="relative rounded-md overflow-hidden bg-gray-100 border border-gray-200"
                >
                  {imgSrc ? (
                    <Image
                      src={imgSrc}
                      alt={`Gallery ${i}`}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground">
                      Empty
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Information Card */}
        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
              {/* Name */}
              <div className="space-y-1">
                <span className="text-sm font-medium text-gray-900">
                  {isEvent ? "Event Name" : "Business Name"}
                </span>
                <p className="text-sm text-gray-600">
                  {listingData?.name || "Not provided"}
                </p>
              </div>

              {/* Category */}
              <div className="space-y-1">
                <span className="text-sm font-medium text-gray-900 flex items-center gap-2">
                  <Tag className="w-3 h-3" /> Category
                </span>
                <p className="text-sm text-gray-600">{categoryStr}</p>
              </div>

              {/* Location */}
              <div className="space-y-1">
                <span className="text-sm font-medium text-gray-900 flex items-center gap-2">
                  <MapPin className="w-3 h-3" /> Location
                </span>
                <p className="text-sm text-gray-600">{locationStr}</p>
                <p className="text-xs text-gray-400">{listingData?.address}</p>
              </div>

              {/* Email */}
              <div className="space-y-1">
                <span className="text-sm font-medium text-gray-900 flex items-center gap-2">
                  <Mail className="w-3 h-3" /> Email
                </span>
                <p className="text-sm text-gray-600">
                  {listingData?.email || "Not provided"}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-sm font-medium text-gray-900 flex items-center gap-2">
                  <Globe className="w-3 h-3" /> Website
                </span>
                <p className="text-sm text-gray-600 truncate underline decoration-[#93C01F]/30">
                  {displayWebsite}
                </p>
              </div>

              {socials &&
                Object.values(socials).some((val) => val !== null) && (
                  <div className="space-y-2 col-span-1 md:col-span-2 border-t pt-4">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                      Social Presence
                    </span>
                    <div className="flex flex-wrap gap-5">
                      {socials.facebook && (
                        <Link
                          href={socials.facebook}
                          target="_blank"
                          className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-[#93C01F] transition-colors"
                        >
                          <Facebook className="w-4 h-4 text-[#1877F2]" />{" "}
                          Facebook
                        </Link>
                      )}
                      {socials.instagram && (
                        <Link
                          href={socials.instagram}
                          target="_blank"
                          className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-[#93C01F] transition-colors"
                        >
                          <Instagram className="w-4 h-4 text-[#E4405F]" />{" "}
                          Instagram
                        </Link>
                      )}
                      {socials.twitter && (
                        <Link
                          href={socials.twitter}
                          target="_blank"
                          className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-[#93C01F] transition-colors"
                        >
                          <Twitter className="w-4 h-4 text-[#1DA1F2]" /> Twitter
                        </Link>
                      )}
                      {socials.tiktok && (
                        <Link
                          href={socials.tiktok}
                          target="_blank"
                          className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-[#93C01F] transition-colors"
                        >
                          <Music2 className="w-4 h-4 text-black" /> TikTok
                        </Link>
                      )}
                      {socials.youtube && (
                        <Link
                          href={socials.youtube}
                          target="_blank"
                          className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-[#93C01F] transition-colors"
                        >
                          <Youtube className="w-4 h-4 text-[#FF0000]" /> YouTube
                        </Link>
                      )}
                    </div>
                  </div>
                )}

              {/* Hours */}
              {isEvent ? (
                <>
                  <div className="space-y-1">
                    <span className="text-sm font-medium text-gray-900 flex items-center gap-2">
                      <Calendar className="w-3 h-3" /> Event Dates
                    </span>
                    <p className="text-sm text-gray-600">
                      {listingData?.event_start_date || "N/A"} to{" "}
                      {listingData?.event_end_date || "N/A"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm font-medium text-gray-900 flex items-center gap-2">
                      <Clock className="w-3 h-3" /> Event Time
                    </span>
                    <p className="text-sm text-gray-600">
                      {listingData?.event_start_time || "N/A"} -{" "}
                      {listingData?.event_end_time || "N/A"}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1 col-span-1 md:col-span-2">
                    <span className="text-sm font-medium text-gray-900 flex items-center gap-2 mb-1">
                      <Clock className="w-3 h-3" /> Business Hours
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {listingData?.opening_hours?.length ? (
                        listingData.opening_hours.map((h, i) => (
                          <div
                            key={i}
                            className="text-xs text-gray-600 bg-gray-50 p-2 rounded border"
                          >
                            <span className="font-semibold block">
                              {h.day_of_week}
                            </span>
                            {h.open_time
                              ? `${h.open_time} - ${h.close_time}`
                              : "Closed"}
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500 italic">
                          No hours set
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Description Box */}
            <div className="bg-[#F7FCE9] border border-[#9ACC23] rounded-lg p-4 mt-4">
              <h4 className="text-xs font-bold text-[#5F8B0A] mb-1 uppercase">
                Description
              </h4>
              <p className="text-sm text-gray-800 leading-relaxed">
                {listingData?.bio || "No description provided"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  },
);

ReviewSubmitStep.displayName = "ReviewSubmitStep";

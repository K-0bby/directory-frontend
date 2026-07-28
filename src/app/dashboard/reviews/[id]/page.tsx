"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Star,
  ArrowRight,
  ArrowLeft as ArrowLeftIcon,
  CheckCircle,
  EyeOff,
  Trash2,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/auth-context";

// --- Types ---

interface ReviewDetail {
  id: string;
  listingName: string;
  listingId: string;
  status: "visible" | "hidden";
  customer: string;
  date: string;
  rating: number;
  content: string;
}

// Raw API Response shape
interface RawReviewDetail {
  id: number | string;
  slug?: string;
  listing?: { id: string; name: string; slug?: string };
  listing_name?: string;
  user?: { id?: number | string; first_name?: string; last_name?: string; name?: string };
  customer_name?: string;
  created_at?: string;
  rating?: number;
  comment?: string;
  content?: string;
  review?: string;
  status?: string;
  vendor_reply?: string | null;
  moderation_reason?: string | null;
}

export default function ReviewDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Unwrap params using React.use() for Next.js 15+ compatibility (or await it)
  // If on Next.js 14 or lower, you can use params directly without await/use
  const { id } = use(params);

  const router = useRouter();
  const { user: authUser, loading: authLoading } = useAuth();

  // --- State ---
  const [review, setReview] = useState<ReviewDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Helpers ---

  const getAuthToken = (): string | null => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("authToken");
    }
    return null;
  };

  const mapApiDataToReview = (data: RawReviewDetail): ReviewDetail => {
    const firstName = data.user?.first_name || "";
    const lastName = data.user?.last_name || "";
    const fullName = `${firstName} ${lastName}`.trim() || data.user?.name || data.customer_name || "Anonymous";

    const rawStatus = data.status?.toLowerCase();
    const status: ReviewDetail["status"] = rawStatus === "hidden" ? "hidden" : "visible";

    return {
      id: data.id.toString(),
      listingName: data.listing?.name || data.listing_name || "Unknown Listing",
      listingId: data.listing?.id?.toString() || "",
      customer: fullName,
      date: data.created_at
        ? new Date(data.created_at).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : "N/A",
      rating: data.rating || 0,
      content: data.comment || data.content || data.review || "",
      status,
    };
  };

  // --- API Fetch ---

  useEffect(() => {
    const fetchReviewDetails = async () => {
      if (authLoading) return;

      if (!authUser) {
        toast.error("Unauthorized access");
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const token = getAuthToken();

        const response = await fetch(`/api/rating/${id}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch review details");
        }

        const json = await response.json();
        // Handle wrapper (json.data or json)
        const rawData = json.data || json;
        setReview(mapApiDataToReview(rawData));
      } catch (err) {
        console.error(err);
        setError("Could not load review details");
        toast.error("Failed to load review details");
      } finally {
        setIsLoading(false);
      }
    };

    fetchReviewDetails();
  }, [id, authUser, authLoading]);

  // --- Action Handlers ---

  const handleStatusChange = async (
    action: "approve" | "hide" | "delete" | "escalate"
  ) => {
    if (!review) return;
    setIsActionLoading(true);

    try {
      const token = getAuthToken();

      let url = `/api/rating/${id}`;
      let method = "PATCH";
      let body: Record<string, unknown> | undefined;

      switch (action) {
        case "hide":
          url = `/api/rating/${id}/hide`;
          break;
        case "approve":
          url = `/api/rating/${id}/unhide`;
          break;
        case "escalate":
          // Escalate re-hides with a moderation reason placeholder
          url = `/api/rating/${id}/hide`;
          body = { moderation_reason: "Escalated for review" };
          break;
        case "delete":
          method = "DELETE";
          break;
      }

      const response = await fetch(url, {
        method: method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: method !== "DELETE" ? JSON.stringify(body ?? {}) : undefined,
      });

      if (!response.ok) throw new Error(`Failed to ${action} review`);

      // Success Actions
      if (action === "delete") {
        toast.success("Review deleted successfully");
        router.push("/dashboard/reviews");
      } else {
        const label = action === "approve" ? "restored" : action === "hide" ? "hidden" : "escalated";
        toast.success(`Review ${label} successfully`);
        setReview((prev) =>
          prev
            ? {
                ...prev,
                status: action === "approve" ? "visible" : "hidden",
              }
            : null,
        );
      }
    } catch (error) {
      console.error(error);
      toast.error(`Error: Failed to ${action} review`);
    } finally {
      setIsActionLoading(false);
    }
  };

  // --- UI Helpers ---

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-5 h-5 ${
              star <= rating ? "fill-[#F2C94C] text-[#F2C94C]" : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "visible":
        return (
          <Badge className="bg-[#E9F5D6] text-[#5F8B0A] hover:bg-[#E9F5D6] gap-1.5 px-3 py-1 text-xs font-normal">
            <CheckCircle className="w-3.5 h-3.5" /> Visible
          </Badge>
        );
      case "hidden":
        return (
          <Badge className="bg-gray-100 text-gray-500 hover:bg-gray-100 gap-1.5 px-3 py-1 text-xs font-normal">
            <EyeOff className="w-3.5 h-3.5" /> Hidden
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500 animate-pulse">
          Loading review details...
        </div>
      </div>
    );
  }

  if (error || !review) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-red-500">{error || "Review not found"}</p>
        <Button variant="outline" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto min-h-screen bg-white">
      {/* Header Navigation */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <span className="text-gray-500 text-sm font-medium">
          Back to reviews
        </span>
      </div>

      {/* Title Section */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Reviews</h1>
        <div className="flex gap-2">
          {/* Mock Pagination Buttons for Detail View */}
          <button className="w-10 h-10 rounded-full bg-[#E9F5D6] flex items-center justify-center text-[#5F8B0A] hover:opacity-80 transition-opacity">
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <button className="w-10 h-10 rounded-full bg-[#93C01F] flex items-center justify-center text-white hover:opacity-90 transition-opacity">
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Card */}
      <Card className="border border-gray-200 shadow-sm rounded-xl overflow-hidden bg-white">
        {/* Card Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white">
          <a
            href={`/dashboard/listings/${review.listingId}`}
            className="text-[#93C01F] underline text-lg font-medium hover:text-[#7da815]"
          >
            {review.listingName}
          </a>
          {getStatusBadge(review.status)}
        </div>

        {/* Card Body */}
        <div className="p-8 space-y-8">
          {/* Row 1: Customer */}
          <div className="flex items-center justify-between">
            <span className="text-gray-900 font-medium w-1/4">Customer</span>
            <span className="text-gray-500 text-right w-3/4">
              {review.customer}
            </span>
          </div>

          <hr className="border-gray-50" />

          {/* Row 2: Date */}
          <div className="flex items-center justify-between">
            <span className="text-gray-900 font-medium w-1/4">
              Date Submitted
            </span>
            <span className="text-gray-500 text-right w-3/4">
              {review.date}
            </span>
          </div>

          <hr className="border-gray-50" />

          {/* Row 3: Rating */}
          <div className="flex items-center justify-between">
            <span className="text-gray-900 font-medium w-1/4">Rating</span>
            <div className="w-3/4 flex justify-end">
              {renderStars(review.rating)}
            </div>
          </div>

          <hr className="border-gray-50" />

          {/* Row 4: Review Content */}
          <div className="space-y-4">
            <span className="text-gray-900 font-medium block">Review</span>
            <p className="text-gray-500 text-sm leading-relaxed">
              {review.content}
            </p>
          </div>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="mt-8 flex gap-4 flex-wrap">
        <Button
          onClick={() => handleStatusChange("approve")}
          disabled={isActionLoading || review.status === "visible"}
          className="bg-[#93C01F] hover:bg-[#7da815] text-white px-8 py-6 text-base font-normal rounded-lg min-w-[130px]"
        >
          {isActionLoading ? "..." : "Unhide"}
        </Button>

        <Button
          variant="secondary"
          onClick={() => handleStatusChange("hide")}
          disabled={isActionLoading || review.status === "hidden"}
          className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-8 py-6 text-base font-normal rounded-lg min-w-[130px]"
        >
          <EyeOff className="w-4 h-4 mr-2" /> Hide
        </Button>

        <Button
          variant="secondary"
          onClick={() => handleStatusChange("delete")}
          disabled={isActionLoading}
          className="bg-gray-100 hover:bg-red-50 text-gray-700 hover:text-red-600 px-8 py-6 text-base font-normal rounded-lg min-w-[130px]"
        >
          <Trash2 className="w-4 h-4 mr-2" /> Delete
        </Button>

        <Button
          variant="secondary"
          onClick={() => handleStatusChange("escalate")}
          disabled={isActionLoading || review.status === "hidden"}
          className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-8 py-6 text-base font-normal rounded-lg min-w-[130px]"
        >
          <ShieldAlert className="w-4 h-4 mr-2" /> Escalate
        </Button>
      </div>
    </div>
  );
}

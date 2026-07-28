"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Star, Loader2, Reply } from "lucide-react";
import { useState } from "react";
import { Textarea } from "./ui/textarea";
import { toast } from "sonner";
import { usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";

export type ReviewReply = {
  id: number;
  author: string;
  date: string;
  comment: string;
  avatar?: string;
};

export type Review = {
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
};

/** * Senior UI Pattern: Reusable divider for internal card separation 
 */
const Divider = () => <div className="w-full h-px bg-gray-100 my-4" />;

interface ReviewsSectionProps {
  reviews: Review[];
  listingSlug: string;
  /** Pass true when the authenticated user owns the listing (vendor/creator). */
  isOwner?: boolean;
  /** Hides the "Leave Review" action — for previewing a not-yet-published listing. */
  readOnly?: boolean;
}

function ReviewItem({
  review,
  onReply,
  isOwner = false,
}: {
  review: Review;
  onReply: (reviewId: string | number, comment: string) => void;
  listingSlug: string;
  isOwner?: boolean;
}) {
  const alreadyReplied = !!(review.vendor_reply);
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  const handleReplySubmit = async () => {
    if (!replyText.trim()) {
      toast.error("Please enter a reply");
      return;
    }

    setIsSubmittingReply(true);

    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        toast.error("You must be logged in to reply");
        return;
      }

      // Route through BFF using the rating slug (falls back to id)
      const ratingKey = review.slug ?? review.id;
      const response = await fetch(`/api/rating/${ratingKey}/reply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ vendor_reply: replyText }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || "Failed to submit reply");
      }

      onReply(review.id!, replyText);
      toast.success("Reply posted successfully!");
      setIsReplying(false);
      setReplyText("");
    } catch (error) {
      console.error("Reply submission error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to post reply. Please try again.");
    } finally {
      setIsSubmittingReply(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-100 p-5 bg-white shadow-xs transition-all hover:border-gray-200">
      <div className="flex items-start gap-4">
        {/* Avatar Container */}
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-100 ring-2 ring-white overflow-hidden shadow-inner">
          {review.avatar ? (
            <Image
              src={review.avatar}
              alt={review.author}
              width={48}
              height={48}
              unoptimized
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-sm font-bold text-gray-500">
              {review.author.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          {/* Header metadata area */}
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-gray-900 leading-none">
                  {review.author}
                </h4>
                <span className="text-[11px] font-medium text-gray-400">
                  • {review.date}
                </span>
              </div>

              {/* Star Rating Rendering */}
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <Star
                    key={idx}
                    className={`h-3.5 w-3.5 ${
                      idx < Math.round(review.rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "fill-gray-100 text-gray-200"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Vendor reply button — only visible to listing owner */}
            {isOwner && !alreadyReplied && (
              <button
                onClick={() => setIsReplying(!isReplying)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-500 hover:text-[#93C01F] hover:bg-[#93C01F]/5 rounded-lg transition-all active:scale-95"
              >
                <Reply className="w-3.5 h-3.5" />
                Reply
              </button>
            )}
          </div>

          {/* Review Content */}
          <div className="mt-3">
            <p className="text-sm leading-relaxed text-gray-600">
              {review.comment}
            </p>
          </div>

          {/* Inline Reply Input UI */}
          {isReplying && (
            <>
              <Divider />
              <div className="space-y-3 bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={`Replying to ${review.author}...`}
                  className="min-h-20 resize-none border-gray-200 bg-white text-sm focus-visible:ring-[#93C01F]"
                  maxLength={500}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs font-semibold"
                    onClick={() => {
                      setIsReplying(false);
                      setReplyText("");
                    }}
                    disabled={isSubmittingReply}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 bg-[#93C01F] hover:bg-[#84ad1b] text-xs font-bold px-4"
                    onClick={handleReplySubmit}
                    disabled={isSubmittingReply || !replyText.trim()}
                  >
                    {isSubmittingReply ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      "Post Reply"
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* Vendor reply — persisted from backend */}
          {review.vendor_reply && (
            <div className="mt-2">
              {!isReplying && <Divider />}
              <div className="border-l-2 border-[#9ACC23]/40 pl-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#9ACC23]">Business Owner</span>
                  {review.vendor_reply_at && (
                    <span className="text-[10px] text-gray-400">
                      {new Date(review.vendor_reply_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-gray-600 leading-relaxed bg-[#9ACC23]/5 p-2.5 rounded-lg">
                  {review.vendor_reply}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ReviewsSection({ reviews, listingSlug, isOwner = false, readOnly = false }: ReviewsSectionProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviewsList, setReviewsList] = useState<Review[]>(reviews);

  const handleLeaveReview = () => {
    if (!user) {
      setAuthPromptOpen(true);
      return;
    }
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (rating === 0) return;
    if (text.trim().length < 20) {
      toast.error("Your review must be at least 20 characters.");
      return;
    }

    const token = localStorage.getItem("authToken");
    if (!token) {
      toast.error("You must be logged in to leave a review");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/listing/${listingSlug}/rating`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rating, comment: text }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || errorData?.message || "Failed to submit review");
      }

      const data = await response.json();

      // Optimistically add the review to the list
      const newReview: Review = {
        id: data?.data?.id ?? Date.now(),
        author: user?.name || "You",
        rating,
        date: "Just now",
        comment: text,
        avatar: user?.image,
        replies: [],
      };
      setReviewsList((prev) => [newReview, ...prev]);

      toast.success("Review submitted");
      setOpen(false);
      setRating(0);
      setText("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReply = (reviewId: string | number, comment: string) => {
    setReviewsList((prev) =>
      prev.map((review) => {
        if (review.id === reviewId) {
          return {
            ...review,
            replies: [
              ...(review.replies || []),
              {
                id: Date.now(),
                author: "You",
                date: "Just now",
                comment: comment,
              },
            ],
          };
        }
        return review;
      }),
    );
  };

  return (
    <div className="w-full">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-xl font-bold text-gray-900">
          Reviews ({reviewsList.length})
        </h3>
        {!readOnly && <Dialog open={open} onOpenChange={setOpen}>
          <Button
            onClick={handleLeaveReview}
            className="bg-[#93C01F] hover:bg-[#84ad1b] text-white font-medium"
          >
            <Star className=" h-4 w-4 fill-white" />
            Leave Review
          </Button>
          <DialogContent className="sm:max-w-xl rounded-2xl">
            <DialogHeader className="text-left">
              <DialogTitle className="text-xl font-black">Leave a review</DialogTitle>
              <DialogDescription>
                Share your experience to help others make informed decisions.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-3">
                <p className="text-sm font-bold text-gray-700">Rate your experience</p>
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setRating(i + 1)}
                      className="transition-transform hover:scale-110 focus:outline-none"
                    >
                      <Star
                        className={`h-7 w-7 ${
                          i + 1 <= rating ? "fill-yellow-400 text-yellow-400" : "fill-gray-100 text-gray-200"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-sm font-bold text-gray-700">Your review</p>
                <Textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  maxLength={500}
                  placeholder="Tell others what you liked and what you didn't like..."
                  className="h-32 resize-none rounded-xl bg-gray-50 border-gray-200 focus-visible:bg-white focus-visible:ring-[#93C01F]"
                />
                <div className="flex items-center justify-between text-[11px] font-medium text-gray-400">
                  <span>
                    {text.trim().length < 20
                      ? `${20 - text.trim().length} more characters required`
                      : "All reviews are moderated"}
                  </span>
                  <span>{text.length}/500</span>
                </div>
              </div>
            </div>
            <DialogFooter className="flex gap-3">
              <Button variant="ghost" onClick={() => setOpen(false)} className="flex-1 font-bold">Cancel</Button>
              <Button
                className="flex-1 bg-[#93C01F] hover:bg-[#84ad1b] font-bold"
                onClick={handleSubmit}
                disabled={isSubmitting || rating === 0 || text.trim().length < 20}
              >
                {isSubmitting ? <Loader2 className="animate-spin" /> : "Submit Review"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>}
      </div>

      <div className="space-y-4">
        {reviewsList.length > 0 ? (
          reviewsList.map((r, i) => (
            <ReviewItem
              key={r.id || i}
              review={r}
              onReply={handleReply}
              listingSlug={listingSlug}
              isOwner={!readOnly && isOwner}
            />
          ))
        ) : (
          <div className="text-center py-12 text-gray-400 bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-100">
            No reviews yet. Be the first to share your experience!
          </div>
        )}
      </div>

      {/* Auth Prompt Dialog */}
      <Dialog open={authPromptOpen} onOpenChange={setAuthPromptOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl text-center">
          <DialogHeader className="items-center">
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-[#93C01F]/10">
              <Star className="h-7 w-7 text-[#93C01F]" />
            </div>
            <DialogTitle className="text-lg font-bold">Sign in required</DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              Sign in to leave a review or rating on this business.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col gap-3 sm:flex-col">
            <Button asChild className="w-full bg-[#93C01F] hover:bg-[#84ad1b] font-bold">
              <Link href={`/auth/login?redirect=${encodeURIComponent(pathname)}`}>
                Sign In
              </Link>
            </Button>
            <p className="text-sm text-gray-500">
              Don&apos;t have an account?{" "}
              <Link
                href={`/auth/signup?redirect=${encodeURIComponent(pathname)}`}
                className="font-bold text-[#93C01F] hover:underline"
              >
                Sign Up
              </Link>
            </p>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
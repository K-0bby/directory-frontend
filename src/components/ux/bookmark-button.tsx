"use client";

import { Button } from "@/components/ui/button";
import { Bookmark, Loader2 } from "lucide-react";
import { useBookmark } from "@/context/bookmark-context";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

interface BookmarkButtonProps {
  slug: string;
  iconOnly?: boolean;
}

export function BookmarkButton({ slug, iconOnly = false }: BookmarkButtonProps) {
  const { isBookmarked, toggleBookmark } = useBookmark();

  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsSaved(isBookmarked(slug));
  }, [isBookmarked, slug]);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isLoading || !slug) return;

    const newState = !isSaved;
    setIsSaved(newState);
    setIsLoading(true);

    try {
      await toggleBookmark(slug);
    } catch (error) {
      console.error("Bookmark toggle failed", error);
      setIsSaved(!newState);
    } finally {
      setIsLoading(false);
    }
  };

  if (iconOnly) {
    return (
      <button
        onClick={handleToggle}
        className={cn(
          "h-10 w-10 rounded-full flex items-center justify-center shadow-md border transition-all",
          isSaved
            ? "bg-[#93C01F]/10 border-[#93C01F]/30 hover:bg-[#93C01F]/20"
            : "bg-white border-white/80 hover:bg-gray-50"
        )}
        aria-label={isSaved ? "Remove bookmark" : "Bookmark"}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
        ) : (
          <Bookmark
            className={cn(
              "h-4 w-4 transition-colors",
              isSaved ? "fill-[#93C01F] text-[#93C01F]" : "text-gray-600"
            )}
          />
        )}
      </button>
    );
  }

  return (
    <Button
      size="sm"
      onClick={handleToggle}
      className={cn(
        "border shadow-sm transition backdrop-blur-md",
        isSaved
          ? "border-[#93C01F]/20 bg-[#93C01F]/10 text-[#93C01F] hover:bg-[#93C01F]/20"
          : "border-white/60 bg-white/80 text-gray-700 hover:bg-white"
      )}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Bookmark
          className={cn(
            "h-4 w-4 mr-2 transition-colors",
            isSaved
              ? "fill-[#93C01F] text-[#93C01F]"
              : "text-gray-500 group-hover:text-[#93C01F]"
          )}
        />
      )}
      {isSaved ? "Saved" : "Bookmark"}
    </Button>
  );
}

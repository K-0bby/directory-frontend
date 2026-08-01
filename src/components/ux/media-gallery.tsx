"use client";

import Image from "next/image";
import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

// Define a local type if the imported one is causing issues or is too strict
type GalleryItem = string | { type: "image" | "video"; src: string; poster?: string; alt?: string };

export function MediaGallery({
  items = [], // Default to empty array
  providerName,
}: {
  items: GalleryItem[];
  providerName: string;
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Safety check: Don't render anything if no items
  if (!items || items.length === 0) {
    return (
      <div className="w-full h-32 flex items-center justify-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
        <p className="text-gray-400 text-sm">No images available</p>
      </div>
    );
  }

  const openAt = (index: number) => {
    setCurrentIndex(index);
    setLightboxOpen(true);
  };

  const displayItems = items.slice(0, 6);

  return (
    <div className="w-full">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {displayItems.map((media, index) => (
          <GalleryThumb
            key={index}
            media={media}
            alt={typeof media === "string" ? `${providerName} gallery ${index + 1}` : media.alt || `${providerName} gallery ${index + 1}`}
            onClick={() => openAt(index)}
          />
        ))}
      </div>

      <Lightbox
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        items={items}
        currentIndex={currentIndex}
        onNavigate={setCurrentIndex}
      />
    </div>
  );
}

function GalleryThumb({
  media,
  alt,
  onClick,
}: {
  media: GalleryItem;
  alt: string;
  onClick: () => void;
}) {
  // Safe check for object type
  const isVideo = typeof media !== "string" && media?.type === "video";
  const src = typeof media === "string" ? media : media?.src;
  const poster = typeof media === "string" ? undefined : media?.poster;
  const vidRef = useRef<HTMLVideoElement | null>(null);

  return (
    <button
      onClick={onClick}
      aria-label={isVideo ? `Play ${alt}` : `View ${alt}`}
      className="group relative h-28 w-full overflow-hidden rounded-2xl md:h-40 bg-gray-100"
    >
      {isVideo ? (
        <video
          ref={vidRef}
          src={src}
          poster={poster}
          className="h-full w-full object-cover"
          muted
          playsInline
          preload="metadata"
          onMouseEnter={() => {
            const v = vidRef.current;
            if (v) {
              v.currentTime = 0;
              v.play().catch(() => {}); // Ignore play errors
            }
          }}
          onMouseLeave={() => {
            const v = vidRef.current;
            if (v) {
              v.pause();
              v.currentTime = 0;
            }
          }}
        />
      ) : (
        <Image
          src={src || ""}
          alt={alt}
          fill
          sizes="(max-width: 768px) 50vw, 33vw"
          className="object-cover"
          unoptimized
        />
      )}
      {isVideo && (
        <span className="absolute bottom-2 right-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white font-medium">
          Video
        </span>
      )}
    </button>
  );
}

export function Lightbox({
  open,
  onClose,
  items,
  currentIndex,
  onNavigate,
}: {
  open: boolean;
  onClose: () => void;
  items: GalleryItem[];
  currentIndex: number;
  onNavigate: (index: number) => void;
}) {
  const goNext = useCallback(() => {
    if (items.length > 0) {
      onNavigate((currentIndex + 1) % items.length);
    }
  }, [currentIndex, items.length, onNavigate]);

  const goPrev = useCallback(() => {
    if (items.length > 0) {
      onNavigate((currentIndex - 1 + items.length) % items.length);
    }
  }, [currentIndex, items.length, onNavigate]);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKey);
    // Disable body scroll when lightbox is open
    document.body.style.overflow = "hidden";
    
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "unset";
    };
  }, [open, goNext, goPrev, onClose]);

  // 1. Safety Check: Return null BEFORE accessing properties
  if (!open || !items || items.length === 0) return null;

  const currentItem = items[currentIndex];
  
  // 2. Extra safety: If index is out of bounds for some reason
  if (!currentItem) return null;

  // 3. Now safe to access properties
  const isVideo = typeof currentItem !== "string" && currentItem.type === "video";
  const src = typeof currentItem === "string" ? currentItem : currentItem.src;
  const poster = typeof currentItem === "string" ? undefined : currentItem.poster;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/95 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 z-20 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
        aria-label="Close gallery"
      >
        <X className="h-6 w-6" />
      </button>

      {/* Navigation Buttons */}
      {items.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); goPrev(); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 transition-colors"
            aria-label="Previous image"
          >
            <ChevronLeft className="h-8 w-8" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); goNext(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 transition-colors"
            aria-label="Next image"
          >
            <ChevronRight className="h-8 w-8" />
          </button>
        </>
      )}

      {/* Content Container */}
      <div 
        className="relative w-full h-full flex items-center justify-center p-4 sm:p-12"
        onClick={onClose} // Clicking background closes lightbox
      >
        <div 
          className="relative max-w-5xl max-h-full w-full h-full flex items-center justify-center"
          onClick={(e) => e.stopPropagation()} // Clicking image does NOT close lightbox
        >
          {isVideo ? (
            <video
              src={src}
              poster={poster}
              controls
              autoPlay
              muted
              aria-label={typeof currentItem === "string" ? `Gallery video ${currentIndex + 1}` : currentItem.alt}
              className="max-h-[85vh] max-w-full w-auto h-auto object-contain rounded-lg shadow-2xl"
            />
          ) : (
            <div className="relative w-full h-full max-h-[85vh]">
              <Image
                src={src}
                alt={`Gallery item ${currentIndex + 1}`}
                fill
                sizes="100vw"
                className="object-contain"
                priority
                unoptimized
              />
            </div>
          )}
        </div>
      </div>

      {/* Counter */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/80 text-sm bg-black/40 px-4 py-2 rounded-full backdrop-blur-md border border-white/10">
        {currentIndex + 1} / {items.length}
      </div>
    </div>
  );
}

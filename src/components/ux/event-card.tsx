import Image from "next/image";
import Link from "next/link";
import { Bookmark } from "lucide-react";
import { useBookmark } from "@/context/bookmark-context";
import { cn, stripHtml } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { ListingCoverMedia } from "@/components/directory/listing-cover-media";

export type Event = {
  id: string;
  name: string;
  category: string;
  image: string;
  location: string;
  description: string;
  slug: string;
  startDate: string;
  endDate: string;
  verified: boolean;
  time?: string;
  timezoneLabel?: string;
};

type EventCardProps = {
  event: Event;
  /** Optional explicit link. When omitted, the link is derived from the current path. */
  href?: string;
};

export function EventCard({ event, href }: EventCardProps) {
  const { isBookmarked, toggleBookmark } = useBookmark();
  const isActive = isBookmarked(event.slug);
  const pathname = usePathname(); // Get current path


   // Determine the base path for navigation based on current page
  const getBasePath = () => {
    if (pathname?.includes("/dashboard/bookmarks")) {
      return "/events";
    } else if (pathname?.includes("/dashboard/my-listing")) {
      return "/dashboard/my-listing";
    } else if (pathname?.includes("/discover")) {
      return "/discover";
    } else if (pathname?.includes("/businesses")) {
      return "/businesses";
    } else if (pathname?.includes("/events")) {
      return "/events";
    } else if (pathname?.includes("/communities")) {
      return "/communities";
    // } else if (pathname?.includes("/")) {
    //   return "/";
    // }
    }
    // Default fallback
    return "/discover";
  };

  // Construct the dynamic link based on current page, unless an explicit href
  // was provided (e.g. the category page routes by listing type).
  const getBusinessLink = () => {
    if (href) return href;
    const basePath = getBasePath();
    return `${basePath}/${event.slug}`;
  };


  const handleBookmarkClick = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigating if card is a link
    e.stopPropagation();
    toggleBookmark(event.slug);
  };
  return (
    <Link
      href={getBusinessLink()}
      className="group block bg-white rounded-2xl overflow-hidden hover:shadow-sm transition-all duration-300 h-full border border-[#E2E8F0]"
    >
      {/* Image Container */}
      <div className="relative w-full h-[220px] overflow-hidden">
        <ListingCoverMedia
          src={event.image}
          alt={event.name}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />

        {/* Bookmark Icon - Always visible on mobile, hover on desktop */}
        <button
          onClick={handleBookmarkClick}
          className="absolute top-2 right-2 w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center hover:bg-white/30 transition-colors md:opacity-0 md:group-hover:opacity-100"
          aria-label="Bookmark event"
        >
          <Bookmark
            className={cn(
              "w-5 h-5 transition-colors",
              isActive
                ? "fill-blue-500 text-blue-500"
                : "text-[#93C01F] hover:text-blue-500"
            )}
          />
        </button>

        {/* Verified badge — bottom-right of image */}
        {event.verified && (
          <div className="absolute bottom-2 right-2 z-10 flex items-center gap-1 px-2.5 py-1 bg-white rounded-full shadow-sm border border-gray-200">
            <Image src="/images/icons/verify.svg" alt="Verified" width={13} height={13} />
            <span className="text-xs font-medium text-gray-700">Verified</span>
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="p-4 space-y-3">
        {/* Category tag */}
        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
          {event.category}
        </span>
        <h3 className="font-semibold text-base md:text-lg line-clamp-2 group-hover:text-[#275782] transition-colors">
          {event.name}
        </h3>

        {/* Description */}
        <p className="text-gray-600 text-sm leading-relaxed line-clamp-2">
          {stripHtml(event.description)}
        </p>

        {/* Location */}
        {event.location && (
          <div className="flex items-center gap-2 text-gray-500">
            <Image
              src="/images/icons/location.svg"
              alt="Location"
              width={16}
              height={16}
            />
            <span className="text-xs">{event.location}</span>
          </div>
        )}

        {/* Date Range */}
        {(event.startDate || event.endDate) && (
          <div className="flex items-center gap-2 text-gray-500">
            <Image
              src="/images/icons/calendar.svg"
              alt="Calendar"
              width={16}
              height={16}
            />
            <span className="text-xs">
              {event.startDate}
              {event.startDate && event.endDate ? " - " : ""}
              {event.endDate}
              {event.time && ` · ${event.time}`}
              {event.timezoneLabel && ` ${event.timezoneLabel}`}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}

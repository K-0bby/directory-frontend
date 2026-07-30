import Image from "next/image";
import Link from "next/link";
import { Star, Bookmark } from "lucide-react";
import { useBookmark } from "@/context/bookmark-context";
import { cn } from "@/lib/utils";
import { usePathname, useRouter } from "next/navigation";
import { ListingCoverMedia } from "@/components/directory/listing-cover-media";

export type Business = {
  id: string;
  name: string;
  category: string;
  images: string[];
  rating: number;
  reviewCount: string | number;
  location: string;
  verified?: boolean;
  slug: string;
  discount?: string;
  reachBadge?: string | null;
};

type BusinessCardProps = {
  business: Business;
  /** Optional explicit link. When omitted, the link is derived from the current path. */
  href?: string;
};

export function BusinessCard({ business, href }: BusinessCardProps) {
  const { isBookmarked, toggleBookmark } = useBookmark();
  const isActive = isBookmarked(business.slug);
  const pathname = usePathname();
  const router = useRouter();

  // Determine the base path for navigation based on current page
  const getBasePath = () => {
    if (pathname?.includes("/dashboard/bookmarks")) {
      return "/businesses";
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
    return `${basePath}/${business.slug}`;
  };

  // 1. Grab the first valid image from the array we fixed in HomeContent
  const initialImage =
    business.images && business.images.length > 0
      ? business.images[0]
      : "/images/no-image.jpg";

  return (
    <Link
      href={getBusinessLink()}
      className="group block bg-white rounded-2xl overflow-hidden hover:shadow-sm transition-all duration-300 border border-[#E2E8F0]"
    >
      <div className="relative w-full aspect-4/3 overflow-hidden">
        <ListingCoverMedia
          src={initialImage}
          alt={business.name}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />


        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleBookmark(business.slug);
          }}
          className="absolute top-2 right-2 w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center hover:bg-white/30 transition-colors md:opacity-0 md:group-hover:opacity-100"
        >
          <Bookmark
            className={cn(
              "w-5 h-5 transition-colors",
              isActive
                ? "fill-[#93C01F] text-[#93C01F]"
                : "text-[#93C01F] hover:fill-[#93C01F]",
            )}
          />
        </button>

        {/* Verified badge — bottom-right of image */}
        {business.verified && (
          <div className="absolute bottom-2 right-2 z-10 flex items-center gap-1 px-2.5 py-1 bg-white rounded-full shadow-sm border border-gray-200">
            <Image src="/images/icons/verify.svg" alt="Verified" width={13} height={13} />
            <span className="text-xs font-medium text-gray-700">Verified</span>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-4 space-y-2">
        {/* Category tag */}
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">{business.category}</span>
          {business.reachBadge && <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">{business.reachBadge}</span>}
        </div>
        <h3 className="font-semibold text-base md:text-lg line-clamp-2 group-hover:text-[#275782] transition-colors">
          {business.name}
        </h3>
        <div className="flex items-center gap-1">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`w-4 h-4 ${
                i < Math.floor(business.rating)
                  ? "fill-yellow-400 text-yellow-400"
                  : "fill-gray-200 text-gray-200"
              }`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            router.push(`${getBusinessLink()}#reviews`);
          }}
          className="text-sm text-gray-600 hover:text-[#275782] hover:underline transition-colors -mt-0.5 text-left"
        >
          {business.reviewCount}{" "}
          {Number(business.reviewCount) === 1 ? "Review" : "Reviews"}
        </button>
        <div className="flex items-center gap-0.5 text-sm text-gray-500 mt-1">
          <Image
            src="/images/icons/location.svg"
            alt="Location"
            width={20}
            height={20}
          />
          <span>{business.location}</span>
        </div>
      </div>
    </Link>
  );
}

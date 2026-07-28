import { slugifyCategory } from "@/components/scrollable-category-tabs";
import { ApiListing, pickDisplayCategory } from "@/lib/directory/types";
import { processImages } from "@/lib/directory/image-utils";

export interface ProcessedBusiness {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  images: string[];
  location: string;
  verified: boolean;
  rating: number;
  reviewCount: string;
  category: string;
  categorySlugs: string[];
  type: "business";
  country: string;
  createdAt: Date;
  reachBadge?: string | null;
}

export function mapBusiness(item: ApiListing): ProcessedBusiness {
  const images = processImages(item.images, [item.primary_image, item.image, item.cover_image]);
  const categorySlugs =
    item.categories?.map((c) => c.slug || slugifyCategory(c.name)) || [
      "general",
    ];
  const displayCategory = pickDisplayCategory(item.categories ?? []);
  const categoryName = displayCategory?.name || "General";

  return {
    id: item.id.toString(),
    name: item.name,
    slug: item.slug,
    description: item.bio || item.description || "",
    image: images[0],
    images,
    location: item.city || item.country || "Online",
    verified: !!(item.listing_verified ?? item.is_verified ?? item.isVerified ?? item.verified),
    rating: Number(item.rating) || 0,
    reviewCount: String(item.ratings_count) || "0",
    category: categoryName,
    categorySlugs,
    type: "business",
    country: item.country || "Ghana",
    createdAt: item.created_at ? new Date(item.created_at) : new Date(),
    reachBadge: item.reach_badge,
  };
}

import { slugifyCategory } from "@/components/scrollable-category-tabs";
import { ApiListing, pickDisplayCategory } from "@/lib/directory/types";
import { processImages } from "@/lib/directory/image-utils";

export interface ProcessedCommunity {
  id: string;
  name: string;
  title: string;
  slug: string;
  description: string;
  image: string;
  imageUrl: string;
  images: string[];
  location: string;
  verified: boolean;
  country: string;
  category: string;
  categorySlug: string;
  tag: string;
  type: "community";
}

export function mapCommunity(item: ApiListing): ProcessedCommunity {
  const images = processImages(item.images, [item.primary_image, item.image, item.cover_image]);
  const category = pickDisplayCategory(item.categories ?? []);

  return {
    id: item.id.toString(),
    name: item.name,
    title: item.name,
    slug: item.slug,
    description: item.bio || item.description || "",
    image: images[0],
    imageUrl: images[0],
    images,
    location: item.city || item.country || "Online",
    verified: !!(item.listing_verified ?? item.is_verified ?? item.isVerified ?? item.verified),
    country: item.country || item.event_country || "Ghana",
    category: category?.name || "General",
    categorySlug:
      category?.slug || slugifyCategory(category?.name || "general"),
    tag: category?.name || "General",
    type: "community",
  };
}

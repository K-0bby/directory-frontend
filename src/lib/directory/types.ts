// Shared API types for the business / events / communities directory pages.
// These describe the raw shape returned by the backend; page-specific
// "Processed*" types live next to each page's mapper.

export interface ApiImage {
  id?: number;
  /** Spatie V2: full-size S3 URL */
  original: string;
  /** Spatie V2: 200×200 thumbnail URL (falls back to original while conversion is pending) */
  thumb: string;
  /** Spatie V2: WebP version URL (falls back to original while conversion is pending) */
  webp: string;
  /** Uncropped, bounded WebP intended for listing cards. */
  card?: string;
  mime_type?: string;
  file_size?: number;
  size?: string;
}

export interface ApiCategory {
  id?: number;
  name: string;
  slug?: string;
  /** Null for top-level categories; the parent's slug for subcategories. */
  parent_slug?: string | null;
  type?: string;
}

/**
 * Returns the most specific category for display on a listing card.
 * Prefers a subcategory (parent_slug is set) over a top-level category,
 * falling back to the first category when no subcategory is present.
 */
export function pickDisplayCategory(categories: ApiCategory[]): ApiCategory | undefined {
  if (!categories || categories.length === 0) return undefined;
  return categories.find((c) => !!c.parent_slug) ?? categories[0];
}

export interface ApiListing {
  id: number;
  name: string;
  slug: string;
  type?: string;
  listing_type?: string;
  rating: string | number;
  ratings_count: string | number;
  address?: string;
  city?: string;
  country?: string;
  status?: string;
  claim_status?: "unclaimed" | "appealed" | "claimed" | string;
  images: (ApiImage | string)[];
  /** Explicit cover image, when the vendor has set one — authoritative over `images[0]`. */
  cover?: ApiImage | null;
  cover_is_explicit?: boolean;
  cover_image?: string;
  image?: string;
  primary_image?: string;
  categories: ApiCategory[];
  bio?: string;
  description?: string;
  created_at?: string;
  listing_verified?: boolean;
  is_verified?: boolean;
  verified?: boolean;
  isVerified?: boolean;
  badge?: string;
  reach_badge?: string | null;
  // Event-only fields (flat — populated by ListingResource when events relation is loaded)
  event_start_date?: string;
  event_end_date?: string;
  event_start_time?: string;
  event_end_time?: string;
  event_venue?: string;
  event_venue_address?: string | null;
  event_city?: string;
  event_country?: string;
  event_price?: string | null;
  event_currency?: string | null;
  event_location_type?: string | null;
  event_ticket_url?: string | null;
  event_online_url?: string | null;
  event_timezone?: string | null;
  event_timezone_label?: string | null;
}

export interface ApiListingsResponse<T = ApiListing> {
  data: T[];
  meta?: {
    current_page?: number;
    last_page?: number;
    per_page?: number;
    total?: number;
    detected_country?: string;
  };
  links?: {
    first?: string | null;
    last?: string | null;
    prev?: string | null;
    next?: string | null;
  };
}

export type DirectoryEndpoint =
  | "/api/businesses"
  | "/api/events"
  | "/api/communities";

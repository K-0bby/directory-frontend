import { slugifyCategory } from "@/components/scrollable-category-tabs";
import { ApiListing, pickDisplayCategory } from "@/lib/directory/types";
import { processImages, formatDateTime } from "@/lib/directory/image-utils";
import { format12Hour } from "@/lib/directory/event-formatting";
import type { ProcessedEvent } from "@/types/event";

/**
 * Creates an event mapper. The factory allows closing over a client-side
 * country filter — needed because events store country in `event_country`,
 * which the backend doesn't currently filter on.
 */
export function createEventMapper(filterCountry?: string | null) {
  return function mapEvent(item: ApiListing): ProcessedEvent | null {
    // Client-side country filter
    if (filterCountry) {
      const target = filterCountry.toLowerCase();
      const itemCountry = (item.event_country || item.country || "")
        .toString()
        .toLowerCase();
      if (itemCountry !== target) return null;
    }

    const images = processImages(item.images, [item.primary_image, item.image, item.cover_image]);
    const category = pickDisplayCategory(item.categories ?? []);

    const startDate = formatDateTime(item.event_start_date);
    const endDate = formatDateTime(
      item.event_end_date || item.event_start_date,
    );
    const priceLabel = item.event_price
      ? `${item.event_currency || ""} ${item.event_price}`.trim()
      : "Free";

    return {
      id: item.id.toString(),
      name: item.name,
      title: item.name,
      slug: item.slug,
      description: item.bio || item.description || "",
      image: images[0],
      images,
      location:
        item.event_venue ||
        item.event_city ||
        item.event_country ||
        item.city ||
        item.country ||
        (item.event_location_type === "online" ? "Online" : "TBA"),
      verified: !!(item.listing_verified ?? item.is_verified ?? item.isVerified ?? item.verified),
      category: category?.name || "General",
      categorySlug:
        category?.slug || slugifyCategory(category?.name || "general"),
      country: item.event_country || item.country || "Ghana",
      createdAt: item.created_at ? new Date(item.created_at) : new Date(),
      startDate,
      startDateRaw: item.event_start_date || "",
      endDate,
      endDateRaw: item.event_end_date || item.event_start_date || "",
      date: startDate,
      price: priceLabel,
      rating: Number(item.rating) || 0,
      reviewCount: Number(item.ratings_count) || 0,
      type: "event",
      ticketUrl: (item as ApiListing & { event?: { event_ticket_url?: string | null } }).event?.event_ticket_url || item.event_ticket_url || undefined,
      time: item.event_start_time ? format12Hour(item.event_start_time) : undefined,
      startTimeRaw: item.event_start_time,
      timezoneLabel: item.event_timezone_label ?? undefined,
    };
  };
}

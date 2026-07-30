import { ApiImage } from "./types";
import { parseLocalDate } from "./event-formatting";

const FALLBACK_IMAGE = "/images/no-image.jpg";

/**
 * Resolve a possibly-relative media URL to an absolute URL against
 * NEXT_PUBLIC_API_URL, or return the fallback placeholder.
 */
export function getImageUrl(url: string | undefined | null): string {
  if (!url) return FALLBACK_IMAGE;
  if (url.startsWith("http")) return url;
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://me-fie.co.uk";
  return `${API_URL}/${url.replace(/^\//, "")}`;
}

/**
 * Resolve a listing's explicit cover image (the backend's `cover` object —
 * NOT `primary_image`/`cover_image`, which don't exist in the API response)
 * to a URL, preferring the card-cropped variant. Returns undefined when no
 * cover has been explicitly set, so callers can fall back to `images[0]`.
 */
export function resolveCoverUrl(cover: ApiImage | null | undefined): string | undefined {
  if (!cover) return undefined;
  return cover.card || cover.webp || cover.original || undefined;
}

/**
 * Normalise a listing's images array into a non-empty list of absolute URLs,
 * with the backend's explicit cover (first truthy entry in `fallbacks` —
 * typically `primary_image`) always placed first when present. Array order
 * in `images` isn't guaranteed to put the intended cover first, and
 * different endpoints have disagreed on it for the same listing, so the
 * explicit cover field is authoritative rather than a last-resort fallback.
 * Prefers `img.webp` (smaller file, ~50% of JPEG original) when available,
 * falling back to `img.original`.
 */
export function processImages(
  images: (ApiImage | string)[] | undefined,
  fallbacks: (string | undefined | null)[] = [],
): string[] {
  const raw = Array.isArray(images) ? images : [];

  const valid = raw
    .filter((img): img is string | ApiImage => {
      if (typeof img === "string") return !!img;
      return !!(img && typeof img === "object" && img.original);
    })
    .map((img) =>
      getImageUrl(typeof img === "string" ? img : (img.card || img.webp || img.original)),
    );

  const cover = fallbacks.find((fb) => !!fb);
  if (cover) {
    const coverUrl = getImageUrl(cover);
    return [coverUrl, ...valid.filter((url) => url !== coverUrl)];
  }

  if (valid.length > 0) return valid;

  return [FALLBACK_IMAGE];
}

/**
 * Format an ISO date string as e.g. "Apr 20, 2026". Returns "TBA" for
 * invalid / missing inputs.
 */
export function formatDateTime(dateString?: string | null): string {
  // Parsed via parseLocalDate rather than `new Date(dateString)` directly —
  // a date-only string ("2026-09-20") is otherwise interpreted as UTC
  // midnight, shifting the displayed date back a day for viewers west of UTC.
  const date = parseLocalDate(dateString);
  if (!date) return "TBA";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

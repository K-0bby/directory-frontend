// Shared utilities for the listing form pipeline.

// ============================================================================
// URL UTILITIES
// ============================================================================

export const isValidUrl = (url: string): boolean => {
  if (!url) return true;
  return /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w-./?%&=@]*)*\/?$/i.test(url);
};

export const normalizeUrl = (url: string): string => {
  if (!url) return "";
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return `https://${url}`;
  }
  return url;
};

export const normalizeWhatsApp = (value: string): string => {
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  if (value.startsWith("wa.me/")) return `https://${value}`;
  const digits = value.replace(/[\s\-\(\)\+]/g, "");
  return `https://wa.me/${digits}`;
};

// ============================================================================
// TIME & DATE UTILITIES
// ============================================================================

export const convertToHHmm = (time: string | undefined | null): string => {
  if (!time) return "09:00";
  const cleaned = time.trim().toUpperCase();
  const timeMatch = cleaned.match(/^(\d{1,2}):(\d{2})/);
  if (timeMatch && !cleaned.includes("AM") && !cleaned.includes("PM")) {
    return `${timeMatch[1].padStart(2, "0")}:${timeMatch[2]}`;
  }
  const amPmMatch = cleaned.match(/^(0?[1-9]|1[0-2]):([0-5][0-9])\s?(AM|PM)$/);
  if (amPmMatch) {
    let hours = parseInt(amPmMatch[1]);
    const minutes = amPmMatch[2];
    const period = amPmMatch[3];
    if (period === "PM" && hours < 12) hours += 12;
    else if (period === "AM" && hours === 12) hours = 0;
    return `${hours.toString().padStart(2, "0")}:${minutes}`;
  }
  return "09:00";
};

export const convertDateToInput = (value: string | undefined | null): string => {
  if (!value) return "";
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) return trimmed.slice(0, 10);
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
};

export const convertTimeToInput = (time: string | undefined | null): string => {
  if (!time) return "";
  const cleaned = time.trim().toUpperCase();
  const hhmmss = cleaned.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
  if (hhmmss) return `${hhmmss[1].padStart(2, "0")}:${hhmmss[2]}`;
  const hhmm = cleaned.match(/^(\d{1,2}):(\d{2})$/);
  if (hhmm) return `${hhmm[1].padStart(2, "0")}:${hhmm[2]}`;
  const amPmMatch = cleaned.match(/^(0?[1-9]|1[0-2]):([0-5][0-9])\s?(AM|PM)$/);
  if (amPmMatch) {
    let hours = parseInt(amPmMatch[1], 10);
    const minutes = amPmMatch[2];
    const period = amPmMatch[3];
    if (period === "PM" && hours < 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
    return `${hours.toString().padStart(2, "0")}:${minutes}`;
  }
  return "";
};

// ============================================================================
// MAPBOX UTILITIES
// ============================================================================

export interface MapboxParsedAddress {
  fullAddress: string;
  city: string;
  country: string;
  lat: number | null;
  lng: number | null;
}

interface MapboxContext {
  place?: { name?: string };
  locality?: { name?: string };
  neighborhood?: { name?: string };
  district?: { name?: string };
  region?: { name?: string };
  country?: {
    name?: string;
    country_code_alpha_3?: string;
    country_code?: string;
  };
}

interface MapboxFeatureProperties {
  full_address?: string;
  name?: string;
  context?: MapboxContext;
}

interface MapboxFeature {
  geometry?: { coordinates?: number[] };
  properties?: MapboxFeatureProperties | null;
}

// Safely extracts address components from a Mapbox Autofill feature.
// Falls back gracefully when context keys (place, locality, etc.) are absent —
// common in lower-density regions like rural Ghana.
export const parseMapboxAddress = (feature: MapboxFeature): MapboxParsedAddress => {
  const props = feature.properties ?? {};
  const ctx = props.context ?? {};

  const [lng, lat] = feature.geometry?.coordinates ?? [];

  const fullAddress = props.full_address || props.name || "";

  const city =
    ctx.place?.name ||
    ctx.locality?.name ||
    ctx.neighborhood?.name ||
    ctx.district?.name ||
    ctx.region?.name ||
    "";

  const country =
    ctx.country?.name ||
    ctx.country?.country_code_alpha_3 ||
    ctx.country?.country_code ||
    "";

  return {
    fullAddress,
    city,
    country,
    lat: typeof lat === "number" ? lat : null,
    lng: typeof lng === "number" ? lng : null,
  };
};

// ============================================================================
// LARAVEL ERROR UTILITIES
// ============================================================================

export interface Laravel422Errors {
  [field: string]: string[];
}

// Flattens a Laravel 422 errors object into { field: firstMessage } shape
// ready to be passed to react-hook-form's setError().
export const parseLaravel422Errors = (
  errors: Laravel422Errors,
): Record<string, string> => {
  return Object.fromEntries(
    Object.entries(errors).map(([field, messages]) => [
      field,
      Array.isArray(messages) ? messages[0] : String(messages),
    ]),
  );
};

// Laravel uses dot notation for nested/array validation keys. Forms generally
// register the parent control, so normalize `category_ids.1` to `category_ids`
// while retaining the original key for diagnostics and summaries.
export interface NormalizedValidationError {
  field: string;
  sourceField: string;
  message: string;
}

export const normalizeLaravel422Errors = (
  errors: Laravel422Errors,
  aliases: Record<string, string> = {},
): NormalizedValidationError[] =>
  Object.entries(errors).flatMap(([sourceField, messages]) => {
    const parentField = sourceField.split(".")[0];
    const field = aliases[sourceField] ?? aliases[parentField] ?? parentField;
    const normalizedMessages = Array.isArray(messages) ? messages : [String(messages)];

    return normalizedMessages.map((message) => ({
      field,
      sourceField,
      message,
    }));
  });

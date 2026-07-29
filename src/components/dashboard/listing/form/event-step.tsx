"use client";

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { AddressAutofill, AddressMinimap } from "@mapbox/search-js-react";
import type { Feature, GeoJsonProperties, Point } from "geojson";
import { MapPin } from "lucide-react";
import { toast } from "sonner";
import { countries } from "country-data-list";
import { ListingFormHandle } from "@/components/dashboard/listing/types";
import { TicketTypeEditor, TicketTypeEditorHandle } from "@/components/dashboard/listing/form/ticket-type-editor";
import { Country, CountryDropdown } from "@/components/ui/country-dropdown";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect, SearchableSelectOption } from "@/components/ui/searchable-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { convertToHHmm, parseMapboxAddress } from "@/lib/directory/utils";
import { cn } from "@/lib/utils";

type Section = "schedule" | "access" | "tickets";
type EventFormat = "in_person" | "online" | "hybrid";
type AccessPolicy = "public_link" | "sent_after_registration" | "shared_later";
type Attendance = "free_no_registration" | "free_registration_required" | "paid";
type AdmissionAvailability = "available" | "coming_soon" | "closed" | "sold_out";
type PricingMode = "fixed" | "multiple" | "varies";
type PurchaseMethod = "external_url" | "pay_at_venue" | "contact_organizer";

interface Props { listingSlug: string; section: Section; }
interface EventDraft {
  slug: string;
  event_start_date: string;
  event_end_date: string;
  event_start_time: string;
  event_end_time: string;
  timezone: string;
  is_all_day: boolean;
  event_location: EventFormat | "";
  event_venue: string;
  event_venue_address: string;
  event_city: string;
  event_country: string;
  latitude: number | null;
  longitude: number | null;
  online_access_policy: AccessPolicy | "";
  event_online_url: string;
  online_access_instructions: string;
  attendance_type: Attendance | "";
  admission_availability: AdmissionAvailability | "";
  registration_url: string;
  pricing_mode: PricingMode | "";
  purchase_method: PurchaseMethod | "";
  purchase_instructions: string;
  event_ticket_url: string;
  event_price: string;
  event_currency: string;
  ticket_provider: string;
  ticket_release_at: string;
  ticket_availability_message: string;
}

type EventField = keyof EventDraft;
type FieldErrors = Partial<Record<EventField, string>>;

const EMPTY: EventDraft = {
  slug: "", event_start_date: "", event_end_date: "", event_start_time: "", event_end_time: "",
  timezone: "", is_all_day: false, event_location: "in_person", event_venue: "",
  event_venue_address: "", event_city: "", event_country: "", latitude: null, longitude: null,
  online_access_policy: "", event_online_url: "", online_access_instructions: "", attendance_type: "paid",
  admission_availability: "available", registration_url: "", pricing_mode: "fixed", purchase_method: "external_url", purchase_instructions: "",
  event_ticket_url: "", event_price: "", event_currency: "GHS", ticket_provider: "",
  ticket_release_at: "", ticket_availability_message: "",
};

const CURRENCIES: SearchableSelectOption[] = [
  ["GHS", "Ghanaian cedi"], ["GBP", "British pound"], ["USD", "US dollar"], ["EUR", "Euro"],
  ["CAD", "Canadian dollar"], ["NGN", "Nigerian naira"], ["ZAR", "South African rand"],
  ["KES", "Kenyan shilling"], ["XOF", "West African CFA franc"], ["AUD", "Australian dollar"],
  ["JPY", "Japanese yen"], ["CNY", "Chinese yuan"], ["INR", "Indian rupee"], ["CHF", "Swiss franc"],
  ["NZD", "New Zealand dollar"], ["AED", "UAE dirham"], ["SAR", "Saudi riyal"],
].map(([value, name]) => ({ value, label: `${value} — ${name}`, searchTerms: name }));

function detectedTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "Africa/Accra";
}

function timezoneOptions(current: string): SearchableSelectOption[] {
  const intl = Intl as typeof Intl & { supportedValuesOf?: (key: "timeZone") => string[] };
  const values = intl.supportedValuesOf?.("timeZone") ?? [
    "Africa/Accra", "Africa/Lagos", "Africa/Nairobi", "Africa/Johannesburg", "Europe/London",
    "Europe/Paris", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
    "America/Toronto", "Asia/Dubai", "Asia/Kolkata", "Asia/Tokyo", "Australia/Sydney",
  ];
  if (current && !values.includes(current)) values.unshift(current);
  return values.map((value) => ({ value, label: value.replaceAll("_", " ") }));
}

const TIME_FORMAT = /^([01]\d|2[0-3]):([0-5]\d)$/;

function isHttpsUrl(value: string | null | undefined): boolean {
  // Draft fields are typed as `string`, but the API can genuinely return
  // null for a URL field the server previously cleared (e.g. purchase
  // method switched away from "external_url") — the load effect spreads
  // that straight onto draft, so this must tolerate null/undefined here
  // rather than assume the type holds at runtime.
  if (!value || value.length > 2048) return false;
  try { return new URL(value).protocol === "https:"; } catch { return false; }
}

function errorFor(field: EventField, draft: EventDraft): string | undefined {
  const required = (message: string) => String(draft[field] ?? "").trim() ? undefined : message;
  switch (field) {
    case "event_start_date": return required("Select the event start date.");
    case "event_end_date":
      if (!draft.event_end_date) return "Select the event end date.";
      return draft.event_start_date && draft.event_end_date < draft.event_start_date ? "End date cannot be before the start date." : undefined;
    case "event_start_time": {
      if (draft.is_all_day) return undefined;
      const requiredMsg = required("Select the event start time.");
      if (requiredMsg) return requiredMsg;
      return TIME_FORMAT.test(draft.event_start_time) ? undefined : "Format must be HH:mm (24h).";
    }
    case "event_end_time": {
      if (draft.is_all_day) return undefined;
      if (!draft.event_end_time) return "Select the event end time.";
      if (!TIME_FORMAT.test(draft.event_end_time)) return "Format must be HH:mm (24h).";
      return draft.event_start_date === draft.event_end_date && draft.event_start_time && draft.event_end_time <= draft.event_start_time
        ? "For a same-day event, the end time must be later than the start time." : undefined;
    }
    case "timezone": return required("Select the timezone used for the event times.");
    case "event_location": return required("Select whether the event is in person, online, or hybrid.");
    case "event_venue": return ["in_person", "hybrid"].includes(draft.event_location) ? required("Enter the venue name.") : undefined;
    case "event_country": return ["in_person", "hybrid"].includes(draft.event_location) ? required("Select the event country before searching for an address.") : undefined;
    case "event_venue_address": return ["in_person", "hybrid"].includes(draft.event_location) ? required("Select or enter the full venue address.") : undefined;
    case "event_city": return ["in_person", "hybrid"].includes(draft.event_location) ? required("Enter the event city.") : undefined;
    case "online_access_policy": return ["online", "hybrid"].includes(draft.event_location) ? required("Choose how attendees will receive online access.") : undefined;
    case "event_online_url":
      if (draft.online_access_policy !== "public_link") return undefined;
      return isHttpsUrl(draft.event_online_url) ? undefined : "Enter a complete HTTPS URL, for example https://zoom.us/j/123.";
    case "attendance_type": return required("Choose a registration or ticket option.");
    case "registration_url":
      if (draft.attendance_type !== "free_registration_required") return undefined;
      return isHttpsUrl(draft.registration_url) ? undefined : "Enter a complete HTTPS registration URL.";
    case "pricing_mode": return draft.attendance_type === "paid" ? required("Choose how pricing works for this event.") : undefined;
    case "purchase_method": return draft.attendance_type === "paid" ? required("Choose how attendees purchase or reserve admission.") : undefined;
    case "event_ticket_url":
      if (draft.attendance_type !== "paid" || draft.purchase_method !== "external_url") return undefined;
      return isHttpsUrl(draft.event_ticket_url) ? undefined : "Enter a public HTTPS event, ticket, or checkout URL.";
    case "event_price":
      if (draft.attendance_type !== "paid" || draft.pricing_mode !== "fixed") return undefined;
      return draft.event_price !== "" && Number(draft.event_price) >= 0 ? undefined : "Enter a price of zero or more.";
    case "event_currency":
      return draft.attendance_type === "paid" && (draft.pricing_mode === "fixed" || draft.pricing_mode === "multiple")
        ? required("Select the ticket currency.") : undefined;
    case "ticket_availability_message": return draft.admission_availability === "coming_soon" ? required("Tell visitors when or how tickets will become available.") : undefined;
    default: return undefined;
  }
}

/** Non-blocking notices — surfaced immediately in the wizard, distinct from
 *  errorFor()'s hard-blocking validation. */
function warningFor(field: EventField, draft: EventDraft, hasContactMethod: boolean): string | undefined {
  switch (field) {
    case "online_access_policy":
      return draft.attendance_type === "paid" && draft.online_access_policy === "public_link"
        ? "This joining link will be publicly visible even though the event is paid. Anyone who can view the listing may be able to join."
        : undefined;
    case "purchase_method":
      if (draft.purchase_method === "pay_at_venue" && draft.event_location === "online") {
        return "Pay at venue isn't available for online-only events. Choose an external ticket website or contact organizer instead.";
      }
      if (draft.purchase_method === "contact_organizer" && !hasContactMethod) {
        return "Add a public phone number, email address, or WhatsApp link so attendees can contact you.";
      }
      return undefined;
    default: return undefined;
  }
}

const SECTION_FIELDS: Record<Section, EventField[]> = {
  schedule: ["event_start_date", "event_end_date", "event_start_time", "event_end_time", "timezone"],
  access: ["event_location", "event_venue", "event_country", "event_venue_address", "event_city", "online_access_policy", "event_online_url"],
  tickets: ["attendance_type", "admission_availability", "registration_url", "pricing_mode", "purchase_method", "event_ticket_url", "event_price", "event_currency", "ticket_availability_message"],
};

export const EventStepForm = forwardRef<ListingFormHandle, Props>(({ listingSlug, section }, ref) => {
  const [draft, setDraft] = useState<EventDraft>(() => ({ ...EMPTY, timezone: "Africa/Accra" }));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Partial<Record<EventField, boolean>>>({});
  const [loading, setLoading] = useState(true);
  const [minimapFeature, setMinimapFeature] = useState<Feature<Point, GeoJsonProperties>>();
  const [mapboxUnavailable, setMapboxUnavailable] = useState(false);
  const [hasContactMethod, setHasContactMethod] = useState(true);
  const retrievedAddress = useRef("");
  const ticketTypeEditorRef = useRef<TicketTypeEditorHandle>(null);
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";
  const timezoneItems = useMemo(() => timezoneOptions(draft.timezone), [draft.timezone]);

  useEffect(() => {
    if (!listingSlug) return;
    const token = localStorage.getItem("authToken");
    fetch(`/api/listing/${listingSlug}/show`, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        const event = payload?.data?.event ?? payload?.event;
        const listing = payload?.data ?? payload;
        const socials: Array<{ whatsapp?: string | null }> = Array.isArray(listing?.socials) ? listing.socials : [];
        setHasContactMethod(
          Boolean(listing?.primary_phone) || Boolean(listing?.secondary_phone) ||
          Boolean(listing?.email) || Boolean(listing?.website) ||
          socials.some((social) => Boolean(social?.whatsapp))
        );
        if (!event) {
          setDraft((current) => ({ ...current, timezone: detectedTimezone() }));
          return;
        }
        setDraft((current) => ({
          ...current,
          ...event,
          slug: event.slug ?? "",
          timezone: event.timezone || detectedTimezone(),
          event_start_date: event.event_start_date?.slice(0, 10) ?? "",
          event_end_date: event.event_end_date?.slice(0, 10) ?? "",
          event_location: event.event_location_type ?? "in_person",
          event_price: event.event_price == null ? "" : String(event.event_price),
          ticket_release_at: event.ticket_release_at?.slice(0, 16) ?? "",
          latitude: listing.latitude == null ? null : Number(listing.latitude),
          longitude: listing.longitude == null ? null : Number(listing.longitude),
          attendance_type: event.attendance_type ?? "paid",
          admission_availability: event.admission_availability ?? "available",
          pricing_mode: event.pricing_mode ?? "fixed",
          purchase_method: event.purchase_method ?? "external_url",
        }));
      })
      .finally(() => setLoading(false));
  }, [listingSlug]);

  const update = <K extends EventField>(key: K, value: EventDraft[K]) => {
    setDraft((current) => {
      const next = { ...current, [key]: value };
      if (touched[key] || errors[key]) setErrors((currentErrors) => ({ ...currentErrors, [key]: errorFor(key, next) }));
      return next;
    });
  };

  const touch = (field: EventField) => {
    setTouched((current) => ({ ...current, [field]: true }));
    setErrors((current) => ({ ...current, [field]: errorFor(field, draft) }));
  };

  // Dropdowns select-and-commit in one action (no separate blur moment), so
  // touch + validate must happen atomically against the value just chosen —
  // not the stale `draft` closure `update(); touch();` would read before the
  // next render lands.
  const selectField = <K extends EventField>(key: K, value: EventDraft[K]) => {
    setTouched((current) => ({ ...current, [key]: true }));
    setDraft((current) => {
      const next = { ...current, [key]: value };
      setErrors((currentErrors) => ({ ...currentErrors, [key]: errorFor(key, next) }));
      return next;
    });
  };

  const validateSection = (draftOverride: EventDraft = draft): boolean => {
    const nextErrors: FieldErrors = {};
    for (const field of SECTION_FIELDS[section]) {
      const message = errorFor(field, draftOverride);
      if (message) nextErrors[field] = message;
    }
    setTouched((current) => ({ ...current, ...Object.fromEntries(SECTION_FIELDS[section].map((field) => [field, true])) }));
    setErrors(nextErrors);
    const first = SECTION_FIELDS[section].find((field) => nextErrors[field]);
    if (first) {
      requestAnimationFrame(() => {
        const target = document.querySelector<HTMLElement>(`[data-event-field="${first}"]`);
        target?.focus();
      });
      toast.error("Please correct the highlighted fields before continuing.");
      return false;
    }
    return true;
  };

  const applyServerErrors = (serverErrors: unknown): boolean => {
    if (!serverErrors || typeof serverErrors !== "object") return false;
    const mapped: FieldErrors = {};
    for (const [field, messages] of Object.entries(serverErrors)) {
      if (!(field in draft)) continue;
      const message = Array.isArray(messages) ? messages[0] : messages;
      if (typeof message === "string") mapped[field as EventField] = message;
    }
    if (Object.keys(mapped).length === 0) return false;
    setErrors(mapped);
    setTouched((current) => ({ ...current, ...Object.fromEntries(Object.keys(mapped).map((field) => [field, true])) }));
    const first = SECTION_FIELDS[section].find((field) => mapped[field]);
    requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-event-field="${first}"]`)?.focus());
    return true;
  };

  const save = async (): Promise<boolean> => {
    // Normalize before validating so any non-canonical time string a native
    // time input's fallback text-entry mode could hand back (e.g. "2:30 PM"
    // on a browser/webview that doesn't implement type="time") is coerced to
    // HH:mm before format checks and the same-day ordering comparison run.
    const normalizedDraft: EventDraft = section === "schedule" && !draft.is_all_day
      ? { ...draft, event_start_time: convertToHHmm(draft.event_start_time), event_end_time: convertToHHmm(draft.event_end_time) }
      : draft;
    if (normalizedDraft !== draft) setDraft(normalizedDraft);

    if (!validateSection(normalizedDraft)) return false;

    if (section === "tickets" && draft.pricing_mode === "multiple") {
      const flushed = await ticketTypeEditorRef.current?.flushPendingChanges();
      if (flushed === false) return false;
    }

    let payload: Record<string, unknown>;
    if (section === "schedule") {
      payload = {
        event_start_date: normalizedDraft.event_start_date, event_end_date: normalizedDraft.event_end_date,
        event_start_time: normalizedDraft.is_all_day ? null : normalizedDraft.event_start_time,
        event_end_time: normalizedDraft.is_all_day ? null : normalizedDraft.event_end_time,
        timezone: normalizedDraft.timezone, is_all_day: normalizedDraft.is_all_day,
      };
    } else if (section === "access") {
      payload = {
        event_location: draft.event_location,
        event_venue: draft.event_venue || null, event_venue_address: draft.event_venue_address || null,
        event_city: draft.event_city || null, event_country: draft.event_country || null,
        latitude: draft.latitude, longitude: draft.longitude,
        online_access_policy: draft.online_access_policy || null,
        event_online_url: draft.online_access_policy === "public_link" ? draft.event_online_url : null,
        online_access_instructions: draft.online_access_instructions || null,
      };
    } else {
      const isPaid = draft.attendance_type === "paid";
      const isComingSoon = draft.admission_availability === "coming_soon";
      payload = {
        attendance_type: draft.attendance_type,
        admission_availability: draft.admission_availability || null,
        registration_url: draft.registration_url || null,
        pricing_mode: isPaid ? (draft.pricing_mode || null) : null,
        purchase_method: isPaid ? (draft.purchase_method || null) : null,
        purchase_instructions: isPaid && (draft.purchase_method === "pay_at_venue" || draft.purchase_method === "contact_organizer") ? (draft.purchase_instructions || null) : null,
        event_ticket_url: isPaid && draft.purchase_method === "external_url" ? (draft.event_ticket_url || null) : null,
        event_price: isPaid && draft.pricing_mode === "fixed" ? (draft.event_price || null) : null,
        event_currency: isPaid && (draft.pricing_mode === "fixed" || draft.pricing_mode === "multiple") ? (draft.event_currency || null) : null,
        ticket_provider: isPaid && draft.purchase_method === "external_url" ? (draft.ticket_provider || null) : null,
        ticket_release_at: isComingSoon ? (draft.ticket_release_at || null) : null,
        ticket_availability_message: isComingSoon ? (draft.ticket_availability_message || null) : null,
      };
    }

    const token = localStorage.getItem("authToken");
    const endpoint = draft.slug ? `/api/listing/${listingSlug}/event/${draft.slug}/update` : `/api/listing/${listingSlug}/eventDetails`;
    try {
      const response = await fetch(endpoint, {
        method: draft.slug ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (!applyServerErrors(result.errors)) toast.error(result.message ?? "Could not save this event step. Retry when ready.");
        else toast.error("Please correct the highlighted fields before continuing.");
        return false;
      }
      const saved = result.data ?? result;
      if (saved.slug) update("slug", saved.slug);
      setErrors({});
      toast.success("Event step saved");
      return true;
    } catch {
      toast.error("Could not connect to save this event step. Your entries are still here; please retry.");
      return false;
    }
  };

  useImperativeHandle(ref, () => ({ submit: save }));

  const changeCountry = (country: Country) => {
    const changed = draft.event_country !== country.name;
    setDraft((current) => ({
      ...current,
      event_country: country.name,
      ...(changed ? { event_venue_address: "", event_city: "", latitude: null, longitude: null } : {}),
    }));
    setMinimapFeature(undefined);
    setErrors((current) => ({ ...current, event_country: undefined, ...(changed ? { event_venue_address: undefined, event_city: undefined } : {}) }));
  };

  const handleRetrieve = (response: { features?: Feature<Point, GeoJsonProperties>[] }) => {
    const feature = response.features?.[0];
    if (!feature) return;
    const parsed = parseMapboxAddress(feature);
    retrievedAddress.current = parsed.fullAddress;
    setMapboxUnavailable(false);
    setMinimapFeature(feature);
    setDraft((current) => ({
      ...current,
      event_venue_address: parsed.fullAddress,
      event_city: parsed.city || current.event_city,
      event_country: parsed.country || current.event_country,
      latitude: parsed.lat,
      longitude: parsed.lng,
    }));
    setErrors((current) => ({ ...current, event_venue_address: undefined, event_city: undefined, event_country: undefined }));
  };

  const changeVenueAddress = (value: string) => {
    if (retrievedAddress.current && value.trim() === retrievedAddress.current.trim()) {
      setDraft((current) => ({ ...current, event_venue_address: value }));
      return;
    }
    retrievedAddress.current = "";
    setDraft((current) => ({ ...current, event_venue_address: value, latitude: null, longitude: null }));
    setMinimapFeature(undefined);
    if (errors.event_venue_address) {
      setErrors((current) => ({ ...current, event_venue_address: undefined }));
    }
  };

  const selectedCountryCode = useMemo(() => {
    if (!draft.event_country) return "";
    return (countries.all as Country[]).find((country) => country.name === draft.event_country)?.alpha2?.toLowerCase() ?? "";
  }, [draft.event_country]);

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading event details…</div>;

  return <div className="mx-auto max-w-3xl space-y-6 p-0.5 lg:p-6">
    {section === "schedule" && <>
      <div><h2 className="text-2xl font-semibold">Date & time</h2><p className="text-sm text-muted-foreground">Times are stored using the selected event timezone.</p></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Start date" error={errors.event_start_date}><Input data-event-field="event_start_date" aria-invalid={!!errors.event_start_date} className={cn(errors.event_start_date && "border-red-500")} type="date" value={draft.event_start_date} onBlur={() => touch("event_start_date")} onChange={(event) => update("event_start_date", event.target.value)} /></Field>
        <Field label="End date" error={errors.event_end_date}><Input data-event-field="event_end_date" aria-invalid={!!errors.event_end_date} className={cn(errors.event_end_date && "border-red-500")} type="date" min={draft.event_start_date} value={draft.event_end_date} onBlur={() => touch("event_end_date")} onChange={(event) => update("event_end_date", event.target.value)} /></Field>
        {!draft.is_all_day && <>
          <Field label="Start time" error={errors.event_start_time}><Input data-event-field="event_start_time" aria-invalid={!!errors.event_start_time} className={cn(errors.event_start_time && "border-red-500")} type="time" value={draft.event_start_time} onBlur={() => touch("event_start_time")} onChange={(event) => update("event_start_time", event.target.value)} /></Field>
          <Field label="End time" error={errors.event_end_time}><Input data-event-field="event_end_time" aria-invalid={!!errors.event_end_time} className={cn(errors.event_end_time && "border-red-500")} type="time" value={draft.event_end_time} onBlur={() => touch("event_end_time")} onChange={(event) => update("event_end_time", event.target.value)} /></Field>
        </>}
      </div>
      <Field label="Timezone" error={errors.timezone}><SearchableSelect fieldName="timezone" value={draft.timezone} options={timezoneItems} onChange={(value) => selectField("timezone", value)} placeholder="Select timezone" searchPlaceholder="Search timezone…" invalid={!!errors.timezone} /></Field>
      <label className="flex items-start gap-3 rounded-lg border p-4 text-sm">
        <input type="checkbox" className="mt-0.5" checked={draft.is_all_day} onChange={(event) => {
          const checked = event.target.checked;
          setDraft((current) => ({ ...current, is_all_day: checked, ...(checked ? { event_start_time: "", event_end_time: "" } : {}) }));
          setErrors((current) => ({ ...current, event_start_time: undefined, event_end_time: undefined }));
        }} />
        <span><strong className="block font-medium">All-day event</strong><span className="text-muted-foreground">Use dates instead of exact clock times.</span></span>
      </label>
    </>}

    {section === "access" && <>
      <div><h2 className="text-2xl font-semibold">Location / online access</h2><p className="text-sm text-muted-foreground">Choose the format first; only relevant fields will be required.</p></div>
      <Field label="Event format" error={errors.event_location}>
        <Select value={draft.event_location} onValueChange={(value) => selectField("event_location", value as EventFormat)}><SelectTrigger data-event-field="event_location" aria-invalid={!!errors.event_location} className={cn("w-full", errors.event_location && "border-red-500")}><SelectValue placeholder="Select format" /></SelectTrigger><SelectContent><SelectItem value="in_person">In person</SelectItem><SelectItem value="online">Online</SelectItem><SelectItem value="hybrid">Hybrid</SelectItem></SelectContent></Select>
      </Field>
      {(draft.event_location === "in_person" || draft.event_location === "hybrid") && <div className="space-y-4 rounded-xl border p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Venue" error={errors.event_venue}><Input data-event-field="event_venue" aria-invalid={!!errors.event_venue} className={cn(errors.event_venue && "border-red-500")} value={draft.event_venue} onBlur={() => touch("event_venue")} onChange={(event) => update("event_venue", event.target.value)} placeholder="Venue or building name" /></Field>
          <Field label="Country" error={errors.event_country}><div data-event-field="event_country" tabIndex={-1}><CountryDropdown defaultValue={draft.event_country} onChange={changeCountry} placeholder="Search for a country" className={cn("rounded-lg", errors.event_country && "border-red-500")} /></div></Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Venue address" error={errors.event_venue_address}>
            <div className="relative">
              {mapboxToken && selectedCountryCode ? <AddressAutofill accessToken={mapboxToken} options={{ country: selectedCountryCode }} popoverOptions={{ placement: "bottom-start", flip: true, offset: 6 }} onSuggestError={() => setMapboxUnavailable(true)} onRetrieve={handleRetrieve}>
                <Input name="event_venue_address" data-event-field="event_venue_address" autoComplete="address-line1" aria-invalid={!!errors.event_venue_address} className={cn("pr-10", errors.event_venue_address && "border-red-500")} value={draft.event_venue_address} onBlur={() => touch("event_venue_address")} onChange={(event) => changeVenueAddress(event.target.value)} placeholder="Start typing the venue address" />
              </AddressAutofill> : <Input data-event-field="event_venue_address" disabled={!draft.event_country} aria-invalid={!!errors.event_venue_address} className={cn("pr-10", errors.event_venue_address && "border-red-500")} value={draft.event_venue_address} onBlur={() => touch("event_venue_address")} onChange={(event) => update("event_venue_address", event.target.value)} placeholder={draft.event_country ? "Enter the venue address" : "Select a country first"} />}
              <MapPin className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </Field>
          <Field label="City" error={errors.event_city}><Input data-event-field="event_city" autoComplete="shipping address-level2" aria-invalid={!!errors.event_city} className={cn(errors.event_city && "border-red-500")} value={draft.event_city} onBlur={() => touch("event_city")} onChange={(event) => update("event_city", event.target.value)} placeholder="City" /></Field>
        </div>
        {mapboxUnavailable && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800" role="status">Address suggestions are temporarily unavailable. You can still enter the address and city manually.</p>}
        {mapboxToken && minimapFeature && <div className="h-40 overflow-hidden rounded-xl border"><AddressMinimap show feature={minimapFeature} accessToken={mapboxToken} /></div>}
      </div>}
      {(draft.event_location === "online" || draft.event_location === "hybrid") && <div className="space-y-4 rounded-xl border p-4">
        <Field label="Online access plan" error={errors.online_access_policy} warning={warningFor("online_access_policy", draft, hasContactMethod)}><Select value={draft.online_access_policy} onValueChange={(value) => selectField("online_access_policy", value as AccessPolicy)}><SelectTrigger data-event-field="online_access_policy" aria-invalid={!!errors.online_access_policy} className={cn("w-full", errors.online_access_policy && "border-red-500")}><SelectValue placeholder="Choose access plan" /></SelectTrigger><SelectContent><SelectItem value="public_link">Public link</SelectItem><SelectItem value="sent_after_registration">Sent after registration</SelectItem><SelectItem value="shared_later">Shared later</SelectItem></SelectContent></Select></Field>
        {draft.online_access_policy === "public_link" && <Field label="Public online URL" error={errors.event_online_url} hint="Use a complete HTTPS link."><Input data-event-field="event_online_url" type="url" maxLength={2048} aria-invalid={!!errors.event_online_url} className={cn(errors.event_online_url && "border-red-500")} value={draft.event_online_url} onBlur={() => touch("event_online_url")} onChange={(event) => update("event_online_url", event.target.value)} placeholder="https://…" /></Field>}
        <Field label="Access instructions (optional)"><textarea className="min-h-24 w-full rounded-md border p-3 text-sm" value={draft.online_access_instructions} onChange={(event) => update("online_access_instructions", event.target.value)} /></Field>
      </div>}
    </>}

    {section === "tickets" && <>
      <div><h2 className="text-2xl font-semibold">Registration & tickets</h2><p className="text-sm text-muted-foreground">Choose the visitor experience that applies now.</p></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Attendance" error={errors.attendance_type}><Select value={draft.attendance_type} onValueChange={(value) => selectField("attendance_type", value as Attendance)}><SelectTrigger data-event-field="attendance_type" aria-invalid={!!errors.attendance_type} className={cn("w-full", errors.attendance_type && "border-red-500")}><SelectValue placeholder="Choose attendance type" /></SelectTrigger><SelectContent><SelectItem value="free_no_registration">Free — no registration</SelectItem><SelectItem value="free_registration_required">Free — registration required</SelectItem><SelectItem value="paid">Paid</SelectItem></SelectContent></Select></Field>

        <Field label="Admission availability" error={errors.admission_availability} hint="Lets visitors know whether admission is open right now.">
          <Select value={draft.admission_availability} onValueChange={(value) => selectField("admission_availability", value as AdmissionAvailability)}>
            <SelectTrigger data-event-field="admission_availability" aria-invalid={!!errors.admission_availability} className={cn("w-full", errors.admission_availability && "border-red-500")}><SelectValue placeholder="Choose current availability" /></SelectTrigger>
            <SelectContent><SelectItem value="available">Available</SelectItem><SelectItem value="coming_soon">Coming soon</SelectItem><SelectItem value="closed">Closed</SelectItem><SelectItem value="sold_out">Sold out</SelectItem></SelectContent>
          </Select>
        </Field>
      </div>

      {draft.attendance_type === "free_registration_required" && <Field label="Registration URL" error={errors.registration_url} hint="Use a complete HTTPS registration link."><Input data-event-field="registration_url" type="url" maxLength={2048} aria-invalid={!!errors.registration_url} className={cn(errors.registration_url && "border-red-500")} value={draft.registration_url} onBlur={() => touch("registration_url")} onChange={(event) => update("registration_url", event.target.value)} placeholder="https://…" /></Field>}

      {draft.attendance_type === "paid" && <div className="space-y-4">
        <Field label="Pricing mode" error={errors.pricing_mode}>
          <Select value={draft.pricing_mode} onValueChange={(value) => selectField("pricing_mode", value as PricingMode)}>
            <SelectTrigger data-event-field="pricing_mode" aria-invalid={!!errors.pricing_mode} className={cn("w-full", errors.pricing_mode && "border-red-500")}><SelectValue placeholder="Choose pricing mode" /></SelectTrigger>
            <SelectContent><SelectItem value="fixed">Fixed price</SelectItem><SelectItem value="multiple">Multiple ticket types</SelectItem><SelectItem value="varies">Prices vary</SelectItem></SelectContent>
          </Select>
        </Field>

        {draft.pricing_mode === "fixed" && (
          <Field label="Price">
            <div
              className={cn(
                "flex items-stretch overflow-hidden rounded-lg border border-input bg-background",
                "focus-within:border-[#93c01f] focus-within:ring-[3px] focus-within:ring-[#93c01f]/20",
                (errors.event_price || errors.event_currency) && "border-red-500",
              )}
            >
              <SearchableSelect
                fieldName="event_currency"
                value={draft.event_currency}
                options={CURRENCIES}
                onChange={(value) => selectField("event_currency", value)}
                placeholder="Currency"
                searchPlaceholder="Search code or currency…"
                invalid={!!errors.event_currency}
                className="h-10 w-28 shrink-0 justify-between rounded-none border-0 border-r border-input bg-transparent px-3 shadow-none focus-visible:ring-0"
              />
              <Input
                data-event-field="event_price"
                type="number"
                min="0"
                step="0.01"
                aria-invalid={!!errors.event_price}
                className="h-10 flex-1 rounded-none border-0 shadow-none focus-visible:ring-0"
                value={draft.event_price}
                onBlur={() => touch("event_price")}
                onChange={(event) => update("event_price", event.target.value)}
                placeholder="0.00"
              />
            </div>
            {errors.event_price && <p className="text-xs text-red-600" role="alert">{errors.event_price}</p>}
            {!errors.event_price && errors.event_currency && <p className="text-xs text-red-600" role="alert">{errors.event_currency}</p>}
          </Field>
        )}

        {draft.pricing_mode === "multiple" && <>
          <Field label="Currency" error={errors.event_currency} hint="Applies to every ticket type below."><SearchableSelect fieldName="event_currency" value={draft.event_currency} options={CURRENCIES} onChange={(value) => selectField("event_currency", value)} placeholder="Select currency" searchPlaceholder="Search code or currency…" invalid={!!errors.event_currency} /></Field>
          {draft.slug
            ? <TicketTypeEditor ref={ticketTypeEditorRef} listingSlug={listingSlug} eventSlug={draft.slug} />
            : <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">Save this step once to start adding ticket types.</p>}
        </>}

        <Field label="Purchase method" error={errors.purchase_method} warning={warningFor("purchase_method", draft, hasContactMethod)}>
          <Select value={draft.purchase_method} onValueChange={(value) => selectField("purchase_method", value as PurchaseMethod)}>
            <SelectTrigger data-event-field="purchase_method" aria-invalid={!!errors.purchase_method} className={cn("w-full", errors.purchase_method && "border-red-500")}><SelectValue placeholder="Choose purchase method" /></SelectTrigger>
            <SelectContent><SelectItem value="external_url">External ticket website</SelectItem><SelectItem value="pay_at_venue">Pay at venue</SelectItem><SelectItem value="contact_organizer">Contact organizer</SelectItem></SelectContent>
          </Select>
        </Field>

        {draft.purchase_method === "external_url" && <>
          <Field label="Ticket URL" error={errors.event_ticket_url} hint="Link directly to a public HTTPS event, ticket, or checkout page."><Input data-event-field="event_ticket_url" type="url" maxLength={2048} aria-invalid={!!errors.event_ticket_url} className={cn(errors.event_ticket_url && "border-red-500")} value={draft.event_ticket_url} onBlur={() => touch("event_ticket_url")} onChange={(event) => update("event_ticket_url", event.target.value)} placeholder="https://…" /></Field>
          <Field label="Ticket provider (optional)"><Input value={draft.ticket_provider} onChange={(event) => update("ticket_provider", event.target.value)} /></Field>
        </>}

        {draft.purchase_method === "pay_at_venue" && <Field label="Purchase instructions (optional)" hint="Let attendees know how payment works at the venue.">
          <textarea className="min-h-24 w-full rounded-md border p-3 text-sm" value={draft.purchase_instructions} onChange={(event) => update("purchase_instructions", event.target.value)} />
        </Field>}

        {draft.purchase_method === "contact_organizer" && <Field label="Purchase instructions (optional)" hint="Explain how attendees should reach you to purchase or reserve admission.">
          <textarea className="min-h-24 w-full rounded-md border p-3 text-sm" value={draft.purchase_instructions} onChange={(event) => update("purchase_instructions", event.target.value)} />
        </Field>}
      </div>}

      {draft.admission_availability === "coming_soon" && <div className="space-y-4">
        <Field label="Release time (optional)"><Input type="datetime-local" value={draft.ticket_release_at} onChange={(event) => update("ticket_release_at", event.target.value)} /></Field>
        <Field label="Public availability message" error={errors.ticket_availability_message}><textarea data-event-field="ticket_availability_message" aria-invalid={!!errors.ticket_availability_message} className={cn("min-h-24 w-full rounded-md border p-3 text-sm", errors.ticket_availability_message && "border-red-500")} value={draft.ticket_availability_message} onBlur={() => touch("ticket_availability_message")} onChange={(event) => update("ticket_availability_message", event.target.value)} /></Field>
      </div>}
    </>}
  </div>;
});

EventStepForm.displayName = "EventStepForm";

function Field({ label, children, error, warning, hint }: { label: string; children: React.ReactNode; error?: string; warning?: string; hint?: string }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}{error ? <p className="text-xs text-red-600" role="alert">{error}</p> : warning ? <p className="text-xs text-amber-700" role="status">{warning}</p> : hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}</div>;
}

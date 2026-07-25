"use client";

import { useState, forwardRef, useImperativeHandle, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { Globe, Question, MapPin } from "@phosphor-icons/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "next/navigation";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { handleSessionExpired } from "@/lib/session";
import {
  BusinessHoursSelector,
  DaySchedule,
} from "@/components/dashboard/listing/business-hours";
import { useListing } from "@/context/listing-form-context";
import { ListingFormHandle } from "@/components/dashboard/listing/types";
import { CountryDropdown, Country } from "@/components/ui/country-dropdown";
import { countries } from "country-data-list";
import {
  normalizeUrl,
  convertToHHmm,
  convertDateToInput,
  convertTimeToInput,
  parseMapboxAddress,
} from "@/lib/directory/utils";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

import {
  AddressAutofill,
  AddressMinimap,
  useConfirmAddress,
} from "@mapbox/search-js-react";
import type { Feature, Point, GeoJsonProperties } from "geojson";

export const DetailsFormSchema = z
  .object({
    listing_type: z.enum(["business", "event", "community"]),
    address: z.string().optional(),
    event_venue: z.string().optional(),
    country: z.string().optional(),
    city: z.string().optional(),
    google_plus_code: z.string().optional(),
    businessHours: z
      .array(
        z.object({
          day_of_week: z.string(),
          startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, {
            message: "Format must be HH:mm (24h)",
          }),
          endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, {
            message: "Format must be HH:mm (24h)",
          }),
          enabled: z.boolean(),
        }),
      )
      .min(1, "Hours are required"),
    // Event-specific fields
    event_price: z.string().optional(),
    event_currency: z.string().optional(),
    event_ticket_url: z
      .string()
      .optional()
      .or(z.literal(""))
      .refine((val) => !val || val.startsWith("https://"), {
        message:
          "URL must start with https:// (e.g., https://www.eventbrite.com/my-event)",
      }),
    event_online_url: z
      .string()
      .optional()
      .or(z.literal(""))
      .refine((val) => !val || val.startsWith("https://"), {
        message:
          "URL must start with https:// (e.g., https://zoom.us/j/123...)",
      }),
    event_start_date: z.string().optional(),
    event_end_date: z.string().optional(),
    event_start_time: z
      .string()
      .optional()
      .refine((val) => !val || /^([01]\d|2[0-3]):([0-5]\d)$/.test(val), {
        message: "Format must be HH:mm (24h)",
      }),
    event_end_time: z
      .string()
      .optional()
      .refine((val) => !val || /^([01]\d|2[0-3]):([0-5]\d)$/.test(val), {
        message: "Format must be HH:mm (24h)",
      }),
    event_location: z.string().optional(),
    event_type: z.string().optional(),
    timezone: z.string().optional(),
    is_all_day: z.boolean().optional(),
    online_access_policy: z.string().optional(),
    attendance_type: z.string().optional(),
    registration_url: z.string().optional().or(z.literal("")),
    ticket_availability_message: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const requireField = (field: keyof typeof data, message: string) => {
      if (!String(data[field] ?? "").trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message });
      }
    };

    if (data.listing_type === "business") {
      requireField("address", "Headquarters address is required");
      requireField("city", "Headquarters city is required");
      requireField("country", "Headquarters country is required");
    }

    if (data.listing_type === "event") {
      requireField("event_start_date", "Start date is required");
      requireField("event_end_date", "End date is required");
      requireField("event_start_time", "Start time is required");
      requireField("event_end_time", "End time is required");
      requireField("event_location", "Event format is required");
      requireField("timezone", "Timezone is required");
      if (data.event_location === "in_person" || data.event_location === "hybrid") {
        requireField("event_venue", "Venue name is required");
        requireField("address", "Venue address is required");
        requireField("city", "Event city is required");
        requireField("country", "Event country is required");
      }
      if (data.event_location === "online" || data.event_location === "hybrid") {
        requireField("online_access_policy", "Choose an online access plan");
        if (data.online_access_policy === "public_link") requireField("event_online_url", "Public online URL is required");
      }
      requireField("attendance_type", "Choose a registration or ticket option");
      if (data.attendance_type === "free_registration_required") requireField("registration_url", "Registration URL is required");
      if (data.attendance_type === "paid") requireField("event_ticket_url", "Ticket URL is required");
      if (data.attendance_type === "tickets_coming_soon") requireField("ticket_availability_message", "Availability message is required");
    }
  })
  .refine(
    (data) => {
      if (data.event_start_date && data.event_end_date) {
        const start = new Date(data.event_start_date);
        const end = new Date(data.event_end_date);
        return end >= start;
      }
      return true;
    },
    {
      message: "End date cannot be earlier than the start date",
      path: ["event_end_date"],
    },
  )
  .refine(
    (data) => {
      // Both can be empty, but if one has a value, the other must also have a value
      const hasPrice = data.event_price && data.event_price.trim() !== "";
      const hasCurrency =
        data.event_currency && data.event_currency.trim() !== "";
      // Allow: both empty, or both have values
      return !((hasPrice && !hasCurrency) || (!hasPrice && hasCurrency));
    },
    {
      message: "Price and currency must both be provided or both be empty",
      path: ["event_price"],
    },
  );

const formTextConfig = {
  business: {
    addressLabel: "Business Address",
    addressPlaceholder: "Enter business address",
    cityLabel: "Business City",
    countryLabel: "Business Country",
    googlePlusCodeLabel: "Google Plus Code",
    subtitle: "Provide the business details below",
  },
  event: {
    venueLabel: "Event Venue Name",
    venuePlaceholder: "e.g., Royal Albert Hall",
    addressLabel: "Event Venue Address",
    addressPlaceholder: "Enter event venue address",
    cityLabel: "Event City",
    countryLabel: "Event Country",
    googlePlusCodeLabel: "Google Plus Code",
    subtitle: "Provide the event details below",
  },
  community: {
    addressLabel: "Community Address",
    addressPlaceholder: "Enter community address",
    cityLabel: "Community City",
    countryLabel: "Community Country",
    googlePlusCodeLabel: "Google Plus Code",
    subtitle: "Provide the community details below",
  },
};

export type DetailsFormValues = z.infer<typeof DetailsFormSchema>;

type Props = {
  listingType: "business" | "event" | "community";
  listingSlug: string;
  onValidityChange?: (isValid: boolean) => void;
  showBusinessHours?: boolean;
};

export const BusinessDetailsForm = forwardRef<ListingFormHandle, Props>(
  ({ listingType, listingSlug, onValidityChange, showBusinessHours = false }, ref) => {
    const searchParams = useSearchParams();
    const [mounted, setMounted] = useState(false);
    const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";

    // --- Mapbox Confirmation Hook ---
    const { formRef, showConfirm } = useConfirmAddress({
      accessToken: MAPBOX_TOKEN,
    });
    const [minimapFeature, setMinimapFeature] = useState<
      Feature<Point, GeoJsonProperties> | undefined
    >(undefined);
    const [coordinates, setCoordinates] = useState<{
      lat: number | null;
      lng: number | null;
    }>({ lat: null, lng: null });

    useEffect(() => {
      setMounted(true);
    }, []);

    const form = useForm<DetailsFormValues>({
      resolver: zodResolver(DetailsFormSchema),
      mode: "onChange",
      defaultValues: {
        listing_type: listingType,
        address: "",
        country: "",
        city: "",
        google_plus_code: "",
        businessHours: [
          {
            day_of_week: "Monday",
            startTime: "09:00",
            endTime: "17:00",
            enabled: true,
          },
          {
            day_of_week: "Tuesday",
            startTime: "09:00",
            endTime: "17:00",
            enabled: true,
          },
          {
            day_of_week: "Wednesday",
            startTime: "09:00",
            endTime: "17:00",
            enabled: true,
          },
          {
            day_of_week: "Thursday",
            startTime: "09:00",
            endTime: "17:00",
            enabled: true,
          },
          {
            day_of_week: "Friday",
            startTime: "09:00",
            endTime: "17:00",
            enabled: true,
          },
          {
            day_of_week: "Saturday",
            startTime: "09:00",
            endTime: "17:00",
            enabled: false,
          },
          {
            day_of_week: "Sunday",
            startTime: "09:00",
            endTime: "17:00",
            enabled: false,
          },
        ],
        // Event-specific default values
        event_price: "",
        event_currency: "",
        event_ticket_url: "",
        event_online_url: "",
        event_start_date: "",
        event_end_date: "",
        event_start_time: "",
        event_end_time: "",
        event_location: "",
        event_type: "",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Africa/Accra",
        is_all_day: false,
        online_access_policy: "",
        attendance_type: "",
        registration_url: "",
        ticket_availability_message: "",
      },
    });

    const {
      register,
      setValue,
      watch,
      trigger,
      control,
      reset,
      formState: { errors, isValid },
    } = form;
    const { businessDetails, setBusinessDetails } = useListing();

    useEffect(() => {
      onValidityChange?.(isValid);
    }, [isValid, onValidityChange]);
    // Tracks the backend event record slug so we can use the update endpoint on subsequent saves.
    const [eventSlug, setEventSlug] = useState<string | null>(null);
    const currentHours =
      (watch("businessHours") as unknown as DaySchedule[]) || [];
    const text = formTextConfig[listingType];

    const eventLocationType = watch("event_location");
    const onlineAccessPolicy = watch("online_access_policy");
    const attendanceType = watch("attendance_type");
    const selectedCountryName = watch("country");
    const startDateValue = watch("event_start_date");

    const minEndDate = startDateValue || undefined;

    useEffect(() => {
      const loadDetails = async () => {
        const effectiveSlug = listingSlug || searchParams.get("slug");
        if (!effectiveSlug) return;
        try {
          const token = localStorage.getItem("authToken");
          const res = await fetch(`/api/listing/${effectiveSlug}/show`, {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          });
          if (res.ok) {
            const json = await res.json();
            const d = json.data || json;
            const isEvent = (d?.type || listingType) === "event";
            // Capture the event record slug for subsequent saves (update vs create)
            if (isEvent) {
              const eSlug = d.event?.slug ?? null;
              if (eSlug) setEventSlug(String(eSlug));
            }
            const mappedHours = form
              .getValues("businessHours")
              .map((defaultDay) => {
                const defaultDayLower = defaultDay.day_of_week.toLowerCase();
                const apiDay = d.opening_hours?.find(
                  (h: { day_of_week?: string; id?: number; slug?: string; open_time: string; close_time: string }) =>
                    h.day_of_week?.toLowerCase() === defaultDayLower,
                );
                return apiDay
                  ? {
                      ...defaultDay,
                      id: apiDay.id,
                      slug: apiDay.slug,
                      startTime: convertToHHmm(apiDay.open_time),
                      endTime: convertToHHmm(apiDay.close_time),
                      enabled: true,
                    }
                  : { ...defaultDay, enabled: false };
              });
            if (d.latitude && d.longitude) {
              setCoordinates({
                lat: Number(d.latitude),
                lng: Number(d.longitude),
              });
            }

            reset({
              listing_type: listingType,
              // Event listings use event_* keys from API; non-events use normal address keys.
              address: isEvent
                ? d.event_venue_address ||
                  d.address ||
                  d.location?.address ||
                  ""
                : d.address || d.location?.address || "",
              event_venue: isEvent ? d.event_venue || "" : "",
              city: isEvent
                ? d.event_city || d.city || d.location?.city || ""
                : d.city || d.location?.city || "",
              country: isEvent
                ? d.event_country ||
                  d.country ||
                  d.location?.country ||
                  "United Kingdom"
                : d.country || d.location?.country || "United Kingdom",
              google_plus_code:
                d.google_plus_code || d.location?.google_plus_code || "",
              businessHours: mappedHours,
              event_price: d.event?.event_price ?? d.event_price ?? "",
              event_currency: d.event?.event_currency ?? d.event_currency ?? "",
              event_ticket_url:
                d.event?.event_ticket_url ??
                d.event_ticket_url ??
                d.ticket_url ??
                "",
              event_online_url:
                d.event?.event_online_url ??
                d.event_online_url ??
                d.online_url ??
                "",
              event_start_date: convertDateToInput(
                d.event?.event_start_date ?? d.event_start_date ?? d.start_date,
              ),
              event_end_date: convertDateToInput(
                d.event?.event_end_date ??
                  d.event_end_date ??
                  d.end_date ??
                  d.event_start_date ??
                  d.start_date,
              ),
              event_start_time: convertTimeToInput(
                d.event?.event_start_time ?? d.event_start_time ?? d.start_time,
              ),
              event_end_time: convertTimeToInput(
                d.event?.event_end_time ?? d.event_end_time ?? d.end_time,
              ),
              // Resource returns event_location_type (renamed from the DB column event_location)
              event_location:
                d.event?.event_location_type ?? d.event_location_type ?? "",
              // Duration type — only on the nested event object
              event_type: d.event?.event_type ?? "",
              timezone: d.event?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? "Africa/Accra",
              is_all_day: Boolean(d.event?.is_all_day),
              online_access_policy: d.event?.online_access_policy ?? "",
              attendance_type: d.event?.attendance_type ?? "",
              registration_url: d.event?.registration_url ?? "",
              ticket_availability_message: d.event?.ticket_availability_message ?? "",
            });
          }
        } catch (err) {
          console.error("Failed to load details:", err);
        }
      };
      loadDetails();
    }, [listingSlug, reset, searchParams, form, listingType]);

    const saveDataToApi = async () => {
      // Only run Mapbox address confirmation when a token is present.
      // Without a token showConfirm() throws, which silently blocks submission.
      if (MAPBOX_TOKEN) {
        const confirmResult = await showConfirm();
        if (confirmResult.type === "change") {
          return false; // User wants to correct the suggested address
        }
      }

      // Skip business hours processing for events
      if (listingType !== "event") {
        const currentValues = form.getValues("businessHours");
        const sanitized = currentValues.map((h) => ({
          ...h,
          startTime: convertToHHmm(h.startTime),
          endTime: convertToHHmm(h.endTime),
        }));
        setValue("businessHours", sanitized);

        const fields: Array<keyof DetailsFormValues> = [
          "address",
          "country",
          "city",
          "google_plus_code",
        ];
        if (showBusinessHours) fields.push("businessHours");
        const isValid = await trigger(fields);
        if (!isValid) {
          if (errors.businessHours) toast.error("Check time formats (HH:mm)");
          return false;
        }
      } else {
        setValue("event_start_time", convertToHHmm(form.getValues("event_start_time")));
        setValue("event_end_time", convertToHHmm(form.getValues("event_end_time")));

        const isValid = await trigger([
          "event_venue",
          "address",
          "country",
          "city",
          "event_start_date",
          "event_end_date",
          "event_start_time",
          "event_end_time",
          "event_location",
          "timezone",
          "online_access_policy",
          "attendance_type",
          "registration_url",
          "event_ticket_url",
          "ticket_availability_message",
        ]);
        if (!isValid) {
          return false;
        }
      }

      const effectiveSlug = listingSlug || searchParams.get("slug");
      if (!effectiveSlug) {
        return false;
      }
      const token = localStorage.getItem("authToken");

      try {
        const data = form.getValues();
        // Build payload based on listing type - events need different field names
        const detailsPayload: Record<string, unknown> = {};

        if (listingType === "event") {
          detailsPayload.event_venue = data.event_venue;
          detailsPayload.event_venue_address = data.address;
          detailsPayload.event_city = data.city;
          detailsPayload.event_country = data.country;
          detailsPayload.latitude = coordinates.lat;
          detailsPayload.longitude = coordinates.lng;
          // event_price / event_currency — send null when blank so backend nullable rules pass
          detailsPayload.event_price = data.event_price || null;
          detailsPayload.event_currency = data.event_currency || null;
          // URL fields — normalise non-empty values; send null when blank (backend: nullable|url)
          const rawTicketUrl = data.event_ticket_url?.trim();
          detailsPayload.event_ticket_url = rawTicketUrl
            ? normalizeUrl(rawTicketUrl)
            : null;
          const rawOnlineUrl = data.event_online_url?.trim();
          detailsPayload.event_online_url = rawOnlineUrl
            ? normalizeUrl(rawOnlineUrl)
            : null;
          detailsPayload.event_start_date = data.event_start_date;
          detailsPayload.event_end_date = data.event_end_date;
          detailsPayload.event_start_time = data.event_start_time;
          detailsPayload.event_end_time = data.event_end_time;
          // event_location = in_person/online/hybrid (required by backend)
          detailsPayload.event_location = data.event_location;
          // event_type = duration (1_day/2_days/multi_days, nullable)
          detailsPayload.event_type = data.event_type || null;
          detailsPayload.timezone = data.timezone;
          detailsPayload.is_all_day = Boolean(data.is_all_day);
          detailsPayload.online_access_policy = data.online_access_policy || null;
          detailsPayload.attendance_type = data.attendance_type || null;
          detailsPayload.registration_url = data.registration_url ? normalizeUrl(data.registration_url) : null;
          detailsPayload.ticket_availability_message = data.ticket_availability_message || null;
        } else {
          // For business/community: use standard field names including google_plus_code
          detailsPayload.address = data.address;
          detailsPayload.city = data.city;
          detailsPayload.country = data.country;
          detailsPayload.google_plus_code = data.google_plus_code;
          detailsPayload.latitude = coordinates.lat;
          detailsPayload.longitude = coordinates.lng;
        }

        // Only prepare business hours for non-event listings
        const enabledHours =
          listingType !== "event" && showBusinessHours
            ? data.businessHours
                .filter((h: DaySchedule) => h.enabled)
                .map((h: DaySchedule) => ({
                  id: h.id,
                  slug: h.slug,
                  day_of_week: h.day_of_week,
                  open_time: h.startTime,
                  close_time: h.endTime,
                }))
            : [];

        // Days that were loaded from the server (have a slug) but user has since unchecked
        const hoursToDelete =
          listingType !== "event" && showBusinessHours
            ? data.businessHours
                .filter((h: DaySchedule) => !h.enabled && !!h.slug)
                .map((h: DaySchedule) => h.slug as string)
            : [];

        // For events: POST to create on first save, PATCH update endpoint on subsequent saves.
        // For business/community: PUT to the address proxy.
        let detailsEndpoint: string;
        let detailsMethod: string;
        if (listingType === "event") {
          if (eventSlug) {
            detailsEndpoint = `/api/listing/${effectiveSlug}/event/${eventSlug}/update`;
            detailsMethod = "PATCH";
          } else {
            detailsEndpoint = `/api/listing/${effectiveSlug}/eventDetails`;
            detailsMethod = "POST";
          }
        } else {
          detailsEndpoint = `/api/listing/${effectiveSlug}/address`;
          detailsMethod = "PUT";
        }

        const detailsReq = fetch(detailsEndpoint, {
          method: detailsMethod,
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(detailsPayload),
        });

        // Only send business hours for non-event listings
        let hoursResults: Response[] = [];
        if (listingType !== "event" && showBusinessHours) {
          // DELETE hours for days the user has unchecked (use slug per API)
          if (hoursToDelete.length > 0) {
            await Promise.all(
              hoursToDelete.map((slug) =>
                fetch(`/api/opening_hours/${slug}`, {
                  method: "DELETE",
                  headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                }),
              ),
            );
          }

          if (enabledHours.length > 0) {
            const hasExistingHours = enabledHours.some((h) => !!h.slug);

            if (hasExistingHours) {
              hoursResults = await Promise.all(
                enabledHours.map((h) => {
                  if (h.slug) {
                    return fetch(`/api/opening_hours/${h.slug}`, {
                      method: "PUT",
                      headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                        Authorization: `Bearer ${token}`,
                      },
                      body: JSON.stringify({
                        day_of_week: h.day_of_week,
                        open_time: h.open_time,
                        close_time: h.close_time,
                      }),
                    });
                  } else {
                    return fetch(
                      `/api/listing/${effectiveSlug}/opening_hours`,
                      {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          Accept: "application/json",
                          Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify([
                          {
                            day_of_week: h.day_of_week,
                            open_time: h.open_time,
                            close_time: h.close_time,
                          },
                        ]),
                      },
                    );
                  }
                }),
              );
            } else {
              // POST all hours as a batch for initial creation
              const res = await fetch(
                `/api/listing/${effectiveSlug}/opening_hours`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify(enabledHours),
                },
              );
              hoursResults = [res];
            }
          }
        }

        const [detailsRes] = await Promise.all([detailsReq]);

        const hoursOk = hoursResults.every((r) => r.ok);

        if (!detailsRes.ok) {
          if (handleSessionExpired(detailsRes.status)) return false;
          const errJson = await detailsRes.json().catch(() => ({}));
          if (detailsRes.status === 422 && errJson.errors) {
            const fieldMap: Record<string, keyof DetailsFormValues> = {
              event_type: "event_location",
            };
            Object.entries(errJson.errors as Record<string, string[]>).forEach(
              ([field, messages]) => {
                const formField = (fieldMap[field] ??
                  field) as keyof DetailsFormValues;
                form.setError(formField, { message: messages[0] });
              },
            );
            toast.error("Please correct the highlighted fields.");
          } else {
            toast.error(errJson.message || "Failed to save details");
          }
          return false;
        }

        if (!hoursOk) {
          const unauthorized = hoursResults.find((r) => r.status === 401);
          if (unauthorized && handleSessionExpired(unauthorized.status)) {
            return false;
          }
          toast.error("Failed to save opening hours");
          return false;
        }

        // If this was a create (POST), capture the returned event slug for subsequent saves.
        if (listingType === "event" && !eventSlug) {
          try {
            const created = await detailsRes.clone().json();
            const newSlug = created?.data?.slug ?? created?.slug ?? null;
            if (newSlug) setEventSlug(String(newSlug));
          } catch {
            // Non-fatal — next page load will re-hydrate the slug
          }
        }

        setBusinessDetails({ ...businessDetails, ...data });
        toast.success("Details saved!");
        return true;
      } catch (error) {
        const msg =
          error instanceof Error ? error.message : "Failed to save details";
        toast.error(msg);
        return false;
      } finally {
      }
    };

    useImperativeHandle(ref, () => ({
      async submit() {
        return await saveDataToApi();
      },
    }));

    const handleRetrieve = (res: {
      features?: Feature<Point, GeoJsonProperties>[];
    }) => {
      const feature = res.features?.[0];
      if (!feature) return;
      setMinimapFeature(feature);
      const parsed = parseMapboxAddress(feature);
      if (parsed.lat !== null && parsed.lng !== null) {
        setCoordinates({ lat: parsed.lat, lng: parsed.lng });
      }
      setValue("address", parsed.fullAddress, { shouldValidate: true });
      if (parsed.city) setValue("city", parsed.city, { shouldValidate: true });
      if (parsed.country)
        setValue("country", parsed.country, { shouldValidate: true });
    };

    return (
      <form
        ref={formRef}
        className="w-full max-w-5xl space-y-6 mx-auto p-0.5 lg:p-6"
        onSubmit={(e) => e.preventDefault()}
      >
        <div>
          <h2 className="text-2xl font-semibold">Details</h2>
          <p className="text-sm text-gray-500 mt-1">{text.subtitle}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            {listingType === "event" ? (
              <>
                <label className="font-medium text-sm">
                  {(text as (typeof formTextConfig)["event"]).venueLabel}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <Input
                  {...register("event_venue")}
                  placeholder={
                    (text as (typeof formTextConfig)["event"]).venuePlaceholder
                  }
                  className={cn(errors.event_venue && "border-red-500")}
                />
                {errors.event_venue && (
                  <p className="text-red-500 text-xs">
                    {errors.event_venue.message}
                  </p>
                )}
              </>
            ) : (
              <>
                <label className="font-medium text-sm">
                  {text.countryLabel} <span className="text-red-500">*</span>
                </label>
                <CountryDropdown
                  placeholder="Select your country"
                  defaultValue={
                    countries.all.find((c) => c.name === selectedCountryName)
                      ?.alpha3
                  }
                  onChange={(country: Country) =>
                    setValue("country", country.name, { shouldValidate: true })
                  }
                  className="rounded-lg"
                />
                {errors.country && (
                  <p className="text-red-500 text-xs">
                    {errors.country.message}
                  </p>
                )}
              </>
            )}
          </div>

          <div className="space-y-1">
            <label className="font-medium text-sm">
              {listingType === "event" ? text.countryLabel : text.addressLabel}{" "}
              <span className="text-red-500">*</span>
            </label>
            {listingType === "event" ? (
              <CountryDropdown
                placeholder="Select your country"
                defaultValue={
                  countries.all.find((c) => c.name === selectedCountryName)
                    ?.alpha3
                }
                onChange={(country: Country) =>
                  setValue("country", country.name, { shouldValidate: true })
                }
                className="rounded-lg"
              />
            ) : (
              <div className="relative">
                {mounted && MAPBOX_TOKEN ? (
                  <AddressAutofill
                    accessToken={MAPBOX_TOKEN}
                    onRetrieve={handleRetrieve}
                  >
                    <Input
                      {...register("address")}
                      autoComplete="shipping address-line1"
                      placeholder={text.addressPlaceholder}
                      className={cn(errors.address && "border-red-500")}
                    />
                  </AddressAutofill>
                ) : (
                  <Input
                    {...register("address")}
                    placeholder={text.addressPlaceholder}
                  />
                )}
                <MapPin
                  size={18}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
                />
              </div>
            )}
            {errors[listingType === "event" ? "country" : "address"] && (
              <p className="text-red-500 text-xs">
                {
                  errors[listingType === "event" ? "country" : "address"]
                    ?.message
                }
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="font-medium text-sm">
              {listingType === "event" ? text.addressLabel : text.cityLabel}{" "}
              <span className="text-red-500">*</span>
            </label>
            {listingType === "event" ? (
              <div className="relative">
                {mounted && MAPBOX_TOKEN ? (
                  <AddressAutofill
                    accessToken={MAPBOX_TOKEN}
                    onRetrieve={handleRetrieve}
                  >
                    <Input
                      {...register("address")}
                      autoComplete="shipping address-line1"
                      placeholder={text.addressPlaceholder}
                      className={cn(errors.address && "border-red-500")}
                    />
                  </AddressAutofill>
                ) : (
                  <Input
                    {...register("address")}
                    placeholder={text.addressPlaceholder}
                  />
                )}
                <MapPin
                  size={18}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
                />
              </div>
            ) : (
              <Input
                {...register("city")}
                autoComplete="shipping address-level2"
                placeholder="e.g., Accra"
                className={cn(errors.city && "border-red-500")}
              />
            )}
            {errors[listingType === "event" ? "address" : "city"] && (
              <p className="text-red-500 text-xs">
                {errors[listingType === "event" ? "address" : "city"]?.message}
              </p>
            )}
            {listingType === "event" &&
              mounted &&
              MAPBOX_TOKEN &&
              minimapFeature && (
                <div className="mt-2 rounded-xl overflow-hidden h-36 border border-gray-200">
                  <AddressMinimap
                    show
                    feature={minimapFeature}
                    accessToken={MAPBOX_TOKEN}
                  />
                </div>
              )}
          </div>

          <div className="space-y-1">
            {listingType === "event" ? (
              <>
                <label className="font-medium text-sm">
                  {text.cityLabel} <span className="text-red-500">*</span>
                </label>
                <Input
                  {...register("city")}
                  autoComplete="shipping address-level2"
                  placeholder="e.g., Accra"
                  className={cn(errors.city && "border-red-500")}
                />
                {errors.city && (
                  <p className="text-red-500 text-xs">{errors.city.message}</p>
                )}
              </>
            ) : (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <label className="font-medium text-sm">
                    {text.googlePlusCodeLabel}{" "}
                    <span className="text-gray-400 font-normal">
                      (Optional)
                    </span>
                  </label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <Question size={14} />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[280px] p-3">
                        <div className="space-y-2 text-xs">
                          <p className="font-semibold">What is a Plus Code?</p>
                          <p>
                            A simple digital address that works like a street
                            address.
                          </p>
                          <p className="font-semibold">How to find it:</p>
                          <ol className="list-decimal list-inside space-y-1">
                            <li>Open Google Maps and tap your location.</li>
                            <li>
                              Look for the plus code icon (e.g., 849VCWC8+R9).
                            </li>
                          </ol>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  {...register("google_plus_code")}
                  placeholder="e.g., 849VCWC8+R9"
                  className={cn(errors.google_plus_code && "border-red-500")}
                />
                {errors.google_plus_code && (
                  <p className="text-red-500 text-xs">
                    {errors.google_plus_code.message}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {listingType !== "event" && showBusinessHours && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="font-medium text-sm mb-2 block">
                Business Hours <span className="text-red-500">*</span>
              </label>
              <BusinessHoursSelector
                label=""
                value={currentHours}
                onChange={(val) => {
                  const formatted = val.map((d: DaySchedule) => ({
                    ...d,
                    startTime: convertToHHmm(d.startTime),
                    endTime: convertToHHmm(d.endTime),
                  }));
                  setValue("businessHours", formatted, {
                    shouldValidate: true,
                  });
                }}
              />
              {errors.businessHours && (
                <p className="text-red-500 text-xs mt-1">
                  Please check time format (HH:mm)
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-medium text-sm">Timezone <span className="text-red-500">*</span></label>
                <Input {...register("timezone")} placeholder="Africa/Accra" className={cn(errors.timezone && "border-red-500")} />
                {errors.timezone && <p className="text-red-500 text-xs">{errors.timezone.message}</p>}
              </div>
              <label className="flex items-center gap-2 pt-7 text-sm">
                <input type="checkbox" {...register("is_all_day")} /> All-day event
              </label>
            </div>
          </div>
        )}

        {/* Event-specific fields - Only show for events */}
        {listingType === "event" && (
          <div className="space-y-6 pt-4 border-t">
            <h3 className="text-lg font-semibold">Event Details</h3>

            {/* Event Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-medium text-sm">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <Input
                  {...register("event_start_date")}
                  type="date"
                  className={cn(errors.event_start_date && "border-red-500")}
                />
                {errors.event_start_date && (
                  <p className="text-red-500 text-xs">
                    {errors.event_start_date.message}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <label className="font-medium text-sm">
                  End Date <span className="text-red-500">*</span>
                </label>
                <Input
                  {...register("event_end_date")}
                  type="date"
                  min={minEndDate}
                  className={cn(errors.event_end_date && "border-red-500")}
                />
                {errors.event_end_date && (
                  <p className="text-red-500 text-xs">
                    {errors.event_end_date.message}
                  </p>
                )}
              </div>
            </div>

            {/* Event Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-medium text-sm">
                  Start Time <span className="text-red-500">*</span>
                </label>
                <Input
                  {...register("event_start_time")}
                  type="time"
                  className={cn(errors.event_start_time && "border-red-500")}
                />
                {errors.event_start_time && (
                  <p className="text-red-500 text-xs">
                    {errors.event_start_time.message}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <label className="font-medium text-sm">
                  End Time <span className="text-red-500">*</span>
                </label>
                <Input
                  {...register("event_end_time")}
                  type="time"
                  className={cn(errors.event_end_time && "border-red-500")}
                />
                {errors.event_end_time && (
                  <p className="text-red-500 text-xs">
                    {errors.event_end_time.message}
                  </p>
                )}
              </div>
            </div>

            {/* Event Type */}
            {/* Row 1: Event Format + Event Duration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-medium text-sm">
                  Event Format <span className="text-red-500">*</span>
                </label>
                <Controller
                  name="event_location"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger
                        className={cn(
                          "h-10 rounded-lg border-gray-300 w-full",
                          errors.event_location && "border-red-500",
                        )}
                      >
                        <SelectValue placeholder="Select event format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="in_person">In-Person</SelectItem>
                        <SelectItem value="online">Online</SelectItem>
                        <SelectItem value="hybrid">Hybrid</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.event_location && (
                  <p className="text-red-500 text-xs">
                    {errors.event_location.message}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="font-medium text-sm">
                  Event Duration{" "}
                  <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <Controller
                  name="event_type"
                  control={control}
                  render={({ field }) => (
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? ""}
                    >
                      <SelectTrigger className="h-10 rounded-lg border-gray-300 w-full">
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1_day">1 Day</SelectItem>
                        <SelectItem value="2_days">2 Days</SelectItem>
                        <SelectItem value="multi_days">Multi-Day</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            {/* Row 2: Online URL (only for online/hybrid) */}
            {(eventLocationType === "online" ||
              eventLocationType === "hybrid") && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="font-medium text-sm">Online access plan <span className="text-red-500">*</span></label>
                  <Controller name="online_access_policy" control={control} render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value ?? ""}><SelectTrigger><SelectValue placeholder="Choose how access is shared" /></SelectTrigger><SelectContent><SelectItem value="public_link">Public link</SelectItem><SelectItem value="sent_after_registration">Sent after registration</SelectItem><SelectItem value="shared_later">Shared later</SelectItem></SelectContent></Select>
                  )} />
                  {errors.online_access_policy && <p className="text-red-500 text-xs">{errors.online_access_policy.message}</p>}
                </div>
                {onlineAccessPolicy === "public_link" && <div className="space-y-1">
                <label className="font-medium text-sm">
                  Public event URL <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Input
                    {...register("event_online_url")}
                    placeholder="https://zoom.us/j/..."
                    className={cn(
                      "h-10 rounded-lg border-gray-300 pl-10",
                      errors.event_online_url && "border-red-500",
                    )}
                  />
                  <Globe
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                </div>
                {errors.event_online_url && (
                  <p className="text-red-500 text-xs">
                    {errors.event_online_url.message}
                  </p>
                )}
                </div>}
              </div>
            )}
          </div>
        )}

        {/* Event-specific fields - Only show for events */}
        {listingType === "event" && (
          <div className="space-y-6 pt-4 border-t">
            <h3 className="text-lg font-semibold">Event Ticketing</h3>

            <div className="space-y-1">
              <label className="font-medium text-sm">Attendance <span className="text-red-500">*</span></label>
              <Controller name="attendance_type" control={control} render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value ?? ""}><SelectTrigger><SelectValue placeholder="Choose registration or ticket option" /></SelectTrigger><SelectContent><SelectItem value="free_no_registration">Free — no registration</SelectItem><SelectItem value="free_registration_required">Free — registration required</SelectItem><SelectItem value="paid">Paid</SelectItem><SelectItem value="tickets_coming_soon">Tickets coming soon</SelectItem></SelectContent></Select>
              )} />
              {errors.attendance_type && <p className="text-red-500 text-xs">{errors.attendance_type.message}</p>}
            </div>

            {attendanceType === "free_registration_required" && <div className="space-y-1"><label className="font-medium text-sm">Registration URL <span className="text-red-500">*</span></label><Input {...register("registration_url")} placeholder="https://..." />{errors.registration_url && <p className="text-red-500 text-xs">{errors.registration_url.message}</p>}</div>}
            {attendanceType === "tickets_coming_soon" && <div className="space-y-1"><label className="font-medium text-sm">Public ticket availability message <span className="text-red-500">*</span></label><textarea {...register("ticket_availability_message")} className="min-h-24 w-full rounded-md border p-3 text-sm" placeholder="Tickets will be released in September." />{errors.ticket_availability_message && <p className="text-red-500 text-xs">{errors.ticket_availability_message.message}</p>}</div>}

            {/* Event Price & Currency */}
            {attendanceType === "paid" && <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="font-medium text-sm">
                  Ticket Price{" "}
                  <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <div className="flex">
                  <Controller
                    name="event_currency"
                    control={control}
                    render={({ field }) => (
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        defaultValue={field.value}
                      >
                        <SelectTrigger className="py-[19px] rounded-l-lg rounded-r-none border-r border-gray-300 px-2 text-gray-800 w-[100px]">
                          <SelectValue placeholder="Currency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="GHS">GHS</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="GBP">GBP</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <Input
                    {...register("event_price")}
                    placeholder="e.g., 50 or Free"
                    type="number"
                    className={cn(
                      "h-10 rounded-r-lg rounded-l-none border-l-0 border-gray-300 px-4 text-gray-800 hide-spinner [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none flex-1",
                      errors.event_price && "border-red-500",
                    )}
                  />
                </div>
                {errors.event_price && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.event_price.message}
                  </p>
                )}
              </div>

              {/* Ticket URL */}
              <div className="space-y-1">
                <label className="font-medium text-sm">
                  Ticket Purchase URL{" "}
                  <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <Input
                  {...register("event_ticket_url")}
                  placeholder="www.example.com/tickets"
                  type="url"
                  className="h-10 rounded-lg border-gray-300 px-4 text-gray-800"
                />
                {errors.event_ticket_url && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.event_ticket_url.message}
                  </p>
                )}
              </div>
            </div>}
          </div>
        )}
      </form>
    );
  },
);

BusinessDetailsForm.displayName = "BusinessDetailsForm";

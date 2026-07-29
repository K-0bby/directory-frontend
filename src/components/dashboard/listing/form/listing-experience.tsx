"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import { AddressAutofill, AddressMinimap } from "@mapbox/search-js-react";
import type { Feature, GeoJsonProperties, Point } from "geojson";
import { countries as countryCatalog } from "country-data-list";
import { toast } from "sonner";
import {
  BusinessHoursSelector,
  DaySchedule,
} from "@/components/dashboard/listing/business-hours";
import { ListingFormHandle } from "@/components/dashboard/listing/types";
import { Button } from "@/components/ui/button";
import { Country, CountryDropdown } from "@/components/ui/country-dropdown";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  ListingExperienceValidationError,
  updateListingExperience,
} from "@/lib/api";
import { parseMapboxAddress } from "@/lib/directory/utils";

interface Props {
  listingType: "business" | "event" | "community";
  listingSlug: string;
}
type Errors = Record<string, string>;
type Presence = "physical" | "online" | "hybrid";
type Reach = "single_country" | "selected_countries" | "worldwide";
type HoursMode =
  | "scheduled"
  | "always_open"
  | "appointment_only"
  | "contact_for_hours";
type Scope = "physical" | "online" | "hybrid" | "global";
type ServiceCountry = { code: string; name: string };

const defaultHours: DaySchedule[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
].map((day) => ({
  day_of_week: day,
  startTime: "09:00",
  endTime: "17:00",
  enabled: day !== "Saturday" && day !== "Sunday",
}));

export const ListingExperienceForm = forwardRef<ListingFormHandle, Props>(
  ({ listingType, listingSlug }, ref) => {
    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "";
    const [presence, setPresence] = useState<Presence>("physical");
    const [reach, setReach] = useState<Reach>("single_country");
    const [hoursMode, setHoursMode] = useState<HoursMode>("scheduled");
    const [scope, setScope] = useState<Scope>("physical");
    const [participation, setParticipation] = useState("");
    const [serviceCountries, setServiceCountries] = useState<ServiceCountry[]>(
      [],
    );
    const [country, setCountry] = useState("");
    const [countryCode, setCountryCode] = useState("");
    const [city, setCity] = useState("");
    const [address, setAddress] = useState("");
    const [coordinates, setCoordinates] = useState<{
      lat: number | null;
      lng: number | null;
    }>({ lat: null, lng: null });
    const [feature, setFeature] = useState<Feature<Point, GeoJsonProperties>>();
    const [hours, setHours] = useState<DaySchedule[]>(defaultHours);
    const [hasBaseLocation, setHasBaseLocation] = useState(false);
    const [mapboxUnavailable, setMapboxUnavailable] = useState(false);
    const [errors, setErrors] = useState<Errors>({});
    const needsFullAddress =
      listingType === "business"
        ? presence === "physical" || presence === "hybrid"
        : scope === "physical" || scope === "hybrid";
    const showLocation =
      listingType === "business" || needsFullAddress || hasBaseLocation;

    const selectableServiceCountries = useMemo(
      () =>
        countryCatalog.all.filter(
          (item: Country) =>
            item.emoji &&
            item.status !== "deleted" &&
            item.ioc !== "PRK" &&
            item.name !== country &&
            !serviceCountries.some((selected) => selected.code === item.alpha2),
        ),
      [country, serviceCountries],
    );

    useEffect(() => {
      if (!listingSlug) return;
      const token = localStorage.getItem("authToken");
      fetch(`/api/listing/${listingSlug}/show`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      })
        .then((response) => (response.ok ? response.json() : null))
        .then((payload) => {
          const data = payload?.data ?? payload;
          if (!data) return;
          if (data.business_presence_type)
            setPresence(data.business_presence_type);
          if (data.business_service_reach)
            setReach(data.business_service_reach);
          if (data.business_hours_mode) setHoursMode(data.business_hours_mode);
          if (data.community_location_scope)
            setScope(data.community_location_scope);
          setParticipation(data.community_participation_method ?? "");
          setServiceCountries(data.service_countries ?? []);
          setAddress(data.address ?? "");
          setCity(data.city ?? "");
          const savedCountry = data.country ?? "";
          setCountry(savedCountry);
          const catalogCountry = countryCatalog.all.find(
            (item: Country) => item.name === savedCountry,
          );
          setCountryCode(catalogCountry?.alpha2?.toLowerCase() ?? "");
          setHasBaseLocation(
            Boolean(data.address || data.city || data.country),
          );
          if (data.latitude != null && data.longitude != null) {
            const lat = Number(data.latitude);
            const lng = Number(data.longitude);
            setCoordinates({ lat, lng });
            setFeature({
              type: "Feature",
              geometry: { type: "Point", coordinates: [lng, lat] },
              properties: {
                name: data.address ?? data.name ?? "Selected location",
              },
            });
          }
          if (Array.isArray(data.opening_hours))
            setHours(
              defaultHours.map((day) => {
                const found = data.opening_hours.find(
                  (item: { day_of_week: string }) =>
                    item.day_of_week === day.day_of_week,
                );
                return found
                  ? {
                      ...day,
                      enabled: true,
                      startTime: String(found.open_time).slice(0, 5),
                      endTime: String(found.close_time).slice(0, 5),
                    }
                  : { ...day, enabled: false };
              }),
            );
        })
        .catch(() => toast.error("Could not load this step."));
    }, [listingSlug]);

    const clearError = (field: string) =>
      setErrors((current) => {
        if (!current[field]) return current;
        const next = { ...current };
        delete next[field];
        return next;
      });
    const setLocationCountry = (selected: Country) => {
      if (selected.name !== country) {
        setAddress("");
        setCity("");
        setCoordinates({ lat: null, lng: null });
        setFeature(undefined);
      }
      setCountry(selected.name);
      setCountryCode(selected.alpha2.toLowerCase());
      clearError("country");
      setServiceCountries((items) =>
        items.filter((item) => item.name !== selected.name),
      );
    };
    const handleRetrieve = (result: {
      features?: Feature<Point, GeoJsonProperties>[];
    }) => {
      const selected = result.features?.[0];
      if (!selected) return;
      const parsed = parseMapboxAddress(selected);
      setFeature(selected);
      setMapboxUnavailable(false);
      setAddress(parsed.fullAddress);
      if (parsed.city) setCity(parsed.city);
      if (parsed.country) setCountry(parsed.country);
      setCoordinates({ lat: parsed.lat, lng: parsed.lng });
      ["address", "city", "country"].forEach(clearError);
    };
    const editAddress = (value: string) => {
      setAddress(value);
      setCoordinates({ lat: null, lng: null });
      setFeature(undefined);
      clearError("address");
    };
    const validate = () => {
      const next: Errors = {};
      if (listingType === "business" && !presence)
        next.business_presence_type = "Choose how this business operates.";
      if (showLocation && !country.trim()) next.country = "Select a country.";
      if (showLocation && !city.trim()) next.city = "Enter a city.";
      if (needsFullAddress && !address.trim())
        next.address = "Select or enter an address.";
      if (
        listingType === "business" &&
        reach === "selected_countries" &&
        serviceCountries.length === 0
      )
        next.service_countries =
          "Select at least one additional service country.";
      if (listingType === "business" && hoursMode === "scheduled") {
        const enabled = hours.filter((day) => day.enabled);
        if (enabled.length === 0)
          next.opening_hours =
            "Add at least one day of scheduled opening hours.";
      }
      if (listingType === "community" && !participation.trim())
        next.community_participation_method =
          "Explain how people can join, attend, contact, or follow this community.";
      setErrors(next);
      const first = Object.keys(next)[0];
      if (first)
        document
          .querySelector<HTMLElement>(`[data-experience-field="${first}"]`)
          ?.focus();
      return Object.keys(next).length === 0;
    };

    useImperativeHandle(ref, () => ({
      submit: async () => {
        if (!listingSlug || !validate()) return false;
        try {
          await updateListingExperience(
            listingSlug,
            listingType === "business"
              ? {
                  business_presence_type: presence,
                  business_service_reach: reach,
                  business_hours_mode: hoursMode,
                  service_countries:
                    reach === "selected_countries" ? serviceCountries : [],
                  address: address.trim() || null,
                  city: city.trim(),
                  country,
                  latitude: coordinates.lat,
                  longitude: coordinates.lng,
                  opening_hours:
                    hoursMode === "scheduled"
                      ? hours
                          .filter((day) => day.enabled)
                          .map((day) => ({
                            day_of_week: day.day_of_week,
                            open_time: day.startTime,
                            close_time: day.endTime,
                          }))
                      : [],
                }
              : {
                  community_location_scope: scope,
                  community_participation_method: participation.trim(),
                  has_base_location: showLocation,
                  address: showLocation ? address.trim() || null : null,
                  city: showLocation ? city.trim() : null,
                  country: showLocation ? country : null,
                  latitude: showLocation ? coordinates.lat : null,
                  longitude: showLocation ? coordinates.lng : null,
                },
            localStorage.getItem("authToken") ?? undefined,
          );
          setErrors({});
          toast.success("Step saved");
          return true;
        } catch (error) {
          if (error instanceof ListingExperienceValidationError) {
            const mapped = Object.fromEntries(
              Object.entries(error.errors).map(([key, messages]) => [
                key.replace(/\.\d+\..*/, ""),
                messages[0],
              ]),
            );
            setErrors(mapped);
            const first = Object.keys(mapped)[0];
            if (first)
              document
                .querySelector<HTMLElement>(
                  `[data-experience-field="${first}"]`,
                )
                ?.focus();
            toast.error("Check the highlighted fields.");
          } else
            toast.error(
              error instanceof Error
                ? error.message
                : "Could not save this step. Retry when ready.",
            );
          return false;
        }
      },
    }));

    if (listingType === "event") return null;
    return (
      <div className="mx-auto w-full max-w-3xl space-y-7 p-0.5 lg:p-6">
        <div>
          <h2 className="text-2xl font-semibold">
            {listingType === "business"
              ? "Location & operations"
              : "Reach & participation"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {listingType === "business"
              ? "Tell customers where you are based, where you serve, and when you are available."
              : "Explain where the community is based and how people participate."}
          </p>
        </div>
        {listingType === "business" ? (
          <Field
            label="Operating presence"
            error={errors.business_presence_type}
          >
            <div data-experience-field="business_presence_type" tabIndex={-1}>
              <Select
                value={presence}
                onValueChange={(value) => {
                  setPresence(value as Presence);
                  clearError("business_presence_type");
                }}
              >
                <SelectTrigger
                  className={cn(
                    "w-full",
                    errors.business_presence_type && "border-red-500",
                  )}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="physical">Physical</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="hybrid">Physical and online</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Field>
        ) : (
          <Field
            label="Community scope"
            error={errors.community_location_scope}
          >
            <Select
              value={scope}
              onValueChange={(value) => {
                const next = value as Scope;
                setScope(next);
                if (next === "physical" || next === "hybrid")
                  setHasBaseLocation(true);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="physical">Physical</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
                <SelectItem value="global">Global</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        )}
        {listingType === "community" && !needsFullAddress && (
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label htmlFor="base-location">Add a base location</Label>
              <p className="text-sm text-muted-foreground">
                Optional for online and global communities.
              </p>
            </div>
            <Switch
              id="base-location"
              checked={hasBaseLocation}
              onCheckedChange={(checked) => {
                setHasBaseLocation(checked);
                if (!checked) {
                  setAddress("");
                  setCity("");
                  setCountry("");
                  setCountryCode("");
                  setCoordinates({ lat: null, lng: null });
                  setFeature(undefined);
                }
              }}
            />
          </div>
        )}
        {showLocation && (
          <section className="space-y-4 rounded-xl border p-4">
            <h3 className="font-medium">
              {listingType === "business"
                ? "Headquarters or business base"
                : "Community base"}
            </h3>
            <Field label="Country" error={errors.country}>
              <div data-experience-field="country" tabIndex={-1}>
                <CountryDropdown
                  defaultValue={country}
                  onChange={setLocationCountry}
                  placeholder="Search for a country"
                  className={cn(
                    "rounded-lg",
                    errors.country && "border-red-500",
                  )}
                />
              </div>
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label={needsFullAddress ? "Address" : "Address (optional)"}
                error={errors.address}
              >
                <div data-experience-field="address" tabIndex={-1}>
                  {mapboxToken && countryCode ? (
                    <AddressAutofill
                      accessToken={mapboxToken}
                      options={{ country: countryCode }}
                      popoverOptions={{
                        placement: "bottom-start",
                        flip: true,
                        offset: 6,
                      }}
                      onSuggestError={() => setMapboxUnavailable(true)}
                      onRetrieve={handleRetrieve}
                    >
                      <Input
                        name="address"
                        autoComplete="shipping address-line1"
                        value={address}
                        onChange={(event) => editAddress(event.target.value)}
                        aria-invalid={!!errors.address}
                        className={cn(errors.address && "border-red-500")}
                        placeholder="Search for an address"
                      />
                    </AddressAutofill>
                  ) : (
                    <Input
                      name="address"
                      disabled={!country}
                      value={address}
                      onChange={(event) => editAddress(event.target.value)}
                      placeholder={
                        country ? "Enter an address" : "Select a country first"
                      }
                    />
                  )}
                </div>
              </Field>
              <Field label="City" error={errors.city}>
                <Input
                  data-experience-field="city"
                  value={city}
                  onChange={(event) => {
                    setCity(event.target.value);
                    clearError("city");
                  }}
                  aria-invalid={!!errors.city}
                  className={cn(errors.city && "border-red-500")}
                  placeholder="e.g., Accra"
                />
              </Field>
            </div>
            {mapboxUnavailable && (
              <p className="text-sm text-amber-700">
                Address suggestions are unavailable. You can enter the address
                and city manually.
              </p>
            )}
            {feature && (
              <div className="h-36 overflow-hidden rounded-xl border">
                <AddressMinimap
                  show
                  feature={feature}
                  accessToken={mapboxToken}
                />
              </div>
            )}
          </section>
        )}
        {listingType === "business" ? (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="Service reach"
                error={errors.business_service_reach}
              >
                <Select
                  value={reach}
                  onValueChange={(value) => {
                    setReach(value as Reach);
                    clearError("service_countries");
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single_country">
                      Headquarters country only
                    </SelectItem>
                    <SelectItem value="selected_countries">
                      Selected additional countries
                    </SelectItem>
                    <SelectItem value="worldwide">Worldwide</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Availability" error={errors.business_hours_mode}>
                <Select
                  value={hoursMode}
                  onValueChange={(value) => {
                    setHoursMode(value as HoursMode);
                    clearError("opening_hours");
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Scheduled hours</SelectItem>
                    <SelectItem value="always_open">Always open</SelectItem>
                    <SelectItem value="appointment_only">
                      Appointment only
                    </SelectItem>
                    <SelectItem value="contact_for_hours">
                      Contact for hours
                    </SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            {reach === "selected_countries" && (
              <Field
                label="Additional service countries"
                error={errors.service_countries}
              >
                <div
                  data-experience-field="service_countries"
                  tabIndex={-1}
                  className="space-y-3 rounded-lg border p-4"
                >
                  <CountryDropdown
                    key={`${country}-${serviceCountries.length}`}
                    options={selectableServiceCountries}
                    onChange={(selected) => {
                      setServiceCountries((items) => [
                        ...items,
                        { code: selected.alpha2, name: selected.name },
                      ]);
                      clearError("service_countries");
                    }}
                    placeholder="Search and add a country"
                    className="rounded-lg"
                  />
                  <div className="flex flex-wrap gap-2">
                    {serviceCountries.map((selected) => (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        key={selected.code}
                        onClick={() =>
                          setServiceCountries((items) =>
                            items.filter((item) => item.code !== selected.code),
                          )
                        }
                      >
                        {selected.name} ×
                      </Button>
                    ))}
                  </div>
                </div>
              </Field>
            )}
            {hoursMode === "scheduled" && (
              <Field label="Scheduled hours" error={errors.opening_hours}>
                <div data-experience-field="opening_hours" tabIndex={-1}>
                  <BusinessHoursSelector
                    label=""
                    value={hours}
                    onChange={(value) => {
                      setHours(value);
                      clearError("opening_hours");
                    }}
                  />
                </div>
              </Field>
            )}
          </>
        ) : (
          <Field
            label="How can people participate?"
            error={errors.community_participation_method}
          >
            <textarea
              data-experience-field="community_participation_method"
              value={participation}
              onChange={(event) => {
                setParticipation(event.target.value);
                clearError("community_participation_method");
              }}
              className={cn(
                "min-h-32 w-full rounded-md border bg-background p-3 text-sm",
                errors.community_participation_method && "border-red-500",
              )}
              placeholder="Explain how people can join, attend, contact, or follow the community."
            />
          </Field>
        )}
      </div>
    );
  },
);
ListingExperienceForm.displayName = "ListingExperienceForm";

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

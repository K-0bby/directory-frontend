/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { SpinnerGap, CaretLeft, CaretRight, Eye } from "@phosphor-icons/react";
import { toast } from "sonner";

import { StepHeader } from "@/components/dashboard/listing/step-header";
import { StepNavigation } from "@/components/dashboard/listing/step-navigation";
import { Button } from "@/components/ui/button";
import { useListing } from "@/context/listing-form-context";
import { ListingFormHandle } from "@/components/dashboard/listing/types";
import { useRolePath } from "@/hooks/useRolePath";
import { LISTING_JOURNEYS } from "@/lib/listing-form-v2";
import { updateListingFormProgress } from "@/lib/api";

// Child Forms
import { BasicInformationForm } from "@/components/dashboard/listing/form/basic-info";
import { MediaUploadStep } from "@/components/dashboard/listing/form/media";
import { SocialMediaForm } from "@/components/dashboard/listing/form/social-media";
import { ReviewSubmitStep } from "@/components/dashboard/listing/form/review";
import { ListingExperienceForm } from "@/components/dashboard/listing/form/listing-experience";
import { EventStepForm } from "@/components/dashboard/listing/form/event-step";
import { EventContactSocialStep } from "@/components/dashboard/listing/form/event-contact-social";
import {
  ListingDirtyGuard,
  useBeforeUnloadWhenDirty,
} from "@/components/dashboard/listing/listing-dirty-guard";

// --- Local Interfaces to fix 'any' errors ---
interface ApiCategory {
  id: string | number;
  name: string;
}

interface ApiHour {
  day_of_week: string;
  open_time: string;
  close_time: string;
}

interface ApiMedia {
  id?: number;
  original: string;
  thumb?: string;
  webp?: string;
  kind: "image" | "video";
  role: "cover" | "gallery";
  position: number | null;
  mime_type?: string;
}

const EDIT_STORAGE_KEY = "listing-edit-step";

export default function EditListingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { myListings } = useRolePath();

  const context = useListing();
  const {
    listingType,
    currentStep,
    setCurrentStep,
    setListingType,
    setBasicInfo,
    setBusinessDetails,
    setMedia,
    // Socials (Handle safely if context is old)
    setSocials = (context as any).setSocials || (context as any).setSocialMedia,
  } = context;

  const [listingSlug, setListingSlug] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [stepIsValid, setStepIsValid] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [pendingStep, setPendingStep] = useState<number | null>(null);
  const [pendingSkip, setPendingSkip] = useState(false);
  const [lastSaveFailed, setLastSaveFailed] = useState(false);
  useBeforeUnloadWhenDirty(dirty);

  const formRef = useRef<ListingFormHandle>(null);
  const initialized = useRef(false);
  const [isReady, setIsReady] = useState(false);

  // Persist step — only after init has restored the step
  useEffect(() => {
    if (isReady && listingSlug) {
      sessionStorage.setItem(
        EDIT_STORAGE_KEY,
        JSON.stringify({ currentStep, listingSlug }),
      );
    }
  }, [currentStep, listingSlug, isReady]);

  // --- 1. Initialize & Fetch Data ---
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const initPage = async () => {
      const type = searchParams.get("type");
      const slug = searchParams.get("slug");

      if (!slug) {
        toast.error("No listing identifier found");
        router.push(myListings);
        return;
      }

      setListingSlug(slug);

      try {
        const stored = JSON.parse(
          sessionStorage.getItem(EDIT_STORAGE_KEY) || "{}",
        );
        if (stored.listingSlug === slug && stored.currentStep > 1) {
          setCurrentStep(stored.currentStep);
        }
      } catch {
        /* ignore */
      }

      if (type === "business" || type === "event" || type === "community") {
        setListingType(type);
      }

      // Fetch Data
      try {
        setIsFetching(true);
        const token = localStorage.getItem("authToken");

        const response = await fetch(`/api/listing/${slug}/show`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });

        if (!response.ok) throw new Error("Failed to load listing data");

        const json = await response.json();
        const data = json.data || json;

        // --- MAP API DATA TO CONTEXT ---

        // Convert ISO country code (e.g., "GH") to dial code (e.g., "+233") for phone input
        const countryCodeToDialCode: Record<string, string> = {
          GH: "+233",
          NG: "+234",
          KE: "+254",
          US: "+1",
          UK: "+44",
        };

        const getDialCode = (isoCode: string | null) => {
          if (!isoCode) return "+44";
          return countryCodeToDialCode[isoCode] || `+${isoCode}`;
        };

        setBasicInfo({
          name: data.name,
          category_ids:
            data.categories?.map((c: ApiCategory) => String(c.id)) || [],
          description: data.bio || data.description,
          type: data.type,
          primary_phone: data.primary_phone || "",
          primary_country_code: getDialCode(data.primary_country_code),
          secondary_phone: data.secondary_phone || "",
          secondary_country_code: data.secondary_phone
            ? getDialCode(data.secondary_country_code)
            : "",
          email: data.email,
          website: data.website,
          business_reg_num: data.business_reg_num,
          bio: data.bio,
        } as any);

        // 2. Business Details & Hours
        const mapApiHoursToUi = (apiHours: ApiHour[]) => {
          const days = [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday",
          ];
          return days.map((day) => {
            const found = apiHours?.find((h) => h.day_of_week === day);
            return {
              day_of_week: day,
              startTime: found?.open_time || "09:00",
              endTime: found?.close_time || "17:00",
              enabled: !!found,
            };
          });
        };

        setBusinessDetails({
          // For events, map from event-specific field names, otherwise use standard names
          address:
            data.type === "event"
              ? data.event_venue || data.address || ""
              : data.address,
          country:
            data.type === "event"
              ? data.event_country || data.country || ""
              : data.country,
          city:
            data.type === "event"
              ? data.event_city || data.city || ""
              : data.city,
          google_plus_code: data.google_plus_code,
          businessHours: mapApiHoursToUi(data.opening_hours || []),
          // Event-specific fields (some APIs nest these under data.event)
          event_price: data.event?.event_price ?? data.event_price ?? "",
          event_currency:
            data.event?.event_currency ?? data.event_currency ?? "",
          event_ticket_url:
            data.event?.event_ticket_url ?? data.event_ticket_url ?? "",
          event_online_url:
            data.event?.event_online_url ?? data.event_online_url ?? "",
          event_start_date:
            data.event?.event_start_date ?? data.event_start_date ?? "",
          event_end_date:
            data.event?.event_end_date ?? data.event_end_date ?? "",
          event_start_time:
            data.event?.event_start_time ?? data.event_start_time ?? "",
          event_end_time:
            data.event?.event_end_time ?? data.event_end_time ?? "",
          event_location:
            data.event?.event_location_type ??
            data.event_location_type ??
            data.event_location ??
            "",
        } as any);

        // 3. Social Media
        if (data.socials && setSocials) {
          setSocials({
            facebook: data.socials.facebook || "",
            twitter: data.socials.twitter || "",
            instagram: data.socials.instagram || "",
            linkedin: data.socials.linkedin || "",
            youtube: data.socials.youtube || "",
            tiktok: data.socials.tiktok || "",
            whatsapp: data.socials.whatsapp || "",
          });
        }

        // 4. Media — use explicit roles from the canonical response. Cover
        // status must never be inferred from the compatibility image array.
        const mapMedia = (item: ApiMedia) => ({
          id: item.id,
          original: item.original,
          url: item.original,
          name: item.original.split("/").pop() || "existing-media",
          kind: item.kind,
          role: item.role,
          position: item.position,
          mime_type: item.mime_type,
        });

        const coverPhoto = data.cover?.original
          ? mapMedia(data.cover as ApiMedia)
          : null;
        const galleryItems = Array.isArray(data.gallery)
          ? (data.gallery as ApiMedia[])
              .filter((item) => !!item.original)
              .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
              .map(mapMedia)
          : [];

        setMedia({ coverPhoto, images: galleryItems });
      } catch (error) {
        console.error("Fetch error:", error);
        toast.error("Could not load listing details");
      } finally {
        setIsFetching(false);
        setIsReady(true);
      }
    };

    initPage();
  }, [
    searchParams,
    router,
    setListingType,
    setCurrentStep,
    setBasicInfo,
    setBusinessDetails,
    setMedia,
    setSocials,
    myListings,
  ]);

  const totalSteps = LISTING_JOURNEYS[listingType].length;

  // --- 2. Navigation Handlers ---

  const handleNext = async () => {
    // If on Review Step (Final Step)
    if (currentStep === totalSteps) {
      if (formRef.current) {
        setIsSaving(true);
        try {
          const completed = await formRef.current.submit();
          if (completed) {
            setDirty(false);
            router.push(myListings);
          }
        } catch (e) {
          console.error(e);
        } finally {
          setIsSaving(false);
        }
      }
      return;
    }

    if (!formRef.current) return;

    setIsSaving(true);
    try {
      const result = await formRef.current.submit();

      if (result) {
        setLastSaveFailed(false);
        setDirty(false);
        if (
          currentStep === 1 &&
          typeof result === "object" &&
          result !== null &&
          "slug" in result
        ) {
          setListingSlug((result as { slug: string }).slug);
        }
        const step = LISTING_JOURNEYS[listingType][currentStep - 1];
        if (step) {
          await updateListingFormProgress(
            listingSlug,
            step.key,
            "complete",
            localStorage.getItem("authToken") ?? undefined,
          ).catch(() => undefined);
        }
        setCurrentStep(currentStep + 1);
      } else {
        setLastSaveFailed(true);
      }
    } catch (error) {
      console.error("Step submission failed", error);
      setLastSaveFailed(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    const prev = Math.max(1, currentStep - 1);
    handleStepClick(prev);
  };

  const handleStepClick = (step: number) => {
    if (dirty) {
      setPendingStep(step);
      return;
    }
    if (step > 2) setStepIsValid(true);
    setCurrentStep(step);
  };

  const skipOptionalStep = async () => {
    const step = LISTING_JOURNEYS[listingType][currentStep - 1];
    if (!step?.optional || !listingSlug) return;

    if (dirty) {
      setPendingSkip(true);
      setPendingStep(currentStep + 1);
      return;
    }

    setIsSaving(true);
    try {
      await updateListingFormProgress(
        listingSlug,
        step.key,
        "optional",
        localStorage.getItem("authToken") ?? undefined,
      );
      setCurrentStep(currentStep + 1);
    } catch {
      toast.error("Could not skip this step. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const stayAndSave = async () => {
    if (!formRef.current) return;
    setIsSaving(true);
    try {
      const saved = await formRef.current.submit();
      if (saved) {
        setDirty(false);
        setPendingStep(null);
        setPendingSkip(false);
        toast.success("Changes saved. You can continue editing this step.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  // --- 3. Render Helpers ---

  const renderStep = () => {
    const commonProps = {
      ref: formRef,
      listingType,
      listingSlug,
    };

    switch (currentStep) {
      case 1:
        return (
          <BasicInformationForm
            {...commonProps}
            onValidityChange={setStepIsValid}
          />
        );
      case 2:
        return listingType === "event" ? (
          <EventStepForm
            ref={formRef}
            listingSlug={listingSlug}
            section="schedule"
          />
        ) : listingType === "community" ? (
          <ListingExperienceForm {...commonProps} />
        ) : (
          <ListingExperienceForm {...commonProps} />
        );
      case 3:
        return listingType === "event" ? (
          <EventStepForm
            ref={formRef}
            listingSlug={listingSlug}
            section="access"
          />
        ) : (
          <SocialMediaForm {...commonProps} />
        );
      case 4:
        return listingType === "event" ? (
          <EventStepForm
            ref={formRef}
            listingSlug={listingSlug}
            section="tickets"
          />
        ) : (
          <MediaUploadStep {...commonProps} />
        );
      case 5:
        return listingType === "event" ? (
          <MediaUploadStep {...commonProps} />
        ) : (
          <ReviewSubmitStep
            listingSlug={listingSlug}
            ref={formRef}
            onEditStep={handleStepClick}
          />
        );
      case 6:
        return listingType === "event" ? (
          <EventContactSocialStep listingSlug={listingSlug} ref={formRef} />
        ) : null;
      case 7:
        return listingType === "event" ? (
          <ReviewSubmitStep
            listingSlug={listingSlug}
            ref={formRef}
            onEditStep={handleStepClick}
          />
        ) : null;
      default:
        return null;
    }
  };

  if (isFetching) {
    return (
      <div className="flex h-[80vh] w-full items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <SpinnerGap className="h-8 w-8 animate-spin text-[#93C01F]" />
          <p className="text-gray-500 text-sm">Loading listing details...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <StepHeader
        currentStep={currentStep}
        totalSteps={totalSteps}
        title={`Edit ${
          listingType
            ? listingType.charAt(0).toUpperCase() + listingType.slice(1)
            : "Listing"
        }`}
        subtitle="Update your listing information"
      />
      <div className="border-b border-gray-100" />

      <div className="grid grid-cols-1 lg:grid-cols-3 md:px-4 lg:px-0">
        <aside className="block shrink-0 border-r border-gray-100 h-auto lg:h-[550px]">
          <div className="sticky top-0 space-y-4 mx-8 py-6">
            <div className="hidden lg:block">
              <StepNavigation
                currentStep={currentStep}
                onStepClick={handleStepClick}
                listingType={listingType}
                unlockedStep={totalSteps}
              />
            </div>
          </div>
        </aside>

        {/* min-h-[100dvh] guarantees this column is always at least one full
            viewport tall, so the sticky footer below lands at the true
            bottom of the screen even on a short step, instead of floating
            wherever the (short) step content happens to end. It stays
            scoped to this column's own width — unlike `position: fixed`,
            which is relative to the viewport and would ignore the outer
            dashboard sidebar and bleed under it. */}
        <div
          className="w-full col-span-1 lg:col-span-2 px-4 lg:px-0 pt-6 flex min-h-dvh flex-col"
          onInputCapture={() => setDirty(true)}
          onChangeCapture={() => setDirty(true)}
        >
          <div className="flex-1 pb-6">{renderStep()}</div>

          <div className="bottom-0 z-40 -mx-4 lg:mx-0 border-t border-gray-100 px-4 py-4 lg:px-8 lg:py-6">
            <div className="flex items-center justify-between">
              <div>
                {currentStep > 1 && (
                  <Button
                    variant="outline"
                    onClick={handleBack}
                    disabled={isSaving}
                    className="w-24"
                  >
                    <CaretLeft className="w-4 h-4 mr-1" /> Back
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {currentStep === totalSteps && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => formRef.current?.openPreview?.()}
                  >
                    <Eye className="w-4 h-4 mr-1" /> Preview as visitor
                  </Button>
                )}
                {LISTING_JOURNEYS[listingType][currentStep - 1]?.optional && (
                  <Button
                    variant="outline"
                    onClick={skipOptionalStep}
                    disabled={isSaving}
                  >
                    Skip for now
                  </Button>
                )}
                <Button
                  onClick={handleNext}
                  disabled={isSaving || (currentStep === 1 && !stepIsValid)}
                  className="bg-[#93C01F] hover:bg-[#82ab1b] text-white min-w-[140px] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <>
                      <SpinnerGap className="w-4 h-4 animate-spin mr-2" />
                      Saving...
                    </>
                  ) : currentStep === totalSteps ? (
                    "Update Listing"
                  ) : (
                    <>
                      {lastSaveFailed ? "Retry save" : "Save & Continue"}{" "}
                      <CaretRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <ListingDirtyGuard
        open={pendingStep !== null}
        saving={isSaving}
        onCancel={() => {
          setPendingStep(null);
          setPendingSkip(false);
        }}
        onStayAndSave={stayAndSave}
        onLeave={async () => {
          const next = pendingStep;
          const shouldSkip = pendingSkip;
          setDirty(false);
          setPendingStep(null);
          setPendingSkip(false);
          if (shouldSkip) {
            const step = LISTING_JOURNEYS[listingType][currentStep - 1];
            if (!step || !listingSlug) return;
            setIsSaving(true);
            try {
              await updateListingFormProgress(
                listingSlug,
                step.key,
                "optional",
                localStorage.getItem("authToken") ?? undefined,
              );
              if (next !== null) setCurrentStep(next);
            } catch {
              toast.error("Could not skip this step. Please try again.");
            } finally {
              setIsSaving(false);
            }
          } else if (next !== null) setCurrentStep(next);
        }}
      />
    </>
  );
}

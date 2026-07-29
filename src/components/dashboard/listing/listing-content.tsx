"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { SpinnerGap, CaretLeft, CaretRight, Eye } from "@phosphor-icons/react";

import { StepHeader } from "@/components/dashboard/listing/step-header";
import { StepNavigation } from "@/components/dashboard/listing/step-navigation";
import { Button } from "@/components/ui/button";
import { useListing } from "@/context/listing-form-context";
import { ListingFormHandle } from "@/components/dashboard/listing/types";
import { useRolePath } from "@/hooks/useRolePath";
import {
  LISTING_JOURNEYS,
  ListingReadiness,
  ListingStepState,
} from "@/lib/listing-form-v2";
import { updateListingFormProgress } from "@/lib/api";
import { toast } from "sonner";

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

const STORAGE_KEY = "listing-form-draft";

export default function ListingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { myListings } = useRolePath();
  const {
    listingType,
    currentStep,
    setCurrentStep,
    setListingType,
    resetListing,
  } = useListing();

  const [listingSlug, setListingSlug] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [unlockedStep, setUnlockedStep] = useState(1);
  const [stepStates, setStepStates] = useState<
    Record<string, ListingStepState>
  >({});
  const [dirty, setDirty] = useState(false);
  const [pendingStep, setPendingStep] = useState<number | null>(null);
  const [pendingSkip, setPendingSkip] = useState(false);
  const [lastSaveFailed, setLastSaveFailed] = useState(false);
  const initialName = searchParams.get("slug")
    ? ""
    : (searchParams.get("name") ?? "");
  const totalSteps = LISTING_JOURNEYS[listingType].length;
  useBeforeUnloadWhenDirty(dirty);

  // ONE Ref to control whichever child form is currently active
  const formRef = useRef<ListingFormHandle>(null);

  // --- Persist currentStep + listingSlug to sessionStorage ---
  useEffect(() => {
    if (listingSlug && currentStep >= 1) {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ currentStep, listingSlug, listingType }),
      );
    }
  }, [currentStep, listingSlug, listingType]);

  // --- Initialization: restore or start fresh ---
  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const type = searchParams.get("type");
    const slug = searchParams.get("slug");

    if (type === "business" || type === "event" || type === "community") {
      setListingType(type);
    }

    if (slug) {
      // URL has a slug → continuing/editing or refreshing mid-creation
      setListingSlug(slug);
      try {
        const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "{}");
        // Restore step only if the stored slug matches this listing
        if (stored.listingSlug === slug && stored.currentStep > 1) {
          setCurrentStep(stored.currentStep);
          setUnlockedStep(stored.currentStep);
        }
      } catch {
        /* ignore parse errors */
      }
      const token = localStorage.getItem("authToken");
      fetch(`/api/listing/${slug}/show`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      })
        .then((response) => (response.ok ? response.json() : null))
        .then((payload) => {
          const readiness = (payload?.data?.submission_readiness ??
            payload?.submission_readiness) as ListingReadiness | undefined;
          if (!readiness) return;
          const states = Object.fromEntries(
            readiness.step_states.map((item) => [item.step, item.state]),
          );
          setStepStates(states);
          const firstIncomplete = readiness.step_states.findIndex(
            (item) =>
              item.state === "needs_attention" || item.state === "not_started",
          );
          const resumeStep =
            firstIncomplete >= 0
              ? firstIncomplete + 1
              : LISTING_JOURNEYS[listingType].length;
          setUnlockedStep(Math.max(1, resumeStep));
          setCurrentStep(resumeStep);
        })
        .catch(() => undefined);
    } else {
      // No slug in URL → brand new listing, reset everything
      sessionStorage.removeItem(STORAGE_KEY);
      resetListing();
    }
  }, [searchParams, setListingType, setCurrentStep, resetListing, listingType]);

  const handleNext = async () => {
    if (currentStep === totalSteps) {
      if (formRef.current) {
        setIsSaving(true);
        const submitted = await formRef.current.submit();
        setIsSaving(false);
        if (submitted) {
          sessionStorage.removeItem(STORAGE_KEY);
          router.push(myListings);
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
        // Check for slug - could be in result.data or directly in result
        const resultObj = result as Record<string, unknown>;
        const slug =
          (resultObj.data as Record<string, unknown>)?.slug || resultObj.slug;

        if (currentStep === 1 && slug) {
          setListingSlug(slug as string);
          // Update URL to include slug so refresh works
          const params = new URLSearchParams(searchParams.toString());
          params.set("slug", slug as string);
          router.replace(`?${params.toString()}`);
        }

        const effectiveSlug =
          currentStep === 1 && slug ? String(slug) : listingSlug;
        const step = LISTING_JOURNEYS[listingType][currentStep - 1];
        if (effectiveSlug && step) {
          await updateListingFormProgress(
            effectiveSlug,
            step.key,
            "complete",
            localStorage.getItem("authToken") ?? undefined,
          ).catch(() => undefined);
          setStepStates((states) => ({ ...states, [step.key]: "complete" }));
        }

        // Fixed: Pass the new number value directly instead of a callback function
        setCurrentStep(currentStep + 1);
        setUnlockedStep((value) => Math.max(value, currentStep + 1));
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
    requestStep(Math.max(1, currentStep - 1));
  };

  const handleSaveDraft = async () => {
    if (!formRef.current || currentStep === totalSteps) return;
    setIsSaving(true);
    try {
      const saved = await formRef.current.submit();
      if (saved) {
        const step = LISTING_JOURNEYS[listingType][currentStep - 1];
        if (step)
          await updateListingFormProgress(
            listingSlug,
            step.key,
            "complete",
            localStorage.getItem("authToken") ?? undefined,
          ).catch(() => undefined);
        setDirty(false);
        toast.success("Draft saved");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const requestStep = (step: number) => {
    if (step > unlockedStep || step === currentStep) return;
    if (dirty) {
      setPendingStep(step);
      return;
    }
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
      setStepStates((states) => ({ ...states, [step.key]: "optional" }));
      setCurrentStep(currentStep + 1);
      setUnlockedStep((value) => Math.max(value, currentStep + 1));
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

  const renderStep = () => {
    const commonProps = {
      ref: formRef,
      listingType,
      listingSlug,
    };

    switch (currentStep) {
      case 1:
        return (
          <BasicInformationForm {...commonProps} initialName={initialName} />
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
            onEditStep={requestStep}
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
            onEditStep={requestStep}
          />
        ) : null;
      default:
        return null;
    }
  };

  return (
    <>
      <StepHeader
        currentStep={currentStep}
        totalSteps={totalSteps}
        title="Create Listing"
        subtitle="Follow the steps to publish"
      />
      <div className="border-b border-gray-100" />

      <div className="grid grid-cols-1 lg:grid-cols-3 md:px-4 lg:px-0">
        <aside className="block shrink-0 border-r border-gray-100 h-auto lg:h-[550px]">
          <div className="sticky top-0 space-y-4 mx-8 py-6">
            <div className="hidden lg:block">
              <StepNavigation
                currentStep={currentStep}
                onStepClick={requestStep}
                listingType={listingType}
                unlockedStep={unlockedStep}
                stepStates={stepStates}
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
          className="w-full col-span-1 lg:col-span-2 px-4 lg:px-0 flex min-h-dvh flex-col"
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
                {currentStep < totalSteps && listingSlug && (
                  <Button
                    variant="ghost"
                    onClick={handleSaveDraft}
                    disabled={isSaving}
                  >
                    Save draft
                  </Button>
                )}
                <Button
                  onClick={handleNext}
                  disabled={isSaving}
                  className="bg-[#93C01F] hover:bg-[#82ab1b] text-white min-w-[140px]"
                >
                  {isSaving ? (
                    <>
                      <SpinnerGap className="w-4 h-4 animate-spin mr-2" />
                      Saving...
                    </>
                  ) : currentStep === totalSteps ? (
                    "Submit for review"
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
              setStepStates((states) => ({
                ...states,
                [step.key]: "optional",
              }));
              if (next !== null) {
                setCurrentStep(next);
                setUnlockedStep((value) => Math.max(value, next));
              }
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

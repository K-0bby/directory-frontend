"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

import { StepHeader } from "@/components/dashboard/listing/step-header";
import { StepNavigation } from "@/components/dashboard/listing/step-navigation";
import { Button } from "@/components/ui/button";
import { useListing } from "@/context/listing-form-context";

// Child Forms
import { BasicInformationForm } from "./form-component/basic-info";
import { BusinessDetailsForm } from "./form-component/business-details";
import { MediaUploadStep } from "./form-component/media";
import { SocialMediaForm } from "./form-component/social-media";
import { ReviewSubmitStep } from "./form-component/review";

export interface ListingFormHandle {
  submit: () => Promise<unknown | boolean>;
}

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

interface ApiImage {
  media: string;
  id?: number;
}

export default function EditListingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const context = useListing();
  const {
    listingType,
    currentStep,
    setCurrentStep,
    setListingType,
    setBasicInfo,
    setBusinessDetails,
    setMedia,
    // Data retrieval
    basicInfo,
    businessDetails,
    
    // Socials (Handle safely if context is old)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    socials = (context as any).socials,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setSocials = (context as any).setSocials || (context as any).setSocialMedia,
  } = context;

  const [listingSlug, setListingSlug] = useState<string>("");
  const [listingId, setListingId] = useState<number | string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  const formRef = useRef<ListingFormHandle>(null);

  // --- 1. Initialize & Fetch Data ---
  useEffect(() => {
    const initPage = async () => {
      const type = searchParams.get("type");
      const slug = searchParams.get("slug");

      if (!slug) {
        toast.error("No listing identifier found");
        router.push("/dashboard/vendor/my-listing");
        return;
      }

      setListingSlug(slug);

      if (type === "business" || type === "event" || type === "community") {
        setListingType(type);
      }

      // Fetch Data
      try {
        setIsFetching(true);
        const token = localStorage.getItem("authToken");
        const API_URL = process.env.API_URL || "https://me-fie.co.uk";

        const response = await fetch(`${API_URL}/api/listing/${slug}/show`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });

        if (!response.ok) throw new Error("Failed to load listing data");

        const json = await response.json();
        const data = json.data || json;

        // Store the listing ID for form submissions
        if (data.id) {
          setListingId(data.id);
        }

        // --- MAP API DATA TO CONTEXT ---

        // console.log("📡 API Response for listing:", JSON.stringify(data, null, 2));

     
        // Convert ISO country code (e.g., "GH") to dial code (e.g., "+233") for phone input
        const countryCodeToDialCode: Record<string, string> = {
          GH: "+233",
          NG: "+234",
          KE: "+254",
          US: "+1",
          UK: "+44",
        };

        const getDialCode = (isoCode: string | null) => {
          if (!isoCode) return "+233";
          return countryCodeToDialCode[isoCode] || `+${isoCode}`;
        };

        setBasicInfo({
          name: data.name,
          category_ids: data.categories?.map((c: ApiCategory) => String(c.id)) || [],
          description: data.bio || data.description,
          type: data.type,
          primary_phone: data.primary_phone || "",
          primary_country_code: getDialCode(data.primary_country_code),
          secondary_phone: data.secondary_phone || "",
          secondary_country_code: data.secondary_phone ? getDialCode(data.secondary_country_code) : "",
          email: data.email,
          website: data.website,
          business_reg_num: data.business_reg_num,
          bio: data.bio,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);

        // 2. Business Details & Hours
        const mapApiHoursToUi = (apiHours: ApiHour[]) => {
          const days = [
            "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
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
        address: data.type === "event" ? (data.event_venue || data.address || "") : data.address,
        country: data.type === "event" ? (data.event_country || data.country || "") : data.country,
        city: data.type === "event" ? (data.event_city || data.city || "") : data.city,
        google_plus_code: data.google_plus_code,
        businessHours: mapApiHoursToUi(data.opening_hours || []),
        // Event-specific fields
        event_price: data.event_price || "",
        event_currency: data.event_currency || "",
        event_ticket_url: data.event_ticket_url || "",
        event_online_url: data.event_online_url || "",
        event_start_date: data.event_start_date || "",
        event_end_date: data.event_end_date || "",
        event_start_time: data.event_start_time || "",
        event_end_time: data.event_end_time || "",
        event_location: data.event_location || "",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

        // 3. Social Media
        if (data.socials && setSocials) {
          setSocials({
            facebook: data.socials.facebook || "",
            twitter: data.socials.twitter || "",
            instagram: data.socials.instagram || "",
            linkedin: data.socials.linkedin || "",
            tiktok: data.socials.tiktok || "",
          });
        }

        // 4. Media
        if (data.images) {
          const validImages = data.images.filter(
            (img: ApiImage) => img.media && !["processing", "failed"].includes(img.media)
          );

          if (validImages.length > 0) {
            // Map API images to the format expected by FileUploader (with url property)
            const mappedImages = validImages.map((img: ApiImage) => ({
              url: img.media,
              name: img.media.split('/').pop() || 'existing-image',
              id: img.id
            }));
            
            // First image is cover, rest are gallery
            const coverPhoto = mappedImages.length > 0 ? mappedImages[0] : null;
            const galleryImages = mappedImages.slice(1);
            
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (setMedia as any)((prev: any) => ({
              ...prev,
              coverPhoto: coverPhoto,
              images: galleryImages, 
            }));
          }
        }
      } catch (error) {
        console.error("Fetch error:", error);
        toast.error("Could not load listing details");
      } finally {
        setIsFetching(false);
      }
    };

    initPage();
  }, [searchParams, router, setListingType, setBasicInfo, setBusinessDetails, setMedia, setSocials]);

  // --- 2. Navigation Handlers ---

  const handleNext = async () => {
    // If on Review Step (Final Step)
    if (currentStep === 5) {
      if (formRef.current) {
        setIsSaving(true);
        try {
          await formRef.current.submit();
          toast.success("Listing published successfully!");
          router.push("/dashboard/vendor/my-listing");
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
        if (
          currentStep === 1 &&
          typeof result === "object" &&
          result !== null &&
          "slug" in result
        ) {
          setListingSlug((result as { slug: string }).slug);
        }
        setCurrentStep(currentStep + 1);
      }
    } catch (error) {
      console.error("Step submission failed", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    setCurrentStep(Math.max(1, currentStep - 1));
  };

  const handleStepClick = (step: number) => {
    setCurrentStep(step);
  };

  // --- 3. Render Helpers ---

  const renderStep = () => {
    const commonProps = {
      ref: formRef,
      listingType,
      listingSlug,
      listingId,
    };

    switch (currentStep) {
      case 1:
        // FIX: Pass populated context data to Child Form
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return <BasicInformationForm {...commonProps} initialData={basicInfo as any} />;
      case 2:
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return <BusinessDetailsForm {...commonProps} initialData={businessDetails as any} />;
      case 3:
        // Pass media data (URLs) so the component can show previews
        
        return <MediaUploadStep {...commonProps} />;
      case 4:
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return <SocialMediaForm {...commonProps} initialData={socials as any} />;
      case 5:
        return <ReviewSubmitStep listingSlug={listingSlug} ref={formRef} />;
      default:
        return null;
    }
  };

  if (isFetching) {
    return (
      <div className="flex h-[80vh] w-full items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-[#93C01F]" />
          <p className="text-gray-500 text-sm">Loading listing details...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <StepHeader
        currentStep={currentStep}
        totalSteps={5}
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
              />
            </div>
          </div>
        </aside>

        <div className="w-full col-span-1 lg:col-span-2 px-4 lg:px-0 pb-24 pt-6">
          {renderStep()}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 z-50 lg:static lg:border-t lg:bg-transparent lg:p-0 lg:mt-10">
        <div className="flex justify-between max-w-5xl mx-auto lg:px-8 lg:py-6">
          <div>
            {currentStep > 1 && (
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={isSaving}
                className="w-24"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>
            )}
          </div>

          <Button
            onClick={handleNext}
            disabled={isSaving}
            className="bg-[#93C01F] hover:bg-[#82ab1b] text-white min-w-[140px]"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Saving...
              </>
            ) : currentStep === 5 ? (
              "Update Listing"
            ) : (
              <>
                Save & Continue <ChevronRight className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </div>
    </>
  );
}

// WRAPPER TO FIX "useListing must be used within a ListingProvider" ERROR
// export default function EditListingPage() {
//   return (
//     <ListingProvider>
//       <EditListingContent />
//     </ListingProvider>
//   );
// }
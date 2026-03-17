"use client";

import { forwardRef, useEffect, useImperativeHandle } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Facebook, Instagram, Linkedin, Twitter, Globe } from "lucide-react";
import { toast } from "sonner";
// Import the shared handle type
import { ListingFormHandle } from "@/app/dashboard/vendor/my-listing/create/new-listing-content";

// --- Helper function to validate URL (allows without protocol) ---
const isValidUrl = (url: string): boolean => {
  if (!url) return true; // Empty is valid (optional field)
  // Allow URLs with or without protocol
  return /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w-./?%&=]*)?$/i.test(url);
};

// --- Helper function to normalize URL (add https:// if missing) ---
const normalizeUrl = (url: string): string => {
  if (!url) return "";
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return `https://${url}`;
  }
  return url;
};

/* ---------------------------------------------------
   SCHEMA
--------------------------------------------------- */
export const socialMediaSchema = z.object({
  facebook: z.string()
    .optional()
    .or(z.literal(""))
    .refine((val) => isValidUrl(val || ""), {
      message: "Invalid Facebook URL",
    }),
  instagram: z.string()
    .optional()
    .or(z.literal(""))
    .refine((val) => isValidUrl(val || ""), {
      message: "Invalid Instagram URL",
    }),
  twitter: z.string()
    .optional()
    .or(z.literal(""))
    .refine((val) => isValidUrl(val || ""), {
      message: "Invalid Twitter URL",
    }),
  linkedin: z.string()
    .optional()
    .or(z.literal(""))
    .refine((val) => isValidUrl(val || ""), {
      message: "Invalid LinkedIn URL",
    }),
  tiktok: z.string()
    .optional()
    .or(z.literal(""))
    .refine((val) => isValidUrl(val || ""), {
      message: "Invalid TikTok URL",
    }),
});

export type SocialMediaFormValues = z.infer<typeof socialMediaSchema>;

type Props = {
  listingSlug: string;
  listingType: "business" | "event" | "community";
  onSuccess?: () => void;
  initialData?: SocialMediaFormValues;
};

const socialPlatforms = [
  {
    id: "facebook",
    name: "Facebook",
    icon: Facebook,
    placeholder: "facebook.com/yourpage",
    color: "text-blue-600",
  },
  {
    id: "instagram",
    name: "Instagram",
    icon: Instagram,
    placeholder: "instagram.com/yourprofile",
    color: "text-pink-600",
  },
  {
    id: "twitter",
    name: "Twitter",
    icon: Twitter,
    placeholder: "twitter.com/yourhandle",
    color: "text-blue-400",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    icon: Linkedin,
    placeholder: "linkedin.com/company/yourcompany",
    color: "text-blue-700",
  },
  {
    id: "tiktok",
    name: "Tiktok",
    icon: Globe,
    placeholder: "tiktok.com/@yourprofile",
    color: "text-black",
  },
];

/* ---------------------------------------------------
   COMPONENT
--------------------------------------------------- */
export const SocialMediaForm = forwardRef<ListingFormHandle, Props>(
  function SocialMediaFormComponent(
    { listingSlug, listingType, onSuccess, initialData},
    ref
  ) {
    const {
      register,
      handleSubmit, // Still used for the <form> onSubmit
      formState: { errors },
      watch,
      trigger,
      getValues, // ✅ Added getValues to manually retrieve data
      reset, // Add reset to the destructuring
    } = useForm<SocialMediaFormValues>({
      
      resolver: zodResolver(socialMediaSchema),
      defaultValues: initialData || {
        facebook: "",
        instagram: "",
        twitter: "",
        linkedin: "",
        tiktok: "",
      },
    });

    useEffect(() => {
        if (initialData) {
            reset(initialData);
        }
    }, [initialData, reset]);

    // Watch all fields to show which ones have values
    const watchedValues = watch();

    const handleFormSubmit = async (data: SocialMediaFormValues) => {
      try {
        if (!listingSlug) {
          throw new Error("Listing ID is missing. Please restart the process.");
        }

        const token = localStorage.getItem("authToken");
        if (!token) {
          throw new Error("Authentication required");
        }

        // Filter out empty values and normalize URLs
        const normalizedData = Object.fromEntries(
          Object.entries(data).map(([key, value]) => [key, normalizeUrl(value || "")]).filter(
            ([, value]) => value && value.trim() !== ""
          )
        );

        const socialData = normalizedData;

        // If no social media links provided, just continue (Return TRUE)
        if (Object.keys(socialData).length === 0) {
          return true; 
        }

        const API_URL = process.env.API_URL || "https://me-fie.co.uk";
        // Ensure this endpoint matches your backend route exactly (/social vs /socials)
        const endpoint = `${API_URL}/api/listing/socials/${listingSlug}`;

        const response = await fetch(endpoint, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(socialData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.message || "Failed to save social media links"
          );
        }

        toast.success("Social media links saved successfully");
        if (onSuccess) onSuccess();
        
        return true; // ✅ Returns true on success
      } catch (error) {
        console.error("Social media save error:", error);
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to save social media links"
        );
        return false; // ❌ Returns false on failure
      }
    };

    // Expose submit method to parent via ref
    useImperativeHandle(ref, () => ({
      submit: async () => {
        // 1. Trigger Validation
        const isValid = await trigger();
        if (!isValid) {
          toast.error("Validation failed", {
            description: "Please check URL formats",
          });
          return false;
        }

        // 2. Get Data Manually
        const data = getValues();

        // 3. Call handler DIRECTLY (Not via handleSubmit)
        // This ensures the boolean return value is passed back to parent
        return await handleFormSubmit(data);
      },
    }));

    return (
      <div className="w-full max-w-5xl mx-auto p-0.5 lg:p-6 space-y-8">
        <div>
          <h2 className="text-2xl font-semibold">Social Media & Links</h2>
          <p className="text-sm text-gray-500 mt-1">
            {listingType === "business"
              ? "Connect your business social media profiles"
              : listingType === "event"
              ? "Connect your event social media profiles"
              : "Connect your community social media profiles"}
          </p>
        </div>

        {/* Used handleSubmit here just for standard form behavior (enter key) */}
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {socialPlatforms.map((platform) => {
              const Icon = platform.icon;
              const fieldValue =
                watchedValues[platform.id as keyof SocialMediaFormValues];
              const hasValue = fieldValue && fieldValue.trim() !== "";

              return (
                <div key={platform.id} className="space-y-2">
                  <label className="flex items-center gap-2 font-medium text-sm">
                    <Icon className={cn("w-4 h-4", platform.color)} />
                    {platform.name}
                  </label>
                  <div className="relative">
                    <Input
                      {...register(platform.id as keyof SocialMediaFormValues)}
                      type="url"
                      placeholder={platform.placeholder}
                      className={cn(
                        "h-10 rounded-lg border-gray-300 px-4 text-gray-800 placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-black",
                        errors[platform.id as keyof SocialMediaFormValues] &&
                          "border-red-500 focus-visible:ring-red-500"
                      )}
                    />
                    {hasValue && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                          <span className="text-green-600 text-xs">✓</span>
                        </div>
                      </div>
                    )}
                  </div>
                  {errors[platform.id as keyof SocialMediaFormValues] && (
                    <p className="text-red-500 text-xs mt-1">
                      {
                        errors[platform.id as keyof SocialMediaFormValues]
                          ?.message
                      }
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <span className="font-semibold">Tip:</span> Adding social media
              links helps customers connect with you on multiple platforms. You
              can leave fields empty if you don&apos;t have a presence on that
              platform.
            </p>
          </div>
        </form>
      </div>
    );
  }
);
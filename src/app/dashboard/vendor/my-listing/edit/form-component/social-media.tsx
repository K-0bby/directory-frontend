/* eslint-disable @typescript-eslint/no-unused-vars */

"use client";

import { forwardRef, useEffect, useImperativeHandle } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Facebook, Instagram, Linkedin, Twitter, Globe } from "lucide-react";
import { toast } from "sonner";
import { ListingFormHandle } from "@/app/dashboard/vendor/my-listing/create/new-listing-content";

/* --- Helper functions remain same --- */
const isValidUrl = (url: string): boolean => {
  if (!url) return true;
  return /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w-./?%&=]*)?$/i.test(url);
};

const normalizeUrl = (url: string): string => {
  if (!url) return "";
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return `https://${url}`;
  }
  return url;
};

/* --- SCHEMA remains same --- */
export const socialMediaSchema = z.object({
  facebook: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((val) => isValidUrl(val || ""), {
      message: "Invalid Facebook URL",
    }),
  instagram: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((val) => isValidUrl(val || ""), {
      message: "Invalid Instagram URL",
    }),
  twitter: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((val) => isValidUrl(val || ""), { message: "Invalid Twitter URL" }),
  linkedin: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((val) => isValidUrl(val || ""), {
      message: "Invalid LinkedIn URL",
    }),
  tiktok: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((val) => isValidUrl(val || ""), { message: "Invalid TikTok URL" }),
});

export type SocialMediaFormValues = z.infer<typeof socialMediaSchema>;

type Props = {
  listingId: number | string; // ✅ Use ID instead of slug for API
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

export const SocialMediaForm = forwardRef<ListingFormHandle, Props>(
  function SocialMediaFormComponent(
    { listingId, listingSlug, listingType, onSuccess, initialData },
    ref,
  ) {
    const {
      register,
      handleSubmit,
      formState: { errors },
      watch,
      trigger,
      getValues,
      reset,
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

    const watchedValues = watch();

    const handleFormSubmit = async (data: SocialMediaFormValues) => {
      try {
        // ✅ Check for listingId as the primary identifier
        if (!listingId) {
          throw new Error("Listing ID is missing. Please restart the process.");
        }

        const token = localStorage.getItem("authToken");
        if (!token) {
          throw new Error("Authentication required");
        }

        const normalizedData = Object.fromEntries(
          Object.entries(data)
            .map(([key, value]) => [key, normalizeUrl(value || "")])
            .filter(([, value]) => value && value.trim() !== ""),
        );

        // If no social media links provided, just continue
        if (Object.keys(normalizedData).length === 0) {
          return true;
        }

        const API_URL =
          process.env.NEXT_PUBLIC_API_URL || "https://me-fie.co.uk";

        // ✅ Endpoint now uses listingId as per your API docs
        const endpoint = `${API_URL}/api/listing/socials/${listingId}`;

        const response = await fetch(endpoint, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(normalizedData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.message || "Failed to save social media links",
          );
        }

        toast.success("Social media links saved successfully");
        if (onSuccess) onSuccess();
        return true;
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to save social media links",
        );
        return false;
      }
    };

    useImperativeHandle(ref, () => ({
      submit: async () => {
        const isValid = await trigger();
        if (!isValid) {
          toast.error("Validation failed", {
            description: "Please check URL formats",
          });
          return false;
        }
        return await handleFormSubmit(getValues());
      },
    }));

    return (
      <div className="w-full max-w-5xl mx-auto p-0.5 lg:p-6 space-y-8">
        <div>
          <h2 className="text-2xl font-semibold">Social Media & Links</h2>
          <p className="text-sm text-gray-500 mt-1 uppercase tracking-wider text-[10px] font-bold">
            Listing ID: {listingId}
          </p>
        </div>

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
                      type="text" // Using text to allow normalizedUrl helper to work
                      placeholder={platform.placeholder}
                      className={cn(
                        "h-10 rounded-lg border-gray-300 px-4 text-gray-800",
                        errors[platform.id as keyof SocialMediaFormValues] &&
                          "border-red-500",
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
                </div>
              );
            })}
          </div>
        </form>
      </div>
    );
  },
);

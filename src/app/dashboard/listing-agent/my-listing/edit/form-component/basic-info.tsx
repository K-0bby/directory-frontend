"use client";

import { useState, forwardRef, useImperativeHandle, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { ListingFormHandle } from "@/app/dashboard/vendor/my-listing/create/new-listing-content";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";

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

// Validation Schema
export const businessFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category_ids: z.array(z.string()).min(1, "At least one category is required"),
  description: z.string().min(1, "Description is required"),
  type: z.enum(["business", "event", "community"]),
  primary_phone: z.string().min(8, "Please enter a valid phone number"),
  primary_country_code: z.string().min(1, "Required").optional().nullable(),
  secondary_phone: z.string().optional().nullable(),
  secondary_country_code: z.string().optional().nullable(),
  email: z.string().email("Invalid email address"),
  website: z.string()
    .optional()
    .nullable()
    .or(z.literal(""))
    .refine((val) => isValidUrl(val || ""), {
      message: "Invalid URL format",
    }),

  business_reg_num: z.string().optional().nullable(),
  bio: z.string().optional().nullable(),
});

export type BusinessFormValues = z.infer<typeof businessFormSchema>;

// API Category Interface
interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
}

interface Props {
  listingType: "business" | "event" | "community";
  listingSlug: string;
  listingId?: number | string;
  initialData?: BusinessFormValues; // Add this
}

const basicInfoConfig = {
  business: {
    nameLabel: "Business Name",
    namePlaceholder: "Enter business name",
    descriptionLabel: "Business Description",
    descriptionPlaceholder: "Short description about your business",
  },
  event: {
    nameLabel: "Event Name",
    namePlaceholder: "Enter event name",
    descriptionLabel: "Event Description",
    descriptionPlaceholder: "Short description about your event",
  },
  community: {
    nameLabel: "Community Name",
    namePlaceholder: "Enter community name",
    descriptionLabel: "Community Description",
    descriptionPlaceholder: "Short description about your community",
  },
};

export const BasicInformationForm = forwardRef<ListingFormHandle, Props>(
  ({ listingType, listingSlug, initialData }, ref) => {
    // --- State ---
    const [categories, setCategories] = useState<Category[]>([]);
    const [mainCategories, setMainCategories] = useState<Category[]>([]);
    const [subCategories, setSubCategories] = useState<Category[]>([]);

    const [selectedMainCategoryId, setSelectedMainCategoryId] =
      useState<string>("");
    const [selectedMainCategory, setSelectedMainCategory] =
      useState<Category | null>(null);

    const [loading, setLoading] = useState(true); // Loading state for categories
    const [error, setError] = useState<string | null>(null);

    // --- Form ---
    const form = useForm<BusinessFormValues>({
      resolver: zodResolver(businessFormSchema),
      defaultValues: initialData || {
        name: "",
        category_ids: [],
        description: "",
        type: listingType,
        primary_phone: "",
        primary_country_code: "+233",
        secondary_phone: "",
        secondary_country_code: "+233",
        email: "",
        website: "",
        business_reg_num: "",
        bio: "",
      },
    });

    // Add an effect to reset form when data arrives (crucial for async fetching)
    useEffect(() => {
      if (initialData) {
        form.reset(initialData);
        // Set selectedMainCategoryId from the first category_id to display in dropdown
        if (initialData.category_ids && initialData.category_ids.length > 0) {
          const firstCategoryId = initialData.category_ids[0];
          setSelectedMainCategoryId(firstCategoryId);
          // Also find and set the main category object
          const mainCat = categories.find((c) => String(c.id) === firstCategoryId);
          if (mainCat) {
            setSelectedMainCategory(mainCat);
          }
        }
      }
    }, [initialData, form, categories]);

    const {
      register,
      watch,
      setValue,
      trigger,
      control,
      formState: { errors },
    } = form;
    const currentCategoryIds = watch("category_ids") || [];
    const textConfig = basicInfoConfig[listingType];

    // --- 1. Fetch Categories Logic (Fixed) ---
    useEffect(() => {
      const fetchCategories = async () => {
        try {
          setLoading(true);
          setError(null);

          const token = localStorage.getItem("authToken");
          if (!token) return; // Optional: Handle no token UI

          const API_URL = process.env.API_URL || "https://me-fie.co.uk";

          const response = await fetch(`${API_URL}/api/categories`, {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });

          if (!response.ok) {
            throw new Error(
              `HTTP ${response.status}: Failed to fetch categories`,
            );
          }

          const data = await response.json();

          // Robust Data Parsing
          let categoriesData: Category[] = [];
          if (Array.isArray(data)) {
            categoriesData = data;
          } else if (Array.isArray(data.data)) {
            categoriesData = data.data;
          } else if (Array.isArray(data.categories)) {
            categoriesData = data.categories;
          }

          setCategories(categoriesData);

          // Filter Main Categories
          const mainCats = categoriesData.filter(
            (cat) => cat.parent_id === null,
          );
          setMainCategories(mainCats);
        } catch (error) {
          console.error("Error fetching categories:", error);
          setError("Failed to load categories");
        } finally {
          setLoading(false);
        }
      };

      fetchCategories();
    }, []); // Dependency array is empty -> Runs once on mount

    // --- 2. Category Selection Logic (Restored your exact UI logic) ---

    const handleMainCategoryChange = (categoryId: string) => {
      // 1. Ensure categoryId is a string for comparison
      const idStr = String(categoryId);

      const selectedCategory = categories.find(
        (cat) => String(cat.id) === idStr,
      );

      if (!selectedCategory) return;

      setSelectedMainCategoryId(idStr);
      setSelectedMainCategory(selectedCategory);

      // Find subcategories (Comparing string to string)
      const subCats = categories.filter(
        (cat) => String(cat.parent_id) === idStr,
      );
      setSubCategories(subCats);

      // 2. FORCE STRING: Reset selection to just this main category
      setValue("category_ids", [idStr], { shouldValidate: true });
    };

    // const handleSubcategoryClick = (subCategoryId: string) => {
    //   // 1. FORCE STRING: Convert input to string immediately
    //   const idStr = String(subCategoryId);

    //   const currentIds = form.getValues("category_ids") || [];

    //   let newIds: string[] = [];
    //   if (currentIds.includes(idStr)) {
    //     // Remove
    //     newIds = currentIds.filter((id) => id !== idStr);
    //   } else {
    //     // Add
    //     newIds = [...currentIds, idStr];
    //   }

    //   setValue("category_ids", newIds, { shouldValidate: true });
    // };

    // --- 3. Submit Handler (Exposed to Parent) ---
    useImperativeHandle(ref, () => ({
      async submit() {
        const isValid = await trigger();
        if (!isValid) {
          toast.error("Please correct the errors in the form.");
          return false;
        }

        const rawData = form.getValues();

        const cleanPhone = (
          fullPhone: string | null | undefined,
          dialCode: string | null | undefined,
        ) => {
          // If either is missing, return an empty string to keep the API happy
          if (!fullPhone || !dialCode) return "";
          const digits = fullPhone.replace(/\D/g, "");
          const codeDigits = dialCode.replace(/\D/g, "");
          return digits.startsWith(codeDigits)
            ? digits.slice(codeDigits.length)
            : digits;
        };

        // 2. Map data to API structure
        const submissionData: Record<string, unknown> = {
          name: rawData.name,
          email: rawData.email,
          website: normalizeUrl(rawData.website || ""),
          type: listingType,
          bio: rawData.description,
          description: rawData.description,
          business_reg_num: rawData.business_reg_num,
          primary_country_code: rawData.primary_country_code,
          primary_phone: cleanPhone(
            rawData.primary_phone,
            rawData.primary_country_code,
          ),
          secondary_country_code: rawData.secondary_country_code,
          secondary_phone: rawData.secondary_phone
            ? cleanPhone(
                rawData.secondary_phone,
                rawData.secondary_country_code || "",
              )
            : "",
          category_ids: rawData.category_ids.map((id) => String(id)),
        };

        const token = localStorage.getItem("authToken");
        const API_URL = process.env.API_URL || "https://me-fie.co.uk";

        try {
          const endpoint = listingSlug
            ? `${API_URL}/api/listing/${listingSlug}/update`
            : `${API_URL}/api/listing/profile`;

          const method = listingSlug ? "PATCH" : "POST";

          const res = await fetch(endpoint, {
            method,
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(submissionData),
          });

          const json = await res.json();
          if (!res.ok) throw new Error(json.message || "Submission failed");
          return json.data || json;
        } catch (error) {
          toast.error(
            error instanceof Error ? error.message : "Failed to save",
          );
          return false;
        }
      },
    }));

    return (
      <div className="w-full max-w-5xl space-y-6 mx-auto p-0.5 lg:p-6">
        <div>
          <h2 className="text-2xl font-semibold">Basic Information</h2>
          <p className="text-sm text-gray-500 mt-1">
            {listingType === "business"
              ? "Tell us about your business"
              : listingType === "event"
                ? "Tell us about your event"
                : "Tell us about your community"}
          </p>
        </div>

        {/* Listing Type */}
        <div className="space-y-1 hidden">
          <label className="font-medium text-sm">Listing Type</label>
          <Input
            value={listingType}
            disabled
            className="h-10 rounded-lg border-gray-300 px-4 text-gray-800 bg-gray-50 cursor-not-allowed"
          />
        </div>

        {/* Name */}
        <div className="space-y-1">
          <label className="font-medium text-sm">{textConfig.nameLabel}</label>
          <Input
            {...register("name")}
            placeholder={textConfig.namePlaceholder}
            className={cn(
              "h-10 rounded-lg border-gray-300 px-4 text-gray-800 placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-black",
              errors.name && "border-red-500 focus-visible:ring-red-500",
            )}
          />
          {errors.name && (
            <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
          )}
        </div>

        {/* Email */}
        <div className="space-y-1">
          <label className="font-medium text-sm">Email Address *</label>
          <Input
            {...register("email")}
            type="email"
            placeholder="example@domain.com"
            className={cn(
              "h-10 rounded-lg border-gray-300 px-4 text-gray-800 placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-black",
              errors.email && "border-red-500 focus-visible:ring-red-500",
            )}
          />
          {errors.email && (
            <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
          )}
        </div>

        {/* Phones */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="font-medium text-sm">Primary Phone *</label>
            <Controller
              name="primary_phone"
              control={control}
              render={({ field }) => (
                <PhoneInput
                  defaultCountry="gh"
                  value={field.value ?? ""}
                  onChange={(phone, meta) => {
                    field.onChange(phone);
                    const dialCode = meta.country.dialCode;
                    setValue(
                      "primary_country_code",
                      dialCode.startsWith("+") ? dialCode : `+${dialCode}`,
                      { shouldValidate: true },
                    );
                  }}
                  inputClassName={cn(
                    "w-full h-10 rounded-r-lg border-gray-300 px-4",
                    errors.primary_phone && "border-red-500",
                  )}
                  className="w-full"
                  countrySelectorStyleProps={{
                    buttonStyle: {
                      paddingLeft: "12px",
                      paddingRight: "8px",
                      height: "36px", // Matches h-10
                      borderTopLeftRadius: "0.5rem",
                      borderBottomLeftRadius: "0.5rem",
                      borderColor: "#d1d5db",
                    },
                  }}
                />
              )}
            />
            {errors.primary_phone && (
              <p className="text-red-500 text-xs mt-1">
                {errors.primary_phone.message}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label className="font-medium text-sm">
              Secondary Phone (Optional)
            </label>
            <Controller
              name="secondary_phone"
              control={control}
              render={({ field }) => (
                <PhoneInput
                  defaultCountry="gh"
                  value={field.value ?? ""}
                  onChange={(phone, meta) => {
                    field.onChange(phone); // Update the full string
                    const dialCode = meta.country.dialCode;
                    const formattedCode = dialCode.startsWith("+")
                      ? dialCode
                      : `+${dialCode}`;
                    // Force the country code field to update based on the component's detection
                    setValue("secondary_country_code", formattedCode, {
                      shouldValidate: true,
                    });
                  }}
                  inputClassName={cn(
                    "w-full h-10 rounded-r-lg border-gray-300 px-4",
                    errors.primary_phone && "border-red-500",
                  )}
                  className="w-full"
                  countrySelectorStyleProps={{
                    buttonStyle: {
                      paddingLeft: "12px",
                      paddingRight: "8px",
                      height: "36px", // Matches h-10
                      borderTopLeftRadius: "0.5rem",
                      borderBottomLeftRadius: "0.5rem",
                      borderColor: "#d1d5db",
                    },
                  }}
                />
              )}
            />
          </div>
        </div>

        {/* Category Selection */}
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="font-medium text-sm">
              Main Category <span className="text-red-500">*</span>
            </label>
            {loading ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-gray-500">
                  Loading categories...
                </span>
              </div>
            ) : error ? (
              <div className="text-red-500 text-sm">{error}</div>
            ) : (
              <SearchableSelect
                options={mainCategories.map((category) => ({
                  value: String(category.id),
                  label: category.name,
                }))}
                value={selectedMainCategoryId}
                onChange={handleMainCategoryChange}
                placeholder={
                  mainCategories.length === 0
                    ? "No categories available"
                    : "Select main category"
                }
                searchPlaceholder="Search main category..."
                disabled={loading || mainCategories.length === 0}
                error={
                  errors.category_ids
                    ? "Main category is required"
                    : undefined
                }
              />
            )}
          </div>

          {/* Subcategory - Single Selection with SearchableSelect */}
          {selectedMainCategoryId && subCategories.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="font-medium text-sm">
                  Subcategory (Optional)
                </label>
              </div>

              <SearchableSelect
                options={subCategories.map((subcategory) => ({
                  value: String(subcategory.id),
                  label: subcategory.name,
                }))}
                value={
                  currentCategoryIds.find(
                    (id) =>
                      id !== String(selectedMainCategory?.id) &&
                      subCategories.some(
                        (sub) => String(sub.id) === id,
                      )
                  ) || ""
                }
                onChange={(subCategoryId) => {
                  // Clear existing subcategories and add the new one
                  const newIds = [selectedMainCategoryId];
                  if (subCategoryId) {
                    newIds.push(subCategoryId);
                  }
                  setValue("category_ids", newIds, { shouldValidate: true });
                }}
                placeholder="Select sub category (optional)"
                searchPlaceholder="Search sub category..."
              />

              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  {currentCategoryIds.length} category selected
                </p>
              </div>
            </div>
          )}

          {errors.category_ids && (
            <p className="text-red-500 text-xs mt-1">
              {errors.category_ids.message}
            </p>
          )}
        </div>

        {/* Website & Reg */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="font-medium text-sm">Website (Optional)</label>
            <Input
              {...register("website")}
              type="url"
              placeholder="www.example.com"
              className="h-10 rounded-lg border-gray-300 px-4 text-gray-800 placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-black"
            />
          </div>

          {listingType === "business" && (
            <div className="space-y-1">
              <label className="font-medium text-sm">
                Business Registration Number (Optional)
              </label>
              <Input
                {...register("business_reg_num")}
                placeholder="Enter registration number"
                className="h-10 rounded-lg border-gray-300 px-4 text-gray-800 placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-black"
              />
            </div>
          )}
        </div>

        {/* Description */}
        <div className="space-y-1">
          <label className="font-medium text-sm">
            {textConfig.descriptionLabel}
          </label>
          <Textarea
            {...register("description")}
            placeholder={textConfig.descriptionPlaceholder}
            className={cn(
              "min-h-[140px] rounded-lg border-gray-300 p-4 text-gray-800 placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-black resize-none",
              errors.description && "border-red-500 focus-visible:ring-red-500",
            )}
          />
          {errors.description && (
            <p className="text-red-500 text-xs mt-1">
              {errors.description.message}
            </p>
          )}
        </div>
      </div>
    );
  },
);

BasicInformationForm.displayName = "BasicInformationForm";

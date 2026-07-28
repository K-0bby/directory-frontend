"use client";

import { useState, forwardRef, useImperativeHandle, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/ui/rich-text-editor";

import { cn } from "@/lib/utils";
import { SpinnerGap } from "@phosphor-icons/react";
import { ListingFormHandle } from "@/components/dashboard/listing/types";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  isValidUrl,
  normalizeUrl,
  parseLaravel422Errors,
} from "@/lib/directory/utils";
import { cleanPhone, normalizePhoneInput, validatePhone } from "@/lib/phone";
import { handleSessionExpired } from "@/lib/session";
import { useAuth } from "@/context/auth-context";
import { normalizeRole } from "@/lib/roles";
import {
  DuplicateAssessment,
  runDuplicateListingPreflight,
} from "@/lib/api";

// Phone Input Imports
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";

// --- Validation Schema ---
export const businessFormSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters long"),
  category_ids: z.array(z.string()).min(1, "At least one category is required"),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters long"),
  type: z.enum(["business", "event", "community"]),
  primary_phone: z
    .string()
    .optional()
    .refine(
      (val) =>
        !val ||
        val.replace(/\D/g, "").length === 0 ||
        val.replace(/\D/g, "").length >= 9,
      "Phone number is too short — please enter a complete number",
    ),
  primary_country_code: z.string().optional(),
  secondary_phone: z.string().optional(),
  secondary_country_code: z.string().optional(),
  email: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine(
      (val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
      "Invalid email address",
    ),
  website: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((val) => isValidUrl(val || ""), {
      message: "Invalid URL format",
    }),
  business_reg_num: z.string().optional(),
  bio: z.string().optional(),
});

export type BusinessFormValues = z.infer<typeof businessFormSchema>;

// API Category Interface
interface Category {
  id: number;
  slug: string;
  name: string;
  type: string;
  parent_slug: string | null;
  parent_id?: number | null;
}

interface Props {
  listingType: "business" | "event" | "community";
  listingSlug: string;
  initialName?: string;
  onValidityChange?: (isValid: boolean) => void;
}

// Config for dynamic labels
const basicInfoConfig = {
  business: {
    label: "Business",
    nameLabel: "Business Name",
    namePlaceholder: "Enter business name",
    descriptionLabel: "Business Description",
    descriptionPlaceholder: "Short description about your business",
  },
  event: {
    label: "Event",
    nameLabel: "Event Name",
    namePlaceholder: "Enter event name",
    descriptionLabel: "Event Description",
    descriptionPlaceholder: "Short description about your event",
  },
  community: {
    label: "Community",
    nameLabel: "Community Name",
    namePlaceholder: "Enter community name",
    descriptionLabel: "Community Description",
    descriptionPlaceholder: "Short description about your community",
  },
};

export const BasicInformationForm = forwardRef<ListingFormHandle, Props>(
  ({ listingType, listingSlug, initialName = "", onValidityChange }, ref) => {
    const { user } = useAuth();
    const userRole = normalizeRole(user?.role ?? "customer");
    // --- State ---
    const [categories, setCategories] = useState<Category[]>([]);
    const [mainCategories, setMainCategories] = useState<Category[]>([]);
    const [subCategories, setSubCategories] = useState<Category[]>([]);
    const [savedCategories, setSavedCategories] = useState<Category[] | null>(null);

    const [selectedMainCategoryId, setSelectedMainCategoryId] =
      useState<string>("");
    const [selectedMainCategory, setSelectedMainCategory] =
      useState<Category | null>(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [primaryIso2, setPrimaryIso2] = useState("gb");
    const [secondaryIso2, setSecondaryIso2] = useState("gb");
    const [duplicateAssessment, setDuplicateAssessment] =
      useState<DuplicateAssessment | null>(null);
    const [duplicateExplanation, setDuplicateExplanation] = useState("");

    // --- Form ---
    const form = useForm<BusinessFormValues>({
      resolver: zodResolver(businessFormSchema),
      mode: "onChange",
      defaultValues: {
        name: "",
        category_ids: [],
        description: "",
        type: listingType,
        primary_phone: "",
        primary_country_code: "+44",
        secondary_phone: "",
        secondary_country_code: "",
        email: "",
        website: "",
        business_reg_num: "",
        bio: "",
      },
    });

    const {
      register,
      watch,
      setValue,
      trigger,
      control,
      reset,
      formState: { errors, isValid },
    } = form;

    useEffect(() => {
      onValidityChange?.(isValid);
    }, [isValid, onValidityChange]);

    useEffect(() => {
      if (listingType) {
        setValue("type", listingType);
      }
    }, [listingType, setValue]);

    useEffect(() => {
      const prefill = initialName.trim().slice(0, 255);
      if (!listingSlug && prefill && !form.getValues("name").trim()) {
        setValue("name", prefill, {
          shouldDirty: false,
          shouldTouch: false,
          shouldValidate: true,
        });
      }
    }, [form, initialName, listingSlug, setValue]);

    const currentCategoryIds = watch("category_ids") || [];
    const textConfig = basicInfoConfig[listingType];

    // --- 1. Fetch Categories Logic ---
    useEffect(() => {
      const fetchCategories = async () => {
        try {
          setLoading(true);
          setError(null);

          const token = localStorage.getItem("authToken");

          const response = await fetch(`/api/categories`, {
            headers: {
              ...(token && { Authorization: `Bearer ${token}` }),
              "Content-Type": "application/json",
            },
          });

          if (!response.ok) {
            throw new Error(
              `HTTP ${response.status}: Failed to fetch categories`,
            );
          }

          const data = await response.json();

          let categoriesData: Category[] = [];
          if (Array.isArray(data)) {
            categoriesData = data;
          } else if (Array.isArray(data.data)) {
            categoriesData = data.data;
          } else if (Array.isArray(data.categories)) {
            categoriesData = data.categories;
          }

          setCategories(categoriesData);

          const mainCats = categoriesData.filter(
            (cat) => cat.parent_slug === null || cat.type === "mainCategory",
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
    }, []);

    // --- 2. Category Selection Logic ---
    const handleMainCategoryChange = (categoryId: string) => {
      const idStr = String(categoryId);

      const selectedCategory = categories.find(
        (cat) => String(cat.id) === idStr,
      );

      if (!selectedCategory) return;

      setSelectedMainCategoryId(idStr);
      setSelectedMainCategory(selectedCategory);

      const subCats = categories.filter(
        (cat) => cat.parent_slug === selectedCategory.slug,
      );
      setSubCategories(subCats);

      setValue("category_ids", [idStr], { shouldValidate: true });
    };

    useEffect(() => {
      if (categories.length === 0 || savedCategories === null) return;

      const savedMain = savedCategories.find(
        (category) => category.parent_id == null && (category.parent_slug === null || category.type === "mainCategory"),
      );
      const savedSubcategory = savedCategories.find(
        (category) => category.parent_id != null || category.parent_slug !== null || category.type === "subCategory",
      );
      const main = savedMain
        ?? categories.find((category) => category.slug === savedSubcategory?.parent_slug)
        ?? null;

      if (!main) {
        setSelectedMainCategoryId("");
        setSelectedMainCategory(null);
        setSubCategories([]);
        return;
      }

      // An already-attached category may since have been archived — it no
      // longer appears in the active `categories` list fetched for new
      // selection, but it must still render correctly and stay removable on
      // this listing rather than silently vanishing (PRD §17). No other
      // archived category becomes newly selectable this way, since only
      // what's already attached to this listing is added back in.
      setMainCategories((prev) => (prev.some((c) => c.id === main.id) ? prev : [...prev, main]));

      const children = categories.filter((category) =>
        category.parent_id === main.id || category.parent_slug === main.slug,
      );
      const savedChild = savedCategories.find((saved) =>
        saved.id !== main.id && (saved.parent_id === main.id || saved.parent_slug === main.slug),
      );
      const childrenWithSaved =
        savedChild && !children.some((child) => child.id === savedChild.id)
          ? [...children, savedChild]
          : children;

      setSelectedMainCategoryId(String(main.id));
      setSelectedMainCategory(main);
      setSubCategories(childrenWithSaved);
      setValue(
        "category_ids",
        [String(main.id), ...(savedChild ? [String(savedChild.id)] : [])],
        { shouldValidate: true },
      );
    }, [categories, savedCategories, setValue]);

    // --- 3. Submit Handler ---
    useImperativeHandle(ref, () => ({
      async submit() {
        const isValid = await trigger();
        if (!isValid) {
          toast.error("Please correct the errors in the form.");
          return false;
        }

        const rawData = form.getValues();

        // Validate phones with libphonenumber-js before submitting
        if (rawData.primary_phone && rawData.primary_phone.replace(/\D/g, "").length > 0) {
          if (!validatePhone(rawData.primary_phone, primaryIso2)) {
            form.setError("primary_phone", {
              message: "Please enter a valid phone number for the selected country",
            });
            toast.error("Please correct the highlighted fields.");
            return false;
          }
        }
        if (rawData.secondary_phone && rawData.secondary_phone.replace(/\D/g, "").length > 0) {
          if (!validatePhone(rawData.secondary_phone, secondaryIso2)) {
            form.setError("secondary_phone", {
              message: "Please enter a valid phone number for the selected country",
            });
            toast.error("Please correct the highlighted fields.");
            return false;
          }
        }

        const cleanedPrimaryPhone = rawData.primary_phone
          ? cleanPhone(rawData.primary_phone, rawData.primary_country_code ?? "")
          : "";
        const cleanedSecondaryPhone = rawData.secondary_phone
          ? cleanPhone(rawData.secondary_phone, rawData.secondary_country_code || "")
          : "";

        // Build payload — omit optional keys entirely when empty so the backend's
        // `sometimes` rule doesn't fire and reject null/empty-string values.
        const submissionData: Record<string, unknown> = {
          name: rawData.name,
          type: listingType,
          bio: rawData.description,
          description: rawData.description,
          category_ids: rawData.category_ids
            .filter((id) => id !== "other")
            .map((id) => Number(id)),
          ...(rawData.email ? { email: rawData.email } : {}),
          ...(normalizeUrl(rawData.website || "")
            ? { website: normalizeUrl(rawData.website || "") }
            : {}),
          ...(rawData.business_reg_num
            ? { business_reg_num: rawData.business_reg_num }
            : {}),
          ...(cleanedPrimaryPhone
            ? {
                primary_phone: cleanedPrimaryPhone,
                primary_country_code: rawData.primary_country_code,
              }
            : {}),
          ...(cleanedSecondaryPhone
            ? {
                secondary_phone: cleanedSecondaryPhone,
                secondary_country_code: rawData.secondary_country_code,
              }
            : {}),
        };

        const token = localStorage.getItem("authToken");

        try {
          if (!listingSlug && userRole === "listing_agent") {
            const assessment = await runDuplicateListingPreflight(
              {
                type: listingType,
                name: rawData.name,
                ...(rawData.email ? { email: rawData.email } : {}),
                ...(cleanedPrimaryPhone
                  ? { primary_phone: cleanedPrimaryPhone }
                  : {}),
                ...(normalizeUrl(rawData.website || "")
                  ? { website: normalizeUrl(rawData.website || "") }
                  : {}),
                ...(rawData.business_reg_num
                  ? { business_reg_num: rawData.business_reg_num }
                  : {}),
              },
              token ?? undefined,
            );

            setDuplicateAssessment(assessment);
            if (
              assessment.requires_explanation &&
              duplicateExplanation.trim().length < 10
            ) {
              toast.warning(
                "Review the possible duplicate and explain why this is a separate listing.",
              );
              return false;
            }

            submissionData.duplicate_assessment_id = assessment.assessment_id;
            if (assessment.requires_explanation) {
              submissionData.duplicate_explanation =
                duplicateExplanation.trim();
            }
          }

          const endpoint = listingSlug
            ? `/api/listing/${listingSlug}/update`
            : `/api/listing/profile`;

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

          if (!res.ok) {
            if (handleSessionExpired(res.status)) return false;
            if (res.status === 422 && json.errors) {
              const fieldErrors = parseLaravel422Errors(json.errors);
              Object.entries(fieldErrors).forEach(([field, message]) => {
                form.setError(field as keyof BusinessFormValues, { message });
              });
              toast.error("Please correct the highlighted fields.");
            } else {
              toast.error(json.error || json.message || "Submission failed");
            }
            return false;
          }

          return json.data || json;
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Failed to save";
          toast.error(msg);
          return false;
        }
      },
    }));

    useEffect(() => {
      const loadExistingData = async () => {
        if (!listingSlug) return;
        try {
          const token = localStorage.getItem("authToken");
          const res = await fetch(`/api/listing/${listingSlug}/show`, {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          });

          if (res.ok) {
            const json = await res.json();
            const d = json.data;

            // Reconstruct full strings so PhoneInput recognizes the country flag
            const fullPrimaryPhone = `${d.country_code || ""}${d.primary_phone || ""}`;
            const fullSecondaryPhone = d.secondary_phone
              ? `${d.secondary_country_code || ""}${d.secondary_phone}`
              : "";

            // Populate the form with data from the API
            reset({
              name: d.name || "",
              description: d.bio || d.description || "",
              email: d.email || "",
              website: d.website || "",
              primary_phone: fullPrimaryPhone,
              primary_country_code: d.primary_country_code || "+44",
              secondary_phone: fullSecondaryPhone,
              secondary_country_code: d.secondary_country_code || "+44",
              category_ids: d.categories?.map((category: Category) => String(category.id)) || [],
              business_reg_num: d.business_reg_num || "",
              type: listingType,
            });

            setSavedCategories(Array.isArray(d.categories) ? d.categories : []);
          }
        } catch (error) {
          console.error("Back navigation load failed", error);
        }
      };
      loadExistingData();
    }, [listingSlug, reset, listingType]);

    return (
      <div className="w-full max-w-5xl space-y-6 mx-auto p-0.5 lg:p-6">
        <div>
          <h2 className="text-2xl font-semibold">Basic Information</h2>
          <p className="text-sm text-gray-500 mt-1">
            {listingType === "business"
              ? "Tell us about your business. Your business page will not appear in search results until the information provided has been verified and approved by our moderators. Once it is approved, you'll receive instructions on how to go live."
              : listingType === "event"
                ? "Tell us about your event. Your event page will not appear in search results until the information provided has been verified and approved by our moderators. Once it is approved, you'll receive instructions on how to go live."
                : "Tell us about your community. Your community page will not appear in search results until the information provided has been verified and approved by our moderators. Once it is approved, you'll receive instructions on how to go live."}
          </p>
        </div>

        {!listingSlug && duplicateAssessment?.requires_explanation && (
          <div
            className={`rounded-xl border p-4 ${
              duplicateAssessment.requires_admin_resolution
                ? "border-red-200 bg-red-50"
                : "border-amber-200 bg-amber-50"
            }`}
          >
            <h3 className="font-semibold text-slate-950">
              {duplicateAssessment.requires_admin_resolution
                ? "Strong identity collision"
                : "Possible duplicate"}
            </h3>
            <p className="mt-1 text-sm text-slate-700">
              Check the public candidates below. Continuing requires a clear
              explanation, and strong collisions require explicit moderator
              resolution.
            </p>
            <div className="mt-3 space-y-2">
              {duplicateAssessment.candidates.map((candidate) => (
                <div
                  key={candidate.listing_id}
                  className="rounded-lg border border-black/10 bg-white/80 p-3 text-sm"
                >
                  <p className="font-medium">{candidate.title}</p>
                  <p className="text-xs text-slate-600">
                    {candidate.listing_type} ·{" "}
                    {candidate.locality || "Location not available"} · Matched:{" "}
                    {candidate.matched_signals.join(", ")}
                  </p>
                </div>
              ))}
            </div>
            <label className="mt-4 block text-sm font-medium" htmlFor="duplicate-explanation">
              Why should this listing continue?
            </label>
            <Textarea
              id="duplicate-explanation"
              value={duplicateExplanation}
              onChange={(event) => setDuplicateExplanation(event.target.value)}
              minLength={10}
              maxLength={2000}
              rows={3}
              className="mt-1 bg-white"
              placeholder="For example: this is a separate branch in a different locality…"
            />
          </div>
        )}

        {/* Listing Type (Hidden) */}
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
          <label className="font-medium text-sm">
            {textConfig.nameLabel} <span className="text-red-500">*</span>
          </label>
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

        {listingType !== "event" && <>
        {/* Email */}
        <div className="space-y-1">
          <label className="font-medium text-sm">
            Email Address{" "}
            <span className="text-gray-400 font-normal">(Optional)</span>
          </label>
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

        {/* Phones - With React International Phone */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="font-medium text-sm">
              Primary Phone Number{" "}
              <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            <Controller
              name="primary_phone"
              control={control}
              render={({ field }) => (
                <PhoneInput
                  disableDialCodePrefill={true}
                  defaultCountry="gb"
                  preferredCountries={["gb", "gh", "ng", "ke", "za"]}
                  value={field.value}
                  onChange={(phone, meta) => {
                    const normalizedInput = normalizePhoneInput(phone, meta.country.iso2 || "gb");
                    field.onChange(normalizedInput);
                    const dialCode = meta.country.dialCode;
                    const formattedCode = dialCode.startsWith("+")
                      ? dialCode
                      : `+${dialCode}`;
                    setPrimaryIso2(meta.country.iso2 || "gb");
                    setValue("primary_country_code", formattedCode, {
                      shouldValidate: true,
                    });
                  }}
                  className={cn("w-full", errors.primary_phone && "phone-input-error")}
                  inputClassName="w-full"
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
              Secondary Phone Number{" "}
              <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            <Controller
              name="secondary_phone"
              control={control}
              render={({ field }) => (
                <PhoneInput
                  disableDialCodePrefill={true}
                  defaultCountry="gb"
                  preferredCountries={["gb", "gh", "ng", "ke", "za"]}
                  value={field.value}
                  onChange={(phone, meta) => {
                    const normalizedInput = normalizePhoneInput(phone, meta.country.iso2 || "gb");
                    field.onChange(normalizedInput);
                    const dialCode = meta.country.dialCode;
                    const formattedCode = dialCode.startsWith("+")
                      ? dialCode
                      : `+${dialCode}`;
                    setSecondaryIso2(meta.country.iso2 || "gb");
                    setValue("secondary_country_code", formattedCode, {
                      shouldValidate: true,
                    });
                  }}
                  className={cn("w-full", errors.secondary_phone && "phone-input-error")}
                  inputClassName="w-full"
                />
              )}
            />
          </div>
        </div>
        </>}

        {/* Category Selection - With Updated Text */}
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="font-medium text-sm">
              {textConfig.label} Main Category{" "}
              <span className="text-red-500">*</span>
            </label>
            {loading ? (
              <div className="flex items-center space-x-2">
                <SpinnerGap className="h-4 w-4 animate-spin" />
                <span className="text-sm text-gray-500">
                  Loading categories...
                </span>
              </div>
            ) : error ? (
              <div className="text-red-500 text-sm">{error}</div>
            ) : (
              <>
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
                      : `Select ${textConfig.label.toLowerCase()} main category`
                  }
                  searchPlaceholder="Search main category..."
                  disabled={loading || mainCategories.length === 0}
                  showOtherOnEmpty
                  error={
                    errors.category_ids
                      ? "Main category is required"
                      : undefined
                  }
                />
                {selectedMainCategoryId === "other" && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-1">
                    Our team will assign the most appropriate category for your
                    listing after review.
                  </p>
                )}
              </>
            )}
          </div>

          {/* Subcategory - Single Selection with SearchableSelect */}
          {selectedMainCategoryId && subCategories.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="font-medium text-sm">
                  Select {textConfig.label} Subcategory{" "}
                  <span className="text-gray-400 font-normal">(Optional)</span>
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
                      subCategories.some((sub) => String(sub.id) === id),
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

              {/* Updated Categories Summary Text */}
              <div className="flex flex-col gap-1 mt-2 p-3 bg-gray-50 rounded-md border border-gray-100">
                <p className="text-sm text-gray-700">
                  <span className="font-bold text-gray-900">
                    Main Category:
                  </span>{" "}
                  {selectedMainCategory?.name}
                </p>

                {currentCategoryIds.filter(
                  (id) => id !== String(selectedMainCategory?.id),
                ).length > 0 && (
                  <p className="text-sm text-gray-700 mt-1">
                    <span className="font-bold text-gray-900">
                      Subcategory:
                    </span>{" "}
                    {subCategories
                      .filter((sub) =>
                        currentCategoryIds.includes(String(sub.id)),
                      )
                      .map((sub) => sub.name)
                      .join(", ")}
                  </p>
                )}
              </div>
            </div>
          )}

          {errors.category_ids && (
            <p className="text-red-500 text-xs mt-1">
              {errors.category_ids.message}
            </p>
          )}
        </div>

        {listingType !== "event" && <>
        {/* Website & Reg */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="font-medium text-sm">
              Website{" "}
              <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            <Input
              {...register("website")}
              type="url"
              placeholder="www.example.com"
              className={cn(
                "h-10 rounded-lg border-gray-300 px-4 text-gray-800 placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-black",
                errors.website && "border-red-500 focus-visible:ring-red-500",
              )}
            />
            {errors.website && (
              <p className="text-red-500 text-xs mt-1">
                {errors.website.message}
              </p>
            )}
          </div>

          {listingType === "business" && (
            <div className="space-y-1">
              <label className="font-medium text-sm">
                Business Registration Number{" "}
                <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <Input
                {...register("business_reg_num")}
                placeholder="Enter registration number"
                className="h-10 rounded-lg border-gray-300 px-4 text-gray-800 placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-black"
              />
            </div>
          )}
        </div>
        </>}

        {/* Description */}
        <div className="space-y-1">
          <label className="font-medium text-sm">
            {textConfig.descriptionLabel}{" "}
            <span className="text-red-500">*</span>
          </label>
          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <RichTextEditor
                value={field.value ?? ""}
                onChange={field.onChange}
                placeholder={textConfig.descriptionPlaceholder}
                error={!!errors.description}
              />
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

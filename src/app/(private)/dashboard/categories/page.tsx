"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  useQueryState,
  parseAsString,
  parseAsStringEnum,
} from "nuqs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Edit2,
  Trash2,
  Archive,
  GitMerge,
  Loader2,
  UploadCloud,
  X as XIcon,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { RoleGuard } from "@/components/dashboard/role-guard";
import { toast } from "sonner";
import type { AdminCategory } from "@/types/category";

interface CategoryFormData {
  name: string;
  description: string;
  parent_slug: string | null;
  make_top_cat: boolean;
  imageFile?: File | null;
}

interface SubcategoryBatchRow {
  name: string;
  description: string;
  error?: string;
}

const EMPTY_BATCH_ROW: SubcategoryBatchRow = { name: "", description: "" };

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  const err = await response.json().catch(() => ({}));
  return err.message || err.error || fallback;
}

// --- API ---
const categoryApi = {
  list: async (): Promise<AdminCategory[]> => {
    const token = localStorage.getItem("authToken");
    const response = await fetch("/api/admin/categories", {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Failed to fetch categories");
    const data = await response.json();
    return data.data || [];
  },

  create: async (formData: CategoryFormData, type: "mainCategory" | "subCategory"): Promise<void> => {
    const token = localStorage.getItem("authToken");
    const body = new FormData();
    body.append("name", formData.name);
    body.append("type", type);
    if (formData.description) body.append("description", formData.description);
    if (type === "subCategory" && formData.parent_slug) body.append("parent_slug", formData.parent_slug);
    if (formData.make_top_cat) body.append("is_top_category", "1");
    if (formData.imageFile) body.append("featured_image", formData.imageFile);
    const response = await fetch("/api/categories", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body,
    });
    if (!response.ok) throw new Error(await readErrorMessage(response, "Failed to create category"));
  },

  update: async (slug: string, formData: CategoryFormData, isMainCategory: boolean): Promise<void> => {
    const token = localStorage.getItem("authToken");
    const body = new FormData();
    body.append("name", formData.name);
    if (formData.description) body.append("description", formData.description);
    if (isMainCategory) body.append("is_top_category", formData.make_top_cat ? "1" : "0");
    if (formData.imageFile) body.append("featured_image", formData.imageFile);
    const response = await fetch(`/api/categories/${slug}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
      body,
    });
    if (!response.ok) throw new Error(await readErrorMessage(response, "Failed to update category"));
  },

  delete: async (slug: string): Promise<void> => {
    const token = localStorage.getItem("authToken");
    const response = await fetch(`/api/categories/${slug}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(await readErrorMessage(response, "Failed to delete category"));
  },

  archive: async (slug: string): Promise<void> => {
    const token = localStorage.getItem("authToken");
    const response = await fetch(`/api/categories/${slug}/archive`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(await readErrorMessage(response, "Failed to archive category"));
  },

  merge: async (slug: string, replacementCategoryId: number): Promise<void> => {
    const token = localStorage.getItem("authToken");
    const response = await fetch(`/api/categories/${slug}/merge`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ replacement_category_id: replacementCategoryId }),
    });
    if (!response.ok) throw new Error(await readErrorMessage(response, "Failed to merge category"));
  },
};

const EMPTY_FORM: CategoryFormData = {
  name: "",
  description: "",
  parent_slug: null,
  make_top_cat: false,
  imageFile: null,
};

function CategoriesPageContent() {
  const { loading: authLoading } = useAuth();

  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [view, setView] = useQueryState(
    "view",
    parseAsStringEnum<"active" | "archived">(["active", "archived"]).withDefault(
      "active",
    ),
  );
  const [selectedMainSlug, setSelectedMainSlug] = useQueryState("main");
  const [searchMainCategory, setSearchMainCategory] = useQueryState(
    "q_main",
    parseAsString.withDefault(""),
  );
  const [searchSubCategory, setSearchSubCategory] = useQueryState(
    "q_sub",
    parseAsString.withDefault(""),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Add/Edit dialog (main-category create, and editing either type)
  const [typeSelectOpen, setTypeSelectOpen] = useState(false);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [addingType, setAddingType] = useState<"main" | null>(null);
  const [editingCategory, setEditingCategory] = useState<AdminCategory | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>(EMPTY_FORM);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Add-subcategory batch dialog — always scoped to one fixed parent
  const [subBatchOpen, setSubBatchOpen] = useState(false);
  const [subBatchParent, setSubBatchParent] = useState<AdminCategory | null>(null);
  const [subBatchRows, setSubBatchRows] = useState<SubcategoryBatchRow[]>([EMPTY_BATCH_ROW]);
  const [isSavingBatch, setIsSavingBatch] = useState(false);

  // Delete
  const [categoryToDelete, setCategoryToDelete] = useState<AdminCategory | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Archive
  const [categoryToArchive, setCategoryToArchive] = useState<AdminCategory | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);

  // Merge
  const [categoryToMerge, setCategoryToMerge] = useState<AdminCategory | null>(null);
  const [mergeTargetSlug, setMergeTargetSlug] = useState<string | null>(null);
  const [isMerging, setIsMerging] = useState(false);

  const refetch = useCallback(async () => {
    if (authLoading) return;
    setIsLoading(true);
    try {
      const data = await categoryApi.list();
      setCategories(data);
    } catch {
      toast.error("Failed to load categories. Retry.");
    } finally {
      setIsLoading(false);
    }
  }, [authLoading]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const mainCategories = categories.filter(
    (c) => c.type === "mainCategory" && (view === "archived" ? c.archived_at !== null : c.archived_at === null),
  );
  const filteredMainCategories = mainCategories.filter((c) =>
    c.name.toLowerCase().includes(searchMainCategory.toLowerCase()),
  );
  const selectedMainCategory =
    mainCategories.find((c) => c.slug === selectedMainSlug) ?? filteredMainCategories[0] ?? mainCategories[0] ?? null;
  // A subcategory can only ever be added under an active parent — relevant when
  // the admin is on the Archived tab, where `selectedMainCategory` above may
  // itself be archived (PRD §9.2 / §11).
  const activeSelectedMainCategory = selectedMainCategory?.archived_at === null ? selectedMainCategory : null;
  const subCategories = selectedMainCategory
    ? categories.filter(
        (c) => c.parent_slug === selectedMainCategory.slug && (view === "archived" ? c.archived_at !== null : c.archived_at === null),
      )
    : [];
  const normalizedSubCategorySearch = searchSubCategory.trim().toLowerCase();
  const filteredSubCategories = normalizedSubCategorySearch
    ? subCategories.filter((category) => category.name.toLowerCase().includes(normalizedSubCategorySearch))
    : subCategories;

  const handleViewChange = (nextView: "active" | "archived") => {
    setView(nextView);
    setSearchSubCategory("");
  };

  const handleMainCategorySelect = (slug: string) => {
    setSelectedMainSlug(slug);
    setSearchSubCategory("");
  };

  function mergeCandidates(category: AdminCategory): AdminCategory[] {
    return categories.filter(
      (c) =>
        c.id !== category.id &&
        c.archived_at === null &&
        c.merged_into === null &&
        c.type === category.type &&
        (category.type !== "subCategory" || c.parent_slug === category.parent_slug),
    );
  }

  const resetForm = () => {
    setFormData(EMPTY_FORM);
    setImagePreview(null);
  };

  const handleAddCategoryClick = () => {
    setEditingCategory(null);
    resetForm();
    setTypeSelectOpen(true);
  };

  const handleTypeChosen = (type: "main" | "sub") => {
    setTypeSelectOpen(false);
    if (type === "sub") {
      if (activeSelectedMainCategory) openSubBatch(activeSelectedMainCategory);
      return;
    }
    setAddingType("main");
    setFormData((prev) => ({ ...prev, parent_slug: null }));
    setFormDialogOpen(true);
  };

  // --- Add-subcategory batch dialog ---
  const openSubBatch = (parent: AdminCategory) => {
    setSubBatchParent(parent);
    setSubBatchRows([EMPTY_BATCH_ROW]);
    setSubBatchOpen(true);
  };

  const addBatchRow = () => setSubBatchRows((rows) => [...rows, EMPTY_BATCH_ROW]);

  const removeBatchRow = (index: number) =>
    setSubBatchRows((rows) => (rows.length > 1 ? rows.filter((_, i) => i !== index) : rows));

  const updateBatchRow = (index: number, patch: Partial<SubcategoryBatchRow>) =>
    setSubBatchRows((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch, error: undefined } : r)));

  const handleSaveBatch = async () => {
    if (!subBatchParent) return;

    const trimmedRows = subBatchRows.map((r) => ({ ...r, name: r.name.trim(), error: undefined }));
    const nonBlankRows = trimmedRows.filter((r) => r.name !== "");

    if (nonBlankRows.length === 0) {
      toast.error("Enter at least one subcategory name");
      return;
    }

    // Duplicate names within the batch itself — fail fast rather than
    // round-tripping a collision the backend would reject anyway.
    const seen = new Map<string, number>();
    let hasDuplicates = false;
    const flaggedRows = nonBlankRows.map((row) => {
      const key = row.name.toLowerCase();
      if (seen.has(key)) {
        hasDuplicates = true;
        return { ...row, error: "Duplicate name in this list" };
      }
      seen.set(key, 1);
      return row;
    });
    if (hasDuplicates) {
      setSubBatchRows(flaggedRows);
      toast.error("Remove duplicate subcategory names before saving");
      return;
    }

    setIsSavingBatch(true);
    const results = await Promise.allSettled(
      nonBlankRows.map((row) =>
        categoryApi.create(
          {
            name: row.name,
            description: row.description,
            parent_slug: subBatchParent.slug,
            make_top_cat: false,
            imageFile: null,
          },
          "subCategory",
        ),
      ),
    );

    const failedRows = nonBlankRows
      .map((row, i) => ({ row, result: results[i] }))
      .filter(({ result }) => result.status === "rejected")
      .map(({ row, result }) => ({
        ...row,
        error: result.status === "rejected" && result.reason instanceof Error ? result.reason.message : "Failed to create",
      }));

    const succeededCount = nonBlankRows.length - failedRows.length;

    if (failedRows.length === 0) {
      toast.success(`${succeededCount} subcategor${succeededCount === 1 ? "y" : "ies"} created`);
      setSubBatchOpen(false);
      setSubBatchRows([EMPTY_BATCH_ROW]);
    } else if (succeededCount === 0) {
      toast.error(`Failed to create ${failedRows.length} subcategor${failedRows.length === 1 ? "y" : "ies"}`);
      setSubBatchRows(failedRows);
    } else {
      toast.success(`${succeededCount} created, ${failedRows.length} failed — see errors below`);
      setSubBatchRows(failedRows);
    }

    setIsSavingBatch(false);
    await refetch();
  };

  const handleEditCategoryClick = (category: AdminCategory) => {
    setAddingType(null);
    setEditingCategory(category);
    setImagePreview(category.featured_image || null);
    setFormData({
      name: category.name,
      description: category.description || "",
      parent_slug: category.parent_slug,
      make_top_cat: category.is_top_category || false,
      imageFile: null,
    });
    setFormDialogOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFormData((prev) => ({ ...prev, imageFile: file }));
    setImagePreview(URL.createObjectURL(file));
  };

  // A main category is being edited/added — the only context where "make top
  // category" and its image are presentable (PRD §10: subcategories can never
  // be featured).
  const isMainContext = editingCategory ? editingCategory.type === "mainCategory" : addingType === "main";

  const handleSaveCategory = async () => {
    if (!formData.name.trim()) {
      toast.error("Category name is required");
      return;
    }
    if (isMainContext && formData.make_top_cat && !formData.imageFile && !imagePreview) {
      toast.error("Please upload an image for the top category");
      return;
    }

    setIsSaving(true);
    try {
      if (editingCategory) {
        await categoryApi.update(editingCategory.slug, formData, isMainContext);
        toast.success("Category updated successfully");
      } else {
        await categoryApi.create(formData, "mainCategory");
        toast.success("Category created successfully");
      }
      setFormDialogOpen(false);
      resetForm();
      await refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!categoryToDelete?.slug) return;
    setIsDeleting(true);
    try {
      await categoryApi.delete(categoryToDelete.slug);
      toast.success("Category deleted successfully");
      setCategoryToDelete(null);
      await refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unknown error");
      setCategoryToDelete(null);
      await refetch();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleArchiveConfirm = async () => {
    if (!categoryToArchive?.slug) return;
    setIsArchiving(true);
    try {
      await categoryApi.archive(categoryToArchive.slug);
      toast.success("Category archived successfully");
      setCategoryToArchive(null);
      await refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unknown error");
      setCategoryToArchive(null);
      await refetch();
    } finally {
      setIsArchiving(false);
    }
  };

  const handleMergeConfirm = async () => {
    if (!categoryToMerge?.slug || !mergeTargetSlug) return;
    const target = categories.find((c) => c.slug === mergeTargetSlug);
    if (!target) return;
    setIsMerging(true);
    try {
      await categoryApi.merge(categoryToMerge.slug, target.id);
      toast.success(`"${categoryToMerge.name}" merged into "${target.name}"`);
      setCategoryToMerge(null);
      setMergeTargetSlug(null);
      await refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unknown error");
      setCategoryToMerge(null);
      setMergeTargetSlug(null);
      await refetch();
    } finally {
      setIsMerging(false);
    }
  };

  const dialogTitle = editingCategory ? "Edit category" : "Add Main Category";
  const subBatchValidCount = subBatchRows.filter((r) => r.name.trim() !== "").length;

  const renderRowActions = (category: AdminCategory) => (
    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <button
        className="p-1 text-gray-400 hover:text-gray-600"
        title="Edit"
        onClick={(e) => {
          e.stopPropagation();
          handleEditCategoryClick(category);
        }}
      >
        <Edit2 className="w-4 h-4" />
      </button>
      <button
        className="p-1 text-gray-400 hover:text-amber-600 disabled:opacity-30 disabled:cursor-not-allowed"
        title={category.permitted_actions.archive ? "Archive" : "Only an active, unused-by-children leaf with listings can be archived"}
        disabled={!category.permitted_actions.archive}
        onClick={(e) => {
          e.stopPropagation();
          if (category.permitted_actions.archive) setCategoryToArchive(category);
        }}
      >
        <Archive className="w-4 h-4" />
      </button>
      <button
        className="p-1 text-gray-400 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed"
        title={category.permitted_actions.merge ? "Merge" : "No compatible merge target is available"}
        disabled={!category.permitted_actions.merge}
        onClick={(e) => {
          e.stopPropagation();
          if (category.permitted_actions.merge) {
            setCategoryToMerge(category);
            setMergeTargetSlug(mergeCandidates(category)[0]?.slug ?? null);
          }
        }}
      >
        <GitMerge className="w-4 h-4" />
      </button>
      <button
        className="p-1 text-gray-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
        title={category.permitted_actions.delete ? "Delete permanently" : "Only an unused leaf can be permanently deleted"}
        disabled={!category.permitted_actions.delete}
        onClick={(e) => {
          e.stopPropagation();
          if (category.permitted_actions.delete) setCategoryToDelete(category);
        }}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );

  return (
    <div className="p-2 lg:p-6 space-y-6">
      <h1 className="text-3xl font-semibold">Categories</h1>

      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="inline-flex rounded-lg border border-gray-200 p-1 bg-gray-50">
            <button
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${view === "active" ? "bg-white shadow-sm font-medium text-gray-900" : "text-gray-500"}`}
              onClick={() => handleViewChange("active")}
            >
              Active
            </button>
            <button
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${view === "archived" ? "bg-white shadow-sm font-medium text-gray-900" : "text-gray-500"}`}
              onClick={() => handleViewChange("archived")}
            >
              Archived
            </button>
          </div>
          <Button
            className="bg-[#93C01F] hover:bg-[#7ea919] text-white gap-2"
            onClick={handleAddCategoryClick}
          >
            <Plus className="w-4 h-4" /> Add category
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-8">Loading categories...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Main Categories */}
            <div className="border border-gray-200 rounded-xl bg-white p-6 h-fit">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Main Category</h2>
              <div className="mb-4">
                <Input
                  value={searchMainCategory}
                  onChange={(e) => setSearchMainCategory(e.target.value)}
                  placeholder="Search main category..."
                />
              </div>
              <div className="space-y-3">
                {filteredMainCategories.map((cat) => (
                  <div
                    key={cat.slug}
                    className={`flex items-center justify-between p-4 rounded-lg cursor-pointer transition-colors border group ${
                      selectedMainCategory?.slug === cat.slug
                        ? "bg-[#F4F9E8] border-[#93C01F] text-gray-900 font-medium"
                        : "bg-white border-gray-100 text-gray-600 hover:bg-gray-50"
                    }`}
                    onClick={() => handleMainCategorySelect(cat.slug)}
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span>{cat.name}</span>
                        {!!cat.is_top_category && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#93C01F]/15 text-[#5F8B0A]">
                            Top Category
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">
                        {cat.direct_listing_count} listing{cat.direct_listing_count === 1 ? "" : "s"} · {cat.child_count} sub{cat.child_count === 1 ? "" : "s"}
                        {cat.merged_into && ` · merged into ${cat.merged_into.name}`}
                      </span>
                    </div>
                    {renderRowActions(cat)}
                  </div>
                ))}
                {mainCategories.length === 0 && (
                  <div className="text-center text-gray-500 py-4">
                    No {view === "archived" ? "archived" : ""} main categories found
                  </div>
                )}
                {mainCategories.length > 0 && filteredMainCategories.length === 0 && (
                  <div className="text-center text-gray-500 py-4">No matching main categories</div>
                )}
              </div>
            </div>

            {/* Sub Categories */}
            <div className="border border-gray-200 rounded-xl bg-white p-6 h-fit min-h-[500px]">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                {selectedMainCategory ? `${selectedMainCategory.name} — Sub Categories` : "Sub Categories"}
              </h2>
              {selectedMainCategory && (
                <div className="mb-4 space-y-1.5">
                  <Input
                    value={searchSubCategory}
                    onChange={(event) => setSearchSubCategory(event.target.value)}
                    placeholder="Search sub category..."
                    aria-label={`Search subcategories under ${selectedMainCategory.name}`}
                  />
                  {normalizedSubCategorySearch && (
                    <p className="text-xs text-gray-400">
                      {filteredSubCategories.length} of {subCategories.length} subcategor
                      {subCategories.length === 1 ? "y" : "ies"} matched
                    </p>
                  )}
                </div>
              )}
              {view === "active" && activeSelectedMainCategory && (
                <Button
                  variant="secondary"
                  onClick={() => openSubBatch(activeSelectedMainCategory)}
                  className="w-full bg-gray-50 text-gray-600 border border-gray-100 mb-6 gap-2"
                >
                  <Plus className="w-4 h-4" /> Add sub category
                </Button>
              )}
              <div className="space-y-3">
                {filteredSubCategories.map((sub) => (
                  <div
                    key={sub.slug}
                    className="flex items-center justify-between group border-b border-gray-50 pb-3 last:border-0"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="text-gray-700 text-sm">{sub.name}</span>
                      <span className="text-xs text-gray-400">
                        {sub.direct_listing_count} listing{sub.direct_listing_count === 1 ? "" : "s"}
                        {sub.merged_into && ` · merged into ${sub.merged_into.name}`}
                      </span>
                    </div>
                    {renderRowActions(sub)}
                  </div>
                ))}
                {subCategories.length === 0 && (
                  <div className="text-center text-gray-500 py-4">
                    {selectedMainCategory ? `No sub categories for ${selectedMainCategory.name}` : "Select a main category"}
                  </div>
                )}
                {subCategories.length > 0 && filteredSubCategories.length === 0 && (
                  <div className="text-center text-gray-500 py-4">
                    No matching sub categories under {selectedMainCategory?.name}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── STEP 1: Type Chooser (Add only) ── */}
      <Dialog open={typeSelectOpen} onOpenChange={setTypeSelectOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Add a category</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500 -mt-2">What type of category would you like to add?</p>
          <div className="grid grid-cols-2 gap-4 py-4">
            <button
              onClick={() => handleTypeChosen("main")}
              className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-gray-200 hover:border-[#93C01F] hover:bg-[#93C01F]/5 transition-all group"
            >
              <div className="w-12 h-12 rounded-full bg-[#93C01F]/10 flex items-center justify-center group-hover:bg-[#93C01F]/20 transition-colors">
                <Plus className="w-6 h-6 text-[#93C01F]" />
              </div>
              <span className="font-semibold text-gray-900 text-sm">Main Category</span>
              <span className="text-[11px] text-gray-400 text-center">Top-level category visible in navigation</span>
            </button>
            <button
              onClick={() => handleTypeChosen("sub")}
              disabled={!activeSelectedMainCategory}
              title={activeSelectedMainCategory ? undefined : "Create a main category first"}
              className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-gray-200 hover:border-[#93C01F] hover:bg-[#93C01F]/5 transition-all group disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:bg-transparent"
            >
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-[#93C01F]/20 transition-colors">
                <Plus className="w-6 h-6 text-gray-400 group-hover:text-[#93C01F]" />
              </div>
              <span className="font-semibold text-gray-900 text-sm">Sub Category</span>
              <span className="text-[11px] text-gray-400 text-center">
                {activeSelectedMainCategory ? `Add one or more to ${activeSelectedMainCategory.name}` : "Create a main category first"}
              </span>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── STEP 2 / EDIT: Category Form ── */}
      <Dialog
        open={formDialogOpen}
        onOpenChange={(open) => {
          if (!open) resetForm();
          setFormDialogOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{dialogTitle}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-4">
            {editingCategory && (
              <p className="text-xs text-gray-400 -mt-2">
                {editingCategory.type === "mainCategory" ? "Main category" : `Subcategory of ${editingCategory.parent_name}`} — type and parent can&apos;t be changed here. Use merge to reassign listings to a different category.
              </p>
            )}

            {/* Name */}
            <div className="space-y-2">
              <Label className="text-gray-600">Category name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                placeholder="Category name"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label className="text-gray-600">Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                placeholder="Description"
                className="placeholder:text-gray-400"
              />
            </div>

            {/* Main category only: Make top category */}
            {isMainContext && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="make_top_cat"
                    checked={formData.make_top_cat}
                    onCheckedChange={(checked) =>
                      setFormData((p) => ({
                        ...p,
                        make_top_cat: !!checked,
                        imageFile: checked ? p.imageFile : null,
                      }))
                    }
                    className="data-[state=checked]:bg-[#93C01F] data-[state=checked]:border-[#93C01F]"
                  />
                  <label htmlFor="make_top_cat" className="text-sm font-medium leading-none">
                    Make top category
                  </label>
                </div>

                {formData.make_top_cat && (
                  <div className="space-y-2">
                    <Label className="text-gray-600">Category Image</Label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageChange}
                    />
                    {imagePreview ? (
                      <div className="relative w-full h-40 rounded-xl overflow-hidden border border-gray-200">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            setImagePreview(null);
                            setFormData((p) => ({ ...p, imageFile: null }));
                          }}
                          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80"
                        >
                          <XIcon className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full flex flex-col items-center justify-center gap-2 p-8 border-2 border-dashed border-gray-200 rounded-xl hover:border-[#93C01F] hover:bg-[#93C01F]/5 transition-all text-gray-400 hover:text-[#93C01F]"
                      >
                        <UploadCloud className="w-8 h-8" />
                        <span className="text-sm font-medium">Click to upload image</span>
                        <span className="text-xs">PNG, JPG, WebP up to 5MB</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => {
                setFormDialogOpen(false);
                resetForm();
              }}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700"
            >
              Cancel
            </Button>
            <Button
              className="bg-[#93C01F] hover:bg-[#7da815] text-white"
              onClick={handleSaveCategory}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : editingCategory ? (
                "Save Changes"
              ) : (
                "Add category"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── ADD SUBCATEGORIES (BATCH) — always scoped to one fixed parent ── */}
      <Dialog
        open={subBatchOpen}
        onOpenChange={(open) => {
          setSubBatchOpen(open);
          if (!open) {
            setSubBatchParent(null);
            setSubBatchRows([EMPTY_BATCH_ROW]);
          }
        }}
      >
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Add subcategories to {subBatchParent?.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4 max-h-[55vh] overflow-y-auto">
            {subBatchRows.map((row, index) => (
              <div key={index} className="space-y-1 rounded-lg border border-gray-100 p-3">
                <div className="flex items-start gap-2">
                  <div className="flex-1 space-y-2">
                    <Input
                      value={row.name}
                      onChange={(e) => updateBatchRow(index, { name: e.target.value })}
                      placeholder="Subcategory name"
                    />
                    <Input
                      value={row.description}
                      onChange={(e) => updateBatchRow(index, { description: e.target.value })}
                      placeholder="Description (optional)"
                      className="placeholder:text-gray-400"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeBatchRow(index)}
                    disabled={subBatchRows.length === 1}
                    className="p-2 text-gray-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Remove row"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {row.error && <p className="text-xs text-red-500">{row.error}</p>}
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="secondary"
            onClick={addBatchRow}
            className="w-full bg-gray-50 text-gray-600 border border-gray-100 gap-2"
          >
            <Plus className="w-4 h-4" /> Add another row
          </Button>

          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setSubBatchOpen(false)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700"
            >
              Cancel
            </Button>
            <Button
              className="bg-[#93C01F] hover:bg-[#7da815] text-white"
              onClick={handleSaveBatch}
              disabled={isSavingBatch || subBatchValidCount === 0}
            >
              {isSavingBatch ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                `Save ${subBatchValidCount} subcategor${subBatchValidCount === 1 ? "y" : "ies"}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── DELETE CONFIRMATION ── */}
      <AlertDialog open={!!categoryToDelete} onOpenChange={(open) => !open && setCategoryToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this category permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This action is permanent and cannot be undone. <strong>{categoryToDelete?.name}</strong> will be
              removed entirely.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteConfirm();
              }}
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Category"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── ARCHIVE CONFIRMATION ── */}
      <AlertDialog open={!!categoryToArchive} onOpenChange={(open) => !open && setCategoryToArchive(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive &quot;{categoryToArchive?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              The {categoryToArchive?.direct_listing_count} listing{categoryToArchive?.direct_listing_count === 1 ? "" : "s"} currently
              using this category will keep it. New assignments will be blocked, and it will be removed from
              selectors and public discovery.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isArchiving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleArchiveConfirm();
              }}
              className="bg-amber-600 hover:bg-amber-700"
              disabled={isArchiving}
            >
              {isArchiving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Archiving...
                </>
              ) : (
                "Archive Category"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── MERGE CONFIRMATION ── */}
      <AlertDialog
        open={!!categoryToMerge}
        onOpenChange={(open) => {
          if (!open) {
            setCategoryToMerge(null);
            setMergeTargetSlug(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Merge &quot;{categoryToMerge?.name}&quot;</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-gray-600">
                <p>
                  All {categoryToMerge?.direct_listing_count} listing{categoryToMerge?.direct_listing_count === 1 ? "" : "s"} directly
                  assigned to &quot;{categoryToMerge?.name}&quot; will move to the replacement below. &quot;{categoryToMerge?.name}&quot; will
                  then be archived.
                </p>
                <div className="space-y-1">
                  <Label className="text-gray-600">Replacement category</Label>
                  <Select value={mergeTargetSlug || ""} onValueChange={setMergeTargetSlug}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a replacement" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryToMerge &&
                        mergeCandidates(categoryToMerge).map((c) => (
                          <SelectItem key={c.slug} value={c.slug}>
                            {c.name}
                          </SelectItem>
                        ))}
                      {categoryToMerge && mergeCandidates(categoryToMerge).length === 0 && (
                        <SelectItem value="none" disabled>
                          No compatible target available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMerging}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleMergeConfirm();
              }}
              className="bg-blue-600 hover:bg-blue-700"
              disabled={isMerging || !mergeTargetSlug}
            >
              {isMerging ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Merging...
                </>
              ) : (
                "Merge Category"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function CategoriesPage() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <CategoriesPageContent />
    </RoleGuard>
  );
}

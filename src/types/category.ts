/** Public/selector category shape — matches the backend's `CategoryResource` (`/api/categories`). */
export interface Category {
  id: number;
  name: string;
  slug: string;
  type: "mainCategory" | "subCategory" | "tag";
  description: string | null;
  is_top_category: boolean | null;
  featured_image: string | null;
  parent_name: string | null;
  parent_slug: string | null;
}

export interface CategoryPermittedActions {
  edit: boolean;
  delete: boolean;
  archive: boolean;
  merge: boolean;
}

/** Admin taxonomy shape — matches `AdminCategoryResource` (`/api/admin/categories`). Never cached. */
export interface AdminCategory extends Category {
  archived_at: string | null;
  merged_into: { id: number; name: string; slug: string } | null;
  direct_listing_count: number;
  child_count: number;
  permitted_actions: CategoryPermittedActions;
}

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CountryDropdown, type Country } from "@/components/ui/country-dropdown";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import {
  Plus,
  Edit2,
  Trash2,
  Loader2,
  Search,
  ChevronUp,
  ChevronDown,
  X,
  Globe,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { toast } from "sonner";
import type {
  CuratedCollection,
  CuratedCollectionItem,
  ListingSearchResult,
} from "@/types/curated-collections";

// ─── API helpers ─────────────────────────────────────────────────────────────

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

async function fetchCollections(token: string): Promise<CuratedCollection[]> {
  const res = await fetch("/api/admin/curated_collections", {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to fetch collections");
  const json = await res.json();
  return json.data ?? [];
}

async function searchListings(
  token: string,
  q: string,
  type: string
): Promise<ListingSearchResult[]> {
  const params = new URLSearchParams({ q });
  if (type && type !== "all") params.set("type", type);
  const res = await fetch(`/api/curated_collections/listing-search?${params}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) return [];
  const json = await res.json();
  return json.data ?? [];
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface CollectionFormData {
  title: string;
  subtitle: string;
  country: string;
  sort_order: number;
  is_published: boolean;
  expires_at: string;
}

const EMPTY_FORM: CollectionFormData = {
  title: "",
  subtitle: "",
  country: "",
  sort_order: 0,
  is_published: false,
  expires_at: "",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function CollectionsPage() {
  const { user } = useAuth();
  const token = typeof window !== "undefined" ? localStorage.getItem("authToken") ?? "" : "";

  const [collections, setCollections] = useState<CuratedCollection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<CuratedCollection | null>(null);
  const [formData, setFormData] = useState<CollectionFormData>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<CuratedCollection | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Items (within the edit dialog)
  const [items, setItems] = useState<CuratedCollectionItem[]>([]);

  // Listing picker
  const [pickerQuery, setPickerQuery] = useState("");
  const [pickerType, setPickerType] = useState("all");
  const [pickerResults, setPickerResults] = useState<ListingSearchResult[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Load collections ───────────────────────────────────────────────────

  const loadCollections = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await fetchCollections(token);
      setCollections(data);
    } catch {
      toast.error("Failed to load collections");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) loadCollections();
  }, [token, loadCollections]);

  // ─── Listing picker search ──────────────────────────────────────────────

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!pickerQuery.trim() && pickerType === "all") {
      setPickerResults([]);
      return;
    }
    searchTimeout.current = setTimeout(async () => {
      setPickerLoading(true);
      const results = await searchListings(token, pickerQuery, pickerType);
      setPickerResults(results);
      setPickerLoading(false);
    }, 350);

    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [pickerQuery, pickerType, token]);

  // ─── Dialog open helpers ────────────────────────────────────────────────

  function openCreate() {
    setEditingCollection(null);
    setFormData(EMPTY_FORM);
    setItems([]);
    setPickerQuery("");
    setPickerResults([]);
    setDialogOpen(true);
  }

  function openEdit(collection: CuratedCollection) {
    setEditingCollection(collection);
    setFormData({
      title: collection.title,
      subtitle: collection.subtitle ?? "",
      country: collection.country ?? "",
      sort_order: collection.sort_order,
      is_published: collection.is_published,
      expires_at: collection.expires_at
        ? collection.expires_at.substring(0, 16)
        : "",
    });
    setItems(collection.items ?? []);
    setPickerQuery("");
    setPickerResults([]);
    setDialogOpen(true);
  }

  // ─── Save collection ────────────────────────────────────────────────────

  async function handleSave() {
    if (!formData.title.trim()) {
      toast.error("Title is required");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        title: formData.title.trim(),
        subtitle: formData.subtitle.trim() || null,
        country: formData.country.trim() || null,
        sort_order: formData.sort_order,
        is_published: formData.is_published,
        expires_at: formData.expires_at || null,
      };

      if (editingCollection) {
        const res = await fetch(
          `/api/curated_collections/${editingCollection.id}`,
          {
            method: "PUT",
            headers: authHeaders(token),
            body: JSON.stringify(payload),
          }
        );
        if (!res.ok) throw new Error();
        toast.success("Collection updated");
      } else {
        const res = await fetch("/api/curated_collections", {
          method: "POST",
          headers: authHeaders(token),
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error();
        const json = await res.json();
        // After creating, set the editing context so items can be added immediately
        const created: CuratedCollection = json.data;
        setEditingCollection(created);
        setItems([]);
        toast.success("Collection created — you can now add listings below");
        await loadCollections();
        return; // Stay in dialog for item management
      }

      setDialogOpen(false);
      await loadCollections();
    } catch {
      toast.error("Failed to save collection");
    } finally {
      setIsSaving(false);
    }
  }

  // ─── Toggle published ───────────────────────────────────────────────────

  async function handleTogglePublished(collection: CuratedCollection) {
    const token = localStorage.getItem("authToken") ?? "";
    try {
      const res = await fetch(`/api/curated_collections/${collection.id}`, {
        method: "PUT",
        headers: authHeaders(token),
        body: JSON.stringify({ is_published: !collection.is_published }),
      });
      if (!res.ok) throw new Error();
      toast.success(collection.is_published ? "Unpublished" : "Published");
      await loadCollections();
    } catch {
      toast.error("Failed to update status");
    }
  }

  // ─── Delete collection ──────────────────────────────────────────────────

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/curated_collections/${deleteTarget.id}`, {
        method: "DELETE",
        headers: authHeaders(token),
      });
      if (!res.ok) throw new Error();
      toast.success("Collection deleted");
      setDeleteTarget(null);
      await loadCollections();
    } catch {
      toast.error("Failed to delete collection");
    } finally {
      setIsDeleting(false);
    }
  }

  // ─── Add listing to collection ──────────────────────────────────────────

  async function handleAddListing(result: ListingSearchResult) {
    if (!editingCollection) return;
    if (items.length >= 15) {
      toast.error("Maximum 15 listings per collection");
      return;
    }
    if (items.some((i) => i.listing.id === result.id)) {
      toast.error("Listing already in collection");
      return;
    }

    try {
      const res = await fetch(
        `/api/curated_collections/${editingCollection.id}/items`,
        {
          method: "POST",
          headers: authHeaders(token),
          body: JSON.stringify({ listing_id: result.id }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || "Failed to add listing");
      }
      const json = await res.json();
      setItems((prev) => [...prev, json.data]);
      toast.success("Listing added");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to add listing");
    }
  }

  // ─── Remove listing from collection ────────────────────────────────────

  async function handleRemoveItem(item: CuratedCollectionItem) {
    if (!editingCollection) return;
    try {
      const res = await fetch(
        `/api/curated_collections/${editingCollection.id}/items/${item.id}`,
        {
          method: "DELETE",
          headers: authHeaders(token),
        }
      );
      if (!res.ok) throw new Error();
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      toast.success("Listing removed");
    } catch {
      toast.error("Failed to remove listing");
    }
  }

  // ─── Reorder items (up / down buttons) ─────────────────────────────────

  async function handleMoveItem(index: number, direction: "up" | "down") {
    if (!editingCollection) return;
    const newItems = [...items];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newItems.length) return;

    [newItems[index], newItems[swapIndex]] = [newItems[swapIndex], newItems[index]];

    const reorderPayload = newItems.map((item, i) => ({
      id: item.id,
      sort_order: i,
    }));

    setItems(newItems);

    try {
      await fetch(
        `/api/curated_collections/${editingCollection.id}/items/reorder`,
        {
          method: "PATCH",
          headers: authHeaders(token),
          body: JSON.stringify({ items: reorderPayload }),
        }
      );
    } catch {
      toast.error("Failed to save order");
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  if (!user || user.role !== "admin") return null;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Curated Collections</h1>
          <p className="text-sm text-gray-500 mt-1">
            Editorial carousels shown on the Discover page
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-[#93C01F] hover:bg-[#7ea919] text-white gap-2"
        >
          <Plus className="w-4 h-4" />
          New Collection
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : collections.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          No collections yet. Create one to get started.
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Title</th>
                <th className="text-left px-4 py-3">Country</th>
                <th className="text-center px-4 py-3">Items</th>
                <th className="text-center px-4 py-3">Order</th>
                <th className="text-left px-4 py-3">Expires</th>
                <th className="text-center px-4 py-3">Published</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {collections.map((col) => (
                <tr key={col.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 truncate max-w-[200px]">
                      {col.title}
                    </div>
                    {col.subtitle && (
                      <div className="text-xs text-gray-400 truncate max-w-[200px]">
                        {col.subtitle}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-gray-600">
                      {col.country ? (
                        col.country
                      ) : (
                        <>
                          <Globe className="w-3.5 h-3.5" />
                          <span className="text-xs">Global</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-700">
                    {col.items_count}
                    <span className="text-gray-400">/15</span>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-700">
                    {col.sort_order + 1}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {col.expires_at
                      ? new Date(col.expires_at).toLocaleDateString("en-GB")
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Switch
                      checked={col.is_published}
                      onCheckedChange={() => handleTogglePublished(col)}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(col)}
                        className="text-gray-500 hover:text-[#0D7077]"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(col)}
                        className="text-gray-500 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCollection ? "Edit Collection" : "New Collection"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Mefie Restaurant Discounts"
              />
            </div>

            {/* Subtitle */}
            <div className="space-y-1.5">
              <Label htmlFor="subtitle">Subtitle</Label>
              <Textarea
                id="subtitle"
                value={formData.subtitle}
                onChange={(e) => setFormData((f) => ({ ...f, subtitle: e.target.value }))}
                placeholder="Brief description shown below the title"
                rows={2}
              />
            </div>

            {/* Country + Sort Order */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Country</Label>
                <div className="flex items-center gap-2">
                  <CountryDropdown
                    defaultValue={formData.country}
                    onChange={(country: Country) =>
                      setFormData((f) => ({ ...f, country: country.name }))
                    }
                    placeholder="Select country…"
                    className="rounded-md flex-1"
                  />
                  {formData.country && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setFormData((f) => ({ ...f, country: "" }))}
                      className="shrink-0 text-gray-400 hover:text-red-400"
                      title="Clear (show globally)"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                {!formData.country && (
                  <p className="text-xs text-gray-400">No country = shown globally</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sort_order">Position (sort order)</Label>
                <Input
                  id="sort_order"
                  type="number"
                  min={0}
                  value={formData.sort_order}
                  onChange={(e) =>
                    setFormData((f) => ({ ...f, sort_order: Number(e.target.value) }))
                  }
                />
              </div>
            </div>

            {/* Expires At + Published */}
            <div className="grid grid-cols-2 gap-4 items-end">
              <div className="space-y-1.5">
                <Label htmlFor="expires_at">Expires at (optional)</Label>
                <Input
                  id="expires_at"
                  type="datetime-local"
                  value={formData.expires_at}
                  onChange={(e) => setFormData((f) => ({ ...f, expires_at: e.target.value }))}
                />
              </div>
              <div className="flex items-center gap-3 pb-1">
                <Switch
                  id="is_published"
                  checked={formData.is_published}
                  onCheckedChange={(v) => setFormData((f) => ({ ...f, is_published: v }))}
                />
                <Label htmlFor="is_published">Published</Label>
              </div>
            </div>

            {/* ── Listing items (only when editing an existing collection) ── */}
            {editingCollection && (
              <div className="border-t pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-800">Listings</h3>
                  <span className="text-xs text-gray-400">{items.length} / 15</span>
                </div>

                {/* Current items */}
                {items.length > 0 && (
                  <div className="space-y-2">
                    {items.map((item, index) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg border border-gray-100"
                      >
                        {/* Thumb */}
                        {item.listing.images[0]?.thumb && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.listing.images[0].thumb}
                            alt={item.listing.name}
                            className="w-10 h-10 rounded-md object-cover shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {item.listing.name}
                          </p>
                          <p className="text-xs text-gray-400 capitalize">
                            {item.listing.type}
                            {item.listing.city ? ` · ${item.listing.city}` : ""}
                          </p>
                        </div>
                        {/* Order buttons */}
                        <div className="flex flex-col gap-0.5">
                          <button
                            onClick={() => handleMoveItem(index, "up")}
                            disabled={index === 0}
                            className="p-0.5 rounded hover:bg-gray-200 disabled:opacity-30"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleMoveItem(index, "down")}
                            disabled={index === items.length - 1}
                            className="p-0.5 rounded hover:bg-gray-200 disabled:opacity-30"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <button
                          onClick={() => handleRemoveItem(item)}
                          className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Picker */}
                {items.length < 15 && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          value={pickerQuery}
                          onChange={(e) => setPickerQuery(e.target.value)}
                          placeholder="Search listings by name..."
                          className="pl-9"
                        />
                      </div>
                      <Select value={pickerType} onValueChange={setPickerType}>
                        <SelectTrigger className="w-36">
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All types</SelectItem>
                          <SelectItem value="business">Business</SelectItem>
                          <SelectItem value="event">Event</SelectItem>
                          <SelectItem value="community">Community</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {pickerLoading && (
                      <div className="text-xs text-gray-400 px-1">Searching…</div>
                    )}

                    {pickerResults.length > 0 && (
                      <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                        {pickerResults.map((result) => {
                          const alreadyAdded = items.some(
                            (i) => i.listing.id === result.id
                          );
                          return (
                            <button
                              key={result.id}
                              onClick={() => !alreadyAdded && handleAddListing(result)}
                              disabled={alreadyAdded}
                              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 text-left disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {result.thumb ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={result.thumb}
                                  alt={result.name}
                                  className="w-8 h-8 rounded object-cover shrink-0"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded bg-gray-100 shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {result.name}
                                </p>
                                <p className="text-xs text-gray-400 capitalize">
                                  {result.type}
                                  {result.city ? ` · ${result.city}` : ""}
                                </p>
                              </div>
                              {alreadyAdded ? (
                                <span className="text-xs text-gray-400">Added</span>
                              ) : (
                                <Plus className="w-4 h-4 text-[#93C01F] shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {editingCollection ? "Close" : "Cancel"}
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-[#93C01F] hover:bg-[#7ea919] text-white"
            >
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingCollection ? "Save changes" : "Create collection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete collection?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.title}&rdquo; and all its listings will be
              permanently removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

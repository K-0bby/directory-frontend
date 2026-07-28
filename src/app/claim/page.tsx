"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  MapPin,
  Plus,
  Search as SearchIcon,
  Store,
  Users,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/auth-context";
import { search } from "@/lib/api";
import { getImageUrl } from "@/lib/directory/image-utils";
import {
  ApiListing,
  ApiListingsResponse,
  pickDisplayCategory,
} from "@/lib/directory/types";

type ListingType = "business" | "event" | "community";
type SearchResponse = ApiListing[] | ApiListingsResponse;

const listingTypes: Array<{
  id: ListingType;
  label: string;
  description: string;
  icon: typeof Building2;
}> = [
  {
    id: "business",
    label: "Business Listing",
    description: "For companies, shops, and services.",
    icon: Building2,
  },
  {
    id: "event",
    label: "Event Listing",
    description: "For concerts, workshops, and gatherings.",
    icon: CalendarDays,
  },
  {
    id: "community",
    label: "Community Listing",
    description: "For groups, clubs, and non-profits.",
    icon: Users,
  },
];

function listingImage(listing: ApiListing): string {
  const first = listing.images?.[0];
  if (typeof first === "string") return getImageUrl(first);
  return getImageUrl(first?.card || first?.webp || first?.original);
}

function listingLocation(listing: ApiListing): string {
  return [listing.address, listing.city, listing.country]
    .filter(Boolean)
    .filter((value, index, values) => values.indexOf(value) === index)
    .join(", ");
}

export default function ClaimPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [nameQuery, setNameQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [results, setResults] = useState<ApiListing[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const searchListings = useCallback(async () => {
    const q = nameQuery.trim();
    const location = locationQuery.trim();

    if (q.length < 3) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    try {
      const payload = await search<SearchResponse>({
        q,
        ...(location ? { location } : {}),
      });
      setResults(Array.isArray(payload) ? payload : payload.data ?? []);
    } catch (error) {
      console.error("Listing search failed", error);
      setResults([]);
      toast.error("We could not search listings. You can still create one manually.");
    } finally {
      setIsSearching(false);
    }
  }, [locationQuery, nameQuery]);

  useEffect(() => {
    const timer = window.setTimeout(searchListings, 500);
    return () => window.clearTimeout(timer);
  }, [searchListings]);

  const authenticatedDestination = (destination: string) => {
    if (user) {
      router.push(destination);
      return;
    }
    router.push(`/auth/login?redirect=${encodeURIComponent(destination)}`);
  };

  const handleClaim = (listing: ApiListing) => {
    authenticatedDestination(`/claim/${listing.slug || listing.id}/verify`);
  };

  const handleManualAdd = (type: ListingType) => {
    const params = new URLSearchParams({ type, source: "claim" });
    const name = nameQuery.trim().slice(0, 255);
    if (name) params.set("name", name);
    authenticatedDestination(`/dashboard/my-listing/create?${params.toString()}`);
  };

  const viewListing = (listing: ApiListing) => {
    const segments: Record<ListingType, string> = {
      business: "businesses",
      event: "events",
      community: "communities",
    };
    const type = (
      listing.type === "event" || listing.type === "community"
        ? listing.type
        : "business"
    ) as ListingType;
    router.push(`/${segments[type]}/${listing.slug || listing.id}`);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <section className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 pt-28 pb-8">
          <div className="flex items-start gap-4 mb-8">
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="Go back"
              className="p-2 bg-gray-100 hover:bg-gray-50 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-[#93C01F]" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Find or create your listing
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Search first to claim an existing listing, or create a new one if none belongs to you.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <Store className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                value={nameQuery}
                onChange={(event) => setNameQuery(event.target.value)}
                placeholder="Listing name (for example, Hello)"
                className="pl-12 py-6 bg-gray-50 border-gray-300 rounded-xl text-base shadow-none focus-visible:ring-[#93C01F]"
              />
            </div>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                value={locationQuery}
                onChange={(event) => setLocationQuery(event.target.value)}
                placeholder="Location (for example, London, UK)"
                className="pl-12 py-6 bg-gray-50 border-gray-300 rounded-xl text-base shadow-none focus-visible:ring-[#93C01F]"
              />
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-3xl mx-auto px-4 py-6">
       

        <div className="mt-6 mb-4 flex items-center gap-3">
          <span className="text-xs font-bold text-gray-400 tracking-wider uppercase">
            Search results
          </span>
          <Badge variant="secondary">{results.length} found</Badge>
          <div className="h-px bg-gray-200 flex-1" />
        </div>

        <div className="space-y-4">
          {isSearching ? (
            [1, 2, 3].map((item) => (
              <div key={item} className="h-28 bg-white rounded-2xl animate-pulse" />
            ))
          ) : results.length > 0 ? (
            results.map((listing) => {
              const type =
                listing.type || listing.listing_type || "business";
              const category = pickDisplayCategory(listing.categories ?? []);
              const claimed = listing.claim_status === "claimed";

              return (
                <article
                  key={listing.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-gray-200 bg-white shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() => viewListing(listing)}
                    className="flex items-center gap-4 text-left min-w-0"
                  >
                    <div className="relative w-16 h-16 shrink-0 overflow-hidden rounded-xl border bg-gray-50">
                      <Image
                        src={listingImage(listing)}
                        alt=""
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <h2 className="font-bold text-lg text-slate-900 truncate">
                        {listing.name}
                      </h2>
                      <p className="text-gray-500 text-sm mt-0.5">
                        {listingLocation(listing) || "Location not provided"}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="outline" className="capitalize">{type}</Badge>
                        {category?.name && <Badge variant="secondary">{category.name}</Badge>}
                      </div>
                    </div>
                  </button>
                  <Button
                    type="button"
                    disabled={claimed}
                    onClick={() => handleClaim(listing)}
                    className={claimed
                      ? "bg-gray-100 text-gray-400 sm:min-w-[100px]"
                      : "bg-[#93C01F] hover:bg-[#7ea919] text-white sm:min-w-[100px]"
                    }
                  >
                    {claimed ? "Claimed" : "Claim"}
                  </Button>
                </article>
              );
            })
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
                {hasSearched ? (
                  <XCircle className="w-8 h-8 text-gray-400" />
                ) : (
                  <SearchIcon className="w-8 h-8 text-gray-300" />
                )}
              </div>
              <h2 className="font-semibold text-lg text-gray-900">
                {hasSearched ? "No matching listings found" : "Start your search"}
              </h2>
              <p className="text-gray-500 text-sm mt-2">
                {hasSearched
                  ? "Try another name or location, or create your listing manually."
                  : "Enter at least three characters, or create a listing manually."}
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 mb-12 flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-gray-600">
            Can&apos;t see your listing, or do the matches belong to someone else?
          </p>
          <Button
            type="button"
            onClick={() => setIsDialogOpen(true)}
            variant="outline"
            className="w-full max-w-sm h-12 border-2 border-[#93C01F] text-[#93C01F] gap-2 hover:bg-[#93C01F] hover:text-white"
          >
            <Plus className="w-5 h-5" />
            Create a new listing manually
          </Button>
        </div>
      </main>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-bold text-[#1F3A4C]">
              Select listing type
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {listingTypes.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => handleManualAdd(item.id)}
                className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50 hover:border-[#93C01F] hover:bg-[#93C01F]/5 text-left group"
              >
                <div className="w-10 h-10 rounded-full bg-white border flex items-center justify-center shrink-0 group-hover:border-[#93C01F]">
                  <item.icon className="w-5 h-5 text-gray-500 group-hover:text-[#93C01F]" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{item.label}</h3>
                  <p className="text-xs text-gray-500">{item.description}</p>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  RefreshCw,
  Search,
  X,
} from "lucide-react";

import {
  AgentClaimState,
  AgentListingState,
  AgentWorkListing,
  AgentWorkResponse,
  getAgentWork,
} from "@/lib/api";
import { AgentCreateListingDialog } from "@/components/dashboard/listing/agent-create-listing-dialog";
import { RoleGuard } from "@/components/dashboard/role-guard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type WorkFilter = "all" | AgentListingState | AgentClaimState;

const FILTERS: Array<{ value: WorkFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "draft", label: "Drafts" },
  { value: "pending", label: "In review" },
  { value: "changes_requested", label: "Needs changes" },
  { value: "approved", label: "Published" },
  { value: "rejected", label: "Rejected" },
  { value: "suspended", label: "Suspended" },
  { value: "claim_in_progress", label: "Claim in progress" },
  { value: "claimed", label: "Handed over" },
];

const VALID_FILTERS = new Set<WorkFilter>(
  FILTERS.map((filter) => filter.value),
);

function label(value: string | null): string {
  if (!value) return "None";
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function moderationClass(state: AgentListingState): string {
  if (state === "approved") return "bg-[#E9F5D6] text-[#5F8B0A] border-[#d6e8b9]";
  if (state === "pending") return "bg-yellow-100 text-yellow-700 border-yellow-200";
  if (state === "changes_requested") return "bg-amber-100 text-amber-800 border-amber-200";
  if (state === "draft") return "bg-slate-100 text-slate-700 border-slate-200";
  if (state === "suspended") return "bg-orange-100 text-orange-700 border-orange-200";
  return "bg-red-100 text-red-800 border-red-200";
}

function claimClass(state: AgentClaimState): string {
  if (state === "claimed") return "bg-slate-100 text-slate-700 border-slate-200";
  if (state === "claim_in_progress") return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-emerald-100 text-emerald-800 border-emerald-200";
}

function actionLabel(listing: AgentWorkListing): string {
  return (
    {
      read_only_history: "View history",
      edit_or_submit: "Continue listing",
      await_moderation_or_edit: "Open workspace",
      edit_and_resubmit: "Address changes",
      continue_revision: "Continue revision",
      maintain_through_revision: "Maintain listing",
      read_only: "View listing",
    } as const
  )[listing.available_next_action];
}

function pageNumbers(current: number, total: number): number[] {
  if (total <= 4) return Array.from({ length: total }, (_, index) => index + 1);
  if (current <= 3) return [1, 2, 3, 4];
  if (current >= total - 2) return [total - 3, total - 2, total - 1, total];
  return [current - 1, current, current + 1, current + 2];
}

function ListingBadges({ listing }: { listing: AgentWorkListing }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge variant="outline">{label(listing.listing_type)}</Badge>
      <Badge className={moderationClass(listing.listing_state)}>
        {label(listing.listing_state)}
      </Badge>
      <Badge className={claimClass(listing.claim_state)}>
        {label(listing.claim_state)}
      </Badge>
      {listing.revision_state && (
        <Badge variant="outline">Revision: {label(listing.revision_state)}</Badge>
      )}
    </div>
  );
}

export default function AgentMyListings() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const rawState = searchParams.get("state") ?? "all";
  const state = VALID_FILTERS.has(rawState as WorkFilter)
    ? (rawState as WorkFilter)
    : "all";
  const query = searchParams.get("q")?.slice(0, 100) ?? "";
  const requestedPage = Number(searchParams.get("page") ?? "1");
  const page = Number.isInteger(requestedPage) && requestedPage > 0
    ? requestedPage
    : 1;

  const [searchInput, setSearchInput] = useState(query);
  const [response, setResponse] = useState<AgentWorkResponse>({
    data: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const replaceQuery = useCallback(
    (changes: Record<string, string | number | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(changes).forEach(([key, value]) => {
        if (value === null || value === "" || (key === "state" && value === "all")) {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      });
      const next = params.toString();
      router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    setSearchInput(query);
  }, [query]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const trimmed = searchInput.trim();
      if (trimmed !== query) replaceQuery({ q: trimmed || null, page: null });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query, replaceQuery, searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAgentWork(
        localStorage.getItem("authToken") ?? undefined,
        {
          state: state === "all" ? undefined : state,
          q: query || undefined,
          page,
          perPage: 20,
        },
      );
      setResponse(data);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load agent listings",
      );
    } finally {
      setLoading(false);
    }
  }, [page, query, state]);

  useEffect(() => {
    void load();
  }, [load]);

  const meta = response.meta;
  const currentPage = meta?.current_page ?? page;
  const totalPages = Math.max(meta?.last_page ?? 1, 1);
  const total = meta?.total ?? response.data.length;
  const perPage = meta?.per_page ?? 20;
  const start = total === 0 ? 0 : (currentPage - 1) * perPage + 1;
  const end = Math.min(start + response.data.length - 1, total);
  const pages = useMemo(
    () => pageNumbers(currentPage, totalPages),
    [currentPage, totalPages],
  );

  return (
    <RoleGuard allowedRoles={["listing_agent"]}>
      <div className="mx-auto w-full max-w-7xl space-y-6 px-3 py-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-[#6f9414]">Listing operations</p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
              My Listings
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Search and manage your current work and read-only listing history.
            </p>
          </div>
          <AgentCreateListingDialog />
        </div>

        <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search listings..."
              className="rounded-lg bg-white pl-9 pr-10 shadow-none"
              maxLength={100}
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                aria-label="Clear listing search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="overflow-x-auto pb-1">
            <div className="flex min-w-max gap-2">
              {FILTERS.map((filter) => (
                <Button
                  key={filter.value}
                  type="button"
                  variant={state === filter.value ? "default" : "outline"}
                  className={`rounded-lg px-5 shadow-none ${
                    state === filter.value
                      ? "border-[#93C01F] bg-[#93C01F] text-white hover:bg-[#7ea919]"
                      : "border-gray-200 text-gray-500 hover:text-gray-700"
                  }`}
                  onClick={() =>
                    replaceQuery({ state: filter.value, page: null })
                  }
                >
                  {filter.label}
                </Button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-64 items-center justify-center text-gray-500">
              <RefreshCw className="mr-2 h-5 w-5 animate-spin text-[#93C01F]" />
              Loading listings…
            </div>
          ) : error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-red-800">
              <CircleAlert className="mx-auto mb-2 h-5 w-5" />
              <p>{error}</p>
              <Button type="button" variant="outline" className="mt-4" onClick={() => void load()}>
                Try again
              </Button>
            </div>
          ) : response.data.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 p-8 text-center">
              <p className="font-medium text-gray-700">
                {query ? "No listings match your search" : "No listings in this view"}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {query
                  ? "Try a different name, slug, city, or country."
                  : "Choose another lifecycle filter or create a listing."}
              </p>
            </div>
          ) : (
            <>
              <div className="hidden overflow-hidden rounded-lg border md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-200 hover:bg-gray-200">
                      <TableHead className="font-semibold">Listing</TableHead>
                      <TableHead className="font-semibold">Type</TableHead>
                      <TableHead className="font-semibold">Moderation</TableHead>
                      <TableHead className="font-semibold">Revision</TableHead>
                      <TableHead className="font-semibold">Claim</TableHead>
                      <TableHead className="font-semibold">Sources</TableHead>
                      <TableHead className="font-semibold">Updated</TableHead>
                      <TableHead className="text-right font-semibold">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {response.data.map((listing) => (
                      <TableRow key={listing.id} className="hover:bg-gray-50/70">
                        <TableCell>
                          <div>
                            <p className="font-semibold text-[#1F3A4C]">{listing.name}</p>
                            <p className="text-xs text-gray-500">{listing.slug}</p>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="outline">{label(listing.listing_type)}</Badge></TableCell>
                        <TableCell><Badge className={moderationClass(listing.listing_state)}>{label(listing.listing_state)}</Badge></TableCell>
                        <TableCell className="text-sm text-gray-600">{label(listing.revision_state)}</TableCell>
                        <TableCell><Badge className={claimClass(listing.claim_state)}>{label(listing.claim_state)}</Badge></TableCell>
                        <TableCell className="text-sm text-gray-600">{listing.source_count}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-gray-600">
                          {new Date(listing.last_updated_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/dashboard/agent/listings/${listing.slug}`}>
                              {actionLabel(listing)}
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-3 md:hidden">
                {response.data.map((listing) => (
                  <article key={listing.id} className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div>
                      <h2 className="font-semibold text-[#1F3A4C]">{listing.name}</h2>
                      <p className="text-xs text-gray-500">{listing.slug}</p>
                    </div>
                    <ListingBadges listing={listing} />
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{listing.source_count} private source(s)</span>
                      <span>{new Date(listing.last_updated_at).toLocaleDateString()}</span>
                    </div>
                    <Button asChild className="w-full bg-[#93C01F] text-white hover:bg-[#7ea919]">
                      <Link href={`/dashboard/agent/listings/${listing.slug}`}>
                        {actionLabel(listing)}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </article>
                ))}
              </div>

              <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm text-gray-600">
                  Showing <span className="font-semibold">{start}-{end}</span> of{" "}
                  <span className="font-semibold">{total}</span>
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => replaceQuery({ page: currentPage - 1 })}
                    disabled={currentPage === 1}
                    className="h-9 w-9 rounded-full border"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <div className="flex gap-1">
                    {pages.map((pageNumber) => (
                      <Button
                        key={pageNumber}
                        type="button"
                        variant={currentPage === pageNumber ? "default" : "ghost"}
                        size="icon"
                        onClick={() => replaceQuery({ page: pageNumber })}
                        className={`h-9 w-9 rounded-full ${
                          currentPage === pageNumber
                            ? "bg-[#93C01F] text-white hover:bg-[#93C01F]/90"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        {pageNumber}
                      </Button>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => replaceQuery({ page: currentPage + 1 })}
                    disabled={currentPage === totalPages}
                    className="h-9 w-9 rounded-full border"
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
                <span className="text-xs text-gray-500 sm:hidden">
                  Page {currentPage} of {totalPages}
                </span>
              </div>
            </>
          )}
        </section>
      </div>
    </RoleGuard>
  );
}

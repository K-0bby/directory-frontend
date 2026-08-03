"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Handshake,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

import {
  AgentClaimState,
  AgentMetrics,
  AgentWorkListing,
  getAgentMetrics,
  getAgentWork,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RoleGuard } from "@/components/dashboard/role-guard";
import { AgentCreateListingDialog } from "@/components/dashboard/listing/agent-create-listing-dialog";

function formatPercent(value: number | null): string {
  return value === null ? "—" : `${Math.round(value * 100)}%`;
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  const hours = Math.round(seconds / 3600);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

function stateLabel(value: string | null): string {
  if (!value) return "None";
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function claimBadgeClass(state: AgentClaimState): string {
  if (state === "claimed") return "bg-slate-100 text-slate-700";
  if (state === "claim_in_progress") return "bg-amber-100 text-amber-800";
  return "bg-emerald-100 text-emerald-800";
}

export default function AgentHome() {
  const [metrics, setMetrics] = useState<AgentMetrics | null>(null);
  const [listings, setListings] = useState<AgentWorkListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = localStorage.getItem("authToken") ?? undefined;
    setLoading(true);
    setError(null);
    try {
      const [metricData, workData] = await Promise.all([
        getAgentMetrics(token),
        getAgentWork(token, { perPage: 5 }),
      ]);
      setMetrics(metricData);
      setListings(workData.data);
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : "Could not load the agent workspace";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <RoleGuard allowedRoles={["listing_agent"]}>
      <div className="mx-auto w-full max-w-7xl space-y-6 px-3 py-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-[#6f9414]">Listing operations</p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
              Agent workspace
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Create, evidence, submit and maintain unowned listings. Ownership
              handoff immediately makes a listing read-only here.
            </p>
          </div>
          <AgentCreateListingDialog />
          <Button asChild variant="outline">
            <Link href="/dashboard/agent/owned">Owned listings</Link>
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[
            ["Created", metrics?.created ?? "—"],
            ["Submitted", metrics?.submitted ?? "—"],
            ["Approved", metrics?.approved ?? "—"],
            ["Claimed", metrics?.claimed ?? "—"],
            ["Approval rate", formatPercent(metrics?.approval_rate ?? null)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {label}
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border bg-white p-4">
            <p className="text-sm text-slate-500">Median moderation turnaround</p>
            <p className="mt-1 text-lg font-semibold">
              {formatDuration(metrics?.median_moderation_turnaround_seconds ?? null)}
            </p>
          </div>
          <div className="rounded-xl border bg-white p-4">
            <p className="text-sm text-slate-500">Duplicate-warning rate</p>
            <p className="mt-1 text-lg font-semibold">
              {formatPercent(metrics?.duplicate_warning_rate ?? null)}
            </p>
          </div>
        </div>

        <section className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Recent listing work</h2>
              <p className="text-sm text-slate-500">
                Your five most recently updated listings.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="outline">
                <Link href="/dashboard/agent/listings">View all listings</Link>
              </Button>
              <Button type="button" size="icon" variant="ghost" onClick={() => void load()}>
                <RefreshCw className="h-4 w-4" />
                <span className="sr-only">Refresh</span>
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-48 items-center justify-center text-slate-500">
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Loading workspace…
            </div>
          ) : error ? (
            <div className="m-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <CircleAlert className="mr-2 inline h-4 w-4" />
              {error}
            </div>
          ) : listings.length === 0 ? (
            <div className="min-h-48 p-8 text-center text-sm text-slate-500">
              No listing work yet.
            </div>
          ) : (
            <div className="divide-y">
              {listings.map((listing) => {
                const handedOver = listing.claim_state === "claimed";
                return (
                  <article
                    key={listing.id}
                    className="grid gap-4 p-4 transition-colors hover:bg-slate-50 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto]"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate font-semibold text-slate-950">
                          {listing.name}
                        </h3>
                        <Badge variant="outline">{stateLabel(listing.listing_type)}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        Updated {new Date(listing.last_updated_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-sm">
                      <p className="text-xs text-slate-500">Moderation</p>
                      <p className="font-medium">{stateLabel(listing.listing_state)}</p>
                    </div>
                    <div className="text-sm">
                      <p className="text-xs text-slate-500">Claim</p>
                      <Badge className={claimBadgeClass(listing.claim_state)}>
                        {listing.claim_state === "claim_in_progress" && (
                          <Clock3 className="mr-1 h-3 w-3" />
                        )}
                        {listing.claim_state === "claimed" && (
                          <Handshake className="mr-1 h-3 w-3" />
                        )}
                        {listing.claim_state === "unclaimed" && (
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                        )}
                        {stateLabel(listing.claim_state)}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-end">
                      <Button asChild size="sm" variant={handedOver ? "outline" : "default"}>
                        <Link href={`/dashboard/agent/listings/${listing.slug}`}>
                          {handedOver ? "View history" : "View listing"}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {metrics?.historical_coverage_notice && (
          <p className="text-xs text-slate-500">{metrics.historical_coverage_notice}</p>
        )}

      </div>
    </RoleGuard>
  );
}

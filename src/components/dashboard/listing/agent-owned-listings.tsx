"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, RefreshCw } from "lucide-react";

import {
  getGrandfatheredOwnedListings,
  GrandfatheredOwnedListing,
} from "@/lib/api";
import { RoleGuard } from "@/components/dashboard/role-guard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function AgentOwnedListings() {
  const [listings, setListings] = useState<GrandfatheredOwnedListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("authToken") ?? undefined;
      const response = await getGrandfatheredOwnedListings(token);
      setListings(response.data);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load owned listings",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <RoleGuard allowedRoles={["listing_agent"]}>
      <div className="mx-auto w-full max-w-6xl space-y-6 px-3 py-6 lg:px-8">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-3">
            <Link href="/dashboard/agent">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Agent workspace
            </Link>
          </Button>
          <h1 className="mt-2 text-2xl font-semibold">Owned listings</h1>
          <p className="mt-1 text-sm text-slate-500">
            Only ownership explicitly snapshotted during the live-data
            grandfathering review appears here. Agent work remains separate.
          </p>
        </div>

        {loading ? (
          <div className="flex min-h-48 items-center justify-center text-slate-500">
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            Loading owned listings…
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        ) : listings.length === 0 ? (
          <div className="rounded-xl border bg-white p-8 text-center text-sm text-slate-500">
            No grandfathered owned listings are attached to this account.
          </div>
        ) : (
          <div className="divide-y overflow-hidden rounded-xl border bg-white">
            {listings.map((listing) => (
              <article
                key={listing.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold">{listing.name}</h2>
                    <Badge variant="outline">{listing.type}</Badge>
                    <Badge>{listing.status.replaceAll("_", " ")}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {[listing.city, listing.country].filter(Boolean).join(", ") ||
                      "Location not set"}
                  </p>
                </div>
                <Button asChild size="sm">
                  <Link href={`/dashboard/my-listing/${listing.slug}`}>
                    Manage as owner
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </article>
            ))}
          </div>
        )}
      </div>
    </RoleGuard>
  );
}

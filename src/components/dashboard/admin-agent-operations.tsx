"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  AdminDuplicateAssessment,
  AdminPendingRevision,
  AdminStewardshipQueueItem,
  EligibleStewardshipAgent,
  OperationsPaginationMeta,
  assignListingSteward,
  decideAdminListingRevision,
  getAdminDuplicateAssessments,
  getAdminPendingRevisions,
  getAdminStewardshipQueue,
  getEligibleStewardshipAgents,
  resolveAdminDuplicateAssessment,
} from "@/lib/api";
import { RoleGuard } from "@/components/dashboard/role-guard";
import {
  StewardshipQueueCard,
  StewardshipQueueTable,
} from "@/components/dashboard/agent-operations/stewardship-queue-view";
import {
  RevisionQueueCard,
  RevisionQueueTable,
} from "@/components/dashboard/agent-operations/revision-queue-view";
import {
  DuplicateQueueCard,
  DuplicateQueueTable,
} from "@/components/dashboard/agent-operations/duplicate-queue-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type AgentOperationsView = "stewardship" | "revisions" | "duplicates";

interface Props {
  view: AgentOperationsView;
}

const EMPTY_META: OperationsPaginationMeta = {
  current_page: 1,
  last_page: 1,
  per_page: 20,
  total: 0,
};

const VIEW_COPY = {
  stewardship: {
    eyebrow: "Stewardship operations",
    title: "Unassigned or unavailable stewardship",
    description: "Assign unowned work or reassign work whose current steward is unavailable.",
    empty: "The stewardship queue is clear.",
    noResults: "No stewardship records match your search.",
  },
  revisions: {
    eyebrow: "Revision moderation",
    title: "Pending approved-listing revisions",
    description: "Review version-guarded changes submitted against approved listings.",
    empty: "No revisions are awaiting moderation.",
    noResults: "No pending revisions match your search.",
  },
  duplicates: {
    eyebrow: "Duplicate resolution",
    title: "Strong duplicate collisions",
    description: "Resolve strong identity collisions before affected listings can proceed.",
    empty: "No strong collisions await resolution.",
    noResults: "No duplicate collisions match your search.",
  },
} satisfies Record<AgentOperationsView, Record<string, string>>;

function pageNumbers(current: number, last: number): number[] {
  const start = Math.max(1, Math.min(current - 2, last - 4));
  return Array.from({ length: Math.min(5, last) }, (_, index) => start + index);
}

export default function AdminAgentOperations({ view }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.get("q")?.slice(0, 100) ?? "";
  const parsedPage = Number(searchParams.get("page") ?? "1");
  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const [searchInput, setSearchInput] = useState(query);
  const [stewardship, setStewardship] = useState<AdminStewardshipQueueItem[]>([]);
  const [revisions, setRevisions] = useState<AdminPendingRevision[]>([]);
  const [duplicates, setDuplicates] = useState<AdminDuplicateAssessment[]>([]);
  const [agents, setAgents] = useState<EligibleStewardshipAgent[]>([]);
  const [meta, setMeta] = useState(EMPTY_META);
  const [selectedAgents, setSelectedAgents] = useState<Record<number, string>>({});
  const [reasons, setReasons] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const replaceQuery = useCallback(
    (updates: { q?: string; page?: number }) => {
      const params = new URLSearchParams(searchParams.toString());
      const nextQuery = updates.q === undefined ? query : updates.q.trim();
      const nextPage = updates.page ?? page;
      if (nextQuery) params.set("q", nextQuery);
      else params.delete("q");
      if (nextPage > 1) params.set("page", String(nextPage));
      else params.delete("page");
      router.replace(`${pathname}${params.size ? `?${params}` : ""}`, { scroll: false });
    },
    [page, pathname, query, router, searchParams],
  );

  useEffect(() => setSearchInput(query), [query]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const trimmed = searchInput.trim();
      if (trimmed !== query) replaceQuery({ q: trimmed, page: 1 });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query, replaceQuery, searchInput]);

  const load = useCallback(async () => {
    const token = localStorage.getItem("authToken") ?? undefined;
    setLoading(true);
    setError(null);
    try {
      if (view === "stewardship") {
        const [response, eligible] = await Promise.all([
          getAdminStewardshipQueue(token, { q: query, page, perPage: 20 }),
          getEligibleStewardshipAgents(token),
        ]);
        setStewardship(response.data);
        setAgents(eligible);
        setMeta(response.meta);
      } else if (view === "revisions") {
        const response = await getAdminPendingRevisions(token, {
          q: query,
          page,
          perPage: 20,
        });
        setRevisions(response.data);
        setMeta(response.meta);
      } else {
        const response = await getAdminDuplicateAssessments(token, {
          q: query,
          page,
          perPage: 20,
        });
        setDuplicates(response.data);
        setMeta(response.meta);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load agent operations");
    } finally {
      setLoading(false);
    }
  }, [page, query, view]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!loading && meta.total > 0 && page > meta.last_page) {
      replaceQuery({ page: meta.last_page });
    }
  }, [loading, meta.last_page, meta.total, page, replaceQuery]);

  async function assign(item: AdminStewardshipQueueItem) {
    const selected = Number(selectedAgents[item.listing_id]);
    if (!selected) {
      toast.error("Select an eligible agent first.");
      return;
    }
    setBusy(`steward-${item.listing_id}`);
    try {
      await assignListingSteward(
        item.slug,
        selected,
        item.current_steward !== null,
        localStorage.getItem("authToken") ?? undefined,
      );
      toast.success("Stewardship updated.");
      await load();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Could not update stewardship");
    } finally {
      setBusy(null);
    }
  }

  async function decide(
    revision: AdminPendingRevision,
    decision: "approve" | "changes_requested" | "reject",
  ) {
    const reason = reasons[revision.id]?.trim() ?? "";
    if (decision !== "approve" && reason.length < 5) {
      toast.error("A clear moderation reason is required.");
      return;
    }
    setBusy(`revision-${revision.id}`);
    try {
      await decideAdminListingRevision(
        revision,
        decision,
        reason,
        localStorage.getItem("authToken") ?? undefined,
      );
      toast.success("Revision decision recorded.");
      await load();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Could not decide revision");
    } finally {
      setBusy(null);
    }
  }

  async function resolveDuplicate(
    assessment: AdminDuplicateAssessment,
    resolution: "distinct" | "duplicate",
  ) {
    const reason = reasons[-assessment.assessment_id]?.trim() ?? "";
    if (reason.length < 5) {
      toast.error("A clear resolution reason is required.");
      return;
    }
    setBusy(`duplicate-${assessment.assessment_id}`);
    try {
      await resolveAdminDuplicateAssessment(
        assessment.assessment_id,
        resolution,
        reason,
        localStorage.getItem("authToken") ?? undefined,
      );
      toast.success("Duplicate assessment resolved.");
      await load();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Could not resolve assessment");
    } finally {
      setBusy(null);
    }
  }

  const rows = view === "stewardship" ? stewardship : view === "revisions" ? revisions : duplicates;
  const copy = VIEW_COPY[view];
  const visibleStart = meta.total === 0 ? 0 : (meta.current_page - 1) * meta.per_page + 1;
  const visibleEnd = Math.min(meta.current_page * meta.per_page, meta.total);
  const pages = useMemo(
    () => pageNumbers(meta.current_page, meta.last_page),
    [meta.current_page, meta.last_page],
  );

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="mx-auto w-full max-w-7xl space-y-6 px-3 py-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-[#6f9414]">{copy.eyebrow}</p>
            <h1 className="text-3xl font-semibold text-slate-950">{copy.title}</h1>
            <p className="mt-1 text-sm text-slate-500">{copy.description}</p>
          </div>
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 p-4">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value.slice(0, 100))}
                placeholder="Search this queue..."
                className="rounded-lg bg-white pl-9 pr-9 shadow-none"
              />
              {searchInput && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setSearchInput("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-56 items-center justify-center text-sm text-slate-500">
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Loading queue…
            </div>
          ) : error ? (
            <div className="m-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <p>{error}</p>
              <Button variant="outline" className="mt-3" onClick={() => void load()}>
                Retry
              </Button>
            </div>
          ) : rows.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-500">
              {query ? copy.noResults : copy.empty}
            </p>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                {view === "stewardship" && (
                  <StewardshipQueueTable
                    rows={stewardship}
                    agents={agents}
                    selected={selectedAgents}
                    setSelected={setSelectedAgents}
                    busy={busy}
                    onAssign={assign}
                  />
                )}
                {view === "revisions" && (
                  <RevisionQueueTable rows={revisions} reasons={reasons} setReasons={setReasons} busy={busy} onDecide={decide} />
                )}
                {view === "duplicates" && (
                  <DuplicateQueueTable rows={duplicates} reasons={reasons} setReasons={setReasons} busy={busy} onResolve={resolveDuplicate} />
                )}
              </div>
              <div className="divide-y md:hidden">
                {view === "stewardship" && stewardship.map((item) => (
                  <StewardshipQueueCard key={item.listing_id} item={item} rows={stewardship} agents={agents} selected={selectedAgents} setSelected={setSelectedAgents} busy={busy} onAssign={assign} />
                ))}
                {view === "revisions" && revisions.map((item) => (
                  <RevisionQueueCard key={item.id} item={item} rows={revisions} reasons={reasons} setReasons={setReasons} busy={busy} onDecide={decide} />
                ))}
                {view === "duplicates" && duplicates.map((item) => (
                  <DuplicateQueueCard key={item.assessment_id} item={item} rows={duplicates} reasons={reasons} setReasons={setReasons} busy={busy} onResolve={resolveDuplicate} />
                ))}
              </div>
            </>
          )}

          {!loading && !error && meta.total > 0 && (
            <div className="flex flex-col gap-3 border-t border-gray-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                Showing {visibleStart}–{visibleEnd} of {meta.total} · Page {meta.current_page} of {meta.last_page}
              </p>
              <div className="flex items-center gap-1">
                <PageButton label="Previous page" disabled={meta.current_page <= 1} onClick={() => replaceQuery({ page: meta.current_page - 1 })}>
                  <ChevronLeft className="h-4 w-4" />
                </PageButton>
                {pages.map((number) => (
                  <PageButton key={number} active={number === meta.current_page} label={`Page ${number}`} onClick={() => replaceQuery({ page: number })}>
                    {number}
                  </PageButton>
                ))}
                <PageButton label="Next page" disabled={meta.current_page >= meta.last_page} onClick={() => replaceQuery({ page: meta.current_page + 1 })}>
                  <ChevronRight className="h-4 w-4" />
                </PageButton>
              </div>
            </div>
          )}
        </section>
      </div>
    </RoleGuard>
  );
}

function PageButton({ children, label, active, disabled, onClick }: { children: React.ReactNode; label: string; active?: boolean; disabled?: boolean; onClick: () => void }) {
  return <Button type="button" variant="outline" size="icon" aria-label={label} disabled={disabled} onClick={onClick} className={`h-9 w-9 rounded-full ${active ? "border-[#93C01F] bg-[#93C01F] text-white hover:bg-[#7ea919]" : ""}`}>{children}</Button>;
}

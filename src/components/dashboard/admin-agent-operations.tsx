"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, ShieldCheck, UserRoundCog } from "lucide-react";
import { toast } from "sonner";

import {
  AdminPendingRevision,
  AdminDuplicateAssessment,
  AdminStewardshipQueueItem,
  assignListingSteward,
  decideAdminListingRevision,
  EligibleStewardshipAgent,
  getAdminPendingRevisions,
  getAdminDuplicateAssessments,
  getAdminStewardshipQueue,
  getEligibleStewardshipAgents,
  resolveAdminDuplicateAssessment,
} from "@/lib/api";
import { RoleGuard } from "@/components/dashboard/role-guard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

function label(value: string | null): string {
  if (!value) return "None";
  return value.replaceAll("_", " ");
}

export default function AdminAgentOperations() {
  const [queue, setQueue] = useState<AdminStewardshipQueueItem[]>([]);
  const [agents, setAgents] = useState<EligibleStewardshipAgent[]>([]);
  const [revisions, setRevisions] = useState<AdminPendingRevision[]>([]);
  const [duplicates, setDuplicates] = useState<AdminDuplicateAssessment[]>([]);
  const [selectedAgents, setSelectedAgents] = useState<Record<number, string>>({});
  const [reasons, setReasons] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = localStorage.getItem("authToken") ?? undefined;
    setLoading(true);
    setError(null);
    try {
      const [queueData, agentData, revisionData, duplicateData] =
        await Promise.all([
        getAdminStewardshipQueue(token),
        getEligibleStewardshipAgents(token),
        getAdminPendingRevisions(token),
          getAdminDuplicateAssessments(token),
        ]);
      setQueue(queueData);
      setAgents(agentData);
      setRevisions(revisionData);
      setDuplicates(duplicateData);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load agent operations",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function assign(item: AdminStewardshipQueueItem) {
    const selected = Number(selectedAgents[item.listing_id]);
    if (!selected) {
      toast.error("Select an eligible agent first.");
      return;
    }
    const key = `steward-${item.listing_id}`;
    setBusy(key);
    try {
      await assignListingSteward(
        item.slug,
        selected,
        item.current_steward !== null,
        localStorage.getItem("authToken") ?? undefined,
      );
      toast.success("Stewardship updated.");
      await load();
    } catch (assignError) {
      toast.error(
        assignError instanceof Error
          ? assignError.message
          : "Could not update stewardship",
      );
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
    const key = `revision-${revision.id}`;
    setBusy(key);
    try {
      await decideAdminListingRevision(
        revision,
        decision,
        reason,
        localStorage.getItem("authToken") ?? undefined,
      );
      toast.success("Revision decision recorded.");
      await load();
    } catch (decisionError) {
      toast.error(
        decisionError instanceof Error
          ? decisionError.message
          : "Could not decide revision",
      );
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
      toast.error("A clear duplicate-resolution reason is required.");
      return;
    }
    const key = `duplicate-${assessment.assessment_id}`;
    setBusy(key);
    try {
      await resolveAdminDuplicateAssessment(
        assessment.assessment_id,
        resolution,
        reason,
        localStorage.getItem("authToken") ?? undefined,
      );
      toast.success("Duplicate assessment resolved.");
      await load();
    } catch (resolutionError) {
      toast.error(
        resolutionError instanceof Error
          ? resolutionError.message
          : "Could not resolve duplicate assessment",
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="mx-auto w-full max-w-7xl space-y-8 px-3 py-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-[#6f9414]">Internal operations</p>
            <h1 className="text-3xl font-semibold">Listing-agent operations</h1>
            <p className="mt-1 text-sm text-slate-500">
              Reassign unavailable work and review stable, version-guarded
              revisions.
            </p>
          </div>
          <Button variant="outline" onClick={() => void load()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="flex min-h-48 items-center justify-center text-slate-500">
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            Loading queues…
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        ) : (
          <>
            <section className="overflow-hidden rounded-xl border bg-white shadow-sm">
              <div className="border-b p-5">
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <UserRoundCog className="h-5 w-5" />
                  Unassigned or unavailable stewardship
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Lifecycle and open revisions remain unchanged until reassignment.
                </p>
              </div>
              {queue.length === 0 ? (
                <p className="p-6 text-sm text-slate-500">The queue is clear.</p>
              ) : (
                <div className="divide-y">
                  {queue.map((item) => (
                    <article
                      key={item.listing_id}
                      className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_auto_minmax(15rem,auto)] lg:items-center"
                    >
                      <div>
                        <h3 className="font-semibold">{item.name}</h3>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge variant="outline">{label(item.listing_state)}</Badge>
                          {item.revision_state && (
                            <Badge variant="outline">
                              revision: {label(item.revision_state)}
                            </Badge>
                          )}
                          <Badge variant="outline">
                            claim: {label(item.claim_state)}
                          </Badge>
                          <Badge>{label(item.stewardship_state)}</Badge>
                        </div>
                        <p className="mt-2 text-xs text-slate-500">
                          {item.current_steward
                            ? `Assigned to ${item.current_steward.name}, currently unavailable`
                            : item.previous_steward
                              ? `Previous assignment ended: ${item.previous_steward.end_reason}`
                              : "No previous steward recorded"}
                        </p>
                      </div>
                      <p className="text-xs text-slate-500">
                        Updated {new Date(item.last_update).toLocaleString()}
                      </p>
                      <div className="flex gap-2">
                        <select
                          value={selectedAgents[item.listing_id] ?? ""}
                          onChange={(event) =>
                            setSelectedAgents((current) => ({
                              ...current,
                              [item.listing_id]: event.target.value,
                            }))
                          }
                          className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm"
                        >
                          <option value="">Select agent</option>
                          {agents.map((agent) => (
                            <option key={agent.id} value={agent.id}>
                              {agent.name} · {agent.email}
                            </option>
                          ))}
                        </select>
                        <Button
                          type="button"
                          disabled={busy === `steward-${item.listing_id}`}
                          onClick={() => void assign(item)}
                        >
                          {item.current_steward ? "Reassign" : "Assign"}
                        </Button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="overflow-hidden rounded-xl border bg-white shadow-sm">
              <div className="border-b p-5">
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <ShieldCheck className="h-5 w-5" />
                  Pending approved-listing revisions
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Decisions carry the versions shown below. A stale decision fails
                  with 409 and must be reloaded.
                </p>
              </div>
              {revisions.length === 0 ? (
                <p className="p-6 text-sm text-slate-500">
                  No revisions are awaiting moderation.
                </p>
              ) : (
                <div className="divide-y">
                  {revisions.map((revision) => (
                    <article key={revision.id} className="space-y-4 p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold">
                            {revision.listing.name} · revision #{revision.id}
                          </h3>
                          <p className="text-xs text-slate-500">
                            Listing content v{revision.listing.content_version} ·
                            revision v{revision.revision_version} · submitted by{" "}
                            {revision.created_by.name || `user ${revision.created_by.id}`}
                          </p>
                        </div>
                        <Badge variant="outline">
                          {revision.listing.ownership_state}
                        </Badge>
                      </div>
                      <div className="grid gap-3 lg:grid-cols-2">
                        <div>
                          <p className="mb-1 text-xs font-medium uppercase text-slate-500">
                            Proposed fields
                          </p>
                          <pre className="max-h-52 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">
                            {JSON.stringify(revision.proposed_changes, null, 2)}
                          </pre>
                        </div>
                        <div>
                          <p className="mb-1 text-xs font-medium uppercase text-slate-500">
                            Proposed relationships
                          </p>
                          <pre className="max-h-52 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">
                            {JSON.stringify(
                              revision.proposed_relationship_state,
                              null,
                              2,
                            )}
                          </pre>
                        </div>
                      </div>
                      <Input
                        value={reasons[revision.id] ?? ""}
                        onChange={(event) =>
                          setReasons((current) => ({
                            ...current,
                            [revision.id]: event.target.value,
                          }))
                        }
                        placeholder="Moderation reason (required for changes/rejection)"
                        maxLength={2000}
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          disabled={busy === `revision-${revision.id}`}
                          onClick={() => void decide(revision, "approve")}
                          className="bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                          Approve latest version
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={busy === `revision-${revision.id}`}
                          onClick={() => void decide(revision, "changes_requested")}
                        >
                          Request changes
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          disabled={busy === `revision-${revision.id}`}
                          onClick={() => void decide(revision, "reject")}
                        >
                          Reject
                        </Button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="overflow-hidden rounded-xl border bg-white shadow-sm">
              <div className="border-b p-5">
                <h2 className="text-lg font-semibold">
                  Strong duplicate collisions
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  These listings cannot be approved until an administrator
                  explicitly resolves the immutable assessment.
                </p>
              </div>
              {duplicates.length === 0 ? (
                <p className="p-6 text-sm text-slate-500">
                  No strong collisions await resolution.
                </p>
              ) : (
                <div className="divide-y">
                  {duplicates.map((assessment) => (
                    <article
                      key={assessment.assessment_id}
                      className="space-y-4 p-5"
                    >
                      <div>
                        <h3 className="font-semibold">
                          {assessment.listing.name} · assessment #
                          {assessment.assessment_id}
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">
                          Matched signals: {assessment.matched_signals.join(", ")}
                        </p>
                        <p className="mt-2 text-sm">
                          Agent explanation:{" "}
                          {assessment.agent_explanation || "No explanation retained."}
                        </p>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {assessment.candidates.map((candidate) => (
                          <div
                            key={candidate.listing_id}
                            className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm"
                          >
                            <p className="font-medium">{candidate.title}</p>
                            <p className="text-xs text-slate-600">
                              {candidate.locality || "No locality"} ·{" "}
                              {candidate.matched_signals.join(", ")}
                            </p>
                          </div>
                        ))}
                      </div>
                      <Input
                        value={reasons[-assessment.assessment_id] ?? ""}
                        onChange={(event) =>
                          setReasons((current) => ({
                            ...current,
                            [-assessment.assessment_id]: event.target.value,
                          }))
                        }
                        placeholder="Resolution reason"
                        maxLength={2000}
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          disabled={
                            busy === `duplicate-${assessment.assessment_id}`
                          }
                          onClick={() =>
                            void resolveDuplicate(assessment, "distinct")
                          }
                        >
                          Confirm distinct record
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          disabled={
                            busy === `duplicate-${assessment.assessment_id}`
                          }
                          onClick={() =>
                            void resolveDuplicate(assessment, "duplicate")
                          }
                        >
                          Confirm duplicate
                        </Button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </RoleGuard>
  );
}

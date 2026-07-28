"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChevronDown, Clock3, ExternalLink, FileText, Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  ClaimEvidencePicker,
  ClaimEvidencePreviewButton,
  PreviousClaimEvidence,
} from "@/components/claims/claim-evidence-picker";
import { useAuth } from "@/context/auth-context";
import { toast } from "sonner";
import { ClaimCaseEvent, ClaimCaseSummary, ClaimStatus, addClaimEvidence, getMyClaims, withdrawClaim } from "@/lib/api";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<ClaimStatus, string> = {
  awaiting_email_verification: "Awaiting email verification",
  under_review: "Under review",
  more_evidence_requested: "Action needed",
  approved: "Approved",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  closed_other_claim_approved: "Closed",
  expired: "Expired",
};

const STATUS_COLOR: Record<ClaimStatus, string> = {
  awaiting_email_verification: "bg-blue-100 text-blue-700",
  under_review: "bg-amber-100 text-amber-700",
  more_evidence_requested: "bg-orange-100 text-orange-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
  withdrawn: "bg-gray-100 text-gray-600",
  closed_other_claim_approved: "bg-gray-100 text-gray-600",
  expired: "bg-gray-100 text-gray-600",
};

const EVENT_LABEL: Record<string, string> = {
  created: "Claim submitted",
  email_verified: "Listing email verified",
  evidence_requested: "More evidence requested",
  evidence_request_updated: "Evidence request updated",
  evidence_responded: "Evidence response submitted",
  evidence_added: "Additional evidence submitted",
  withdrawn: "Claim withdrawn",
  expired: "Claim expired",
  rejected: "Claim rejected",
  approved: "Claim approved",
  closed_other_claim_approved: "Claim closed",
};

const listingPath: Record<string, string> = { event: "events", community: "communities", business: "businesses" };

type TimelineItem =
  | { kind: "event"; id: string; at: string; event: ClaimCaseEvent; attempt: number }
  | { kind: "evidence"; id: string; at: string; item: PreviousClaimEvidence; attempt: number };

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ClaimThread({ claims, onChanged }: { claims: ClaimCaseSummary[]; onChanged: () => void }) {
  const latest = claims[0];
  const [expanded, setExpanded] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const allEvidence = useMemo<PreviousClaimEvidence[]>(
    () => claims.flatMap((claim) => claim.evidence.map((evidence) => ({ claimId: claim.id, evidence }))),
    [claims],
  );

  const timeline = useMemo<TimelineItem[]>(() => {
    const chronologicalClaims = [...claims].reverse();
    return chronologicalClaims
      .flatMap((claim, index) => {
        const attempt = index + 1;
        const events: TimelineItem[] = (claim.events ?? []).map((event) => ({
          kind: "event", id: `event-${claim.id}-${event.id}`, at: event.created_at, event, attempt,
        }));
        const evidence: TimelineItem[] = claim.evidence.map((item) => ({
          kind: "evidence", id: `evidence-${claim.id}-${item.id}`, at: item.created_at,
          item: { claimId: claim.id, evidence: item }, attempt,
        }));
        return [...events, ...evidence];
      })
      .sort((left, right) => new Date(left.at).getTime() - new Date(right.at).getTime());
  }, [claims]);

  const token = () => localStorage.getItem("authToken") || undefined;

  const submitEvidence = async () => {
    if (pendingFiles.length === 0) return;
    setIsBusy(true);
    try {
      await addClaimEvidence(latest.id, pendingFiles, token());
      toast.success("Evidence submitted.");
      setPendingFiles([]);
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit evidence.");
    } finally {
      setIsBusy(false);
    }
  };

  const withdraw = async () => {
    setIsBusy(true);
    try {
      await withdrawClaim(latest.id, token());
      toast.success("Claim withdrawn.");
      setWithdrawOpen(false);
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to withdraw claim.");
    } finally {
      setIsBusy(false);
    }
  };

  const href = `/${listingPath[latest.listing.type] ?? "businesses"}/${latest.listing.slug}`;

  return (
    <article className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="flex gap-4 p-5">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-gray-100">
          <Image src={latest.listing.image || "/images/no-image.jpg"} alt={latest.listing.name} fill className="object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="truncate font-bold text-[#1F3A4C]">{latest.listing.name}</h2>
              <p className="text-xs capitalize text-gray-400">
                {claims.length > 1 ? `${claims.length} claim attempts` : latest.method.replace(/_/g, " ")}
              </p>
            </div>
            <Badge className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-bold uppercase ${STATUS_COLOR[latest.status]}`}>
              {STATUS_LABEL[latest.status]}
            </Badge>
          </div>
          <p className="mt-1 text-[11px] text-gray-400">Latest activity {new Date(latest.updated_at).toLocaleDateString()}</p>
        </div>
      </div>

      {latest.status === "more_evidence_requested" && latest.evidence_instructions && (
        <div className="mx-5 mb-4 flex items-start gap-2 rounded-xl border border-orange-200 bg-orange-50 p-3 text-xs text-orange-800">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span><strong>What we need:</strong> {latest.evidence_instructions}</span>
        </div>
      )}

      {latest.status === "rejected" && latest.rejection_reason && (
        <div className="mx-5 mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
          <p><strong>Reason:</strong> {latest.rejection_reason}</p>
          {latest.rejection_recommendation && <p className="mt-1"><strong>Recommendation:</strong> {latest.rejection_recommendation}</p>}
        </div>
      )}

      {latest.available_actions.includes("respond_evidence") && (
        <div className="mx-5 mb-5 rounded-2xl border border-gray-200 p-4">
          <ClaimEvidencePicker
            files={pendingFiles}
            onChange={setPendingFiles}
            constraints={latest.evidence_constraints}
            previousEvidence={allEvidence}
          />
          <Button
            size="sm"
            disabled={isBusy || pendingFiles.length === 0}
            onClick={() => void submitEvidence()}
            className="mt-4 bg-[#93C01F] text-white hover:bg-[#7ea919]"
          >
            {isBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Submit evidence
          </Button>
        </div>
      )}

      <div className="border-t border-gray-100 px-5 py-3">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="flex w-full items-center justify-between text-left text-xs font-bold text-[#1F3A4C]"
        >
          <span className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-[#93C01F]" /> View history</span>
          <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
        </button>

        {expanded && (
          <ol className="relative mt-4 space-y-5 border-l border-gray-200 pl-5">
            {timeline.map((entry) => (
              <li key={entry.id} className="relative">
                <span className="absolute -left-[25px] top-1 h-2 w-2 rounded-full bg-[#93C01F] ring-4 ring-white" />
                {entry.kind === "event" ? (
                  <div>
                    <p className="text-xs font-semibold text-gray-700">{EVENT_LABEL[entry.event.event_type] ?? entry.event.event_type.replace(/_/g, " ")}</p>
                    <p className="text-[11px] text-gray-400">Attempt {entry.attempt} · {new Date(entry.at).toLocaleString()}</p>
                    {entry.event.metadata.instructions && <p className="mt-1 text-xs text-gray-600">{entry.event.metadata.instructions}</p>}
                    {entry.event.metadata.reason && <p className="mt-1 text-xs text-rose-700">{entry.event.metadata.reason}</p>}
                  </div>
                ) : (
                  <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <FileText className="h-5 w-5 shrink-0 text-gray-400" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-gray-700">{entry.item.evidence.original_filename}</p>
                      <p className="text-[11px] text-gray-400">
                        Evidence round {entry.item.evidence.submission_round ?? 1} · {formatBytes(entry.item.evidence.file_size)} · {new Date(entry.at).toLocaleString()}
                      </p>
                    </div>
                    <ClaimEvidencePreviewButton item={entry.item} />
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 px-5 pb-5 pt-2">
        <Link href={href} className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-[#1F3A4C]">
          View listing <ExternalLink className="h-3 w-3" />
        </Link>
        {latest.available_actions.includes("verify_email") && <Link href={`/claim/${latest.listing.slug}/verify`} className="text-xs font-bold text-[#93C01F]">Continue verification</Link>}
        {latest.available_actions.includes("resubmit") && <Link href={`/claim/${latest.listing.slug}`} className="text-xs font-bold text-[#93C01F]">Submit a new claim</Link>}
        {latest.available_actions.includes("withdraw") && (
          <Button size="sm" variant="ghost" disabled={isBusy} onClick={() => setWithdrawOpen(true)} className="ml-auto text-xs text-rose-600">Withdraw claim</Button>
        )}
      </div>

      <AlertDialog open={withdrawOpen} onOpenChange={(open) => !isBusy && setWithdrawOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Withdraw this claim?</AlertDialogTitle>
            <AlertDialogDescription>This closes the current claim attempt for {latest.listing.name}. Its history and evidence remain available.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBusy}>Keep claim</AlertDialogCancel>
            <AlertDialogAction disabled={isBusy} onClick={(event) => { event.preventDefault(); void withdraw(); }} className="bg-rose-600 text-white hover:bg-rose-700">
              {isBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Withdraw claim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  );
}

export default function MyClaimsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [claims, setClaims] = useState<ClaimCaseSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { if (!authLoading && !user) router.push("/auth/login"); }, [user, authLoading, router]);

  const fetchClaims = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("authToken") || undefined;
      const data = await getMyClaims(token, { history: true });
      setClaims((data as unknown as { data: ClaimCaseSummary[] }).data || []);
    } catch {
      toast.error("Failed to load your claims.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { if (user) void fetchClaims(); }, [user, fetchClaims]);

  const threads = useMemo(() => {
    const grouped = new Map<number, ClaimCaseSummary[]>();
    claims.forEach((claim) => grouped.set(claim.listing.id, [...(grouped.get(claim.listing.id) ?? []), claim]));
    return Array.from(grouped.values());
  }, [claims]);

  if (authLoading || !user) return null;

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 md:p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1F3A4C]">My Claims</h1>
          <p className="mt-1 text-sm text-gray-500">Track every submission, evidence request, and decision for listings you have claimed.</p>
        </div>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20"><Loader2 className="h-8 w-8 animate-spin text-[#93C01F]" /><p className="text-sm text-gray-400">Loading your claims...</p></div>
        ) : threads.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 py-20 text-center"><p className="mb-4 text-sm text-gray-400">You haven&apos;t submitted any claims yet.</p><Link href="/claim"><Button className="bg-[#93C01F] text-white hover:bg-[#7ea919]">Browse claimable listings</Button></Link></div>
        ) : (
          <div className="space-y-4">{threads.map((thread) => <ClaimThread key={thread[0].listing.id} claims={thread} onChanged={fetchClaims} />)}</div>
        )}
      </div>
    </div>
  );
}

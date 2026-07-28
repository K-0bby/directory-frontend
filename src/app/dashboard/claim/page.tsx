"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  FileText,
  ExternalLink,
  Loader2,
  Search,
  MessageSquareWarning,
  Users,
} from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ClaimCaseAdmin,
  ClaimStatus,
  adminApproveClaim,
  adminGetEvidenceSignedUrl,
  adminListClaims,
  adminRejectClaim,
  adminRequestMoreEvidence,
} from "@/lib/api";

const STATUS_LABEL: Record<ClaimStatus, string> = {
  awaiting_email_verification: "Awaiting Email",
  under_review: "Under Review",
  more_evidence_requested: "Evidence Requested",
  approved: "Approved",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  closed_other_claim_approved: "Closed (Competing)",
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

type DialogState =
  | { type: "approve"; claim: ClaimCaseAdmin }
  | { type: "reject"; claim: ClaimCaseAdmin }
  | { type: "request_evidence"; claim: ClaimCaseAdmin }
  | { type: "view"; claim: ClaimCaseAdmin }
  | null;

export default function AdminClaimsPage() {
  const [claims, setClaims] = useState<ClaimCaseAdmin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [caseTypeFilter, setCaseTypeFilter] = useState<string>("all");
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [dialog, setDialog] = useState<DialogState>(null);
  const [reasonInput, setReasonInput] = useState("");
  const [recommendationInput, setRecommendationInput] = useState("");
  const [instructionsInput, setInstructionsInput] = useState("");

  const getToken = () => localStorage.getItem("authToken") || undefined;

  const fetchClaims = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = {};
      if (statusFilter !== "all") params.status = statusFilter;
      if (caseTypeFilter !== "all") params.case_type = caseTypeFilter;
      if (methodFilter !== "all") params.method = methodFilter;

      const data = await adminListClaims(getToken(), params);
      setClaims((data as unknown as { data: ClaimCaseAdmin[] }).data || []);
    } catch {
      toast.error("Failed to load claims.");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, caseTypeFilter, methodFilter]);

  useEffect(() => {
    fetchClaims();
  }, [fetchClaims]);

  const handleApprove = async () => {
    if (dialog?.type !== "approve") return;
    const claim = dialog.claim;

    setProcessingId(claim.id);
    try {
      const data = await adminApproveClaim(claim.id, getToken());
      toast.success(data.message || `Claim #${claim.id} approved.`);
      setDialog(null);
      await fetchClaims();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to approve claim.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (dialog?.type !== "reject") return;
    if (reasonInput.trim().length < 5) {
      toast.error("A rejection reason (at least 5 characters) is required.");
      return;
    }

    setProcessingId(dialog.claim.id);
    try {
      const data = await adminRejectClaim(dialog.claim.id, reasonInput, recommendationInput || undefined, getToken());
      toast.success(data.message || "Claim rejected.");
      setDialog(null);
      setReasonInput("");
      setRecommendationInput("");
      await fetchClaims();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reject claim.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleRequestEvidence = async () => {
    if (dialog?.type !== "request_evidence") return;
    if (instructionsInput.trim().length < 5) {
      toast.error("Please describe what evidence is needed.");
      return;
    }

    setProcessingId(dialog.claim.id);
    try {
      const data = await adminRequestMoreEvidence(dialog.claim.id, instructionsInput, getToken());
      toast.success(data.message || "Evidence request sent.");
      setDialog(null);
      setInstructionsInput("");
      await fetchClaims();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to request evidence.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleViewEvidence = async (claim: ClaimCaseAdmin, evidenceId: number) => {
    try {
      const { url } = await adminGetEvidenceSignedUrl(claim.id, evidenceId, getToken());
      window.open(url, "_blank", "noreferrer");
    } catch {
      toast.error("Failed to generate a secure link for this document.");
    }
  };

  const filteredClaims = claims.filter(
    (c) =>
      c.listing.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.claimant.email.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-white p-8 pt-12">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#1F3A4C]">
              Claims Management
            </h1>
            <p className="text-gray-500 mt-1">
              Review evidence and decide ownership claims, by claim ID.
            </p>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by listing or claimant email..."
              className="pl-10 h-11 border-gray-200 rounded-xl focus-visible:ring-[#93C01F]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44 h-10 rounded-xl border-gray-200">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {Object.entries(STATUS_LABEL).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={caseTypeFilter} onValueChange={setCaseTypeFilter}>
            <SelectTrigger className="w-44 h-10 rounded-xl border-gray-200">
              <SelectValue placeholder="Case type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Ordinary & rectification</SelectItem>
              <SelectItem value="ordinary">Ordinary</SelectItem>
              <SelectItem value="rectification">Rectification</SelectItem>
            </SelectContent>
          </Select>

          <Select value={methodFilter} onValueChange={setMethodFilter}>
            <SelectTrigger className="w-44 h-10 rounded-xl border-gray-200">
              <SelectValue placeholder="Method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All methods</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="document">Document</SelectItem>
              <SelectItem value="email_plus_document">Email + Document</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="border border-gray-100 rounded-2xl bg-white shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-gray-50/50">
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-bold text-[#1F3A4C]">Claim</TableHead>
                <TableHead className="font-bold text-[#1F3A4C]">Listing</TableHead>
                <TableHead className="font-bold text-[#1F3A4C]">Claimant</TableHead>
                <TableHead className="font-bold text-[#1F3A4C]">Type / Method</TableHead>
                <TableHead className="font-bold text-[#1F3A4C]">Status</TableHead>
                <TableHead className="font-bold text-[#1F3A4C]">Evidence</TableHead>
                <TableHead className="text-right font-bold text-[#1F3A4C]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-64 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-[#93C01F] mx-auto mb-2" />
                    <p className="text-sm text-gray-400 font-medium">Loading claims...</p>
                  </TableCell>
                </TableRow>
              ) : filteredClaims.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-64 text-center text-gray-400">
                    No results found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredClaims.map((claim) => {
                  // Decisions are allowed while awaiting evidence too — the admin can
                  // approve on existing evidence, reject, or revise the request.
                  const canDecide =
                    claim.status === "under_review" ||
                    claim.status === "more_evidence_requested";
                  const isAwaitingEvidence = claim.status === "more_evidence_requested";
                  const isProcessing = processingId === claim.id;

                  return (
                    <TableRow key={claim.id} className="hover:bg-gray-50/50 align-top">
                      <TableCell className="font-mono text-xs text-gray-500 font-bold">
                        #{claim.id}
                        {claim.competing_active_claims.length > 0 && (
                          <div className="mt-1 flex items-center gap-1 text-[10px] text-amber-600 font-sans font-bold">
                            <Users className="w-3 h-3" /> {claim.competing_active_claims.length} competing
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-bold text-[#1F3A4C]">{claim.listing.name}</div>
                        <div className="text-xs text-gray-400 capitalize">{claim.listing.type}</div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="font-medium text-gray-700">{claim.claimant.name || "—"}</div>
                        <div className="text-xs text-gray-400">{claim.claimant.email}</div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="secondary" className="capitalize mb-1">{claim.case_type}</Badge>
                        <div className="text-gray-400 capitalize">{claim.method.replace(/_/g, " ")}</div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase ${STATUS_COLOR[claim.status]}`}>
                          {STATUS_LABEL[claim.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {claim.evidence.length === 0 ? (
                          <span className="text-xs text-gray-300 italic">None</span>
                        ) : (
                          <div className="space-y-1">
                            {claim.evidence.map((e) => (
                              <button
                                key={e.id}
                                onClick={() => handleViewEvidence(claim, e.id)}
                                className="flex items-center gap-1.5 text-xs font-bold text-[#93C01F] hover:text-[#7ea919]"
                              >
                                <FileText className="w-3.5 h-3.5" /> {e.original_filename}
                                <ExternalLink className="w-3 h-3" />
                                {e.is_new && (
                                  <Badge className="bg-[#93C01F]/15 text-[#5c7a12] border-none rounded-full px-2 py-0 text-[9px] font-bold uppercase">
                                    New
                                  </Badge>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right space-x-1 whitespace-nowrap">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDialog({ type: "view", claim })}
                          className="text-xs"
                        >
                          View
                        </Button>
                        {canDecide && (
                          <>
                            <Button
                              size="sm"
                              disabled={isProcessing}
                              onClick={() => setDialog({ type: "approve", claim })}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isProcessing}
                              onClick={() => {
                                setInstructionsInput(
                                  isAwaitingEvidence ? claim.evidence_instructions || "" : "",
                                );
                                setDialog({ type: "request_evidence", claim });
                              }}
                              className="text-xs border-orange-200 text-orange-700 hover:bg-orange-50"
                            >
                              <MessageSquareWarning className="w-3.5 h-3.5 mr-1" />
                              {isAwaitingEvidence ? "Edit Request" : "Request Info"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isProcessing}
                              onClick={() => setDialog({ type: "reject", claim })}
                              className="text-xs border-rose-200 text-rose-700 hover:bg-rose-50"
                            >
                              <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Reject dialog */}
      {/* Approve confirmation dialog — prevents accidental one-click transfers */}
      <Dialog open={dialog?.type === "approve"} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          {dialog?.type === "approve" && (
            <>
              <DialogHeader>
                <DialogTitle>Approve claim #{dialog.claim.id}?</DialogTitle>
                <DialogDescription>
                  This will transfer management of{" "}
                  <span className="font-semibold text-[#1F3A4C]">{dialog.claim.listing.name}</span>{" "}
                  to <span className="font-semibold text-[#1F3A4C]">{dialog.claim.claimant.name || dialog.claim.claimant.email}</span>
                  {dialog.claim.current_owner && (
                    <> and remove access for the current manager, {dialog.claim.current_owner.name}</>
                  )}
                  . Any competing active claims on this listing will be closed and their
                  claimants notified. This cannot be undone from this screen.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
                <Button
                  onClick={handleApprove}
                  disabled={processingId === dialog.claim.id}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {processingId === dialog.claim.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Yes, Approve Claim"
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={dialog?.type === "reject"} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject claim #{dialog?.type === "reject" ? dialog.claim.id : ""}</DialogTitle>
            <DialogDescription>
              A reason is required and will be shown to the claimant. A recommendation is optional.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              placeholder="Reason for rejection (required)"
              value={reasonInput}
              onChange={(e) => setReasonInput(e.target.value)}
              className="min-h-[90px]"
            />
            <Textarea
              placeholder="Recommendation for the claimant (optional)"
              value={recommendationInput}
              onChange={(e) => setRecommendationInput(e.target.value)}
              className="min-h-[70px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
            <Button
              onClick={handleReject}
              disabled={processingId === (dialog?.type === "reject" ? dialog.claim.id : -1)}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              Reject Claim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request evidence dialog (also used to revise an outstanding request) */}
      <Dialog open={dialog?.type === "request_evidence"} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog?.type === "request_evidence" && dialog.claim.status === "more_evidence_requested"
                ? "Edit evidence request"
                : "Request more evidence"}
            </DialogTitle>
            <DialogDescription>
              Tell the claimant exactly what&apos;s missing — they can add documents without losing what they already submitted.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="e.g. Please upload a government-issued ID matching the business registration name."
            value={instructionsInput}
            onChange={(e) => setInstructionsInput(e.target.value)}
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
            <Button
              onClick={handleRequestEvidence}
              disabled={processingId === (dialog?.type === "request_evidence" ? dialog.claim.id : -1)}
              className="bg-[#93C01F] hover:bg-[#7ea919] text-white"
            >
              {dialog?.type === "request_evidence" && processingId === dialog.claim.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Send Request"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View dialog */}
      <Dialog open={dialog?.type === "view"} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="max-w-lg">
          {dialog?.type === "view" && (
            <>
              <DialogHeader>
                <DialogTitle>Claim #{dialog.claim.id} — {dialog.claim.listing.name}</DialogTitle>
                <DialogDescription>
                  {dialog.claim.case_type === "rectification"
                    ? "Ownership rectification request"
                    : "Ordinary claim"}{" "}
                  via {dialog.claim.method.replace(/_/g, " ")}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-gray-400">Claimant: </span>
                  <span className="font-medium">{dialog.claim.claimant.name} ({dialog.claim.claimant.email})</span>
                </div>
                {dialog.claim.current_owner && (
                  <div>
                    <span className="text-gray-400">Current manager: </span>
                    <span className="font-medium">{dialog.claim.current_owner.name}</span>
                  </div>
                )}
                {dialog.claim.competing_active_claims.length > 0 && (
                  <div>
                    <span className="text-gray-400">Competing claims: </span>
                    {dialog.claim.competing_active_claims.map((c) => (
                      <div key={c.id} className="ml-2 text-xs text-gray-600">
                        #{c.id} — {c.claimant_name} ({c.method}, {STATUS_LABEL[c.status]})
                      </div>
                    ))}
                  </div>
                )}
                {dialog.claim.rejection_reason && (
                  <div>
                    <span className="text-gray-400">Rejection reason: </span>
                    <span className="font-medium">{dialog.claim.rejection_reason}</span>
                  </div>
                )}
                {dialog.claim.evidence_instructions && (
                  <div>
                    <span className="text-gray-400">Evidence requested: </span>
                    <span className="font-medium">{dialog.claim.evidence_instructions}</span>
                  </div>
                )}
                <div>
                  <span className="text-gray-400">Submitted: </span>
                  {new Date(dialog.claim.created_at).toLocaleString()}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import type { Dispatch, SetStateAction } from "react";

import type { AdminDuplicateAssessment } from "@/lib/api";
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

export interface DuplicateQueueViewProps {
  rows: AdminDuplicateAssessment[];
  reasons: Record<number, string>;
  setReasons: Dispatch<SetStateAction<Record<number, string>>>;
  busy: string | null;
  onResolve: (
    item: AdminDuplicateAssessment,
    resolution: "distinct" | "duplicate",
  ) => Promise<void>;
}

function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleString() : "—";
}

function DuplicateActions({
  item,
  reasons,
  setReasons,
  busy,
  onResolve,
}: DuplicateQueueViewProps & { item: AdminDuplicateAssessment }) {
  const key = -item.assessment_id;
  return (
    <div className="min-w-72 space-y-2">
      <Input
        value={reasons[key] ?? ""}
        onChange={(event) =>
          setReasons((current) => ({
            ...current,
            [key]: event.target.value,
          }))
        }
        placeholder="Resolution reason"
        maxLength={2000}
      />
      <div className="flex gap-2">
        <Button
          variant="outline"
          disabled={busy === `duplicate-${item.assessment_id}`}
          onClick={() => void onResolve(item, "distinct")}
        >
          Distinct
        </Button>
        <Button
          variant="destructive"
          disabled={busy === `duplicate-${item.assessment_id}`}
          onClick={() => void onResolve(item, "duplicate")}
        >
          Duplicate
        </Button>
      </div>
    </div>
  );
}

export function DuplicateQueueTable(props: DuplicateQueueViewProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-gray-100">
          <TableHead>Listing</TableHead>
          <TableHead>Signals</TableHead>
          <TableHead>Explanation</TableHead>
          <TableHead>Candidates</TableHead>
          <TableHead>Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {props.rows.map((item) => (
          <TableRow
            key={item.assessment_id}
            className="align-top hover:bg-gray-50"
          >
            <TableCell>
              <p className="font-medium">{item.listing.name}</p>
              <p className="text-xs text-slate-500">
                Assessment #{item.assessment_id}
                <br />
                {formatDate(item.created_at)}
              </p>
            </TableCell>
            <TableCell>{item.matched_signals.join(", ") || "—"}</TableCell>
            <TableCell className="max-w-64 whitespace-normal">
              {item.agent_explanation || "No explanation retained."}
            </TableCell>
            <TableCell>
              {item.candidates.map((candidate) => (
                <p key={candidate.listing_id} className="text-sm">
                  {candidate.title}
                </p>
              ))}
            </TableCell>
            <TableCell>
              <DuplicateActions item={item} {...props} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function DuplicateQueueCard({
  item,
  ...props
}: DuplicateQueueViewProps & { item: AdminDuplicateAssessment }) {
  return (
    <article className="space-y-3 p-4">
      <div>
        <h2 className="font-semibold">{item.listing.name}</h2>
        <p className="text-xs text-slate-500">
          Assessment #{item.assessment_id} · {formatDate(item.created_at)}
        </p>
      </div>
      <p className="text-sm">
        Signals: {item.matched_signals.join(", ") || "—"}
      </p>
      <p className="text-sm text-slate-600">
        {item.agent_explanation || "No explanation retained."}
      </p>
      <DuplicateActions item={item} {...props} />
    </article>
  );
}

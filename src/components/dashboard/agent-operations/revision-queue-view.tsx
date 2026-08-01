"use client";

import type { Dispatch, SetStateAction } from "react";

import type { AdminPendingRevision } from "@/lib/api";
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

export interface RevisionQueueViewProps {
  rows: AdminPendingRevision[];
  reasons: Record<number, string>;
  setReasons: Dispatch<SetStateAction<Record<number, string>>>;
  busy: string | null;
  onDecide: (
    item: AdminPendingRevision,
    decision: "approve" | "changes_requested" | "reject",
  ) => Promise<void>;
}

function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleString() : "—";
}

function RevisionActions({
  item,
  reasons,
  setReasons,
  busy,
  onDecide,
}: RevisionQueueViewProps & { item: AdminPendingRevision }) {
  return (
    <div className="min-w-72 space-y-2">
      <Input
        value={reasons[item.id] ?? ""}
        onChange={(event) =>
          setReasons((current) => ({
            ...current,
            [item.id]: event.target.value,
          }))
        }
        placeholder="Moderation reason"
        maxLength={2000}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={busy === `revision-${item.id}`}
          className="bg-emerald-600 hover:bg-emerald-700"
          onClick={() => void onDecide(item, "approve")}
        >
          Approve
        </Button>
        <Button
          variant="outline"
          disabled={busy === `revision-${item.id}`}
          onClick={() => void onDecide(item, "changes_requested")}
        >
          Changes
        </Button>
        <Button
          variant="destructive"
          disabled={busy === `revision-${item.id}`}
          onClick={() => void onDecide(item, "reject")}
        >
          Reject
        </Button>
      </div>
    </div>
  );
}

export function RevisionQueueTable(props: RevisionQueueViewProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-gray-100">
          <TableHead>Listing</TableHead>
          <TableHead>Version</TableHead>
          <TableHead>Submitted by</TableHead>
          <TableHead>Proposed changes</TableHead>
          <TableHead>Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {props.rows.map((item) => (
          <TableRow key={item.id} className="align-top hover:bg-gray-50">
            <TableCell>
              <p className="font-medium">{item.listing.name}</p>
              <Badge variant="outline">{item.listing.ownership_state}</Badge>
            </TableCell>
            <TableCell>
              Content v{item.listing.content_version}
              <br />
              Revision v{item.revision_version}
            </TableCell>
            <TableCell>
              {item.created_by.name || `User ${item.created_by.id}`}
              <p className="text-xs text-slate-500">
                {formatDate(item.submitted_at)}
              </p>
            </TableCell>
            <TableCell>
              <pre className="max-h-32 max-w-80 overflow-auto rounded bg-slate-950 p-2 text-xs text-white">
                {JSON.stringify(item.proposed_changes, null, 2)}
              </pre>
            </TableCell>
            <TableCell>
              <RevisionActions item={item} {...props} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function RevisionQueueCard({
  item,
  ...props
}: RevisionQueueViewProps & { item: AdminPendingRevision }) {
  return (
    <article className="space-y-3 p-4">
      <div>
        <h2 className="font-semibold">{item.listing.name}</h2>
        <p className="text-xs text-slate-500">
          Revision v{item.revision_version} · {formatDate(item.submitted_at)}
        </p>
      </div>
      <Badge variant="outline">{item.listing.ownership_state}</Badge>
      <pre className="max-h-40 overflow-auto rounded bg-slate-950 p-2 text-xs text-white">
        {JSON.stringify(item.proposed_changes, null, 2)}
      </pre>
      <RevisionActions item={item} {...props} />
    </article>
  );
}

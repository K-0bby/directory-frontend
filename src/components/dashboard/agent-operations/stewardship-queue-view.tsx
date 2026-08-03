"use client";

import type { Dispatch, SetStateAction } from "react";

import type {
  AdminStewardshipQueueItem,
  EligibleStewardshipAgent,
} from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface StewardshipQueueViewProps {
  rows: AdminStewardshipQueueItem[];
  agents: EligibleStewardshipAgent[];
  selected: Record<number, string>;
  setSelected: Dispatch<SetStateAction<Record<number, string>>>;
  busy: string | null;
  onRequestAssignment: (item: AdminStewardshipQueueItem) => void;
}

function label(value: string | null): string {
  return value ? value.replaceAll("_", " ") : "None";
}

function StewardshipAction({
  item,
  agents,
  selected,
  setSelected,
  busy,
  onRequestAssignment,
}: StewardshipQueueViewProps & { item: AdminStewardshipQueueItem }) {
  return (
    <div className="flex min-w-64 gap-2">
      <select
        disabled={busy === `steward-${item.listing_id}`}
        value={selected[item.listing_id] ?? ""}
        onChange={(event) =>
          setSelected((current) => ({
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
        disabled={busy === `steward-${item.listing_id}`}
        onClick={() => onRequestAssignment(item)}
      >
        {item.current_steward ? "Reassign" : "Assign"}
      </Button>
    </div>
  );
}

export function StewardshipQueueTable(props: StewardshipQueueViewProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-gray-100">
          <TableHead>Listing</TableHead>
          <TableHead>Lifecycle</TableHead>
          <TableHead>Stewardship</TableHead>
          <TableHead>Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {props.rows.map((item) => (
          <TableRow key={item.listing_id} className="hover:bg-gray-50">
            <TableCell>
              <p className="font-medium">{item.name}</p>
              <p className="text-xs text-slate-500">{item.slug}</p>
            </TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline">{label(item.listing_state)}</Badge>
                <Badge variant="outline">claim: {label(item.claim_state)}</Badge>
              </div>
              {item.created_by ? (
                <p className="mt-1 break-words text-[10px] text-slate-500">
                  Creator: {item.created_by.name} ({item.created_by.email})
                </p>
              ) : (
                <p className="mt-1 text-[10px] text-slate-500">
                  Original creator unavailable
                </p>
              )}
            </TableCell>
            <TableCell>
              <Badge>{label(item.stewardship_state)}</Badge>
              <p className="mt-1 text-xs text-slate-500">
                {item.current_steward?.name ??
                  (item.previous_steward
                    ? `Previous: ${item.previous_steward.end_reason}`
                    : "No previous steward")}
              </p>
            </TableCell>
            <TableCell>
              <StewardshipAction item={item} {...props} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function StewardshipQueueCard({
  item,
  ...props
}: StewardshipQueueViewProps & { item: AdminStewardshipQueueItem }) {
  return (
    <article className="space-y-3 p-4">
      <div>
        <h2 className="font-semibold">{item.name}</h2>
        <p className="text-xs text-slate-500">{item.slug}</p>
      </div>
      <div className="flex flex-wrap gap-1">
        <Badge variant="outline">{label(item.listing_state)}</Badge>
        <Badge>{label(item.stewardship_state)}</Badge>
      </div>
      {item.created_by ? (
        <p className="break-words text-[10px] text-slate-500">
          Creator: {item.created_by.name} ({item.created_by.email})
        </p>
      ) : (
        <p className="text-[10px] text-slate-500">
          Original creator unavailable
        </p>
      )}
      <p className="text-sm text-slate-600">
        {item.current_steward?.name ?? "Unassigned"}
      </p>
      <StewardshipAction item={item} {...props} />
    </article>
  );
}

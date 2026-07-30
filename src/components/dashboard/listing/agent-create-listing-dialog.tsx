"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2, CalendarDays, FilePlus2, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ListingType = "business" | "event" | "community";

const LISTING_TYPES: Array<{
  id: ListingType;
  label: string;
  description: string;
  icon: typeof Building2;
}> = [
  {
    id: "business",
    label: "Business Listing",
    description: "For companies, shops, and services.",
    icon: Building2,
  },
  {
    id: "event",
    label: "Event Listing",
    description: "For concerts, workshops, and gatherings.",
    icon: CalendarDays,
  },
  {
    id: "community",
    label: "Community Listing",
    description: "For groups, clubs, and non-profits.",
    icon: Users,
  },
];

export function AgentCreateListingDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        className="bg-[#93C01F] text-slate-950 hover:bg-[#7ea919]"
        onClick={() => setOpen(true)}
      >
        <FilePlus2 className="mr-2 h-4 w-4" />
        Create listing
      </Button>

      <DialogContent className="rounded-2xl bg-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold text-[#1F3A4C]">
            Select listing type
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {LISTING_TYPES.map((item) => (
            <Link
              key={item.id}
              href={`/dashboard/my-listing/create?type=${item.id}`}
              onClick={() => setOpen(false)}
              className="group flex items-center gap-4 rounded-xl border border-gray-100 bg-gray-50 p-4 text-left hover:border-[#93C01F] hover:bg-[#93C01F]/5"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-white group-hover:border-[#93C01F]">
                <item.icon className="h-5 w-5 text-gray-500 group-hover:text-[#93C01F]" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{item.label}</h3>
                <p className="text-xs text-gray-500">{item.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

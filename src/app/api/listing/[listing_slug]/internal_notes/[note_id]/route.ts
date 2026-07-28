import { NextRequest } from "next/server";
import { proxyLaravelJson } from "@/lib/bff/proxy-laravel";

type RouteContext = {
  params: Promise<{ listing_slug: string; note_id: string }>;
};

function notePath(listingSlug: string, noteId: string): string {
  return `listing/${encodeURIComponent(listingSlug)}/internal_notes/${encodeURIComponent(noteId)}`;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { listing_slug, note_id } = await context.params;
  return proxyLaravelJson(request, {
    path: notePath(listing_slug, note_id),
    method: "PATCH",
  });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { listing_slug, note_id } = await context.params;
  return proxyLaravelJson(request, {
    path: notePath(listing_slug, note_id),
    method: "DELETE",
  });
}

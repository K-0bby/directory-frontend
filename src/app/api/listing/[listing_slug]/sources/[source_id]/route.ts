import { NextRequest } from "next/server";
import { proxyLaravelJson } from "@/lib/bff/proxy-laravel";

type RouteContext = {
  params: Promise<{ listing_slug: string; source_id: string }>;
};

function sourcePath(listingSlug: string, sourceId: string): string {
  return `listing/${encodeURIComponent(listingSlug)}/sources/${encodeURIComponent(sourceId)}`;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { listing_slug, source_id } = await context.params;
  return proxyLaravelJson(request, {
    path: sourcePath(listing_slug, source_id),
    method: "PATCH",
  });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { listing_slug, source_id } = await context.params;
  return proxyLaravelJson(request, {
    path: sourcePath(listing_slug, source_id),
    method: "DELETE",
  });
}

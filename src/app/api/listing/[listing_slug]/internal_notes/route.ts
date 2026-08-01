import { NextRequest } from "next/server";
import { proxyLaravelJson } from "@/lib/bff/proxy-laravel";

type RouteContext = { params: Promise<{ listing_slug: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { listing_slug } = await context.params;
  return proxyLaravelJson(request, {
    path: `listing/${encodeURIComponent(listing_slug)}/internal_notes`,
  });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { listing_slug } = await context.params;
  return proxyLaravelJson(request, {
    path: `listing/${encodeURIComponent(listing_slug)}/internal_notes`,
    method: "POST",
  });
}

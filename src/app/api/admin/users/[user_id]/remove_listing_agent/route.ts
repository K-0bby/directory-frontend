import { NextRequest } from "next/server";
import { proxyLaravelJson } from "@/lib/bff/proxy-laravel";

type RouteContext = { params: Promise<{ user_id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const { user_id } = await context.params;
  return proxyLaravelJson(request, {
    path: `users/${encodeURIComponent(user_id)}/remove_listing_agent`,
    method: "POST",
  });
}

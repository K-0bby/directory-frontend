import { NextRequest } from "next/server";
import { proxyLaravelJson } from "@/lib/bff/proxy-laravel";

type RouteContext = { params: Promise<{ revision_id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { revision_id } = await context.params;
  return proxyLaravelJson(request, {
    path: `revisions/${encodeURIComponent(revision_id)}`,
  });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { revision_id } = await context.params;
  return proxyLaravelJson(request, {
    path: `revisions/${encodeURIComponent(revision_id)}`,
    method: "PATCH",
  });
}

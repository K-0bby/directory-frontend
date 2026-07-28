import { NextRequest, NextResponse } from "next/server";
import { proxyLaravelJson } from "@/lib/bff/proxy-laravel";

type RouteContext = {
  params: Promise<{ user_id: string; action: string }>;
};

const ALLOWED_ACTIONS = new Set([
  "make_admin",
  "make_vendor",
  "make_user",
  "make_listing_agent",
]);

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { user_id, action } = await context.params;
  if (!ALLOWED_ACTIONS.has(action)) {
    return NextResponse.json({ error: "Unsupported role action." }, { status: 404 });
  }

  return proxyLaravelJson(request, {
    path: `users/${encodeURIComponent(user_id)}/${action}`,
    method: "PATCH",
  });
}

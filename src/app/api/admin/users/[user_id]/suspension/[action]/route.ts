import { NextRequest, NextResponse } from "next/server";
import { proxyLaravelJson } from "@/lib/bff/proxy-laravel";

type RouteContext = {
  params: Promise<{ user_id: string; action: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { user_id, action } = await context.params;
  if (!["suspend", "unsuspend"].includes(action)) {
    return NextResponse.json(
      { error: "Unsupported suspension action." },
      { status: 404 },
    );
  }

  return proxyLaravelJson(request, {
    path: `users/${encodeURIComponent(user_id)}/${action}`,
    method: "POST",
  });
}

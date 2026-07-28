import { NextRequest } from "next/server";
import { proxyLaravelJson } from "@/lib/bff/proxy-laravel";

type RouteContext = { params: Promise<{ assessment_id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { assessment_id } = await context.params;
  return proxyLaravelJson(request, {
    path: `admin/duplicate_assessments/${encodeURIComponent(assessment_id)}/resolve`,
    method: "PATCH",
  });
}

import { NextRequest } from "next/server";
import { proxyLaravelJson } from "@/lib/bff/proxy-laravel";

export async function GET(request: NextRequest) {
  return proxyLaravelJson(request, {
    path: "agent/owned_listings",
    includeSearch: true,
  });
}

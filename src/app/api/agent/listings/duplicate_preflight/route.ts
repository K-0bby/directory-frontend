import { NextRequest } from "next/server";
import { proxyLaravelJson } from "@/lib/bff/proxy-laravel";

export async function POST(request: NextRequest) {
  return proxyLaravelJson(request, {
    path: "agent/listings/duplicate_preflight",
    method: "POST",
  });
}

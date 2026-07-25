import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "https://me-fie.co.uk").replace(/\/$/, "");

// Admin taxonomy — impact counts and permitted actions must always be
// authoritative, never cached at any layer. See
// md files/V1-category-taxonomy-lifecycle-cache-PRD.md §16.2 / §15.4.
export async function GET(request: NextRequest) {
  const response = await fetch(`${API_BASE_URL}/api/admin/categories`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      ...(request.headers.get("Authorization") && { Authorization: request.headers.get("Authorization")! }),
    },
    cache: "no-store",
  });

  return NextResponse.json(await response.json().catch(() => ({})), {
    status: response.status,
    headers: { "Cache-Control": "no-store" },
  });
}

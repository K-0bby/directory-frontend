import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "https://me-fie.co.uk").replace(/\/$/, "");

export async function GET(request: NextRequest, { params }: { params: Promise<{ listing_slug: string }> }) {
  const { listing_slug } = await params;
  const authorization = request.headers.get("Authorization");
  try {
    const response = await fetch(`${API_BASE_URL}/api/listing/${encodeURIComponent(listing_slug)}/management`, {
      headers: { Accept: "application/json", ...(authorization ? { Authorization: authorization } : {}) },
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ message: "Could not load listing workspace" }, { status: 502 });
  }
}

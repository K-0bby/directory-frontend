import { NextRequest, NextResponse } from "next/server";
import { extractClientIp } from "@/lib/bff/extract-client-ip";

const API_BASE_URL = (
  process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "https://me-fie.co.uk"
).replace(/\/$/, "");

// Category-by-listing-type discovery is governed by Laravel's own versioned
// CategoryCache service — this BFF layer must never add its own caching on
// top of that. See md files/V1-category-taxonomy-lifecycle-cache-PRD.md §15.4/§15.5.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const backendUrl = new URL(`${API_BASE_URL}/api/business_categories`);

    searchParams.forEach((value, key) => {
      backendUrl.searchParams.set(key, value);
    });

    // Forward real client IP so the backend can geo-detect when no ?country= is present.
    const clientIp = extractClientIp(request);
    if (clientIp) backendUrl.searchParams.set("ip_address", clientIp);

    const authHeader = request.headers.get("Authorization");

    const response = await fetch(backendUrl.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      cache: "no-store",
    });

    const rawText = await response.text();
    let data: unknown;
    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch {
      return NextResponse.json(
        {
          message: "Upstream returned non-JSON response",
          upstreamStatus: response.status,
          upstreamBody: rawText.slice(0, 500),
          backendUrl: backendUrl.toString(),
        },
        { status: 502 },
      );
    }

    if (!response.ok) {
      const maybeMessage =
        typeof data === "object" && data !== null && "message" in data
          ? (data as { message?: string }).message
          : undefined;
      return NextResponse.json(
        { message: maybeMessage || "Failed to fetch business categories" },
        { status: response.status },
      );
    }

    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("business_categories proxy error:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 },
    );
  }
}

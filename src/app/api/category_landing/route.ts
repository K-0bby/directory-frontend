import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = (
  process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "https://me-fie.co.uk"
).replace(/\/$/, "");

export async function GET(request: NextRequest) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const { searchParams } = new URL(request.url);
    const backendUrl = new URL(`${API_BASE_URL}/api/category_landing`);

    searchParams.forEach((value, key) => {
      backendUrl.searchParams.set(key, value);
    });

    const forwarded =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      request.headers.get("cf-connecting-ip");
    const clientIp = forwarded ? forwarded.split(",")[0].trim() : null;
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
      signal: controller.signal,
    });

    const rawText = await response.text();
    let data: unknown;
    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch {
      return NextResponse.json(
        {
          message: "Upstream returned a non-JSON response",
          upstreamStatus: response.status,
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
        { message: maybeMessage || "Failed to fetch category landing" },
        { status: response.status },
      );
    }

    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return NextResponse.json(
        { message: "Category landing request timed out" },
        { status: 504 },
      );
    }
    console.error("category_landing proxy error:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 },
    );
  } finally {
    clearTimeout(timeout);
  }
}

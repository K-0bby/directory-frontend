import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = (
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "https://me-fie.co.uk"
).replace(/\/$/, "");

type ProxyOptions = {
  path: string;
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  includeSearch?: boolean;
};

/**
 * Proxies an authenticated JSON request to Laravel without exposing the
 * upstream URL to browser code. Laravel remains authoritative for roles,
 * suspension, ownership, stewardship and validation.
 */
export async function proxyLaravelJson(
  request: NextRequest,
  { path, method = "GET", includeSearch = false }: ProxyOptions,
): Promise<NextResponse> {
  try {
    const authorization = request.headers.get("authorization");
    const contentType = request.headers.get("content-type");
    const search = includeSearch ? request.nextUrl.search : "";
    const body = method === "GET" ? undefined : await request.text();

    const response = await fetch(`${API_BASE_URL}/api/${path}${search}`, {
      method,
      headers: {
        Accept: "application/json",
        ...(authorization ? { Authorization: authorization } : {}),
        ...(contentType ? { "Content-Type": contentType } : {}),
      },
      ...(body ? { body } : {}),
      cache: "no-store",
    });

    if (response.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    const payload = await response.json().catch(() => ({
      error: "The upstream service returned an invalid response.",
    }));

    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error(`Laravel proxy failed for ${path}`, error);
    return NextResponse.json(
      { error: "The service is temporarily unavailable." },
      { status: 502 },
    );
  }
}

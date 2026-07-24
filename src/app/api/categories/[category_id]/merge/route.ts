import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "https://me-fie.co.uk").replace(/\/$/, "");

export async function POST(request: NextRequest, { params }: { params: Promise<{ category_id: string }> }) {
  const { category_id } = await params;

  const response = await fetch(`${API_BASE_URL}/api/categories/${category_id}/merge`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(request.headers.get("Authorization") && { Authorization: request.headers.get("Authorization")! }),
    },
    body: JSON.stringify(await request.json()),
  });

  return NextResponse.json(await response.json().catch(() => ({})), {
    status: response.status,
    headers: { "Cache-Control": "no-store" },
  });
}

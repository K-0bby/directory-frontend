import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = (
  process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "https://me-fie.co.uk"
).replace(/\/$/, "");

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ claim_id: string }> },
) {
  try {
    const { claim_id } = await params;
    const authHeader = request.headers.get("Authorization");

    const response = await fetch(`${API_BASE_URL}/api/admin/claims/${claim_id}/approve`, {
      method: "PATCH",
      headers: {
        Accept: "application/json",
        ...(authHeader && { Authorization: authHeader }),
      },
    });

    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("admin/claims/[claim_id]/approve PATCH error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

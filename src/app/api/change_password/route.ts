import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = (
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "https://me-fie.co.uk"
).replace(/\/$/, "");

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const authHeader = request.headers.get("Authorization");
    const response = await fetch(`${API_BASE_URL}/api/change_password`, {
      method: "PUT",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(authHeader && { Authorization: authHeader }),
      },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Error changing password:", error);
    return NextResponse.json(
      { message: "Failed to change password" },
      { status: 500 },
    );
  }
}

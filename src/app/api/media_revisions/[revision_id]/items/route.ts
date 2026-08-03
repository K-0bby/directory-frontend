import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = (
  process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "https://me-fie.co.uk"
).replace(/\/$/, "");

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ revision_id: string }> },
) {
  try {
    const { revision_id } = await params;
    const authHeader = request.headers.get("Authorization");
    const contentType = request.headers.get("Content-Type") ?? "";
    const itemId = request.nextUrl.searchParams.get("item_id");

    if (contentType.includes("multipart/form-data")) {
      if (!itemId || !/^\d+$/.test(itemId)) {
        return NextResponse.json(
          { message: "A valid staged media item is required." },
          { status: 422 },
        );
      }

      const uploadBody = await request.formData();
      const uploadResponse = await fetch(
        `${API_BASE_URL}/api/media_revisions/${revision_id}/items/${itemId}/upload`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            ...(authHeader && { Authorization: authHeader }),
          },
          body: uploadBody,
        },
      );
      const uploadData = await uploadResponse.json().catch(() => ({
        message: uploadResponse.ok ? "Upload completed." : "Media upload failed.",
      }));
      return NextResponse.json(uploadData, { status: uploadResponse.status });
    }

    const body = await request.json().catch(() => ({}));

    const response = await fetch(`${API_BASE_URL}/api/media_revisions/${revision_id}/items`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(authHeader && { Authorization: authHeader }),
      },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("media_revisions items POST error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

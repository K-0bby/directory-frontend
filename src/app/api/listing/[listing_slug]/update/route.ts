import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://me-fie.co.uk').replace(/\/$/, '');

async function handleUpdate(
  request: NextRequest,
  listing_slug: string,
  method: 'PUT' | 'PATCH',
) {
  try {
    const body = await request.json();
    const authHeader = request.headers.get('Authorization');

    const response = await fetch(
      `${API_BASE_URL}/api/listing/${listing_slug}/update`,
      {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(authHeader && { Authorization: authHeader }),
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        {
          message: errorData.message || 'Failed to update listing',
          error: errorData.error || errorData.message || 'Failed to update listing',
          errors: errorData.errors,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error updating listing:', error);
    return NextResponse.json({ error: 'Failed to update listing' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ listing_slug: string }> }
) {
  const { listing_slug } = await params;
  return handleUpdate(request, listing_slug, 'PUT');
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ listing_slug: string }> }
) {
  const { listing_slug } = await params;
  return handleUpdate(request, listing_slug, 'PATCH');
}

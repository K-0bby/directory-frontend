import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://me-fie.co.uk').replace(/\/$/, '');

// Category taxonomy is governed by Laravel's own versioned CategoryCache
// service (immediate consistency after a committed mutation) — this BFF
// layer must never add its own caching on top of that. See
// md files/V1-category-taxonomy-lifecycle-cache-PRD.md §15.4.
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const authHeader = request.headers.get('Authorization');

    const params = new URLSearchParams();
    searchParams.forEach((value, key) => params.append(key, value));
    const queryString = params.toString();

    const response = await fetch(
      `${API_BASE_URL.replace(/\/$/, "")}/api/categories${queryString ? `?${queryString}` : ""}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(authHeader && { Authorization: authHeader }),
        },
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.message || 'Failed to fetch categories' },
        { status: response.status, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const data = await response.json();

    return NextResponse.json(data, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const contentType = request.headers.get('Content-Type') || '';

    // Forward FormData as-is for file uploads; fall back to JSON for plain requests
    let forwardBody: BodyInit;
    const forwardHeaders: Record<string, string> = {
      Accept: 'application/json',
      ...(authHeader && { Authorization: authHeader }),
    };

    if (contentType.includes('multipart/form-data')) {
      forwardBody = await request.formData();
      // Do NOT set Content-Type — fetch adds it with the correct boundary automatically
    } else {
      forwardBody = JSON.stringify(await request.json());
      forwardHeaders['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${API_BASE_URL}/api/categories`, {
      method: 'POST',
      headers: forwardHeaders,
      body: forwardBody,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.message || 'Failed to create category', ...errorData },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json(data, {
      status: response.status,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    );
  }
}

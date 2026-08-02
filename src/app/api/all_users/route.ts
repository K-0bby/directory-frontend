import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = (
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'https://me-fie.co.uk'
).replace(/\/+$/, '');

const PRIVATE_CACHE_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0, must-revalidate',
  Vary: 'Authorization',
};

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');

    const response = await fetch(
      `${API_BASE_URL}/api/all_users${request.nextUrl.search}`,
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
        { error: errorData.message || 'Failed to fetch users' },
        { status: response.status, headers: PRIVATE_CACHE_HEADERS }
      );
    }

    const data = await response.json();

    return NextResponse.json(data, {
      status: 200,
      headers: PRIVATE_CACHE_HEADERS,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500, headers: PRIVATE_CACHE_HEADERS }
    );
  }
}

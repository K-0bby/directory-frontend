import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://me-fie.co.uk').replace(/\/$/, '');

export async function POST(request: NextRequest) {
  try {
    const body = await request.formData();
    const authHeader = request.headers.get('Authorization');

    const response = await fetch(`${API_BASE_URL}/api/update_user`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        ...(authHeader && { Authorization: authHeader }),
      },
      body,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        {
          message: errorData.message || 'Failed to update user',
          errors: errorData.errors,
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json(data, {
      status: response.status,
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

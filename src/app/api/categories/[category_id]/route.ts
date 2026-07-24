import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://me-fie.co.uk').replace(/\/$/, '');

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ category_id: string }> }
) {
  try {
    const { category_id } = await params;
    const authHeader = request.headers.get('Authorization');
    const contentType = request.headers.get('Content-Type') || '';

    // Forward FormData as-is for file uploads; fall back to JSON for plain requests.
    //
    // IMPORTANT: PHP only populates $_POST and $_FILES for POST requests.
    // Sending PUT + multipart/form-data means Laravel receives an empty body —
    // $request->input() and $request->hasFile() both return nothing.
    // Fix: send as POST with _method=PUT in the FormData so Laravel's method-
    // spoofing middleware re-routes it as PUT while PHP correctly parses the body.
    let forwardBody: BodyInit;
    let forwardMethod: string;
    const forwardHeaders: Record<string, string> = {
      Accept: 'application/json',
      ...(authHeader && { Authorization: authHeader }),
    };

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      formData.append('_method', 'PUT'); // Laravel body-based method spoofing
      forwardBody = formData;
      forwardMethod = 'POST'; // Must be POST so PHP parses multipart correctly
      forwardHeaders['X-HTTP-Method-Override'] = 'PUT'; // Symfony header-based override (checked first)
      // Do NOT set Content-Type — fetch sets it with the correct boundary automatically
    } else {
      forwardBody = JSON.stringify(await request.json());
      forwardMethod = 'PUT';
      forwardHeaders['Content-Type'] = 'application/json';
    }

    const response = await fetch(
      `${API_BASE_URL}/api/categories/${category_id}`,
      {
        method: forwardMethod,
        headers: forwardHeaders,
        body: forwardBody,
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.message || 'Failed to update category', ...errorData },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json(data, {
      status: response.status,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('Error updating category:', error);
    return NextResponse.json(
      { error: 'Failed to update category' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ category_id: string }> }
) {
  try {
    const { category_id } = await params;
    const authHeader = request.headers.get('Authorization');

    const response = await fetch(
      `${API_BASE_URL}/api/categories/${category_id}`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(authHeader && { Authorization: authHeader }),
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.message || 'Failed to delete category' },
        { status: response.status }
      );
    }

    const data = await response.json().catch(() => ({}));

    return NextResponse.json(data, {
      status: response.status,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json(
      { error: 'Failed to delete category' },
      { status: 500 }
    );
  }
}

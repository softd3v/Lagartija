import { NextResponse } from 'next/server';
import {
  deleteEndpoint,
  getEndpointById,
  updateEndpoint,
} from '@/lib/db/endpoints-repository';
import { monitorEndpointSchema } from '@/lib/validation/endpoint-schema';

export const runtime = 'nodejs';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const endpoint = getEndpointById(id);

  if (!endpoint) {
    return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });
  }

  return NextResponse.json({ endpoint });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = monitorEndpointSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updated = updateEndpoint(id, parsed.data);
    if (!updated) {
      return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });
    }

    return NextResponse.json({ endpoint: updated });
  } catch (error) {
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      return NextResponse.json({ error: 'Endpoint id already exists' }, { status: 409 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const deleted = deleteEndpoint(id);

  if (!deleted) {
    return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

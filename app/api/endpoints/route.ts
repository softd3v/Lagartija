import { NextResponse } from 'next/server';
import { createEndpoint, getAllEndpoints } from '@/lib/db/endpoints-repository';
import { monitorEndpointSchema } from '@/lib/validation/endpoint-schema';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const endpoints = getAllEndpoints();
    return NextResponse.json({ endpoints });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = monitorEndpointSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const created = createEndpoint(parsed.data);
    return NextResponse.json({ endpoint: created }, { status: 201 });
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

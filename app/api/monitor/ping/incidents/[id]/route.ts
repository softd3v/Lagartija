import { NextRequest, NextResponse } from 'next/server';
import {
  getEndpointByIdOrName,
  getDowntimeIncidentsByEndpoint,
  getDowntimeSummaryByEndpoint,
} from '@/lib/db/endpoints-repository';

export const runtime = 'nodejs';

function resolveRange(searchParams: URLSearchParams) {
  const to = searchParams.get('to') ?? new Date().toISOString();
  const from = searchParams.get('from') ?? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  return { from, to };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const endpoint = getEndpointByIdOrName(id);

    if (!endpoint || endpoint.type !== 'network') {
      return NextResponse.json({ error: 'Network endpoint not found' }, { status: 404 });
    }

    const { from, to } = resolveRange(request.nextUrl.searchParams);
    const incidents = getDowntimeIncidentsByEndpoint(endpoint.id, from, to);
    const summary = getDowntimeSummaryByEndpoint(endpoint.id, from, to);

    return NextResponse.json({
      endpoint: {
        id: endpoint.id,
        name: endpoint.name,
        host: endpoint.host,
      },
      from,
      to,
      incidents,
      summary,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

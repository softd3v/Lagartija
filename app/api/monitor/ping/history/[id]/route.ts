import { NextRequest, NextResponse } from 'next/server';
import { getEndpointByIdOrName, getPingSamplesByEndpoint } from '@/lib/db/endpoints-repository';

export const runtime = 'nodejs';

function resolveRange(searchParams: URLSearchParams) {
  const to = searchParams.get('to') ?? new Date().toISOString();
  const from = searchParams.get('from') ?? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const limit = Number(searchParams.get('limit') ?? '500');

  return {
    from,
    to,
    limit: Number.isFinite(limit) ? limit : 500,
  };
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

    const { from, to, limit } = resolveRange(request.nextUrl.searchParams);
    const samples = getPingSamplesByEndpoint(endpoint.id, from, to, limit);

    return NextResponse.json({
      endpoint: {
        id: endpoint.id,
        name: endpoint.name,
        host: endpoint.host,
      },
      from,
      to,
      count: samples.length,
      samples,
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

import { NextRequest, NextResponse } from 'next/server';
import { checkNetworkHealth } from '@/lib/api-monitor/network-health-checker';
import { alertManager } from '@/lib/services/alert-manager';
import { getEndpointByIdOrName } from '@/lib/db/endpoints-repository';
import type { NetworkEndpoint } from '@/types';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const endpoint = getEndpointByIdOrName(id);

    if (!endpoint) {
      return NextResponse.json({ error: 'Network endpoint not found' }, { status: 404 });
    }

    if (endpoint.type !== 'network') {
      return NextResponse.json({ error: 'Endpoint is not a network type' }, { status: 400 });
    }

    const healthCheck = await checkNetworkHealth(endpoint as NetworkEndpoint);
    await alertManager.checkAndAlert(endpoint, healthCheck);

    return NextResponse.json(healthCheck);
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

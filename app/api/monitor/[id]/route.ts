import { NextRequest, NextResponse } from 'next/server';
import { checkApiHealth } from '@/lib/api-monitor/health-checker';
import { alertManager } from '@/lib/services/alert-manager';
import { getEndpointById } from '@/lib/db/endpoints-repository';
import type { ApiEndpoint } from '@/types';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: endpointId } = await params;
  const endpoint = getEndpointById(endpointId);

  if (!endpoint || endpoint.type !== 'api') {
    return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });
  }

  try {
    const healthCheck = await checkApiHealth(endpoint as ApiEndpoint);
    
    // Check for alerts (status changes)
    await alertManager.checkAndAlert(endpoint, healthCheck);

    return NextResponse.json(healthCheck);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

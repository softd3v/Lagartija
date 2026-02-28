import { NextRequest, NextResponse } from 'next/server';
import { checkDatabaseHealth } from '@/lib/api-monitor/database-health-checker';
import { alertManager } from '@/lib/services/alert-manager';
import { DEFAULT_ENDPOINTS } from '@/config/apis.config';
import type { DatabaseEndpoint } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Find the database endpoint in configuration
    const endpoint = DEFAULT_ENDPOINTS.find((e) => e.id === id);

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Database endpoint not found' },
        { status: 404 }
      );
    }

    if (endpoint.type !== 'database') {
      return NextResponse.json(
        { error: 'Endpoint is not a database type' },
        { status: 400 }
      );
    }

    const dbEndpoint = endpoint as DatabaseEndpoint;

    // Get credentials from environment variables
    const username = process.env[`DB_${id}_USER`];
    const password = process.env[`DB_${id}_PASSWORD`];

    if (!username || !password) {
      return NextResponse.json(
        { 
          error: 'Database credentials not configured',
          message: `Missing environment variables: DB_${id}_USER or DB_${id}_PASSWORD`
        },
        { status: 500 }
      );
    }

    // Perform health check
    const healthCheck = await checkDatabaseHealth(
      dbEndpoint,
      username,
      password
    );

    // Check for alerts (status changes)
    await alertManager.checkAndAlert(endpoint, healthCheck);

    return NextResponse.json(healthCheck);
  } catch (error) {
    console.error('Error checking database health:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

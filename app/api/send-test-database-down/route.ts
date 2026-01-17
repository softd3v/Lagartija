import { NextResponse } from 'next/server';
import { sendAlertEmail } from '@/lib/services/email-service';
import { DEFAULT_APIS } from '@/config/apis.config';
import type { ApiHealthCheck } from '@/types';

export async function GET() {
  try {
    // Use the first configured API for the test
    const testEndpoint = DEFAULT_APIS[0];
    
    if (!testEndpoint) {
      return NextResponse.json(
        { success: false, error: 'No API endpoints configured' },
        { status: 400 }
      );
    }

    // Simulate a DATABASE DISCONNECTED scenario with realistic data
    const mockDatabaseDownHealthCheck: ApiHealthCheck = {
      endpointId: testEndpoint.id,
      status: 'up', // API is UP but database is DOWN
      responseTime: 234,
      statusCode: 200,
      timestamp: new Date().toISOString(),
      responseData: {
        status: "degraded",
        timestamp: new Date().toISOString(),
        service: "CCT API",
        version: "ALPHA",
        database: {
          connected: false,
          pool_available: false,
          response_time_ms: null,
          error: "Connection timeout - Unable to connect to database server at localhost:5432",
          pool_size: 0,
          pool_min: 2
        }
      },
      databaseConnected: false,
      databaseError: "Connection timeout - Unable to connect to database server at localhost:5432",
    };

    // Send DATABASE DOWN alert email
    await sendAlertEmail(testEndpoint, mockDatabaseDownHealthCheck, 'database-down');

    return NextResponse.json({ 
      success: true, 
      message: 'Test DATABASE DOWN alert email sent successfully',
      recipients: process.env.ALERT_TO_EMAILS?.split(',') || [],
      endpoint: testEndpoint.name,
    });
  } catch (error) {
    console.error('Test DATABASE DOWN alert failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

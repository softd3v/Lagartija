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

    // Simulate a DATABASE RECONNECTED scenario with realistic data
    const mockDatabaseRecoveredHealthCheck: ApiHealthCheck = {
      endpointId: testEndpoint.id,
      status: 'up',
      responseTime: 187,
      statusCode: 200,
      timestamp: new Date().toISOString(),
      responseData: {
        status: "healthy",
        timestamp: new Date().toISOString(),
        service: "CCT API",
        version: "ALPHA",
        database: {
          connected: true,
          pool_available: true,
          response_time_ms: 15.62,
          error: null,
          pool_size: 10,
          pool_min: 2
        }
      },
      databaseConnected: true,
      databaseError: undefined,
    };

    // Send DATABASE RECOVERED alert email
    await sendAlertEmail(testEndpoint, mockDatabaseRecoveredHealthCheck, 'database-recovered');

    return NextResponse.json({ 
      success: true, 
      message: 'Test DATABASE RECONNECTED alert email sent successfully',
      recipients: process.env.ALERT_TO_EMAILS?.split(',') || [],
      endpoint: testEndpoint.name,
    });
  } catch (error) {
    console.error('Test DATABASE RECOVERED alert failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

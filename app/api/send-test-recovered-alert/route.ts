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

    // Simulate a RECOVERED scenario
    const mockRecoveredHealthCheck: ApiHealthCheck = {
      endpointId: testEndpoint.id,
      status: 'up',
      responseTime: 145,
      statusCode: 200,
      timestamp: new Date().toISOString(),
      responseData: {
        status: 'healthy',
        uptime: 3600,
        message: 'All systems operational',
        timestamp: new Date().toISOString(),
      },
    };

    // Send RECOVERED alert email
    await sendAlertEmail(testEndpoint, mockRecoveredHealthCheck, 'recovered');

    return NextResponse.json({ 
      success: true, 
      message: 'Test RECOVERED alert email sent successfully',
      recipients: process.env.ALERT_TO_EMAILS?.split(',') || [],
      endpoint: testEndpoint.name,
    });
  } catch (error) {
    console.error('Test RECOVERED alert failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

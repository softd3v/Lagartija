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

    // Simulate a DOWN scenario with realistic error data
    const mockDownHealthCheck: ApiHealthCheck = {
      endpointId: testEndpoint.id,
      status: 'down',
      responseTime: 5000, // Timeout scenario
      statusCode: 0, // No response
      timestamp: new Date().toISOString(),
      error: 'NetworkError when attempting to fetch resource - Connection timeout after 5000ms',
      responseData: null,
    };

    // Send DOWN alert email
    await sendAlertEmail(testEndpoint, mockDownHealthCheck, 'down');

    return NextResponse.json({ 
      success: true, 
      message: 'Test DOWN alert email sent successfully',
      recipients: process.env.ALERT_TO_EMAILS?.split(',') || [],
      endpoint: testEndpoint.name,
    });
  } catch (error) {
    console.error('Test DOWN alert failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { sendAlertEmail } from '@/lib/services/email-service';
import { DEFAULT_ENDPOINTS } from '@/config/apis.config';
import type { ApiHealthCheck, DatabaseEndpoint } from '@/types';

export async function GET() {
  try {
    // Find the Oracle database endpoint
    const oracleEndpoint = DEFAULT_ENDPOINTS.find(
      e => e.type === 'database' && e.id === 'ORACLE_CCTPROD'
    ) as DatabaseEndpoint;
    
    if (!oracleEndpoint) {
      return NextResponse.json(
        { success: false, error: 'Oracle database endpoint not configured' },
        { status: 400 }
      );
    }

    // Simulate Oracle Database DOWN scenario
    const mockOracleDownHealthCheck: ApiHealthCheck = {
      endpointId: oracleEndpoint.id,
      status: 'down',
      responseTime: 10023, // Timeout reached
      timestamp: new Date().toISOString(),
      error: 'ORA-12170: TNS:Connect timeout occurred',
      responseData: null,
      databaseConnected: false,
      databaseError: 'ORA-12170: TNS:Connect timeout occurred',
    };

    // Send DATABASE DOWN alert email
    await sendAlertEmail(oracleEndpoint, mockOracleDownHealthCheck, 'down');

    return NextResponse.json({ 
      success: true, 
      message: 'Test Oracle Database DOWN alert email sent successfully',
      recipients: process.env.ALERT_TO_EMAILS?.split(',') || [],
      endpoint: oracleEndpoint.name,
      scenario: 'Oracle Database Connection Failed',
      alertType: 'down',
    });
  } catch (error) {
    console.error('Error sending test Oracle DOWN alert:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

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

    // Simulate Oracle Database RECOVERED scenario
    const mockOracleRecoveredHealthCheck: ApiHealthCheck = {
      endpointId: oracleEndpoint.id,
      status: 'up',
      responseTime: 287,
      statusCode: 200,
      timestamp: new Date().toISOString(),
      responseData: {
        database: {
          connected: true,
          type: 'oracle',
          host: oracleEndpoint.host,
          serviceName: oracleEndpoint.serviceName,
        },
        query: [{ '1': 1 }],
      },
      databaseConnected: true,
    };

    // Send DATABASE RECOVERED alert email
    await sendAlertEmail(oracleEndpoint, mockOracleRecoveredHealthCheck, 'recovered');

    return NextResponse.json({ 
      success: true, 
      message: 'Test Oracle Database RECOVERED alert email sent successfully',
      recipients: process.env.ALERT_TO_EMAILS?.split(',') || [],
      endpoint: oracleEndpoint.name,
      scenario: 'Oracle Database Connection Restored',
      alertType: 'recovered',
    });
  } catch (error) {
    console.error('Error sending test Oracle RECOVERED alert:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

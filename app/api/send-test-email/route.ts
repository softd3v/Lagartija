import { NextResponse } from 'next/server';
import { sendTestEmail } from '@/lib/services/email-service';

export async function GET() {
  try {
    await sendTestEmail();
    return NextResponse.json({ 
      success: true, 
      message: 'Test email sent successfully',
      recipients: process.env.ALERT_TO_EMAILS?.split(',') || []
    });
  } catch (error) {
    console.error('Test email failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { getWebhookById } from '@/lib/db/webhooks-repository';
import { sendTestWebhook } from '@/lib/services/webhook-service';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const webhook = getWebhookById(id);

    if (!webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    await sendTestWebhook(webhook);

    return NextResponse.json({
      success: true,
      message: 'Test webhook sent successfully',
      webhook: webhook.name,
      type: webhook.type,
    });
  } catch (error) {
    console.error('Test webhook failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

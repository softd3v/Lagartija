import { NextResponse } from 'next/server';
import { createWebhook, getAllWebhooks } from '@/lib/db/webhooks-repository';
import { webhookConfigSchema } from '@/lib/validation/webhook-schema';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const webhooks = getAllWebhooks();
    return NextResponse.json({ webhooks });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = webhookConfigSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const created = createWebhook(parsed.data);
    return NextResponse.json({ webhook: created }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      return NextResponse.json({ error: 'Webhook id already exists' }, { status: 409 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

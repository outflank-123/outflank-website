import { NextRequest, NextResponse } from 'next/server';

/**
 * WhatsApp Cloud API Webhook Handler
 * 
 * 1. GET: Meta challenge verification
 *    Meta sends: ?hub.mode=subscribe&hub.challenge=...&hub.verify_token=...
 * 2. POST: Meta webhook event payload (status updates, inbound messages)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'outflank_wa_verify_token';

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('[WhatsApp Webhook] Verification challenge passed.');
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  console.warn('[WhatsApp Webhook] Verification failed. Token mismatch or invalid mode.');
  return new NextResponse('Forbidden', { status: 403 });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('[WhatsApp Webhook Event]:', JSON.stringify(body, null, 2));

    // Acknowledge receipt immediately with 200 OK so Meta doesn't retry
    return NextResponse.json({ status: 'EVENT_RECEIVED' }, { status: 200 });
  } catch (err: any) {
    console.error('[WhatsApp Webhook] Error parsing event:', err);
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
}

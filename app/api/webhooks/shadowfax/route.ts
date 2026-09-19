import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHmac } from 'crypto'
import { mapShadowfaxStatus } from '@/lib/shadowfax'
import { sendShipmentStatusEmail } from '@/lib/email'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST /api/webhooks/shadowfax
 *
 * Receives real-time push notifications from Shadowfax when a shipment
 * status changes. This URL must be registered in the Shadowfax Client Portal
 * under the Webhook tab.
 *
 * Docs: https://sfxunifiedapi.docs.apiary.io/#Push_Callback_API
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()

    // ── Signature Verification ──────────────────────────────────────────────────
    // Shadowfax sends an X-Sfx-Signature or X-Signature header.
    // Verify it against SHADOWFAX_WEBHOOK_SECRET if configured.
    const webhookSecret = process.env.SHADOWFAX_WEBHOOK_SECRET
    if (webhookSecret) {
      const signature = req.headers.get('x-sfx-signature') || req.headers.get('x-signature')
      if (!signature) {
        console.warn('[Shadowfax Webhook] Missing signature header — rejecting')
        return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
      }
      const expectedSig = createHmac('sha256', webhookSecret).update(rawBody).digest('hex')
      if (signature !== expectedSig) {
        console.warn('[Shadowfax Webhook] Invalid signature — rejecting')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    } else {
      console.warn('[Shadowfax Webhook] SHADOWFAX_WEBHOOK_SECRET not set — skipping signature check')
    }
    // ─────────────────────────────────────────────────────────────────────────────

    const body = JSON.parse(rawBody)
    console.log('[Shadowfax Webhook] Received:', JSON.stringify(body, null, 2))

    const {
      awb_number,
      order_id,       // This is our internal client_order_id we sent to Shadowfax
      event,          // status_id e.g. 'ofd', 'delivered'
      status,         // Human readable e.g. 'Delivered'
      current_location,
      rider_name,
      rider_contact,
      event_timestamp,
    } = body

    if (!order_id) {
      return NextResponse.json({ error: 'Missing order_id' }, { status: 400 })
    }

    // Map Shadowfax event to our internal status
    const internalStatus = mapShadowfaxStatus(event)

    // Idempotency check: if the order already has this exact Shadowfax status, skip processing
    const { data: existingOrder } = await supabase
      .from('retail_orders')
      .select('id, customer_email, customer_name, shadowfax_status, awb_number')
      .eq('id', order_id)
      .single()

    if (existingOrder && existingOrder.shadowfax_status === event) {
      console.log(`[Shadowfax Webhook] Skipping duplicate event '${event}' for order ${order_id}`)
      return NextResponse.json({ received: true, skipped: 'duplicate_event' })
    }

    // Update the order in Supabase
    const updatePayload: any = {
      status: internalStatus,
      shadowfax_status: event,
      awb_number: awb_number || existingOrder?.awb_number || undefined,
      updated_at: new Date().toISOString(),
    }

    if (internalStatus === 'delivered') {
      updatePayload.delivered_at = new Date().toISOString()
    }

    let { data: order, error } = await supabase
      .from('retail_orders')
      .update(updatePayload)
      .eq('id', order_id)
      .select('id, customer_email, customer_name, status')
      .single()

    if (error && error.code === '42703' && updatePayload.delivered_at) {
      delete updatePayload.delivered_at
      const retry = await supabase
        .from('retail_orders')
        .update(updatePayload)
        .eq('id', order_id)
        .select('id, customer_email, customer_name, status')
        .single()
      order = retry.data
      error = retry.error
    }

    if (error) {
      console.error('[Shadowfax Webhook] Supabase update error:', error)
      // Return 200 anyway so Shadowfax doesn't retry indefinitely
      return NextResponse.json({ received: true, warning: error.message })
    }

    console.log(`[Shadowfax Webhook] Order ${order_id} updated to status: ${internalStatus}`)

    // Send email on key status changes
    if (order && (internalStatus === 'out_for_delivery' || internalStatus === 'delivered')) {
      try {
        await sendShipmentStatusEmail({
          customerEmail: order.customer_email,
          customerName: order.customer_name,
          orderId: order_id,
          awbNumber: awb_number,
          status: internalStatus,
          riderName: rider_name,
          riderContact: rider_contact,
          currentLocation: current_location,
        })
      } catch (emailErr) {
        console.error('[Shadowfax Webhook] Email send error:', emailErr)
      }
    }

    return NextResponse.json({ received: true, updatedStatus: internalStatus })
  } catch (err) {
    console.error('[Shadowfax Webhook] Handler error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHmac } from 'crypto'
import { mapShadowfaxStatus } from '@/lib/shadowfax'
import { sendShipmentStatusEmail } from '@/lib/email'
import {
  sendOrderOutForDeliveryNotification,
  sendOrderDeliveredNotification,
  sendOrderCancelledNotification,
} from '@/lib/services/whatsapp'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST /api/webhooks/shadowfax
 *
 * Receives real-time push notifications from Shadowfax when a shipment
 * status changes. Registered in Shadowfax360 under Settings → Webhooks.
 *
 * Docs: https://sfxunifiedapi.docs.apiary.io/#Push_Callback_API
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()

    // ── Signature Verification ────────────────────────────────────────────────
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

    const body = JSON.parse(rawBody)
    console.log('[Shadowfax Webhook] Received:', JSON.stringify(body, null, 2))

    const {
      awb_number,
      order_id,        // Our internal client_order_id sent to Shadowfax
      event,           // e.g. 'ofd', 'delivered', 'picked', 'rto'
      current_location,
      rider_name,
      rider_contact,
    } = body

    if (!order_id) {
      return NextResponse.json({ error: 'Missing order_id' }, { status: 400 })
    }

    // Map Shadowfax event to our internal status
    const internalStatus = mapShadowfaxStatus(event)

    // Idempotency: skip if we already processed this exact event
    const { data: existingOrder } = await supabase
      .from('retail_orders')
      .select('id, customer_email, customer_name, customer_phone, shadowfax_status, awb_number')
      .eq('id', order_id)
      .single()

    if (existingOrder && existingOrder.shadowfax_status === event) {
      console.log(`[Shadowfax Webhook] Skipping duplicate event '${event}' for order ${order_id}`)
      return NextResponse.json({ received: true, skipped: 'duplicate_event' })
    }

    // Build DB update payload
    const updatePayload: any = {
      status: internalStatus,
      shadowfax_status: event,
      awb_number: awb_number || existingOrder?.awb_number || undefined,
      updated_at: new Date().toISOString(),
    }

    if (internalStatus === 'delivered') {
      updatePayload.delivered_at = new Date().toISOString()
    }

    // Update order in Supabase
    let { data: order, error } = await supabase
      .from('retail_orders')
      .update(updatePayload)
      .eq('id', order_id)
      .select('id, customer_email, customer_name, customer_phone, status, awb_number')
      .single()

    // Retry without delivered_at if column doesn't exist yet
    if (error && error.code === '42703' && updatePayload.delivered_at) {
      delete updatePayload.delivered_at
      const retry = await supabase
        .from('retail_orders')
        .update(updatePayload)
        .eq('id', order_id)
        .select('id, customer_email, customer_name, customer_phone, status, awb_number')
        .single()
      order = retry.data
      error = retry.error
    }

    if (error) {
      console.error('[Shadowfax Webhook] Supabase update error:', error)
      // Return 200 so Shadowfax doesn't retry indefinitely
      return NextResponse.json({ received: true, warning: error.message })
    }

    console.log(`[Shadowfax Webhook] Order ${order_id} → status: ${internalStatus} (event: ${event})`)

    // ── Notifications per status ──────────────────────────────────────────────
    if (order) {
      // 1. Out for Delivery → WhatsApp + Email
      if (internalStatus === 'out_for_delivery') {
        try {
          await sendOrderOutForDeliveryNotification({
            order: { ...order, awb_number: awb_number || existingOrder?.awb_number },
            riderName: rider_name,
            riderContact: rider_contact,
          })
        } catch (waErr) {
          console.error('[Shadowfax Webhook] WhatsApp OFD error:', waErr)
        }

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
          console.error('[Shadowfax Webhook] OFD Email error:', emailErr)
        }
      }

      // 2. Delivered → WhatsApp + Email
      if (internalStatus === 'delivered') {
        try {
          await sendOrderDeliveredNotification({ order })
        } catch (waErr) {
          console.error('[Shadowfax Webhook] WhatsApp Delivered error:', waErr)
        }

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
          console.error('[Shadowfax Webhook] Delivered Email error:', emailErr)
        }
      }

      // 3. Cancelled / RTO → WhatsApp only
      if (internalStatus === 'cancelled' && order.customer_phone) {
        const isRto = ['rto', 'rto_in_process', 'rto_d', 'rto_nd'].includes(event)
        try {
          await sendOrderCancelledNotification({
            order,
            reason: isRto ? 'rto' : 'cancelled',
          })
        } catch (waErr) {
          console.error('[Shadowfax Webhook] WhatsApp Cancelled error:', waErr)
        }
      }
    }

    return NextResponse.json({ received: true, updatedStatus: internalStatus })
  } catch (err) {
    console.error('[Shadowfax Webhook] Handler error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

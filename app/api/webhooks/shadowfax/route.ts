import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
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
    const body = await req.json()

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

    // Update the order in Supabase
    const { data: order, error } = await supabase
      .from('retail_orders')
      .update({
        status: internalStatus,
        shadowfax_status: event,
        awb_number: awb_number || undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order_id)
      .select('id, customer_email, customer_name, status')
      .single()

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

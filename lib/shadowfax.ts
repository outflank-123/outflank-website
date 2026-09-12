/**
 * Shadowfax API Client
 * Unified API (Forward/Warehouse model)
 * Docs: https://sfxunifiedapi.docs.apiary.io/
 */

const SHADOWFAX_BASE_URL = process.env.SHADOWFAX_BASE_URL || 'https://dale.staging.shadowfax.in/api'
const SHADOWFAX_API_TOKEN = process.env.SHADOWFAX_API_TOKEN || ''

function sfxHeaders() {
  return {
    'Authorization': `Token ${SHADOWFAX_API_TOKEN}`,
    'Content-Type': 'application/json',
  }
}

// ─── Status Mapping ────────────────────────────────────────────────────────────

/**
 * Maps Shadowfax event status_id to our internal retail_order_status enum.
 */
export function mapShadowfaxStatus(event: string): string {
  const transitStatuses = [
    'new', 'received_from_client_warehouse', 'item_manifested', 'bag_in_transit',
    'bag_received_at_via', 'bag_received', 'recd_at_fwd_dc', 'recd_at_fwd_hub',
    'picked', 'assigned_for_seller_pickup', 'ofp', 'recd_at_rev_hub',
  ]
  const outForDeliveryStatuses = ['assigned_for_delivery', 'ofd']
  const deliveredStatuses = ['delivered']
  const cancelledStatuses = [
    'cancelled_by_customer', 'cancelled_by_seller', 'rto',
    'rto_in_process', 'rto_d', 'rto_nd', 'lost',
  ]

  if (deliveredStatuses.includes(event)) return 'delivered'
  if (outForDeliveryStatuses.includes(event)) return 'out_for_delivery'
  if (cancelledStatuses.includes(event)) return 'cancelled'
  if (transitStatuses.includes(event)) return 'shipped'
  return 'shipped'
}

// ─── Serviceability Check ──────────────────────────────────────────────────────

export async function checkPincodeServiceability(pincode: string): Promise<{
  serviceable: boolean
  error?: string
}> {
  try {
    const url = `${SHADOWFAX_BASE_URL}/v1/clients/serviceability/?service=customer_delivery&pincodes=${pincode}`
    const res = await fetch(url, { headers: sfxHeaders() })
    const data = await res.json()
    if (!res.ok) return { serviceable: false, error: data?.message || 'API error' }
    const results: any[] = data?.results || []
    const isServiceable = results.some((r: any) => String(r.pincode) === String(pincode))
    return { serviceable: isServiceable }
  } catch (err) {
    console.error('[Shadowfax] Serviceability check error:', err)
    return { serviceable: false, error: 'Network error' }
  }
}

// ─── Create Delivery Order ──────────────────────────────────────────────────────

export interface ShadowfaxCreateOrderPayload {
  clientOrderId: string
  customerName: string
  customerPhone: string
  customerEmail?: string
  addressLine1: string
  city: string
  state: string
  pincode: string
  productName: string
  orderValue: number
  weightKg?: number
  paymentMode: 'prepaid' | 'cod'
  codAmount?: number
}

export async function createShadowfaxOrder(payload: ShadowfaxCreateOrderPayload): Promise<{
  success: boolean
  awbNumber?: string
  data?: any
  error?: string
}> {
  try {
    const body = {
      order_details: {
        client_order_id: payload.clientOrderId,
        payment_mode: payload.paymentMode === 'cod' ? 'cod' : 'prepaid',
        cod_amount: payload.paymentMode === 'cod' ? (payload.codAmount ?? payload.orderValue) : 0,
        total_amount: payload.orderValue,
      },
      delivery_details: {
        name: payload.customerName,
        contact_number: payload.customerPhone,
        address_line_1: payload.addressLine1,
        city: payload.city,
        state: payload.state,
        pincode: String(payload.pincode),
      },
      product_details: {
        name: payload.productName,
        quantity: 1,
        price: payload.orderValue,
        weight: payload.weightKg ?? 0.5,
      },
      rto_details: {
        name: 'Outflank Warehouse',
        contact_number: '9999999999',
        address_line_1: 'Outflank Warehouse, Delhi',
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110001',
      },
    }

    const res = await fetch(`${SHADOWFAX_BASE_URL}/v3/clients/orders/`, {
      method: 'POST',
      headers: sfxHeaders(),
      body: JSON.stringify(body),
    })

    const data = await res.json()
    if (!res.ok) {
      console.error('[Shadowfax] Create order failed:', data)
      return { success: false, error: data?.message || JSON.stringify(data) }
    }

    const awbNumber = data?.awb_number || data?.data?.awb_number
    return { success: true, awbNumber, data }
  } catch (err) {
    console.error('[Shadowfax] Create order network error:', err)
    return { success: false, error: 'Network error' }
  }
}

// ─── Cancel Order ───────────────────────────────────────────────────────────────

export async function cancelShadowfaxOrder(awbNumber: string, reason = 'Cancelled by Client'): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const res = await fetch(`${SHADOWFAX_BASE_URL}/v1/clients/orders/cancel/`, {
      method: 'POST',
      headers: sfxHeaders(),
      body: JSON.stringify({ awb_number: awbNumber, cancel_reason: reason }),
    })
    const data = await res.json()
    if (!res.ok) return { success: false, error: data?.message || JSON.stringify(data) }
    return { success: true }
  } catch (err) {
    console.error('[Shadowfax] Cancel order error:', err)
    return { success: false, error: 'Network error' }
  }
}

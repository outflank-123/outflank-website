/**
 * Shared coupon validation + usage recording logic.
 * Used by /api/coupons/validate and checkout routes.
 */

import { createAdminClient } from '@/lib/supabase/admin'

export interface CouponValidationResult {
  valid: boolean
  couponId?: string
  code?: string
  type?: 'percentage' | 'fixed'
  value?: number
  discountAmount?: number
  maxDiscountAmount?: number | null
  error?: string
}

/**
 * Validates a coupon against all business rules and returns the computed discount.
 */
export async function validateCoupon({
  code,
  cartTotal,
  customerPhone,
}: {
  code: string
  cartTotal: number
  customerPhone?: string
}): Promise<CouponValidationResult> {
  const supabase = createAdminClient()
  const upperCode = code.trim().toUpperCase()

  const { data: coupon, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('code', upperCode)
    .single()

  if (error || !coupon) {
    return { valid: false, error: 'Invalid coupon code.' }
  }

  if (!coupon.is_active) {
    return { valid: false, error: 'This coupon is no longer active.' }
  }

  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return { valid: false, error: 'This coupon has expired.' }
  }

  if (coupon.usage_limit_total !== null && coupon.used_count >= coupon.usage_limit_total) {
    return { valid: false, error: 'This coupon has reached its maximum usage limit.' }
  }

  if (cartTotal < Number(coupon.min_order_amount)) {
    return {
      valid: false,
      error: `Minimum order of ₹${Number(coupon.min_order_amount).toLocaleString('en-IN')} required for this coupon.`,
    }
  }

  // Per-user usage limit
  if (customerPhone && coupon.usage_limit_per_user > 0) {
    const cleanPhone = customerPhone.replace(/\D/g, '').slice(-10)
    const { count } = await supabase
      .from('coupon_usages')
      .select('id', { count: 'exact', head: true })
      .eq('coupon_id', coupon.id)
      .eq('customer_phone', cleanPhone)

    if ((count ?? 0) >= coupon.usage_limit_per_user) {
      const limit = coupon.usage_limit_per_user
      return {
        valid: false,
        error: `You can only use this coupon ${limit === 1 ? 'once' : `${limit} times`} per account.`,
      }
    }
  }

  // First order only
  if (coupon.first_order_only && customerPhone) {
    const cleanPhone = customerPhone.replace(/\D/g, '').slice(-10)
    const { count: orderCount } = await supabase
      .from('retail_orders')
      .select('id', { count: 'exact', head: true })
      .eq('customer_phone', cleanPhone)
      .in('status', ['paid', 'pending', 'shipped', 'out_for_delivery', 'delivered'])

    if ((orderCount ?? 0) > 0) {
      return { valid: false, error: 'This coupon is valid for first-time orders only.' }
    }
  }

  // Compute discount
  let discountAmount = 0
  if (coupon.type === 'percentage') {
    discountAmount = (cartTotal * Number(coupon.value)) / 100
    if (coupon.max_discount_amount !== null && coupon.max_discount_amount !== undefined) {
      discountAmount = Math.min(discountAmount, Number(coupon.max_discount_amount))
    }
  } else {
    discountAmount = Math.min(Number(coupon.value), cartTotal)
  }

  discountAmount = Math.round(discountAmount * 100) / 100

  return {
    valid: true,
    couponId: coupon.id,
    code: coupon.code,
    type: coupon.type,
    value: Number(coupon.value),
    discountAmount,
    maxDiscountAmount: coupon.max_discount_amount ? Number(coupon.max_discount_amount) : null,
  }
}

/**
 * Records a coupon usage and increments used_count.
 * Call this AFTER order is successfully created/paid.
 */
export async function recordCouponUsage({
  couponId,
  orderId,
  customerPhone,
  discountAmount,
}: {
  couponId: string
  orderId: string
  customerPhone: string
  discountAmount: number
}): Promise<void> {
  const supabase = createAdminClient()
  const cleanPhone = customerPhone.replace(/\D/g, '').slice(-10)

  try {
    // Insert usage record
    await supabase.from('coupon_usages').insert({
      coupon_id: couponId,
      order_id: orderId,
      customer_phone: cleanPhone,
      discount_amount: discountAmount,
    })

    // Increment used_count via fetch-and-update (safe for Supabase without RPC)
    const { data: current } = await supabase
      .from('coupons')
      .select('used_count')
      .eq('id', couponId)
      .single()

    if (current) {
      await supabase
        .from('coupons')
        .update({
          used_count: (current.used_count || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', couponId)
    }
  } catch (err) {
    console.error('[recordCouponUsage] Error:', err)
  }
}

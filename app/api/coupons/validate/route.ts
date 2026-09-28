import { NextRequest, NextResponse } from 'next/server'
import { validateCoupon } from '@/lib/coupons'

/**
 * POST /api/coupons/validate
 * Body: { code: string, cartTotal: number, customerPhone?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { code, cartTotal, customerPhone } = await req.json()

    if (!code || !cartTotal || cartTotal <= 0) {
      return NextResponse.json({ valid: false, error: 'Missing code or cart total.' }, { status: 400 })
    }

    const result = await validateCoupon({ code, cartTotal, customerPhone })

    if (!result.valid) {
      return NextResponse.json({ valid: false, error: result.error }, { status: 200 })
    }

    return NextResponse.json({
      valid: true,
      couponId: result.couponId,
      code: result.code,
      type: result.type,
      value: result.value,
      discountAmount: result.discountAmount,
      maxDiscountAmount: result.maxDiscountAmount,
    })
  } catch (err) {
    console.error('[/api/coupons/validate] Error:', err)
    return NextResponse.json({ valid: false, error: 'Server error. Please try again.' }, { status: 500 })
  }
}

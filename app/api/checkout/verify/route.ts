import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendOrderConfirmationEmail } from '@/lib/email'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, internal_order_id } = body

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !internal_order_id) {
      return NextResponse.json({ success: false, error: 'Missing payment details' }, { status: 400 })
    }

    const secret = process.env.RAZORPAY_KEY_SECRET

    if (!secret) {
      console.error('RAZORPAY_KEY_SECRET is not set in environment variables')
      return NextResponse.json({ success: false, error: 'Server configuration error' }, { status: 500 })
    }

    // Verify Signature
    const generated_signature = crypto
      .createHmac('sha256', secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex')

    if (generated_signature !== razorpay_signature) {
      console.error('Razorpay signature mismatch')
      return NextResponse.json({ success: false, error: 'Invalid payment signature' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Payment is valid, update order status
    const { data: orderData, error: updateError } = await supabase
      .from('retail_orders')
      .update({
        status: 'paid',
        razorpay_payment_id: razorpay_payment_id,
      })
      .eq('id', internal_order_id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating order status:', updateError)
      return NextResponse.json({ success: false, error: 'Payment verified but order update failed' }, { status: 500 })
    }

    // Fetch order items to include in the email
    const { data: itemsData } = await supabase
      .from('retail_order_items')
      .select('product_name, quantity, price_at_time, selected_color')
      .eq('order_id', internal_order_id)

    const items = itemsData?.map((i: any) => ({
      name: i.product_name,
      quantity: i.quantity,
      price: i.price_at_time,
      colorName: i.selected_color
    })) || []

    // Send confirmation email
    await sendOrderConfirmationEmail({
      orderId: orderData.id,
      customerName: orderData.customer_name,
      customerEmail: orderData.customer_email,
      amount: Number(orderData.total_amount),
      shippingFee: Number(orderData.shipping_fee || 0),
      paymentMethod: orderData.payment_method || 'razorpay',
      items: items,
      shippingAddress: orderData.shipping_address
    })

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Payment verification error:', error)
    return NextResponse.json({ success: false, error: 'An unexpected error occurred' }, { status: 500 })
  }
}

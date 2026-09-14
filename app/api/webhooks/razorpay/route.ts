import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendOrderConfirmationEmail } from '@/lib/email'

export async function POST(req: Request) {
  try {
    const rawBody = await req.text()
    const signature = req.headers.get('x-razorpay-signature')
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET

    if (!signature || !secret) {
      return NextResponse.json({ error: 'Invalid signature or secret missing' }, { status: 400 })
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex')

    if (expectedSignature !== signature) {
      console.error('[Razorpay Webhook] Invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    const body = JSON.parse(rawBody)

    // Handle Payment Captured Event
    if (body.event === 'payment.captured') {
      const payment = body.payload.payment.entity
      const razorpayOrderId = payment.order_id
      const razorpayPaymentId = payment.id

      if (!razorpayOrderId) {
        return NextResponse.json({ error: 'No order_id in payment' }, { status: 400 })
      }

      const supabase = createAdminClient()

      // Find the internal order by razorpay_order_id
      const { data: orderData, error: fetchError } = await supabase
        .from('retail_orders')
        .select('*')
        .eq('razorpay_order_id', razorpayOrderId)
        .single()

      if (fetchError || !orderData) {
        console.error('[Razorpay Webhook] Order not found for Razorpay Order ID:', razorpayOrderId)
        return NextResponse.json({ error: 'Order not found' }, { status: 404 })
      }

      // If already paid, ignore
      if (orderData.status === 'paid' || orderData.status === 'shipped' || orderData.status === 'delivered') {
        return NextResponse.json({ success: true, message: 'Already processed' })
      }

      // Update order status to paid
      const { error: updateError } = await supabase
        .from('retail_orders')
        .update({
          status: 'paid',
          razorpay_payment_id: razorpayPaymentId,
        })
        .eq('id', orderData.id)

      if (updateError) {
        console.error('[Razorpay Webhook] Error updating order status:', updateError)
        return NextResponse.json({ error: 'Update failed' }, { status: 500 })
      }

      // Fetch items for email
      const { data: itemsData } = await supabase
        .from('retail_order_items')
        .select('product_name, quantity, price_at_time, selected_color')
        .eq('order_id', orderData.id)

      const items = itemsData?.map((i: any) => ({
        name: i.product_name,
        quantity: i.quantity,
        price: i.price_at_time,
        colorName: i.selected_color
      })) || []

      // Send confirmation email
      try {
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
      } catch (emailError) {
        console.error('[Razorpay Webhook] Non-fatal error: Failed to send confirmation email', emailError)
      }

      console.log(`[Razorpay Webhook] Successfully processed payment for order ${orderData.id}`)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[Razorpay Webhook] Unhandled error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

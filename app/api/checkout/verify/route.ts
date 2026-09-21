import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendOrderConfirmationEmail } from '@/lib/email'
import { sendOrderPlacedNotification, sendAdminOrderAlertNotification } from '@/lib/services/whatsapp'

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

    // Fetch order items to include in the email (including customization)
    let { data: itemsData } = await supabase
      .from('retail_order_items')
      .select('product_name, quantity, price_at_time, selected_color, customization')
      .eq('order_id', internal_order_id)

    if (!itemsData) {
      const fallback = await supabase
        .from('retail_order_items')
        .select('product_name, quantity, price_at_time, selected_color')
        .eq('order_id', internal_order_id)
      itemsData = fallback.data as any
    }

    let notesCustomItems: any[] = []
    if (orderData.notes) {
      try {
        const parsedNotes = typeof orderData.notes === 'string' ? JSON.parse(orderData.notes) : orderData.notes
        notesCustomItems = parsedNotes?.custom_items || []
      } catch {}
    }

    const items = itemsData?.map((i: any) => {
      const fallbackCustom = notesCustomItems.find((ci: any) => ci.product_name === i.product_name)?.customization
      return {
        name: i.product_name,
        quantity: i.quantity,
        price: i.price_at_time,
        colorName: i.selected_color,
        customization: i.customization || fallbackCustom || null
      }
    }) || []

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
      console.error('Non-fatal error: Failed to send Razorpay confirmation email', emailError)
    }

    // Trigger automated WhatsApp notifications (non-blocking)
    try {
      sendOrderPlacedNotification({ order: orderData })
      sendAdminOrderAlertNotification({ order: orderData })
    } catch (waError) {
      console.error('Non-fatal error: WhatsApp notification trigger failed', waError)
    }

    // Sync customer profile and phone number to customers table if order has customer_uid
    if (orderData.customer_uid) {
      const cleanPhone = orderData.customer_phone ? orderData.customer_phone.replace(/\D/g, '').slice(-10) : null
      let parsedAddr: any = {}
      try {
        parsedAddr = typeof orderData.shipping_address === 'string' ? JSON.parse(orderData.shipping_address) : orderData.shipping_address
      } catch {}

      const houseNo = parsedAddr?.houseNo || ''
      const street = parsedAddr?.street || ''
      const landmark = parsedAddr?.landmark || parsedAddr?.addressLine2 || ''
      const addressLine1 = parsedAddr?.addressLine1 || (houseNo ? [houseNo, street].filter(Boolean).join(', ') : (parsedAddr?.address || ''))
      const addressLine2 = landmark || parsedAddr?.addressLine2 || ''
      const landmarkText = landmark ? (/^(near|opp|opposite|behind|beside|adjacent)\b/i.test(landmark) ? landmark : `Near ${landmark}`) : ''
      const fullAddress = parsedAddr?.address || [addressLine1, landmarkText].filter(Boolean).join(', ')

      try {
        await supabase
          .from('customers')
          .upsert({
            firebase_uid: orderData.customer_uid,
            full_name: orderData.customer_name || null,
            email: orderData.customer_email || null,
            phone: cleanPhone || null,
            shipping_address: {
              fullName: orderData.customer_name,
              phone: cleanPhone || orderData.customer_phone,
              email: orderData.customer_email,
              houseNo: houseNo || undefined,
              street: street || undefined,
              landmark: landmark || undefined,
              addressLine1: addressLine1 || undefined,
              addressLine2: addressLine2 || undefined,
              address: fullAddress,
              city: parsedAddr?.city || '',
              state: parsedAddr?.state || '',
              pincode: parsedAddr?.pincode || '',
            },
            updated_at: new Date().toISOString(),
          }, { onConflict: 'firebase_uid' })
      } catch (err: any) {
        console.warn('[Verify payment] Could not sync customer profile:', err?.message || err)
      }
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Payment verification error:', error)
    return NextResponse.json({ success: false, error: 'An unexpected error occurred' }, { status: 500 })
  }
}

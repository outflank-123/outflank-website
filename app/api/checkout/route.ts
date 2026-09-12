import { NextResponse } from 'next/server'
import Razorpay from 'razorpay'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  try {
    // Initialize Razorpay inside the handler to prevent build errors
    const razorpay = new Razorpay({
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'dummy_key',
      key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy_secret',
    })

    const body = await req.json()
    const { items, customer, totalAmount, shippingFee, firebaseUid } = body

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
    }

    if (!customer.name || !customer.email || !customer.phone || !customer.address || !customer.city || !customer.state || !customer.pincode) {
      return NextResponse.json({ error: 'Missing customer details' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // 1. Create a pending order in our database
    // Store address as structured JSON so admin dispatch can extract fields
    const shippingAddressJson = {
      addressLine1: customer.address,
      city: customer.city,
      state: customer.state,
      pincode: customer.pincode,
    }
    
    const { data: orderData, error: orderError } = await supabase
      .from('retail_orders')
      .insert([
        {
          customer_name: customer.name,
          customer_email: customer.email,
          customer_phone: customer.phone,
          shipping_address: JSON.stringify(shippingAddressJson),
          total_amount: totalAmount,
          shipping_fee: shippingFee || 0,
          payment_method: 'razorpay',
          status: 'pending',
          customer_uid: firebaseUid || null
        }
      ])
      .select('id')
      .single()

    if (orderError) {
      console.error('Error creating internal order:', orderError)
      return NextResponse.json({ error: 'Failed to create internal order' }, { status: 500 })
    }

    const internalOrderId = orderData.id

    // 2. Insert order items
    const orderItems = items.map((item: any) => ({
      order_id: internalOrderId,
      product_id: item.productId,
      product_name: item.name,
      quantity: item.quantity,
      price_at_time: item.price,
      selected_color: item.colorName || null,
    }))

    const { error: itemsError } = await supabase
      .from('retail_order_items')
      .insert(orderItems)

    if (itemsError) {
      console.error('Error inserting order items:', itemsError)
      return NextResponse.json({ error: 'Failed to save order items' }, { status: 500 })
    }

    // 3. Create a Razorpay Order
    // Razorpay amount is in paise (multiply by 100)
    const options = {
      amount: Math.round(totalAmount * 100),
      currency: 'INR',
      receipt: `receipt_${internalOrderId}`,
    }

    const razorpayOrder = await razorpay.orders.create(options)

    // 4. Update internal order with Razorpay Order ID
    await supabase
      .from('retail_orders')
      .update({ razorpay_order_id: razorpayOrder.id })
      .eq('id', internalOrderId)

    return NextResponse.json({
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      razorpayOrderId: razorpayOrder.id,
      internalOrderId: internalOrderId,
    })

  } catch (error: any) {
    console.error('Checkout API error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred during checkout' },
      { status: 500 }
    )
  }
}

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendOrderConfirmationEmail } from '@/lib/email'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { items, customer, totalAmount, shippingFee, firebaseUid } = body

    if (!items || !customer || !totalAmount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!customer.name || !customer.email || !customer.phone || !customer.address || !customer.city || !customer.state || !customer.pincode) {
      return NextResponse.json({ error: 'Missing customer details' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // 1. Create a pending order in our database for COD
    const fullAddress = `${customer.address}, ${customer.city}, ${customer.state} - ${customer.pincode}`
    
    const { data: orderData, error: orderError } = await supabase
      .from('retail_orders')
      .insert([
        {
          customer_name: customer.name,
          customer_email: customer.email,
          customer_phone: customer.phone,
          shipping_address: fullAddress,
          total_amount: totalAmount,
          shipping_fee: shippingFee || 0,
          payment_method: 'cod',
          status: 'pending', // COD is technically pending payment upon delivery
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

    // 3. Send confirmation email for COD
    await sendOrderConfirmationEmail({
      orderId: internalOrderId,
      customerName: customer.name,
      customerEmail: customer.email,
      amount: totalAmount,
      shippingFee: shippingFee,
      paymentMethod: 'cod',
      items: items,
      shippingAddress: fullAddress
    })

    return NextResponse.json({
      success: true,
      internalOrderId: internalOrderId,
    })

  } catch (error: any) {
    console.error('COD Checkout API error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred during COD checkout' },
      { status: 500 }
    )
  }
}

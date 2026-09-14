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

    // --- SECURE PRICE CALCULATION ---
    // Fetch product prices from DB
    const productIds = items.map((i: any) => i.productId)
    const { data: dbProducts, error: dbProductsError } = await supabase
      .from('products')
      .select('id, base_price')
      .in('id', productIds)

    if (dbProductsError || !dbProducts) {
      console.error('Error fetching products:', dbProductsError)
      return NextResponse.json({ error: 'Failed to verify cart items' }, { status: 500 })
    }

    // Recalculate Subtotal
    let verifiedSubtotal = 0
    const verifiedItems = items.map((item: any) => {
      const dbProduct = dbProducts.find((p) => p.id === item.productId)
      if (!dbProduct) throw new Error(`Product ${item.productId} not found`)
      verifiedSubtotal += dbProduct.base_price * item.quantity
      return {
        ...item,
        price: dbProduct.base_price // Overwrite frontend price
      }
    })

    // Fetch Shipping Settings from DB
    const { data: settings } = await supabase
      .from('store_settings')
      .select('free_shipping_threshold, flat_shipping_rate')
      .single()

    let verifiedShippingFee = 0
    if (settings && verifiedSubtotal < settings.free_shipping_threshold) {
      verifiedShippingFee = settings.flat_shipping_rate
    }

    const verifiedTotalAmount = verifiedSubtotal + verifiedShippingFee

    // Safety check against frontend manipulation
    if (Math.abs(verifiedTotalAmount - totalAmount) > 1) { // 1 rupee tolerance for float weirdness
      console.warn(`Price mismatch detected in COD. Expected: ${verifiedTotalAmount}, Got: ${totalAmount}`)
      return NextResponse.json({ error: 'Cart total mismatch. Please refresh and try again.' }, { status: 400 })
    }
    // --------------------------------

    // 1. Create a pending order in our database for COD
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
          total_amount: verifiedTotalAmount,
          shipping_fee: verifiedShippingFee,
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
    const orderItems = verifiedItems.map((item: any) => ({
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
      // Rollback: delete the dangling order
      await supabase.from('retail_orders').delete().eq('id', internalOrderId)
      return NextResponse.json({ error: 'Failed to save order items' }, { status: 500 })
    }

    // 3. Send confirmation email for COD
    try {
      await sendOrderConfirmationEmail({
        orderId: internalOrderId,
        customerName: customer.name,
        customerEmail: customer.email,
        amount: verifiedTotalAmount,
        shippingFee: verifiedShippingFee,
        paymentMethod: 'cod',
        items: verifiedItems,
        shippingAddress: JSON.stringify(shippingAddressJson)
      })
    } catch (emailError) {
      console.error('Non-fatal error: Failed to send COD confirmation email', emailError)
    }

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

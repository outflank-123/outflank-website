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

    const addressValue = customer.address || [customer.houseNo, customer.street].filter(Boolean).join(', ') || customer.addressLine1
    if (!customer.name || !customer.email || !customer.phone || !addressValue || !customer.city || !customer.state || !customer.pincode) {
      return NextResponse.json({ error: 'Missing customer details' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // --- SECURE PRICE CALCULATION & RETAIL CHECK ---
    // Fetch product prices from DB
    const productIds = items.map((i: any) => i.productId)
    let { data: dbProducts, error: dbProductsError } = await supabase
      .from('products')
      .select('id, base_price, branding_config, is_retail')
      .in('id', productIds)

    if (dbProductsError && dbProductsError.code === '42703') {
      const fallback = await supabase
        .from('products')
        .select('id, base_price, branding_config')
        .in('id', productIds)
      dbProducts = fallback.data as any
      dbProductsError = fallback.error
    }

    if (dbProductsError || !dbProducts) {
      console.error('Error fetching products:', dbProductsError)
      return NextResponse.json({ error: 'Failed to verify cart items' }, { status: 500 })
    }

    // Guard against non-retail products
    const nonRetailProduct = dbProducts.find((p: any) => p.is_retail === false || p.branding_config?._is_retail === false)
    if (nonRetailProduct) {
      return NextResponse.json(
        { error: 'One or more items in your cart are restricted to corporate bulk orders only and cannot be purchased via retail checkout.' },
        { status: 400 }
      )
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
      console.warn(`Price mismatch detected. Expected: ${verifiedTotalAmount}, Got: ${totalAmount}`)
      return NextResponse.json({ error: 'Cart total mismatch. Please refresh and try again.' }, { status: 400 })
    }
    // --------------------------------

    // 1. Create a pending order in our database
    // Store address as structured JSON so admin dispatch can extract fields
    const houseNo = customer.houseNo || ''
    const street = customer.street || ''
    const landmark = customer.landmark || customer.addressLine2 || ''
    const addressLine1 = customer.addressLine1 || (houseNo ? [houseNo, street].filter(Boolean).join(', ') : customer.address)
    const addressLine2 = landmark || customer.addressLine2 || ''
    const landmarkText = landmark ? (/^(near|opp|opposite|behind|beside|adjacent)\b/i.test(landmark) ? landmark : `Near ${landmark}`) : ''
    const fullAddress = customer.address || [addressLine1, landmarkText].filter(Boolean).join(', ')

    const shippingAddressJson = {
      fullName: customer.name,
      phone: customer.phone,
      email: customer.email,
      houseNo,
      street,
      landmark,
      addressLine1,
      addressLine2,
      address: fullAddress,
      city: customer.city,
      state: customer.state,
      pincode: customer.pincode,
    }

    const hasCustomItems = verifiedItems.some((i: any) => i.customBranding?.isCustomized || Boolean(i.customization))
    
    const orderPayload: any = {
      customer_name: customer.name,
      customer_email: customer.email,
      customer_phone: customer.phone,
      shipping_address: JSON.stringify(shippingAddressJson),
      total_amount: verifiedTotalAmount,
      shipping_fee: verifiedShippingFee,
      payment_method: 'razorpay',
      status: 'pending',
      customer_uid: firebaseUid || null,
      has_custom_items: hasCustomItems
    }

    let { data: orderData, error: orderError } = await supabase
      .from('retail_orders')
      .insert([orderPayload])
      .select('id')
      .single()

    if (orderError && (orderError.code === '42703' || orderError.code === 'PGRST204' || orderError.message?.includes('has_custom_items'))) {
      // Fallback if has_custom_items column does not exist yet in DB
      delete orderPayload.has_custom_items
      orderPayload.notes = JSON.stringify({ has_custom_items: hasCustomItems })
      const retry = await supabase.from('retail_orders').insert([orderPayload]).select('id').single()
      orderData = retry.data
      orderError = retry.error
    }

    if (orderError || !orderData) {
      console.error('Error creating internal order:', orderError)
      return NextResponse.json({ error: 'Failed to create internal order' }, { status: 500 })
    }

    const internalOrderId = orderData.id

    // 2. Insert order items with custom branding metadata
    const orderItems = verifiedItems.map((item: any) => {
      const customData = item.customBranding || (item.customization ? { isCustomized: true, customizationLabel: item.customization } : null)
      return {
        order_id: internalOrderId,
        product_id: item.productId,
        product_name: item.name,
        quantity: item.quantity,
        price_at_time: item.price,
        selected_color: item.colorName || null,
        customization: customData ? { ...customData } : null
      }
    })

    // Upload locally stored base64 custom logos to Supabase Storage permanently upon checkout
    for (const oi of orderItems) {
      if (oi.customization?.logoUrl?.startsWith('data:image/')) {
        try {
          const dataUrl = oi.customization.logoUrl
          const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/)
          if (matches && matches[2]) {
            const buffer = Buffer.from(matches[2], 'base64')
            const fileName = `orders/${internalOrderId}_${oi.product_id}_${Date.now()}.webp`
            const { data: uploadRes, error: uploadErr } = await supabase.storage
              .from('custom-branding-assets')
              .upload(fileName, buffer, {
                contentType: 'image/webp',
                upsert: true
              })

            if (!uploadErr && uploadRes) {
              const { data: publicUrlData } = supabase.storage
                .from('custom-branding-assets')
                .getPublicUrl(fileName)

              oi.customization.logoUrl = publicUrlData.publicUrl
              oi.customization.logoStoragePath = fileName
            }
          }
        } catch (uploadEx) {
          console.warn('[Razorpay checkout] Could not upload logo to storage bucket, keeping base64 in record:', uploadEx)
        }
      }
    }

    let { error: itemsError } = await supabase
      .from('retail_order_items')
      .insert(orderItems)

    if (itemsError && (itemsError.code === '42703' || itemsError.code === 'PGRST204' || itemsError.message?.includes('customization'))) {
      // Fallback if customization column does not exist yet:
      const fallbackItems = orderItems.map((item: any) => {
        const customData = item.customization
        const customTag = customData?.customizationLabel || (customData?.brandText ? `Custom: "${customData.brandText}"` : null)
        return {
          order_id: item.order_id,
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          price_at_time: item.price,
          selected_color: item.selected_color ? (customTag ? `${item.selected_color} (${customTag})` : item.selected_color) : customTag
        }
      })
      const retryItems = await supabase.from('retail_order_items').insert(fallbackItems)
      itemsError = retryItems.error

      // Save customData details in retail_orders.notes
      await supabase.from('retail_orders').update({
        notes: JSON.stringify({
          has_custom_items: hasCustomItems,
          custom_items: orderItems.map((oi: any) => ({
            product_name: oi.product_name,
            selected_color: oi.selected_color,
            customization: oi.customization
          }))
        })
      }).eq('id', internalOrderId)
    }

    if (itemsError) {
      console.error('Error inserting order items:', itemsError)
      // Rollback: delete the dangling order
      await supabase.from('retail_orders').delete().eq('id', internalOrderId)
      return NextResponse.json({ error: 'Failed to save order items' }, { status: 500 })
    }

    // 3. Create a Razorpay Order
    // Razorpay amount is in paise (multiply by 100)
    const options = {
      amount: Math.round(verifiedTotalAmount * 100),
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

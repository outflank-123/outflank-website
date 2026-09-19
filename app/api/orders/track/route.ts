import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('order_id');
    const email = searchParams.get('email');

    if (!orderId || !email) {
      return NextResponse.json({ error: 'Order ID and Email are required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Fetch the specific order matching both ID and Email with rich item details
    let { data: order, error } = await supabase
      .from('retail_orders')
      .select(`
        id,
        created_at,
        status,
        total_amount,
        shipping_fee,
        payment_method,
        awb_number,
        shadowfax_status,
        customer_email,
        customer_name,
        notes,
        has_custom_items,
        retail_order_items (
          id,
          product_name,
          quantity,
          price_at_time,
          selected_color,
          customization,
          products (
            primary_image_url
          )
        )
      `)
      .eq('id', orderId.trim())
      .ilike('customer_email', email.trim())
      .single();

    if (error && (error.code === '42703' || error.code === 'PGRST204')) {
      const fallback = await supabase
        .from('retail_orders')
        .select(`
          id,
          created_at,
          status,
          total_amount,
          shipping_fee,
          payment_method,
          awb_number,
          shadowfax_status,
          customer_email,
          customer_name,
          notes,
          retail_order_items (
            id,
            product_name,
            quantity,
            price_at_time,
            selected_color
          )
        `)
        .eq('id', orderId.trim())
        .ilike('customer_email', email.trim())
        .single();
      order = fallback.data as any;
      error = fallback.error;
    }

    if (error || !order) {
      console.error('Error fetching order for tracking:', error?.message);
      return NextResponse.json({ error: 'Order not found or email does not match' }, { status: 404 });
    }

    // Merge notes fallback customization if item.customization is missing
    if (order.notes && order.retail_order_items) {
      try {
        const parsedNotes = typeof order.notes === 'string' ? JSON.parse(order.notes) : order.notes;
        const customItems = parsedNotes?.custom_items || [];
        for (const item of order.retail_order_items as any[]) {
          if (!item.customization) {
            const found = customItems.find((ci: any) => ci.product_name === item.product_name);
            if (found?.customization) {
              item.customization = found.customization;
            }
          }
        }
      } catch {}
    }

    return NextResponse.json(order);
  } catch (error: any) {
    console.error('Tracking API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

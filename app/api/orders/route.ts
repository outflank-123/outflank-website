import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get('uid');

    if (!uid) {
      return NextResponse.json({ error: 'UID is required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Fetch orders belonging to this firebase UID
    let { data: orders, error } = await supabase
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
      .eq('customer_uid', uid)
      .order('created_at', { ascending: false });

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
          notes,
          retail_order_items (
            id,
            product_name,
            quantity,
            price_at_time,
            selected_color
          )
        `)
        .eq('customer_uid', uid)
        .order('created_at', { ascending: false });
      orders = fallback.data as any;
      error = fallback.error;
    }

    if (error) {
      console.error('Error fetching orders:', error);
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
    }

    return NextResponse.json(orders, {
      headers: {
        'Cache-Control': 'private, max-age=30, stale-while-revalidate=120',
      },
    });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

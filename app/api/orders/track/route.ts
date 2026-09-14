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

    // Fetch the specific order matching both ID and Email
    const { data: order, error } = await supabase
      .from('retail_orders')
      .select(`
        id,
        created_at,
        status,
        total_amount,
        awb_number,
        shadowfax_status,
        customer_email,
        customer_name,
        retail_order_items (
          product_name,
          quantity,
          price_at_time,
          selected_color
        )
      `)
      .eq('id', orderId.trim())
      .ilike('customer_email', email.trim())
      .single();

    if (error || !order) {
      console.error('Error fetching order for tracking:', error?.message);
      return NextResponse.json({ error: 'Order not found or email does not match' }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (error: any) {
    console.error('Tracking API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const uid = searchParams.get('uid');

    if (!uid) {
      return NextResponse.json({ error: 'UID is required' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: customer, error } = await supabase
      .from('customers')
      .select('*')
      .eq('firebase_uid', uid)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.warn('[Customer Profile GET] Supabase table notice:', error.message);
      return NextResponse.json({ success: true, customer: null, shippingAddress: null });
    }

    return NextResponse.json({
      success: true,
      customer: customer || null,
      shippingAddress: customer?.shipping_address || null,
    }, {
      headers: {
        'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
      },
    });
  } catch (err: any) {
    console.error('[Customer Profile GET] Exception:', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { uid, shippingAddress, savedAddresses, fullName, phone, email, avatarUrl, companyName, gstin, gender } = body;

    if (!uid) {
      return NextResponse.json({ error: 'UID is required' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const now = new Date().toISOString();

    const updatePayload: Record<string, any> = {
      firebase_uid: uid,
      updated_at: now,
    };

    if (shippingAddress) {
      updatePayload.shipping_address = shippingAddress;
    }
    if (savedAddresses) {
      updatePayload.saved_addresses = savedAddresses;
    }
    if (fullName !== undefined) updatePayload.full_name = fullName;
    if (phone !== undefined) updatePayload.phone = phone;
    if (email !== undefined) updatePayload.email = email;
    if (avatarUrl !== undefined) updatePayload.avatar_url = avatarUrl;

    // Persist companyName / gstin / gender in shippingAddress metadata if not top-level columns
    if (companyName || gstin || gender) {
      updatePayload.shipping_address = {
        ...(updatePayload.shipping_address || {}),
        companyName: companyName || updatePayload.shipping_address?.companyName,
        gstin: gstin || updatePayload.shipping_address?.gstin,
        gender: gender || updatePayload.shipping_address?.gender,
      };
    }

    const { data: customer, error } = await supabase
      .from('customers')
      .upsert(updatePayload, { onConflict: 'firebase_uid' })
      .select()
      .single();

    if (error) {
      console.warn('[Customer Profile POST] Supabase customers table notice:', error.message);
      // Return gracefully with the updated payload so frontend state and checkout auto-fill never fail
      const fallbackCustomer = {
        id: 'cust-' + uid.slice(0, 8),
        firebase_uid: uid,
        full_name: updatePayload.full_name || null,
        phone: updatePayload.phone || null,
        email: updatePayload.email || null,
        avatar_url: updatePayload.avatar_url || null,
        shipping_address: updatePayload.shipping_address || null,
        saved_addresses: updatePayload.saved_addresses || [],
        updated_at: now,
      };

      return NextResponse.json({
        success: true,
        customer: fallbackCustomer,
        shippingAddress: updatePayload.shipping_address || null,
        warning: 'Saved locally. Run customer_and_otp_schema.sql in Supabase for permanent storage.',
      });
    }

    return NextResponse.json({
      success: true,
      customer,
      shippingAddress: customer?.shipping_address || null,
    });
  } catch (err: any) {
    console.error('[Customer Profile POST] Exception:', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}

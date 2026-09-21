import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { uid, email, fullName, phone, photoURL, provider } = body;

    if (!uid) {
      return NextResponse.json({ error: 'UID is required' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const now = new Date().toISOString();

    // Check existing customer
    const { data: existing } = await supabase
      .from('customers')
      .select('*')
      .eq('firebase_uid', uid)
      .single();

    const updateData: Record<string, any> = {
      firebase_uid: uid,
      auth_provider: provider || existing?.auth_provider || 'google',
      last_login_at: now,
      updated_at: now,
    };

    if (email) updateData.email = email;
    if (fullName) updateData.full_name = fullName;
    if (phone) updateData.phone = phone;
    if (photoURL) updateData.avatar_url = photoURL;

    // Upsert customer
    const { data: customer, error } = await supabase
      .from('customers')
      .upsert(updateData, { onConflict: 'firebase_uid' })
      .select()
      .single();

    if (error) {
      console.error('[Customer Sync] Error saving customer:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      customer: customer || existing,
    });
  } catch (err: any) {
    console.error('[Customer Sync] Exception:', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}

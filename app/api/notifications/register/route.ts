import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  try {
    const { token, uid } = await req.json();

    if (!token || !uid) {
      return NextResponse.json({ error: 'Missing token or uid' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Use upsert to avoid duplicate tokens. Wait, token is UNIQUE.
    // If a user logs in on the same device, the token is the same.
    // We should handle conflicts on 'token' gracefully.
    
    // First check if it exists
    const { data: existing } = await supabase
      .from('push_tokens')
      .select('id')
      .eq('token', token)
      .single();
      
    if (existing) {
      // Update the uid just in case a different user logged in on the same device
      await supabase
        .from('push_tokens')
        .update({ customer_uid: uid })
        .eq('token', token);
    } else {
      // Insert new token
      await supabase
        .from('push_tokens')
        .insert([{ token, customer_uid: uid }]);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error registering push token:', error);
    return NextResponse.json({ error: 'Failed to register token' }, { status: 500 });
  }
}

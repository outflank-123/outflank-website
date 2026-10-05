import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatWhatsAppPhone } from '@/lib/services/whatsapp';
import { getOrCreateUserByPhone, createCustomFirebaseToken } from '@/lib/firebase-admin';
import { getOtpRecord, recordFailedAttempt, deleteOtpRecord } from '@/lib/services/otp-store';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone, otp, name } = body;

    if (!phone || !otp) {
      return NextResponse.json({ error: 'Phone number and OTP code are required' }, { status: 400 });
    }

    const formattedPhone = formatWhatsAppPhone(phone);
    if (!formattedPhone) {
      return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 });
    }

    const cleanOtp = String(otp).trim();
    if (cleanOtp.length !== 6) {
      return NextResponse.json({ error: 'Please enter a valid 6-digit verification code.' }, { status: 400 });
    }

    const now = new Date();

    // 1. Fetch OTP record
    const record = await getOtpRecord(formattedPhone);

    if (!record) {
      return NextResponse.json(
        { error: 'No active OTP found for this number. Please click "Resend Code".' },
        { status: 400 }
      );
    }

    // 2. Check Expiration (5 min)
    if (new Date(record.expires_at).getTime() < now.getTime()) {
      await deleteOtpRecord(formattedPhone);
      return NextResponse.json(
        { error: 'Verification code has expired. Please request a new code.' },
        { status: 400 }
      );
    }

    // 3. Check Attempt Limits (Max 3 failed attempts)
    if (record.attempts >= 3) {
      await deleteOtpRecord(formattedPhone);
      return NextResponse.json(
        { error: 'Too many incorrect attempts. This code has been invalidated for security. Please request a new code.' },
        { status: 400 }
      );
    }

    // 4. Verify SHA-256 Hash
    const computedHash = crypto.createHash('sha256').update(cleanOtp).digest('hex');
    if (computedHash !== record.otp_hash) {
      const newAttempts = record.attempts + 1;
      const remainingAttempts = 3 - newAttempts;

      if (remainingAttempts <= 0) {
        await deleteOtpRecord(formattedPhone);
        return NextResponse.json(
          { error: 'Invalid verification code. Maximum attempts exceeded. Please request a new code.' },
          { status: 400 }
        );
      }

      await recordFailedAttempt(formattedPhone, newAttempts);

      return NextResponse.json(
        { error: `Invalid verification code. ${remainingAttempts} attempt${remainingAttempts === 1 ? '' : 's'} remaining.` },
        { status: 400 }
      );
    }

    // 5. Code is valid! Invalidate OTP immediately to prevent replay attacks
    await deleteOtpRecord(formattedPhone);

    const supabase = createAdminClient();
    const phoneWithPlus = formattedPhone.startsWith('+') ? formattedPhone : `+${formattedPhone}`;
    
    // 6. Check if this phone number is already linked to a customer (e.g., from Google auth)
    let targetUid = '';
    let targetName = name || null;

    try {
      const tenDigitPhone = formattedPhone.slice(-10);
      const { data: existingCustomers } = await supabase
        .from('customers')
        .select('firebase_uid, full_name, auth_provider')
        .like('phone', `%${tenDigitPhone}`)
        .limit(1);

      if (existingCustomers && existingCustomers.length > 0) {
        const existingCustomer = existingCustomers[0];
        targetUid = existingCustomer.firebase_uid;
        targetName = targetName || existingCustomer.full_name;
      }
    } catch (err) {
      // Ignored: either no customer found or network error
    }

    // 7. If no existing customer found, create a new one in Firebase
    if (!targetUid) {
      const { user: firebaseUser } = await getOrCreateUserByPhone(phoneWithPlus, targetName || undefined);
      targetUid = firebaseUser.uid;
      targetName = targetName || firebaseUser.displayName || null;
    }

    // 8. Store / Upsert customer record in Supabase `customers` table
    try {
      await supabase
        .from('customers')
        .upsert(
          {
            firebase_uid: targetUid,
            phone: formattedPhone,
            full_name: targetName,
            auth_provider: 'whatsapp', // Alternatively, you could preserve 'google' if it was already google
            last_login_at: now.toISOString(),
            updated_at: now.toISOString(),
          },
          { onConflict: 'firebase_uid' }
        );
    } catch (err) {
      console.warn('[Verify OTP] Customers table upsert skipped:', err);
    }

    // 9. Generate Firebase Custom Authentication Token
    const customToken = await createCustomFirebaseToken(targetUid, {
      phone: formattedPhone,
      provider: 'whatsapp',
    });

    return NextResponse.json({
      success: true,
      customToken,
      user: {
        uid: targetUid,
        phoneNumber: phoneWithPlus,
        displayName: targetName,
      },
    });
  } catch (err: any) {
    console.error('[Verify OTP] Unexpected exception:', err?.message || err);
    console.error('[Verify OTP] Stack:', err?.stack);
    return NextResponse.json(
      { error: err?.message || 'Authentication error while verifying code.', stack: process.env.NODE_ENV === 'development' ? err?.stack : undefined },
      { status: 500 }
    );
  }
}

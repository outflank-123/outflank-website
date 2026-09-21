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

    // 6. Get or create user in Firebase via Admin SDK
    const phoneWithPlus = formattedPhone.startsWith('+') ? formattedPhone : `+${formattedPhone}`;
    const { user: firebaseUser } = await getOrCreateUserByPhone(phoneWithPlus, name);

    // 7. Store / Upsert customer record in Supabase `customers` table
    const supabase = createAdminClient();
    try {
      await supabase
        .from('customers')
        .upsert(
          {
            firebase_uid: firebaseUser.uid,
            phone: formattedPhone,
            full_name: name || firebaseUser.displayName || null,
            auth_provider: 'whatsapp',
            last_login_at: now.toISOString(),
            updated_at: now.toISOString(),
          },
          { onConflict: 'firebase_uid' }
        );
    } catch (err) {
      console.warn('[Verify OTP] Customers table upsert skipped:', err);
    }

    // 8. Generate Firebase Custom Authentication Token
    const customToken = await createCustomFirebaseToken(firebaseUser.uid, {
      phone: formattedPhone,
      provider: 'whatsapp',
    });

    return NextResponse.json({
      success: true,
      customToken,
      user: {
        uid: firebaseUser.uid,
        phoneNumber: phoneWithPlus,
        displayName: name || firebaseUser.displayName || null,
      },
    });
  } catch (err: any) {
    console.error('[Verify OTP] Unexpected exception:', err);
    return NextResponse.json(
      { error: err?.message || 'Authentication error while verifying code.' },
      { status: 500 }
    );
  }
}

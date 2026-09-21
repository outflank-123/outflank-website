import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { formatWhatsAppPhone, sendWhatsAppMessage } from '@/lib/services/whatsapp';
import { getOtpRecord, saveOtp } from '@/lib/services/otp-store';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone } = body;

    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    const formattedPhone = formatWhatsAppPhone(phone);
    if (!formattedPhone || formattedPhone.length < 10) {
      return NextResponse.json({ error: 'Invalid phone number format. Please enter a valid 10-digit mobile number.' }, { status: 400 });
    }

    const now = new Date();

    // 1. Rate-limiting checks via hybrid store
    const existingRecord = await getOtpRecord(formattedPhone);

    if (existingRecord) {
      const lastSentAt = new Date(existingRecord.last_sent_at);
      const secondsSinceLast = Math.floor((now.getTime() - lastSentAt.getTime()) / 1000);

      // 60-second cooldown
      if (secondsSinceLast < 60) {
        const remaining = 60 - secondsSinceLast;
        return NextResponse.json(
          { error: `Please wait ${remaining}s before requesting another WhatsApp code.`, cooldownRemaining: remaining },
          { status: 429 }
        );
      }

      // Hourly limit (max 5 per hour)
      const windowStart = new Date(existingRecord.hourly_window_start || existingRecord.last_sent_at);
      const hoursSinceWindow = (now.getTime() - windowStart.getTime()) / (1000 * 60 * 60);

      if (hoursSinceWindow < 1 && existingRecord.hourly_count >= 5) {
        const minutesRemaining = Math.ceil(60 - (hoursSinceWindow * 60));
        return NextResponse.json(
          { error: `Too many OTP requests. For security, please try again in ${minutesRemaining} minutes.` },
          { status: 429 }
        );
      }
    }

    // 2. Generate secure 6-digit numeric OTP
    const rawOtp = crypto.randomInt(100000, 999999).toString();

    // 3. Save into store
    await saveOtp({
      phone: formattedPhone,
      rawOtp,
      expiresInMinutes: 5,
    });

    // 4. Dispatch WhatsApp message via Meta Cloud API
    const messageText = `Your Outflank verification code is ${rawOtp}.\n\nValid for 5 minutes. Do not share this code with anyone for your account security.`;
    
    const sendResult = await sendWhatsAppMessage({
      to: formattedPhone,
      messageText,
    });

    if (!sendResult.success) {
      console.error('[Send OTP] Meta WhatsApp dispatch failed:', sendResult.error);
      return NextResponse.json({ 
        error: sendResult.error || 'Failed to deliver WhatsApp message. Please verify your phone number has WhatsApp active.' 
      }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      message: `Verification code sent to WhatsApp number +${formattedPhone}`,
      cooldown: 60,
    });
  } catch (err: any) {
    console.error('[Send OTP] Unexpected exception:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error while sending OTP.' }, { status: 500 });
  }
}

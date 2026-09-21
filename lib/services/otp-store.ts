import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';

export interface StoredOtp {
  phone: string;
  otp_hash: string;
  expires_at: string;
  attempts: number;
  last_sent_at: string;
  hourly_count: number;
  hourly_window_start: string;
}

// In-memory fallback map (active across requests in Node server process)
const memoryOtpStore = new Map<string, StoredOtp>();

export async function saveOtp({
  phone,
  rawOtp,
  expiresInMinutes = 5,
}: {
  phone: string;
  rawOtp: string;
  expiresInMinutes?: number;
}): Promise<{ success: boolean; error?: string }> {
  const now = new Date();
  const otpHash = crypto.createHash('sha256').update(rawOtp).digest('hex');
  const expiresAt = new Date(now.getTime() + expiresInMinutes * 60 * 1000).toISOString();

  // 1. Always update memory store
  const existingMemory = memoryOtpStore.get(phone);
  const hourlyCount = existingMemory ? existingMemory.hourly_count + 1 : 1;
  const hourlyWindowStart = existingMemory ? existingMemory.hourly_window_start : now.toISOString();

  const record: StoredOtp = {
    phone,
    otp_hash: otpHash,
    expires_at: expiresAt,
    attempts: 0,
    last_sent_at: now.toISOString(),
    hourly_count: hourlyCount,
    hourly_window_start: hourlyWindowStart,
  };

  memoryOtpStore.set(phone, record);

  // 2. Attempt to persist to Supabase if table exists
  try {
    const supabase = createAdminClient();
    await supabase.from('whatsapp_otps').upsert({
      phone,
      otp_hash: otpHash,
      expires_at: expiresAt,
      attempts: 0,
      last_sent_at: now.toISOString(),
      hourly_count: hourlyCount,
      hourly_window_start: hourlyWindowStart,
    });
  } catch (err) {
    // If Supabase table is not yet created, memory store is our active source of truth
    console.warn('[OTP Store] Supabase whatsapp_otps sync skipped:', err);
  }

  return { success: true };
}

export async function getOtpRecord(phone: string): Promise<StoredOtp | null> {
  // Try Supabase first
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('whatsapp_otps')
      .select('*')
      .eq('phone', phone)
      .single();

    if (!error && data) {
      return data as StoredOtp;
    }
  } catch {}

  // Fallback to memory store
  return memoryOtpStore.get(phone) || null;
}

export async function recordFailedAttempt(phone: string, newAttempts: number): Promise<void> {
  const mem = memoryOtpStore.get(phone);
  if (mem) {
    mem.attempts = newAttempts;
    memoryOtpStore.set(phone, mem);
  }

  try {
    const supabase = createAdminClient();
    await supabase
      .from('whatsapp_otps')
      .update({ attempts: newAttempts })
      .eq('phone', phone);
  } catch {}
}

export async function deleteOtpRecord(phone: string): Promise<void> {
  memoryOtpStore.delete(phone);

  try {
    const supabase = createAdminClient();
    await supabase.from('whatsapp_otps').delete().eq('phone', phone);
  } catch {}
}

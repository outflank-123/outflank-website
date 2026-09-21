"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  MessageSquare,
  CheckCircle2,
  ShieldCheck,
  Loader2,
  RefreshCw,
  AlertCircle,
  Smartphone,
  ArrowRight,
  LogOut,
  Check,
} from 'lucide-react';
import { auth, googleProvider, appleProvider } from '@/lib/firebase';
import { signInWithPopup, signInWithCustomToken } from 'firebase/auth';
import { useAuth } from '@/lib/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { user, customerProfile, refreshProfile, updateProfile, signOutCustomer, needsPhoneNumber } = useAuth();
  const [method, setMethod] = useState<'phone' | 'whatsapp_otp' | 'require_phone'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Forced phone mode: active when require_phone is selected or authenticated user is missing phone number
  const isForcedPhoneMode = Boolean(
    method === 'require_phone' ||
    (user && needsPhoneNumber) ||
    (user && customerProfile && (!customerProfile.phone || customerProfile.phone.replace(/\D/g, '').length < 10))
  );

  // If user is logged in without phone, ensure we switch to require_phone
  useEffect(() => {
    if (isForcedPhoneMode && method !== 'whatsapp_otp') {
      setMethod('require_phone');
    }
  }, [isForcedPhoneMode, method]);

  // Timer countdown for resending WhatsApp OTP
  useEffect(() => {
    let timer: any;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setMethod('phone');
        setPhoneNumber('');
        setFullName('');
        setOtp('');
        setError('');
        setLoading(false);
        setCooldown(0);
      }, 250);
    }
  }, [isOpen]);

  const syncCustomerToDatabase = async (
    uid: string,
    email?: string | null,
    name?: string | null,
    photo?: string | null,
    provider?: string
  ) => {
    try {
      const res = await fetch('/api/customer/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid,
          email,
          fullName: name,
          photoURL: photo,
          provider: provider || 'google',
        }),
      });
      const data = await res.json();
      await refreshProfile();
      return data?.customer;
    } catch (err) {
      console.warn('[AuthModal] Customer sync warning:', err);
      return null;
    }
  };

  // Google Sign-In with mandatory phone verification check
  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result?.user) {
        const customer = await syncCustomerToDatabase(
          result.user.uid,
          result.user.email,
          result.user.displayName,
          result.user.photoURL,
          'google'
        );

        const existingPhone = customer?.phone || customerProfile?.phone;
        const cleanPhone = existingPhone ? existingPhone.replace(/\D/g, '') : '';

        if (cleanPhone.length >= 10) {
          // Already has a valid phone number
          onClose();
        } else {
          // Force customer to enter their phone number
          setMethod('require_phone');
          setPhoneNumber('');
        }
      }
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user') {
        // User closed popup; do nothing
      } else if (err?.code === 'auth/account-exists-with-different-credential') {
        setError('An account with this email already exists under a different sign-in method. Please use your original login method.');
      } else {
        setError(err?.message || 'Google sign-in could not be completed.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Apple Sign-In with mandatory phone verification check
  const handleAppleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, appleProvider);
      if (result?.user) {
        const customer = await syncCustomerToDatabase(
          result.user.uid,
          result.user.email,
          result.user.displayName,
          result.user.photoURL,
          'apple'
        );

        const existingPhone = customer?.phone || customerProfile?.phone;
        const cleanPhone = existingPhone ? existingPhone.replace(/\D/g, '') : '';

        if (cleanPhone.length >= 10) {
          onClose();
        } else {
          // Force customer to enter their phone number
          setMethod('require_phone');
          setPhoneNumber('');
        }
      }
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user') {
        // User closed popup
      } else if (err?.code === 'auth/account-exists-with-different-credential') {
        setError('An account with this email already exists under a different sign-in method.');
      } else {
        setError(err?.message || 'Apple sign-in could not be completed.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Save mandatory phone number for social sign-in user
  const handleSaveRequiredPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const cleanPhone = phoneNumber.replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);
    try {
      const currentUid = user?.uid;
      if (!currentUid) {
        setError('Session expired. Please sign in again.');
        setLoading(false);
        return;
      }

      // 1. Update customer profile in Supabase & cache
      await updateProfile({
        phone: cleanPhone,
        fullName: fullName.trim() || user.displayName || customerProfile?.full_name || undefined,
      });

      // 2. Also ensure customer sync has the phone number stored
      await fetch('/api/customer/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: currentUid,
          phone: cleanPhone,
          fullName: fullName.trim() || user.displayName || customerProfile?.full_name || undefined,
          email: user.email,
        }),
      });

      await refreshProfile();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Could not save mobile number. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // WhatsApp OTP - Send
  const handleSendWhatsAppOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const cleanPhone = phoneNumber.replace(/\D/g, '').slice(-10);
      if (cleanPhone.length !== 10) {
        setError('Please enter a valid 10-digit mobile number.');
        setLoading(false);
        return;
      }

      const res = await fetch('/api/auth/whatsapp/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to send WhatsApp verification code.');
        if (data.cooldownRemaining) setCooldown(data.cooldownRemaining);
      } else {
        setMethod('whatsapp_otp');
        setCooldown(data.cooldown || 60);
      }
    } catch (err: any) {
      setError(err?.message || 'Network error while requesting WhatsApp code.');
    } finally {
      setLoading(false);
    }
  };

  // WhatsApp OTP - Verify & Custom Token Sign-In
  const handleVerifyWhatsAppOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const cleanPhone = phoneNumber.replace(/\D/g, '').slice(-10);
      const cleanOtp = otp.replace(/\D/g, '').slice(0, 6);

      if (cleanOtp.length !== 6) {
        setError('Please enter the 6-digit code received on your WhatsApp.');
        setLoading(false);
        return;
      }

      const res = await fetch('/api/auth/whatsapp/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhone,
          otp: cleanOtp,
          name: fullName.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Invalid or expired verification code.');
        setLoading(false);
        return;
      }

      // If user is already authenticated with Google, link phone directly
      if (user?.uid) {
        await updateProfile({
          phone: cleanPhone,
          fullName: fullName.trim() || user.displayName || undefined,
        });
        await fetch('/api/customer/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid: user.uid,
            phone: cleanPhone,
            fullName: fullName.trim() || user.displayName || undefined,
            email: user.email,
          }),
        });
        await refreshProfile();
        onClose();
      } else if (data?.customToken) {
        // Authenticate into Firebase with custom token
        await signInWithCustomToken(auth, data.customToken);
        await refreshProfile();
        onClose();
      } else {
        setError('Could not establish session token. Please try again.');
      }
    } catch (err: any) {
      setError(err?.message || 'Verification error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop - unclickable if phone is mandatory */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-md"
          onClick={isForcedPhoneMode ? undefined : onClose}
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden z-10 border border-slate-100 font-sans"
        >
          {/* Top Header */}
          <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-red-50 text-[#e3231c] flex items-center justify-center font-bold">
                {isForcedPhoneMode ? <Smartphone size={18} /> : <ShieldCheck size={18} />}
              </div>
              <div>
                <h2 className="text-base font-extrabold text-[#1d1d1f]">
                  {isForcedPhoneMode
                    ? 'Enter Mobile Number'
                    : method === 'phone'
                    ? 'Customer Sign In'
                    : 'Enter WhatsApp OTP'}
                </h2>
                <p className="text-[11px] text-slate-400 font-medium">
                  {isForcedPhoneMode
                    ? 'Required for order delivery & WhatsApp tracking'
                    : 'Outflank Corporate & Retail Gifting'}
                </p>
              </div>
            </div>

            {/* Hide close button if in forced phone mode */}
            {!isForcedPhoneMode && (
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-800 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            )}
          </div>

          <div className="p-6">
            {/* Error Notification */}
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 font-semibold flex items-start gap-2"
              >
                <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-600" />
                <span>{error}</span>
              </motion.div>
            )}

            {/* ── MANDATORY PHONE COLLECTION AFTER GOOGLE LOGIN ── */}
            {method === 'require_phone' && (
              <form onSubmit={handleSaveRequiredPhone} className="space-y-4">
                {/* Account Connected Box */}
                <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3 overflow-hidden">
                    {user?.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt=""
                        className="w-10 h-10 rounded-full border border-slate-200 shrink-0 object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-700 shrink-0 text-sm">
                        {(user?.displayName || user?.email || 'U')[0].toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#1d1d1f] truncate">
                        {user?.displayName || customerProfile?.full_name || 'Account'}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {user?.email || customerProfile?.email}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <Check size={11} />
                    Connected
                  </span>
                </div>

                <div className="text-left space-y-1 pt-1">
                  <p className="text-xs font-bold text-slate-700">
                    Link your 10-digit mobile number
                  </p>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Outflank requires your phone number to coordinate order dispatches, send tracking links, and share delivery updates on WhatsApp.
                  </p>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1.5">
                    Mobile Number
                  </label>
                  <div className="flex rounded-2xl border border-slate-200 bg-slate-50 focus-within:bg-white focus-within:border-[#1d1d1f] focus-within:ring-2 focus-within:ring-slate-100 transition-all overflow-hidden">
                    <span className="inline-flex items-center px-3.5 bg-slate-100/90 text-slate-700 text-xs font-bold border-r border-slate-200 select-none">
                      +91
                    </span>
                    <input
                      type="tel"
                      required
                      autoFocus
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="Enter 10-digit mobile number"
                      className="flex-1 w-full px-3.5 py-3 text-xs font-semibold text-[#1d1d1f] bg-transparent outline-none placeholder:text-slate-400"
                    />
                  </div>
                </div>

                {/* Primary Action Button */}
                <button
                  type="submit"
                  disabled={loading || phoneNumber.length < 10}
                  className="w-full flex items-center justify-center gap-2.5 bg-[#1d1d1f] hover:bg-black text-white py-3.5 rounded-2xl font-bold text-xs transition-all shadow-sm hover:shadow-md cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Saving Mobile Number...</span>
                    </>
                  ) : (
                    <>
                      <span>Save &amp; Continue</span>
                      <ArrowRight size={15} />
                    </>
                  )}
                </button>

                {/* Secondary Action: Verify via WhatsApp OTP */}
                <button
                  type="button"
                  disabled={loading || phoneNumber.length < 10}
                  onClick={() => handleSendWhatsAppOtp()}
                  className="w-full flex items-center justify-center gap-2 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#1f8f4a] py-2.5 rounded-xl font-bold text-[11px] transition-all cursor-pointer disabled:opacity-40"
                >
                  <MessageSquare size={14} />
                  <span>Verify with WhatsApp OTP instead</span>
                </button>

                {/* Sign Out Escape Hatch */}
                <div className="pt-2 text-center border-t border-slate-100">
                  <button
                    type="button"
                    onClick={async () => {
                      await signOutCustomer();
                      setMethod('phone');
                      setPhoneNumber('');
                      onClose();
                    }}
                    className="text-[11px] text-slate-400 hover:text-red-600 transition-colors inline-flex items-center gap-1 font-medium cursor-pointer"
                  >
                    <LogOut size={12} />
                    <span>Signed into wrong account? Sign out</span>
                  </button>
                </div>
              </form>
            )}

            {/* ── MAIN VIEW: MOBILE NUMBER ABOVE + SOCIAL BUTTONS BELOW ── */}
            {method === 'phone' && (
              <div>
                {/* 1. Mobile Number Form (Top) */}
                <form onSubmit={handleSendWhatsAppOtp} className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1.5">
                      Mobile Number
                    </label>
                    <div className="flex rounded-2xl border border-slate-200 bg-slate-50 focus-within:bg-white focus-within:border-[#1d1d1f] focus-within:ring-2 focus-within:ring-slate-100 transition-all overflow-hidden">
                      <span className="inline-flex items-center px-3.5 bg-slate-100/90 text-slate-700 text-xs font-bold border-r border-slate-200 select-none">
                        +91
                      </span>
                      <input
                        type="tel"
                        required
                        autoFocus
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        placeholder="Enter 10-digit mobile number"
                        className="flex-1 w-full px-3.5 py-3 text-xs font-semibold text-[#1d1d1f] bg-transparent outline-none placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || phoneNumber.length < 10}
                    className="w-full flex items-center justify-center gap-2.5 bg-[#25D366] hover:bg-[#20bd5a] text-white py-3.5 rounded-2xl font-bold text-xs transition-all shadow-sm hover:shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Sending Code...</span>
                      </>
                    ) : (
                      <>
                        <MessageSquare size={16} />
                        <span>Continue with WhatsApp OTP</span>
                      </>
                    )}
                  </button>
                </form>

                {/* 2. Divider */}
                <div className="relative flex items-center justify-center my-5">
                  <div className="border-t border-slate-200 w-full" />
                  <span className="bg-white px-3 text-[11px] font-semibold text-slate-400 shrink-0 uppercase tracking-wider">
                    or
                  </span>
                  <div className="border-t border-slate-200 w-full" />
                </div>

                {/* 3. The 2 Social Buttons (Below) */}
                <div className="space-y-2.5">
                  {/* Google Sign-In */}
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 px-4 py-3.5 rounded-2xl font-bold text-xs transition-all hover:bg-slate-50 cursor-pointer disabled:opacity-50 shadow-2xs"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    <span>Continue with Google</span>
                  </button>

                  {/* Apple Sign-In */}
                  <button
                    type="button"
                    onClick={handleAppleSignIn}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 bg-[#000000] hover:bg-[#1d1d1f] text-white px-4 py-3.5 rounded-2xl font-bold text-xs transition-all shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.92-2.85-.9.04-1.98.6-2.62 1.34-.56.64-1.06 1.71-.93 2.73 1 .08 2.01-.47 2.63-1.22z"/>
                    </svg>
                    <span>Continue with Apple</span>
                  </button>
                </div>

                {/* Footer */}
                <div className="pt-4 text-center">
                  <p className="text-[11px] text-slate-400">
                    Signing in lets you track orders, save delivery addresses, and receive shipping updates.
                  </p>
                </div>
              </div>
            )}

            {/* ── WHATSAPP OTP VERIFICATION STEP ── */}
            {method === 'whatsapp_otp' && (
              <form onSubmit={handleVerifyWhatsAppOtp} className="space-y-4">
                <div className="text-center py-2 space-y-1">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2 border border-emerald-100">
                    <CheckCircle2 size={20} />
                  </div>
                  <p className="text-xs text-slate-600 font-medium">
                    Enter the 6-digit code sent via WhatsApp to
                  </p>
                  <p className="text-sm font-extrabold text-[#1d1d1f]">
                    +91 {phoneNumber}
                  </p>
                </div>

                <div>
                  <input
                    type="text"
                    required
                    autoFocus
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="••••••"
                    className="w-full text-center tracking-[0.4em] text-xl font-black rounded-xl border border-slate-200 py-3 bg-slate-50 text-[#1d1d1f] focus:outline-none focus:border-slate-400 focus:bg-white transition-all shadow-inner"
                  />
                  <p className="text-[10.5px] text-center text-slate-400 mt-1.5">
                    Valid for 5 minutes • Max 3 verification attempts
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.length < 6}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-xs text-white bg-[#1d1d1f] hover:bg-black transition-all disabled:opacity-50 cursor-pointer shadow-md"
                >
                  {loading ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <span>Verify &amp; Sign In</span>
                  )}
                </button>

                {/* Resend Cooldown */}
                <div className="pt-2 flex items-center justify-between text-xs font-semibold text-slate-500">
                  <button
                    type="button"
                    onClick={() => setMethod(user ? 'require_phone' : 'phone')}
                    className="hover:text-slate-800 transition-colors cursor-pointer"
                  >
                    Change mobile number
                  </button>

                  {cooldown > 0 ? (
                    <span className="text-slate-400 text-[11px] font-mono">
                      Resend in {cooldown}s
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSendWhatsAppOtp()}
                      className="text-[#e3231c] hover:underline flex items-center gap-1 cursor-pointer text-[11px]"
                    >
                      <RefreshCw size={11} />
                      <span>Resend code</span>
                    </button>
                  )}
                </div>
              </form>
            )}

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

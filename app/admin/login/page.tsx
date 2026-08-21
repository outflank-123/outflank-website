'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Lock, Mail } from 'lucide-react'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError(authError.message)
      setLoading(false)
    } else {
      router.push('/admin')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-[#1d1d1f] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-[#e3231c]/20 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-[#6366f1]/15 blur-[80px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-sm"
      >
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-[0_24px_80px_rgba(0,0,0,0.4)]">
          {/* Logo */}
          <div className="text-center mb-8">
            <Image
              src="/logo/outflank-logo.png"
              alt="Outflank"
              width={140}
              height={56}
              className="h-12 w-auto object-contain mx-auto mb-3 brightness-0 invert"
            />
            <p className="text-xs text-white/30 uppercase tracking-widest">Admin CRM</p>
          </div>

          <h1 className="text-xl font-bold text-white text-center mb-6 tracking-tight">
            Sign In to Continue
          </h1>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            {/* Email */}
            <div className="relative">
              <Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                id="admin-login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@outflank.in"
                className="w-full pl-10 pr-4 py-3.5 rounded-xl bg-white/8 border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#e3231c]/50 focus:bg-white/12 transition-all"
              />
            </div>

            {/* Password */}
            <div className="relative">
              <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                id="admin-login-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3.5 rounded-xl bg-white/8 border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#e3231c]/50 focus:bg-white/12 transition-all"
              />
            </div>

            {/* Error */}
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3"
              >
                {error}
              </motion.p>
            )}

            {/* Submit */}
            <button
              type="submit"
              id="admin-login-submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-full bg-[#e3231c] text-white py-3.5 text-sm font-semibold hover:bg-[#ff4038] disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-2 shadow-[0_4px_16px_rgba(227,35,28,0.35)]"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <p className="text-center text-xs text-white/20 mt-6">
            Admin access only. Contact your administrator for credentials.
          </p>
        </div>
      </motion.div>
    </div>
  )
}

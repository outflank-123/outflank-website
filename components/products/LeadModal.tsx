'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, CheckCircle, Loader2 } from 'lucide-react'

interface LeadModalProps {
  open: boolean
  onClose: () => void
  productId?: string
  productName?: string
}

type FormState = 'idle' | 'submitting' | 'success' | 'error'

export default function LeadModal({ open, onClose, productId, productName }: LeadModalProps) {
  const [form, setForm] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    requirements: '',
  })
  const [state, setState] = useState<FormState>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const firstInputRef = useRef<HTMLInputElement>(null)

  // Focus first input on open
  useEffect(() => {
    if (open) {
      setTimeout(() => firstInputRef.current?.focus(), 100)
      // Prevent body scroll
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  // Reset on close
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setState('idle')
        setErrorMsg('')
        setForm({ name: '', company: '', email: '', phone: '', requirements: '' })
      }, 300)
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setState('submitting')
    setErrorMsg('')
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          product_id: productId ?? null,
          product_name: productName ?? null,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Submission failed. Please try again.')
      }
      setState('success')
    } catch (err: unknown) {
      setState('error')
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong.')
    }
  }

  const field = (
    id: string,
    label: string,
    key: keyof typeof form,
    type = 'text',
    required = true,
    ref?: React.Ref<HTMLInputElement>
  ) => (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-[#1d1d1f] mb-1.5">
        {label}{required && <span className="text-[#e3231c] ml-0.5">*</span>}
      </label>
      <input
        ref={ref as React.Ref<HTMLInputElement>}
        id={id}
        type={type}
        required={required}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        className="w-full rounded-xl border border-black/10 bg-[#f5f5f7] px-4 py-3 text-sm text-[#1d1d1f] placeholder-[#aeaeb2] focus:outline-none focus:border-[#e3231c] focus:bg-white transition-all duration-200"
        placeholder={type === 'email' ? 'you@company.com' : type === 'tel' ? '+91 98765 43210' : ''}
      />
    </div>
  )

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.96, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 24 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="pointer-events-auto w-full max-w-md bg-white rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.16)] overflow-hidden max-h-[92vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="sticky top-0 bg-white/95 backdrop-blur-lg px-6 pt-6 pb-4 border-b border-black/6 flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold text-[#1d1d1f] tracking-tight">Request a Quote</h2>
                  {productName && (
                    <p className="text-xs text-[#6e6e73] mt-0.5">
                      Inquiring about: <strong className="text-[#1d1d1f]">{productName}</strong>
                    </p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  id="lead-modal-close"
                  className="p-1.5 rounded-full hover:bg-[#f5f5f7] transition-colors text-[#6e6e73]"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="px-6 py-5">
                {state === 'success' ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center text-center py-8 gap-4"
                  >
                    <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
                      <CheckCircle size={32} className="text-green-500" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-[#1d1d1f] mb-1">Inquiry Received!</h3>
                      <p className="text-sm text-[#6e6e73]">
                        We'll get back to you within <strong>24 hours</strong> with a detailed quote.
                      </p>
                    </div>
                    <button
                      onClick={onClose}
                      className="mt-2 rounded-full bg-[#e3231c] text-white px-8 py-2.5 text-sm font-semibold hover:bg-[#b91a14] transition-colors"
                    >
                      Done
                    </button>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      {field('lead-name', 'Full Name', 'name', 'text', true, firstInputRef)}
                      {field('lead-company', 'Company', 'company')}
                    </div>
                    {field('lead-email', 'Work Email', 'email', 'email')}
                    {field('lead-phone', 'Phone Number', 'phone', 'tel', false)}

                    <div>
                      <label htmlFor="lead-requirements" className="block text-xs font-semibold text-[#1d1d1f] mb-1.5">
                        Requirements<span className="text-[#e3231c] ml-0.5">*</span>
                      </label>
                      <textarea
                        id="lead-requirements"
                        required
                        rows={3}
                        value={form.requirements}
                        onChange={(e) => setForm((f) => ({ ...f, requirements: e.target.value }))}
                        placeholder="Quantity needed, occasion, budget, customization details..."
                        className="w-full rounded-xl border border-black/10 bg-[#f5f5f7] px-4 py-3 text-sm text-[#1d1d1f] placeholder-[#aeaeb2] focus:outline-none focus:border-[#e3231c] focus:bg-white transition-all duration-200 resize-none"
                      />
                    </div>

                    {state === 'error' && (
                      <p className="text-xs text-[#e3231c] bg-red-50 rounded-xl px-4 py-3 border border-red-100">
                        {errorMsg}
                      </p>
                    )}

                    <button
                      type="submit"
                      id="lead-modal-submit"
                      disabled={state === 'submitting'}
                      className="w-full flex items-center justify-center gap-2 rounded-full bg-[#e3231c] text-white py-3.5 text-sm font-semibold hover:bg-[#b91a14] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 mt-1 shadow-[0_4px_16px_rgba(227,35,28,0.25)]"
                    >
                      {state === 'submitting' ? (
                        <>
                          <Loader2 size={16} className="animate-spin" /> Submitting...
                        </>
                      ) : (
                        <>
                          <Send size={14} /> Send Inquiry
                        </>
                      )}
                    </button>

                    <p className="text-[10px] text-center text-[#aeaeb2]">
                      We respect your privacy. No spam, ever.
                    </p>
                  </form>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

'use client'

import React, { useState, useEffect, useRef } from 'react'
import { MessageCircle, X, Send, ArrowRight, ShieldCheck, Briefcase, Palette, Package } from 'lucide-react'

interface WhatsAppFloatingWidgetProps {
  defaultPhone?: string
}

export default function WhatsAppFloatingWidget({ defaultPhone = '919999926273' }: WhatsAppFloatingWidgetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [phone, setPhone] = useState(defaultPhone)
  const [userMessage, setUserMessage] = useState('')
  const [pageContext, setPageContext] = useState<{ title: string; url: string }>({ title: '', url: '' })
  const [hasInteracted, setHasInteracted] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Fetch dynamic phone from store settings if available
  useEffect(() => {
    let isMounted = true
    async function fetchSettings() {
      try {
        const res = await fetch('/api/settings', { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          if (data?.whatsapp_support_phone && isMounted) {
            const clean = data.whatsapp_support_phone.replace(/\D/g, '')
            setPhone(clean.length === 10 ? `91${clean}` : clean)
          }
        }
      } catch {
        // Fall back to defaultPhone smoothly
      }
    }
    fetchSettings()
    return () => {
      isMounted = false
    }
  }, [defaultPhone])

  // Capture current page title & URL on mount/change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPageContext({
        title: document.title.split('|')[0].trim(),
        url: window.location.href,
      })
    }
  }, [])

  // Auto focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [isOpen])

  const openWhatsApp = (text: string) => {
    const encoded = encodeURIComponent(text)
    const targetUrl = `https://wa.me/${phone}?text=${encoded}`
    window.open(targetUrl, '_blank', 'noopener,noreferrer')
    setIsOpen(false)
  }

  const handleCustomSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!userMessage.trim()) return
    openWhatsApp(userMessage.trim())
    setUserMessage('')
  }

  return (
    <div className="fixed bottom-20 md:bottom-7 right-5 md:right-7 z-50 font-sans">
      {/* ── EXPANDED CHAT CARD ── */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="WhatsApp Support Concierge"
          className="absolute bottom-16 right-0 w-[90vw] sm:w-96 max-w-sm bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-gray-900 via-black to-gray-900 text-white p-4 flex items-center justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center gap-3 relative z-10">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center font-black text-sm shadow-md">
                  <MessageCircle size={22} className="fill-white/20" />
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-gray-950 rounded-full" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm tracking-tight text-white">Outflank Concierge</h3>
                  <ShieldCheck size={14} className="text-emerald-400" />
                </div>
                <p className="text-[11px] text-gray-400 font-medium">Official WhatsApp Desk • Replies &lt; 15m</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Close WhatsApp chat widget"
              className="relative z-10 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white flex items-center justify-center transition-colors"
            >
              <X size={15} />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 bg-gray-50/70 space-y-3 max-h-[60vh] overflow-y-auto text-xs">
            {/* Greeting speech bubble */}
            <div className="bg-white p-3.5 rounded-2xl rounded-tl-sm shadow-xs border border-gray-100 space-y-1">
              <p className="font-semibold text-gray-900 text-xs">
                Hi! Welcome to Outflank 👋
              </p>
              <p className="text-gray-600 leading-relaxed">
                Looking for corporate gifting, bulk apparel, or have questions about custom orders? Tap a quick option or send us a message below.
              </p>
            </div>

            {/* Quick Action Chips */}
            <div className="space-y-1.5 pt-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-1">
                Quick Assistance
              </p>

              {pageContext.title && (
                <button
                  type="button"
                  onClick={() =>
                    openWhatsApp(
                      `Hi Outflank team, I'm currently looking at "${pageContext.title}". Could you share bulk pricing and customization options? (${pageContext.url})`
                    )
                  }
                  className="w-full text-left p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200/70 text-emerald-950 transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <Package size={14} className="text-emerald-700 shrink-0" />
                    <span className="font-semibold truncate text-[11px]">
                      Inquire about &quot;{pageContext.title.slice(0, 26)}...&quot;
                    </span>
                  </div>
                  <ArrowRight size={13} className="text-emerald-700 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                </button>
              )}

              <button
                type="button"
                onClick={() =>
                  openWhatsApp(
                    `Hi Outflank team, I'd like to place a corporate / bulk merchandise order (50+ units). Please share your corporate catalog and volume pricing.`
                  )
                }
                className="w-full text-left p-2.5 rounded-xl bg-white hover:bg-gray-100 border border-gray-200 text-gray-800 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-2">
                  <Briefcase size={14} className="text-blue-600 shrink-0" />
                  <span className="font-semibold text-[11px]">Bulk Corporate Orders (50+ units)</span>
                </div>
                <ArrowRight size={13} className="text-gray-400 group-hover:text-gray-700 group-hover:translate-x-0.5 transition-all" />
              </button>

              <button
                type="button"
                onClick={() =>
                  openWhatsApp(
                    `Hi Outflank team, I need help with custom company logo embroidery and mockups for our team apparel.`
                  )
                }
                className="w-full text-left p-2.5 rounded-xl bg-white hover:bg-gray-100 border border-gray-200 text-gray-800 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-2">
                  <Palette size={14} className="text-purple-600 shrink-0" />
                  <span className="font-semibold text-[11px]">Custom Logo Design & Mockup Help</span>
                </div>
                <ArrowRight size={13} className="text-gray-400 group-hover:text-gray-700 group-hover:translate-x-0.5 transition-all" />
              </button>

              <button
                type="button"
                onClick={() =>
                  openWhatsApp(
                    `Hi Outflank team, I want to track my order. My order ID is: `
                  )
                }
                className="w-full text-left p-2.5 rounded-xl bg-white hover:bg-gray-100 border border-gray-200 text-gray-800 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-2">
                  <Package size={14} className="text-amber-600 shrink-0" />
                  <span className="font-semibold text-[11px]">Track My Order</span>
                </div>
                <ArrowRight size={13} className="text-gray-400 group-hover:text-gray-700 group-hover:translate-x-0.5 transition-all" />
              </button>
            </div>
          </div>

          {/* Footer input form */}
          <form onSubmit={handleCustomSend} className="p-3 bg-white border-t border-gray-100 flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={userMessage}
              onChange={(e) => setUserMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 px-3 py-2 text-xs bg-gray-100 rounded-xl border border-transparent focus:bg-white focus:border-emerald-500 focus:outline-none transition-all"
            />
            <button
              type="submit"
              disabled={!userMessage.trim()}
              aria-label="Send WhatsApp message"
              className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white transition-colors"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}

      {/* ── FLOATING TRIGGER BUBBLE ── */}
      <div className="relative group">
        <button
          onClick={() => {
            setIsOpen((prev) => !prev)
            setHasInteracted(true)
          }}
          aria-label="Open WhatsApp live support"
          className={`relative flex items-center gap-2 px-4 py-3 rounded-full shadow-xl transition-all duration-300 font-bold text-xs ${
            isOpen
              ? 'bg-gray-900 text-white scale-95 shadow-gray-900/30'
              : 'bg-[#25D366] hover:bg-[#20bd5a] text-white hover:scale-105 shadow-[#25D366]/35'
          }`}
        >
          {isOpen ? (
            <>
              <X size={18} />
              <span className="hidden sm:inline">Close</span>
            </>
          ) : (
            <>
              <div className="relative">
                <MessageCircle size={20} className="fill-white/20" />
                {/* Ping animation if never opened */}
                {!hasInteracted && (
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
                  </span>
                )}
              </div>
              <span className="tracking-wide">Chat with Us</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}

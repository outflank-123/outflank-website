'use client'
// Cache bust to fix turbopack issue

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Palette, Type, MessageSquare, Check, Sparkles } from 'lucide-react'
import Image from 'next/image'
import LeadModal from '@/components/catalog/LeadModal'

const PRODUCT_MOCKUPS = [
  { 
    id: 'tshirt', 
    label: 'Classic T-Shirt', 
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=1200&auto=format&fit=crop',
    textStyle: { top: '40%', left: '50%', transform: 'translate(-50%, -50%)', width: '40%' }
  },
  { 
    id: 'mug', 
    label: 'Ceramic Mug', 
    image: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?q=80&w=1200&auto=format&fit=crop',
    textStyle: { top: '55%', left: '48%', transform: 'translate(-50%, -50%) rotate(2deg)', width: '30%' }
  },
  { 
    id: 'notebook', 
    label: 'Leather Notebook', 
    image: 'https://images.unsplash.com/photo-1531346878377-a54481b7a69b?q=80&w=1200&auto=format&fit=crop',
    textStyle: { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '50%' }
  },
  { 
    id: 'bag', 
    label: 'Canvas Tote', 
    image: 'https://images.unsplash.com/photo-1597484661643-2f5fef640df1?q=80&w=1200&auto=format&fit=crop',
    textStyle: { top: '55%', left: '50%', transform: 'translate(-50%, -50%)', width: '45%' }
  }
]

const FONTS = ['Inter', 'Playfair Display', 'Montserrat', 'Space Grotesk', 'Caveat']
const PRESET_COLORS = ['#1d1d1f', '#e3231c', '#0071e3', '#22c55e', '#f59e0b', '#8b5cf6', '#ffffff']

export default function BrandingPreviewClient() {
  const [brandName, setBrandName] = useState('Outflank')
  const [brandColor, setBrandColor] = useState('#1d1d1f')
  const [selectedFont, setSelectedFont] = useState('Montserrat')
  const [selectedMockup, setSelectedMockup] = useState(PRODUCT_MOCKUPS[0])
  const [textSize, setTextSize] = useState(40)
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <>
      <main className="min-h-screen bg-[#fbfbfd] pt-28 pb-12 md:pt-32 md:pb-20">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 h-[calc(100vh-160px)] min-h-[700px] flex flex-col lg:flex-row gap-6 lg:gap-8">
        
        {/* ── Left Side: Beautiful Live Preview ── */}
        <div className="flex-1 relative rounded-[32px] md:rounded-[40px] overflow-hidden bg-black/5 flex items-center justify-center border border-black/5 shadow-inner">
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedMockup.id}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0"
            >
              <Image 
                src={selectedMockup.image} 
                alt="Product Mockup" 
                fill 
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            </motion.div>
          </AnimatePresence>

          {/* Dynamic Brand Text Overlay */}
          <motion.div 
            className="absolute z-10 flex flex-col items-center justify-center pointer-events-none drop-shadow-xl"
            style={selectedMockup.textStyle}
            animate={{ 
              color: brandColor,
              opacity: brandName ? 0.9 : 0
            }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          >
            <span 
              style={{ 
                fontFamily: selectedFont, 
                fontSize: `${textSize}px`,
                lineHeight: 1.1,
                textAlign: 'center',
                textShadow: brandColor === '#ffffff' ? '0 2px 10px rgba(0,0,0,0.15)' : 'none'
              }}
              className="font-bold tracking-tight whitespace-pre-wrap break-words w-full"
            >
              {brandName || 'Your Brand'}
            </span>
          </motion.div>

          {/* Badge */}
          <div className="absolute top-6 left-6 flex items-center gap-2 rounded-full bg-white/30 backdrop-blur-md px-4 py-2 shadow-sm border border-white/20 z-20">
            <Sparkles size={16} className="text-white" />
            <span className="text-xs font-bold text-white tracking-widest uppercase">Live Brand Studio</span>
          </div>
        </div>

        {/* ── Right Side: Glassmorphic Controls Panel ── */}
        <div className="w-full lg:w-[420px] xl:w-[460px] shrink-0 bg-white shadow-[0_8px_40px_rgba(0,0,0,0.06)] border border-[#e5e5ea] rounded-[32px] md:rounded-[40px] z-20 flex flex-col h-full overflow-hidden">
          <div className="p-8 lg:p-10 flex-1 flex flex-col overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <h1 className="text-3xl font-bold text-[#1d1d1f] tracking-tight mb-2">
                Brand Configurator
              </h1>
              <p className="text-[#86868b] text-[15px] leading-relaxed">
                Experience your brand on premium corporate gifts before you order.
              </p>
            </motion.div>

            <div className="flex flex-col gap-8 flex-1">
              
              {/* Product Selector */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-[#1d1d1f] uppercase tracking-widest">Select Product</label>
                <div className="grid grid-cols-2 gap-3">
                  {PRODUCT_MOCKUPS.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setSelectedMockup(m)}
                      className={`relative px-4 py-3 rounded-2xl text-sm font-semibold transition-all border ${
                        selectedMockup.id === m.id
                          ? 'border-[#1d1d1f] bg-[#1d1d1f] text-white shadow-md'
                          : 'border-black/10 bg-white text-[#1d1d1f] hover:border-black/30'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Brand Name Input */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-[#1d1d1f] uppercase tracking-widest flex items-center gap-2">
                  <Type size={14} /> Brand Name
                </label>
                <input
                  type="text"
                  value={brandName}
                  maxLength={30}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="Enter your brand name"
                  className="w-full rounded-2xl border border-black/10 bg-[#fbfbfd] px-5 py-4 text-[15px] font-medium focus:outline-none focus:border-[#e3231c] focus:ring-4 focus:ring-[#e3231c]/10 transition-all placeholder:text-[#86868b]"
                />
              </div>

              {/* Typography Slider */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#1d1d1f] uppercase tracking-widest">Scale Size</label>
                  <span className="text-xs font-semibold text-[#86868b]">{textSize}px</span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={120}
                  value={textSize}
                  onChange={(e) => setTextSize(Number(e.target.value))}
                  className="w-full accent-[#1d1d1f] h-1.5 bg-black/10 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md cursor-pointer"
                />
              </div>

              {/* Font Selector */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-[#1d1d1f] uppercase tracking-widest">Typography</label>
                <div className="flex flex-wrap gap-2">
                  {FONTS.map((f) => (
                    <button
                      key={f}
                      onClick={() => setSelectedFont(f)}
                      style={{ fontFamily: f }}
                      className={`px-4 py-2 rounded-xl text-[14px] transition-all border ${
                        selectedFont === f
                          ? 'border-[#1d1d1f] bg-black/5 text-[#1d1d1f] font-bold shadow-inner'
                          : 'border-transparent text-[#86868b] hover:bg-black/5 hover:text-[#1d1d1f]'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Picker */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-[#1d1d1f] uppercase tracking-widest flex items-center gap-2">
                  <Palette size={14} /> Brand Color
                </label>
                <div className="flex gap-3 flex-wrap">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setBrandColor(c)}
                      className="w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110 shadow-sm border border-black/10"
                      style={{ backgroundColor: c }}
                    >
                      {brandColor === c && (
                        <Check size={16} className={c === '#ffffff' ? 'text-black' : 'text-white'} />
                      )}
                    </button>
                  ))}
                  <div className="relative w-10 h-10 rounded-full border border-black/10 overflow-hidden shadow-sm hover:scale-110 transition-transform">
                    <input
                      type="color"
                      value={brandColor}
                      onChange={(e) => setBrandColor(e.target.value)}
                      className="absolute -inset-2 w-14 h-14 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* Action Area */}
            <div className="pt-8 mt-8 border-t border-black/5">
              <button
                onClick={() => setModalOpen(true)}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#e3231c] text-white py-4 text-[15px] font-bold hover:bg-[#c91d17] transition-all shadow-lg shadow-[#e3231c]/20 hover:shadow-xl hover:shadow-[#e3231c]/30 hover:-translate-y-0.5"
              >
                <MessageSquare size={18} />
                Get Quote for this Design
              </button>
              <p className="text-center text-[11px] text-[#86868b] mt-4 font-medium uppercase tracking-wider">
                Our design team will share a physical mockup before bulk order.
              </p>
            </div>
          </div>
        </div>
        
        </div>
      </main>

      <LeadModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        productName="Custom Branding Inquiry"
      />
    </>
  )
}

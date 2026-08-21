'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Palette, Type } from 'lucide-react'
import Image from 'next/image'

const FONTS = ['Inter', 'Playfair Display', 'Montserrat', 'Space Grotesk', 'Caveat']
const PRESET_COLORS = ['#1d1d1f', '#e3231c', '#0071e3', '#22c55e', '#f59e0b', '#8b5cf6', '#ffffff']

interface Product {
  name: string
  primary_image_url: string | null
  branding_config: { top: string; left: string; transform: string; width: string } | null
}

export default function ProductBrandingClient({ product }: { product: Product }) {
  const [brandName, setBrandName] = useState('Your Brand')
  const [brandColor, setBrandColor] = useState('#1d1d1f')
  const [selectedFont, setSelectedFont] = useState('Montserrat')
  const [textSize, setTextSize] = useState(40)

  if (!product.primary_image_url || !product.branding_config) {
    return null // Failsafe if data is missing
  }

  return (
    <div className="bg-white rounded-[32px] p-6 lg:p-8 shadow-xl border border-black/5 flex flex-col gap-8">
      <div>
        <h3 className="text-xl font-bold text-[#1d1d1f] tracking-tight">Live Branding Preview</h3>
        <p className="text-sm text-[#86868b] mt-1">See your logo on the {product.name} instantly.</p>
      </div>

      <div className="flex flex-col xl:flex-row gap-8 items-start">
        {/* Preview Area */}
        <div className="w-full xl:w-1/2 aspect-square relative bg-[#fbfbfd] rounded-2xl overflow-hidden border border-black/5 group">
          <Image 
            src={product.primary_image_url} 
            alt={product.name} 
            fill 
            className="object-cover"
            priority
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />

          {/* Dynamic Overlay */}
          <motion.div 
            className="absolute z-10 flex flex-col items-center justify-center pointer-events-none drop-shadow-md"
            style={{ ...product.branding_config }}
            animate={{ 
              color: brandColor,
              opacity: brandName ? 0.95 : 0
            }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          >
            <span 
              style={{ 
                fontFamily: selectedFont, 
                fontSize: `${textSize}px`,
                lineHeight: 1.1,
                textAlign: 'center',
                textShadow: brandColor === '#ffffff' ? '0 2px 10px rgba(0,0,0,0.2)' : 'none'
              }}
              className="font-bold tracking-tight whitespace-pre-wrap break-words w-full"
            >
              {brandName || 'Your Brand'}
            </span>
          </motion.div>
        </div>

        {/* Controls */}
        <div className="w-full xl:w-1/2 flex flex-col gap-6">
          <div className="space-y-2.5">
            <label className="text-[11px] font-bold text-[#86868b] uppercase tracking-widest flex items-center gap-1.5">
              <Type size={12} /> Text Input
            </label>
            <input
              type="text"
              value={brandName}
              maxLength={30}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="Enter your brand name"
              className="w-full rounded-xl border border-black/10 bg-[#fbfbfd] px-4 py-3 text-sm font-medium focus:outline-none focus:border-[#e3231c] transition-all"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-[#86868b] uppercase tracking-widest">Text Size</label>
            </div>
            <input
              type="range"
              min={20}
              max={120}
              value={textSize}
              onChange={(e) => setTextSize(Number(e.target.value))}
              className="w-full accent-[#1d1d1f] h-1.5 bg-black/10 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md cursor-pointer"
            />
          </div>

          <div className="space-y-2.5">
            <label className="text-[11px] font-bold text-[#86868b] uppercase tracking-widest">Typography</label>
            <div className="flex flex-wrap gap-2">
              {FONTS.map((f) => (
                <button
                  key={f}
                  onClick={() => setSelectedFont(f)}
                  style={{ fontFamily: f }}
                  className={`px-3 py-1.5 rounded-lg text-[13px] transition-all border ${
                    selectedFont === f
                      ? 'border-[#1d1d1f] bg-black/5 text-[#1d1d1f] font-bold shadow-inner'
                      : 'border-transparent text-[#86868b] hover:bg-black/5'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2.5">
            <label className="text-[11px] font-bold text-[#86868b] uppercase tracking-widest flex items-center gap-1.5">
              <Palette size={12} /> Colors
            </label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setBrandColor(c)}
                  className="w-8 h-8 rounded-full transition-transform hover:scale-110 shadow-sm border border-black/10"
                  style={{ backgroundColor: c }}
                />
              ))}
              <div className="relative w-8 h-8 rounded-full border border-black/10 overflow-hidden shadow-sm hover:scale-110 transition-transform">
                <input
                  type="color"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="absolute -inset-2 w-12 h-12 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

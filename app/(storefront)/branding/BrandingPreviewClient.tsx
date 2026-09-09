'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, X, MessageSquare, ChevronDown, Check, RotateCcw } from 'lucide-react'
import LeadModal from '@/components/products/LeadModal'
import dynamic from 'next/dynamic'

const Scene = dynamic(() => import('@/components/branding/Scene'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-white/30 border-t-white animate-spin" />
        <p className="text-white/60 text-sm font-medium">Loading 3D Studio...</p>
      </div>
    </div>
  )
})

const PRODUCTS = [
  { id: 'mug',       label: 'Ceramic Mug',     emoji: '☕' },
  { id: 'flask',     label: 'Steel Flask',      emoji: '🍶' },
  { id: 'notebook',  label: 'Notebook',         emoji: '📒' },
  { id: 'powerbank', label: 'Power Bank',       emoji: '🔋' },
  { id: 'tshirt',    label: 'T-Shirt',          emoji: '👕' },
]

const PRESET_COLORS = [
  { hex: '#1d1d1f', label: 'Black' },
  { hex: '#e3231c', label: 'Red' },
  { hex: '#0071e3', label: 'Blue' },
  { hex: '#22c55e', label: 'Green' },
  { hex: '#f59e0b', label: 'Gold' },
  { hex: '#8b5cf6', label: 'Purple' },
  { hex: '#ffffff', label: 'White' },
]

const FONTS = ['Inter', 'Montserrat', 'Playfair Display', 'Space Grotesk', 'Caveat']

export default function BrandingPreviewClient() {
  const [selectedProduct, setSelectedProduct] = useState(PRODUCTS[0]!)
  const [brandName, setBrandName]             = useState('Your Brand')
  const [brandColor, setBrandColor]           = useState('#1d1d1f')
  const [selectedFont, setSelectedFont]       = useState('Inter')
  const [textSize, setTextSize]               = useState(60)
  const [uploadedLogo, setUploadedLogo]       = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen]         = useState(false)
  const [panelOpen, setPanelOpen]             = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setUploadedLogo(url)
    setBrandName('')
  }

  const clearLogo = () => {
    if (uploadedLogo) URL.revokeObjectURL(uploadedLogo)
    setUploadedLogo(null)
    setBrandName('Your Brand')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <>
      {/* Fullscreen 3D Studio */}
      <main className="fixed inset-0 bg-[#1a1a2e] overflow-hidden">

        {/* ── 3D Canvas (full-screen background) ── */}
        <div className="absolute inset-0">
          <Scene
            brandName={brandName}
            color={brandColor}
            activeModel={selectedProduct.id}
            uploadedLogo={uploadedLogo}
            font={selectedFont}
            scale={textSize}
          />
        </div>

        {/* ── Top Bar ── */}
        <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-6 pt-8 pb-4 pointer-events-none">
          {/* Live badge */}
          <div className="pointer-events-auto flex items-center gap-2 bg-black/40 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-full">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs font-bold text-white tracking-widest uppercase">Live 3D Studio</span>
          </div>

          {/* CTA Button */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="pointer-events-auto flex items-center gap-2 bg-[#e3231c] hover:bg-[#c91d17] text-white text-sm font-bold px-5 py-2.5 rounded-full shadow-lg shadow-red-500/30 transition-all hover:scale-105"
          >
            <MessageSquare size={15} />
            Get Quote
          </button>
        </div>

        {/* ── Product Switcher (top center horizontal pills) ── */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30">
          <div className="flex items-center gap-2 bg-black/40 backdrop-blur-xl border border-white/10 rounded-full p-1.5">
            {PRODUCTS.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedProduct(p)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                  selectedProduct.id === p.id
                    ? 'bg-white text-[#1d1d1f] shadow-md'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <span>{p.emoji}</span>
                <span className="hidden sm:inline">{p.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Bottom Control Drawer ── */}
        <div className="absolute bottom-0 left-0 right-0 z-30">
          {/* Toggle Button */}
          <div className="flex justify-center mb-2">
            <button
              onClick={() => setPanelOpen((v) => !v)}
              className="flex items-center gap-2 bg-black/50 backdrop-blur-xl border border-white/10 text-white/80 text-xs font-bold px-5 py-2 rounded-full hover:bg-black/70 transition-all"
            >
              <ChevronDown
                size={14}
                className={`transition-transform duration-300 ${panelOpen ? 'rotate-0' : 'rotate-180'}`}
              />
              {panelOpen ? 'Hide Controls' : 'Customize'}
            </button>
          </div>

          <AnimatePresence>
            {panelOpen && (
              <motion.div
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 35 }}
                className="bg-black/60 backdrop-blur-2xl border-t border-white/10 px-6 py-5"
              >
                <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">

                  {/* Brand Name */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Brand Name</label>
                    <input
                      type="text"
                      value={brandName}
                      maxLength={30}
                      onChange={(e) => {
                        setBrandName(e.target.value)
                        if (uploadedLogo) clearLogo()
                      }}
                      placeholder="Your Brand"
                      className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/40 transition-all"
                    />
                  </div>

                  {/* Logo Upload */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Logo Upload</label>
                    {uploadedLogo ? (
                      <div className="flex items-center justify-between bg-green-500/20 border border-green-500/30 rounded-xl px-4 py-2.5">
                        <span className="text-sm text-green-400 font-semibold flex items-center gap-1.5">
                          <Check size={13} /> Applied
                        </span>
                        <button onClick={clearLogo} className="text-white/50 hover:text-white transition-colors">
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/svg+xml"
                          onChange={handleFileUpload}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div className="flex items-center gap-2 bg-white/10 border border-dashed border-white/20 rounded-xl px-4 py-2.5 text-sm text-white/60 hover:bg-white/15 hover:text-white transition-all cursor-pointer">
                          <Upload size={13} />
                          PNG / JPG / SVG
                        </div>
                      </div>
                    )}
                    <p className="text-[9px] text-white/30 font-medium">100% local — never uploaded</p>
                  </div>

                  {/* Color */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Color</label>
                    <div className="flex items-center gap-2 flex-wrap">
                      {PRESET_COLORS.map((c) => (
                        <button
                          key={c.hex}
                          onClick={() => setBrandColor(c.hex)}
                          title={c.label}
                          className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all hover:scale-110 ${
                            brandColor === c.hex ? 'border-white scale-110' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: c.hex }}
                        >
                          {brandColor === c.hex && (
                            <Check size={12} className={c.hex === '#ffffff' ? 'text-black' : 'text-white'} />
                          )}
                        </button>
                      ))}
                      {/* Custom color */}
                      <div className="relative w-7 h-7 rounded-full border-2 border-white/20 overflow-hidden hover:scale-110 transition-transform">
                        <input
                          type="color"
                          value={brandColor}
                          onChange={(e) => setBrandColor(e.target.value)}
                          className="absolute -inset-2 w-12 h-12 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Typography + Scale */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Font & Size</label>
                    <select
                      value={selectedFont}
                      onChange={(e) => setSelectedFont(e.target.value)}
                      className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white/40 transition-all appearance-none cursor-pointer"
                    >
                      {FONTS.map((f) => (
                        <option key={f} value={f} className="bg-[#1a1a2e] text-white">{f}</option>
                      ))}
                    </select>
                    <input
                      type="range"
                      min={20}
                      max={120}
                      value={textSize}
                      onChange={(e) => setTextSize(Number(e.target.value))}
                      className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-white"
                    />
                  </div>

                </div>

                {/* Hint */}
                <p className="text-center text-white/25 text-[10px] font-medium mt-4 uppercase tracking-widest">
                  Click & drag the model to rotate 360°
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </main>

      <LeadModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        productName={`Custom Branding — ${selectedProduct.label}`}
      />
    </>
  )
}

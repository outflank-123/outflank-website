'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ShoppingBag, Building2 } from 'lucide-react'
import { useShoppingModeStore, ShoppingMode } from '@/lib/store/useShoppingModeStore'

interface ShoppingModeToggleProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  showLabels?: boolean
}

export default function ShoppingModeToggle({
  size = 'md',
  className = '',
  showLabels = true,
}: ShoppingModeToggleProps) {
  const { mode, setMode } = useShoppingModeStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const currentMode: ShoppingMode = mounted ? mode : 'retail'

  if (size === 'sm') {
    return (
      <div 
        className={`relative inline-flex items-center bg-[#f0f0f2]/90 backdrop-blur-md p-0.5 rounded-full border border-black/5 shadow-2xs ${className}`}
        role="group"
        aria-label="Select shopping mode"
      >
        {/* Retail Button */}
        <button
          type="button"
          onClick={() => setMode('retail')}
          className={`relative z-10 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-colors duration-200 cursor-pointer ${
            currentMode === 'retail'
              ? 'text-[#1d1d1f]'
              : 'text-[#86868b] hover:text-[#1d1d1f]'
          }`}
          title="Switch to Individual Retail purchases"
        >
          <ShoppingBag size={12} className={currentMode === 'retail' ? 'text-[#e3231c]' : 'text-[#86868b]'} />
          <span>Retail</span>
        </button>

        {/* Bulk Button */}
        <button
          type="button"
          onClick={() => setMode('bulk')}
          className={`relative z-10 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-colors duration-200 cursor-pointer ${
            currentMode === 'bulk'
              ? 'text-[#1d1d1f]'
              : 'text-[#86868b] hover:text-[#1d1d1f]'
          }`}
          title="Switch to Corporate Bulk orders & Wholesale pricing"
        >
          <Building2 size={12} className={currentMode === 'bulk' ? 'text-[#e3231c]' : 'text-[#86868b]'} />
          <span>Bulk</span>
        </button>

        {/* Animated Sliding Pill */}
        <motion.div
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
          className="absolute inset-y-0.5 rounded-full bg-white shadow-xs border border-black/5"
          style={{
            left: currentMode === 'retail' ? '2px' : '50%',
            right: currentMode === 'retail' ? '50%' : '2px',
          }}
        />
      </div>
    )
  }

  return (
    <div
      className={`relative inline-flex items-center bg-[#f0f0f2] p-1 rounded-full border border-black/6 shadow-xs ${className}`}
      role="group"
      aria-label="Select shopping mode"
    >
      {/* Retail Option */}
      <button
        type="button"
        onClick={() => setMode('retail')}
        className={`relative z-10 flex items-center gap-2 px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition-colors duration-200 cursor-pointer ${
          currentMode === 'retail'
            ? 'text-[#1d1d1f]'
            : 'text-[#86868b] hover:text-[#1d1d1f]'
        }`}
      >
        <ShoppingBag size={14} className={currentMode === 'retail' ? 'text-[#e3231c]' : 'text-[#86868b]'} />
        <span>Buy Retail</span>
      </button>

      {/* Bulk Option */}
      <button
        type="button"
        onClick={() => setMode('bulk')}
        className={`relative z-10 flex items-center gap-2 px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition-colors duration-200 cursor-pointer ${
          currentMode === 'bulk'
            ? 'text-[#1d1d1f]'
            : 'text-[#86868b] hover:text-[#1d1d1f]'
        }`}
      >
        <Building2 size={14} className={currentMode === 'bulk' ? 'text-[#e3231c]' : 'text-[#86868b]'} />
        <span>Buy in Bulk</span>
      </button>

      {/* Animated Sliding Background */}
      <motion.div
        layout
        transition={{ type: 'spring', stiffness: 450, damping: 32 }}
        className="absolute inset-y-1 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-black/5"
        style={{
          left: currentMode === 'retail' ? '4px' : '50%',
          right: currentMode === 'retail' ? '50%' : '4px',
        }}
      />
    </div>
  )
}

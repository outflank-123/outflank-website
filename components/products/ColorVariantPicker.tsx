import { type ColorVariant } from './ProductCard'
import { motion } from 'framer-motion'

interface ColorVariantPickerProps {
  variants: ColorVariant[]
  activeIndex: number
  onChange: (index: number) => void
  size?: 'sm' | 'md' | 'lg'
  showLabels?: boolean
}

export default function ColorVariantPicker({
  variants,
  activeIndex,
  onChange,
  size = 'md',
  showLabels = false,
}: ColorVariantPickerProps) {
  if (!variants || variants.length === 0) return null

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  }

  const activeVariantName = variants[activeIndex]?.name || 'Unknown'

  return (
    <div className="flex flex-col gap-4">
      {/* Labels */}
      {showLabels && (
        <div className="flex flex-col gap-2">
          <p className="text-[17px] tracking-tight">
            <span className="font-semibold text-[#1d1d1f]">Colour.</span>{' '}
            <span className="text-[#86868b]">Pick your favourite.</span>
          </p>
          <p className="text-[14px] font-semibold text-[#1d1d1f]">
            Colour - {activeVariantName}
          </p>
        </div>
      )}

      {/* Swatches */}
      <div className="flex items-center gap-4 flex-wrap">
        {variants.map((variant, i) => {
          const isActive = activeIndex === i
          const hex = variant.hex || '#f5f5f7'
          
          return (
            <button
              key={`${variant.name}-${i}`}
              onClick={() => onChange(i)}
              title={variant.name}
              aria-label={`Select color: ${variant.name}`}
              className={`relative rounded-full transition-transform hover:scale-105 outline-none`}
            >
              {/* The Blue Focus Ring for active state */}
              {isActive && (
                <motion.div
                  layoutId="activeColorRing"
                  className="absolute -inset-1 rounded-full border-2 border-[#0071e3]"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              
              {/* The Inner Color Dot */}
              <div 
                className={`${sizeClasses[size]} rounded-full border shadow-inner ${hex.toLowerCase() === '#ffffff' || hex.toLowerCase() === '#fff' ? 'border-black/10' : 'border-transparent'}`}
                style={{ backgroundColor: hex }}
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}

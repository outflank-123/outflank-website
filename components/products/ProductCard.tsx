'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Package, ChevronRight, Building2, Sparkles, ShoppingBag } from 'lucide-react'
import Link from 'next/link'
import ColorVariantPicker from './ColorVariantPicker'
import LeadModal from './LeadModal'
import { useShoppingModeStore } from '@/lib/store/useShoppingModeStore'

export interface ColorVariant {
  name: string
  hex: string
  images: string[]
}

export interface Product {
  id: string
  name: string
  slug: string
  short_desc?: string | null
  base_price?: number | null
  min_order_qty?: number | null
  color_variants: ColorVariant[]
  primary_image_url?: string | null
  categories?: { name: string; slug: string } | null
  is_retail?: boolean | null
  is_customizable?: boolean | null
  branding_config?: any
}

interface ProductCardProps {
  product: Product
  index?: number
}

export default function ProductCard({ product, index = 0 }: ProductCardProps) {
  const [activeVariant, setActiveVariant] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  const { mode: shoppingMode } = useShoppingModeStore()
  useEffect(() => {
    setMounted(true)
  }, [])

  const currentMode = mounted ? shoppingMode : 'retail'
  const isRetailAllowed = product.is_retail !== false && product.branding_config?._is_retail !== false

  const variants: ColorVariant[] = product.color_variants ?? []
  const currentImages = variants[activeVariant]?.images ?? []
  const displayImage = currentImages[0] ?? product.primary_image_url ?? null

  return (
    <>
      <motion.article
        className="group relative bg-white rounded-3xl border border-[#f0f0f2] shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden hover:border-[#e5e5ea] hover:shadow-[0_24px_54px_rgba(0,0,0,0.07)] hover:-translate-y-1 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col"
      >
        {/* Full Card Link Overlay */}
        <Link 
          href={`/products/${product.slug}`} 
          className="absolute inset-0 z-10 block cursor-pointer"
          aria-label={`View ${product.name}`}
        >
          <span className="sr-only">View {product.name}</span>
        </Link>

        {/* Image */}
        <div className="relative aspect-square bg-[#f5f5f7] overflow-hidden block">
          {displayImage ? (
            <Image
              src={displayImage}
              alt={product.name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Package size={48} className="text-[#aeaeb2]" />
            </div>
          )}

          {/* Category badge */}
          {product.categories?.name && (
            <div className="absolute top-2 left-2 md:top-3 md:left-3 rounded-full bg-white/90 backdrop-blur-md border border-black/8 px-2 md:px-3 py-0.5 md:py-1 text-[8px] md:text-[10px] font-semibold text-[#6e6e73] uppercase tracking-wide max-w-[80%] truncate z-0">
              {product.categories.name}
            </div>
          )}

          {/* Bulk Wholesale Only Badge */}
          {(product.is_retail === false || product.branding_config?._is_retail === false) && (
            <div className="absolute top-2 right-2 md:top-3 md:right-3 rounded-full bg-[#1d1d1f]/90 text-white backdrop-blur-md border border-white/20 px-2 md:px-2.5 py-0.5 md:py-1 text-[8px] md:text-[10px] font-bold tracking-wide flex items-center gap-1 z-0 shadow-sm">
              <Building2 size={10} className="text-amber-400" />
              <span>Wholesale Only</span>
            </div>
          )}

          {/* Customizable Badge */}
          {product.is_customizable && (
            <div className="absolute bottom-2 left-2 md:bottom-3 md:left-3 rounded-full bg-white/95 text-[#1d1d1f] backdrop-blur-md border border-black/8 px-2 md:px-2.5 py-0.5 md:py-1 text-[8px] md:text-[10px] font-bold tracking-wide flex items-center gap-1 z-0 shadow-xs">
              <Sparkles size={10} className="text-[#0066FF]" />
              <span>Customizable</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-3 md:p-5 flex flex-col flex-grow gap-2 md:gap-3">
          <div>
            <h3 className="font-semibold text-[#1d1d1f] text-xs md:text-sm leading-tight line-clamp-2 mb-1 group-hover:text-[#e3231c] transition-colors relative z-0">
              {product.name}
            </h3>
            {product.short_desc && (
              <p className="hidden md:block text-xs text-[#6e6e73] line-clamp-2 leading-relaxed">
                {product.short_desc}
              </p>
            )}
          </div>

          {/* Color variants */}
          {variants.length > 0 && (
            <div className="relative z-20">
              <ColorVariantPicker
                variants={variants}
                activeIndex={activeVariant}
                onChange={setActiveVariant}
                size="sm"
              />
            </div>
          )}

          {/* Footer row */}
          <div className="mt-auto flex items-center justify-between pt-2 border-t border-black/5 relative z-20">
            <div className="flex flex-col">
              {currentMode === 'retail' && isRetailAllowed ? (
                product.base_price ? (
                  <>
                    <span className="text-sm md:text-base font-bold text-[#1d1d1f]">
                      ₹{product.base_price.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] text-[#86868b]">Retail price</span>
                  </>
                ) : (
                  <span className="text-xs text-[#86868b]">Price on request</span>
                )
              ) : (
                <>
                  <span className="text-xs md:text-sm font-bold text-[#e3231c]">
                    Wholesale Quote
                  </span>
                  <span className="text-[10px] text-[#86868b]">
                    MOQ: {product.min_order_qty || 50} units
                  </span>
                </>
              )}
            </div>

            {currentMode === 'retail' && isRetailAllowed ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#1d1d1f] text-white px-3.5 py-1.5 text-xs font-semibold group-hover:bg-black transition-colors group-hover:scale-[1.03]">
                <span>{product.is_customizable ? 'Customize' : 'Buy Retail'}</span>
                <ChevronRight size={12} />
              </span>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setModalOpen(true)
                }}
                id={`product-inquire-${product.id}`}
                className="inline-flex items-center gap-1 rounded-full bg-[#e3231c] text-white px-4 py-1.5 text-xs font-semibold hover:bg-[#b91a14] transition-colors hover:scale-[1.03] cursor-pointer"
              >
                Inquire
                <ChevronRight size={12} />
              </button>
            )}
          </div>
        </div>
      </motion.article>

      <LeadModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        productId={product.id}
        productName={product.name}
      />
    </>
  )
}

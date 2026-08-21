'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Package, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import ColorVariantPicker from './ColorVariantPicker'
import LeadModal from './LeadModal'

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
}

interface ProductCardProps {
  product: Product
  index?: number
}

export default function ProductCard({ product, index = 0 }: ProductCardProps) {
  const [activeVariant, setActiveVariant] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)

  const variants: ColorVariant[] = product.color_variants ?? []
  const currentImages = variants[activeVariant]?.images ?? []
  const displayImage = currentImages[0] ?? product.primary_image_url ?? null

  return (
    <>
      <motion.article
        className="group relative bg-white rounded-3xl border border-[#f0f0f2] shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden hover:border-[#e5e5ea] hover:shadow-[0_24px_54px_rgba(0,0,0,0.07)] hover:-translate-y-1 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col"
      >
        {/* Image */}
        <Link href={`/catalog/${product.slug}`} className="relative aspect-square bg-[#f5f5f7] overflow-hidden block">
          {displayImage ? (
            <Image
              src={displayImage}
              alt={product.name}
              fill
              unoptimized
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
            <div className="absolute top-3 left-3 rounded-full bg-white/90 backdrop-blur-md border border-black/8 px-3 py-1 text-[10px] font-semibold text-[#6e6e73] uppercase tracking-wide">
              {product.categories.name}
            </div>
          )}

        </Link>

        {/* Content */}
        <div className="p-5 flex flex-col flex-grow gap-3">
          <div>
            <Link href={`/catalog/${product.slug}`}>
              <h3 className="font-semibold text-[#1d1d1f] text-sm leading-tight line-clamp-2 mb-1 hover:text-[#e3231c] transition-colors">
                {product.name}
              </h3>
            </Link>
            {product.short_desc && (
              <p className="text-xs text-[#6e6e73] line-clamp-2 leading-relaxed">
                {product.short_desc}
              </p>
            )}
          </div>

          {/* Color variants */}
          {variants.length > 0 && (
            <ColorVariantPicker
              variants={variants}
              activeIndex={activeVariant}
              onChange={setActiveVariant}
              size="sm"
            />
          )}

          {/* Footer row */}
          <div className="mt-auto flex items-center justify-between pt-2 border-t border-black/5">
            <div className="text-xs text-[#aeaeb2]">
              {product.min_order_qty ? `MOQ: ${product.min_order_qty} units` : 'Ask for MOQ'}
            </div>
            <button
              onClick={() => setModalOpen(true)}
              id={`product-inquire-${product.id}`}
              className="inline-flex items-center gap-1 rounded-full bg-[#e3231c] text-white px-4 py-1.5 text-xs font-semibold hover:bg-[#b91a14] transition-colors hover:scale-[1.03]"
            >
              Inquire
              <ChevronRight size={12} />
            </button>
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

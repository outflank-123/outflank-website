'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Package, Clock, Users, Tag, MessageSquare, ShieldCheck, Sparkles } from 'lucide-react'
import ColorVariantPicker from '@/components/catalog/ColorVariantPicker'
import LeadModal from '@/components/catalog/LeadModal'
import type { ColorVariant } from '@/components/catalog/ProductCard'

interface ProductDetailClientProps {
  product: {
    id: string
    name: string
    slug: string
    description?: string | null
    short_desc?: string | null
    base_price?: number | null
    min_order_qty?: number | null
    lead_time_days?: number | null
    tags?: string[] | null
    color_variants: ColorVariant[]
    primary_image_url?: string | null
    image_gallery?: string[] | null
    categories?: { name: string; slug: string } | null
    is_customizable?: boolean
    branding_config?: { top: string; left: string; transform: string; width: string } | null
  }
}

export default function ProductDetailClient({ product }: ProductDetailClientProps) {
  const variants: ColorVariant[] = product.color_variants ?? []
  const [activeVariant, setActiveVariant] = useState(0)
  const [activeImage, setActiveImage] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)

  const currentVariant = variants[activeVariant]
  const images = currentVariant?.images?.length
    ? currentVariant.images
    : product.image_gallery?.length
      ? product.image_gallery
      : product.primary_image_url
        ? [product.primary_image_url]
        : []

  const mainImage = images[activeImage] ?? images[0] ?? null

  const handleVariantChange = (i: number) => {
    setActiveVariant(i)
    setActiveImage(0)
  }

  const prevImage = () => {
    setActiveImage((prev) => (prev > 0 ? prev - 1 : images.length - 1))
  }

  const nextImage = () => {
    setActiveImage((prev) => (prev < images.length - 1 ? prev + 1 : 0))
  }

  return (
    <>
      <main className="min-h-screen bg-[#fbfbfd] pt-24 md:pt-28">
        {/* Clean Back Button */}
        <div className="max-w-[1400px] mx-auto px-6 pb-2 flex items-center">
          <Link 
            href="/catalog" 
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#86868b] hover:text-[#1d1d1f] transition-colors py-1 cursor-pointer group"
          >
            <ChevronLeft size={18} className="transition-transform group-hover:-translate-x-1" />
            Back
          </Link>
        </div>

        {/* Hero Section */}
        <section className="max-w-[1400px] mx-auto px-6 pt-2 pb-12 md:pt-4 md:pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            
            {/* ── Left Column: E-Commerce Product Gallery (Thumbnails on Left + Large Hero) ── */}
            <div className="lg:col-span-7 lg:sticky lg:top-24 flex flex-col md:flex-row gap-4 md:gap-5 items-start">
              
              {/* Vertical Thumbnail Strip (Desktop) / Horizontal Row (Mobile) */}
              {images.length > 1 && (
                <div className="order-2 md:order-1 flex md:flex-col gap-3 shrink-0 overflow-x-auto md:overflow-y-auto max-h-[520px] p-1 w-full md:w-auto scrollbar-none">
                  {images.map((img, i) => {
                    const isSelected = activeImage === i
                    const label = i === 0 ? "Front" : i === 1 ? "Side" : `Angle ${i + 1}`
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setActiveImage(i)}
                        onMouseEnter={() => setActiveImage(i)}
                        className={`group relative w-16 h-20 md:w-20 md:h-24 rounded-2xl bg-white transition-all duration-200 shrink-0 overflow-hidden flex flex-col items-center justify-center p-1 cursor-pointer ${
                          isSelected
                            ? 'border-2 border-[#e3231c] shadow-[0_4px_16px_rgba(227,35,28,0.18)] scale-[1.03]'
                            : 'border border-black/10 hover:border-black/30 shadow-xs hover:shadow-sm opacity-75 hover:opacity-100'
                        }`}
                        aria-label={`Select ${label} view`}
                      >
                        <div className="relative w-full h-full">
                          <Image
                            src={img}
                            alt={`${product.name} - ${label}`}
                            fill
                            className="object-contain p-1"
                            sizes="80px"
                            unoptimized
                          />
                        </div>
                        <span className={`text-[10px] font-bold tracking-tight pb-0.5 ${
                          isSelected ? 'text-[#e3231c]' : 'text-[#86868b] group-hover:text-[#1d1d1f]'
                        }`}>
                          {label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Main Hero Showcase Card */}
              <div className="order-1 md:order-2 flex-1 w-full">
                <motion.div
                  layoutId="product-main-image"
                  className="relative aspect-square md:aspect-[4/3] w-full rounded-[32px] overflow-hidden bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.06)] border border-black/[0.04] group"
                >
                  <AnimatePresence mode="wait">
                    {mainImage ? (
                      <motion.div
                        key={mainImage}
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.02 }}
                        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                        className="absolute inset-0"
                      >
                        <Image
                          src={mainImage}
                          alt={`${product.name} Preview`}
                          fill
                          className="object-contain p-4 md:p-6"
                          sizes="(max-width: 1024px) 100vw, 50vw"
                          priority
                          unoptimized
                        />
                      </motion.div>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-[#f5f5f7]">
                        <Package size={64} className="text-[#aeaeb2]" />
                      </div>
                    )}
                  </AnimatePresence>
                  
                  {/* Category Pill Tag */}
                  {product.categories && (
                    <div className="absolute top-5 left-5 bg-white/90 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-black/5 text-[11px] font-bold text-[#1d1d1f] tracking-wider uppercase shadow-sm z-10">
                      {product.categories.name}
                    </div>
                  )}

                  {/* Angle Label Badge */}
                  {images.length > 1 && (
                    <div className="absolute bottom-5 left-5 bg-black/70 backdrop-blur-md text-white px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide shadow-sm z-10">
                      {activeImage === 0 ? "Front View" : activeImage === 1 ? "Side Profile" : `Angle ${activeImage + 1}`}
                    </div>
                  )}

                  {/* Left & Right Chevron Navigation Buttons */}
                  {images.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          prevImage()
                        }}
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/90 hover:bg-white text-[#1d1d1f] shadow-lg hover:shadow-2xl backdrop-blur-md border border-black/8 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 z-20 cursor-pointer"
                        aria-label="Previous image"
                      >
                        <ChevronLeft size={22} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          nextImage()
                        }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/90 hover:bg-white text-[#1d1d1f] shadow-lg hover:shadow-2xl backdrop-blur-md border border-black/8 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 z-20 cursor-pointer"
                        aria-label="Next image"
                      >
                        <ChevronRight size={22} />
                      </button>
                    </>
                  )}
                </motion.div>
              </div>
            </div>

            {/* ── Right Column: Product Intelligence & Options ── */}
            <div className="lg:col-span-5 flex flex-col pt-2 lg:pt-4">
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              >
                <h1 className="text-3xl md:text-4xl lg:text-[44px] font-bold text-[#1d1d1f] tracking-tight leading-[1.1] mb-4">
                  {product.name}
                </h1>

                {product.short_desc && (
                  <p className="text-base md:text-lg text-[#6e6e73] font-medium leading-relaxed mb-8 max-w-xl">
                    {product.short_desc}
                  </p>
                )}
              </motion.div>

              {/* Color Swatches */}
              {variants.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
                  className="mb-8 pb-8 border-b border-black/8"
                >
                  <ColorVariantPicker
                    variants={variants}
                    activeIndex={activeVariant}
                    onChange={handleVariantChange}
                    size="lg"
                    showLabels={true}
                  />
                </motion.div>
              )}

              {/* Data Points Grid */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15, ease: "easeOut" }}
                className="grid grid-cols-2 gap-3 mb-8"
              >
                <div className="bg-white rounded-2xl p-5 border border-black/6 shadow-xs flex flex-col gap-1 hover:shadow-sm transition-shadow">
                  <div className="flex items-center gap-1.5 text-[#86868b]">
                    <Users size={15} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Min. Order</span>
                  </div>
                  <span className="text-2xl font-bold text-[#1d1d1f] tracking-tight">
                    {product.min_order_qty ? `${product.min_order_qty}` : '--'} <span className="text-sm text-[#86868b] font-medium">units</span>
                  </span>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-black/6 shadow-xs flex flex-col gap-1 hover:shadow-sm transition-shadow">
                  <div className="flex items-center gap-1.5 text-[#86868b]">
                    <Clock size={15} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Lead Time</span>
                  </div>
                  <span className="text-2xl font-bold text-[#1d1d1f] tracking-tight">
                    {product.lead_time_days ? `${product.lead_time_days}` : '--'} <span className="text-sm text-[#86868b] font-medium">days</span>
                  </span>
                </div>
              </motion.div>

              {/* Action Buttons */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
                className="flex flex-col gap-3"
              >
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className="w-full flex items-center justify-center gap-2.5 px-8 py-4 rounded-full bg-[#e3231c] text-white font-bold text-base shadow-[0_8px_24px_rgba(227,35,28,0.28)] hover:bg-[#c91d17] hover:shadow-[0_12px_32px_rgba(227,35,28,0.38)] active:scale-[0.98] transition-all cursor-pointer"
                >
                  <MessageSquare size={18} />
                  Request Corporate Quote
                </button>

                {product.is_customizable && (
                  <Link
                    href={`/branding?slug=${product.slug}`}
                    className="w-full flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-full bg-white text-[#1d1d1f] font-semibold text-sm border border-black/10 hover:border-black/20 hover:bg-[#f5f5f7] active:scale-[0.98] transition-all shadow-xs"
                  >
                    <Sparkles size={16} className="text-[#e3231c]" />
                    Preview Custom Logo on Product
                  </Link>
                )}
              </motion.div>

              {/* Guarantees */}
              <div className="mt-8 pt-6 border-t border-black/8 flex items-center justify-between text-xs text-[#86868b]">
                <span className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-[#34c759]" /> 100% Quality Guaranteed</span>
                <span>•</span>
                <span>Pan-India Delivery</span>
                <span>•</span>
                <span>Bulk GST Invoicing</span>
              </div>
            </div>

          </div>
        </section>
      </main>

      {/* Lead Inquiry Modal */}
      <LeadModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        productName={product.name}
        productId={product.id}
      />
    </>
  )
}

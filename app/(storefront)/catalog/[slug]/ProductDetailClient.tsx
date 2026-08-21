'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, Package, Clock, Users, Tag, MessageSquare, ShieldCheck, Sparkles } from 'lucide-react'
import ColorVariantPicker from '@/components/catalog/ColorVariantPicker'
import LeadModal from '@/components/catalog/LeadModal'
import type { ColorVariant } from '@/components/catalog/ProductCard'
import ProductBrandingClient from './ProductBrandingClient'

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

  return (
    <>
      <main className="min-h-screen bg-[#fbfbfd] pt-24 md:pt-28">
        {/* Simple Back Button */}
        <div className="max-w-[1400px] mx-auto px-6 pb-4 flex items-center">
          <Link 
            href="/catalog" 
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-[#e5e5ea] shadow-sm text-sm font-semibold text-[#1d1d1f] hover:bg-[#f5f5f7] hover:border-black/10 hover:shadow-md transition-all"
          >
            <ChevronLeft size={16} className="text-[#86868b]" />
            Back to Catalog
          </Link>
        </div>

        {/* Hero Section */}
        <section className="max-w-[1400px] mx-auto px-6 pt-4 pb-12 md:pt-8 md:pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-start">
            
            {/* ── Left Column: Sticky Image Gallery ── */}
            <div className="lg:sticky lg:top-24 flex flex-col gap-6">
              <motion.div
                layoutId="product-main-image"
                className="relative aspect-square md:aspect-[4/3] w-full rounded-[40px] overflow-hidden bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-black/[0.03]"
              >
                <AnimatePresence mode="wait">
                  {mainImage ? (
                    <motion.div
                      key={mainImage}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.02 }}
                      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                      className="absolute inset-0"
                    >
                      <Image
                        src={mainImage}
                        alt={`${product.name} Preview`}
                        fill
                        className="object-cover"
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
                
                {product.categories && (
                  <div className="absolute top-6 left-6 bg-white/80 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/50 text-[11px] font-bold text-[#1d1d1f] tracking-widest uppercase shadow-sm">
                    {product.categories.name}
                  </div>
                )}
              </motion.div>

              {/* Minimalist Thumbnails */}
              {images.length > 1 && (
                <div className="flex gap-4 justify-center mt-2">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImage(i)}
                      className={`relative w-3 h-3 rounded-full transition-all duration-300 ${
                        activeImage === i ? 'bg-[#1d1d1f] scale-125' : 'bg-[#d2d2d7] hover:bg-[#86868b]'
                      }`}
                      aria-label={`View image ${i + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* ── Right Column: Product Intelligence ── */}
            <div className="flex flex-col pt-4 lg:pt-10">
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              >
                <h1 className="text-4xl md:text-5xl lg:text-[56px] font-bold text-[#1d1d1f] tracking-tighter leading-[1.05] mb-6">
                  {product.name}
                </h1>

                {product.short_desc && (
                  <p className="text-xl md:text-2xl text-[#86868b] font-medium leading-snug tracking-tight mb-12 max-w-xl">
                    {product.short_desc}
                  </p>
                )}
              </motion.div>

              {/* Apple-Style Color Variants */}
              {variants.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
                  className="mb-14 pb-14 border-b border-black/5"
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
                transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
                className="grid grid-cols-2 gap-4 mb-12"
              >
                <div className="bg-white rounded-3xl p-6 border border-black/5 shadow-sm flex flex-col gap-2 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 text-[#86868b]">
                    <Users size={16} />
                    <span className="text-[11px] font-bold uppercase tracking-widest">Min. Order</span>
                  </div>
                  <span className="text-3xl font-bold text-[#1d1d1f] tracking-tight">
                    {product.min_order_qty ? `${product.min_order_qty}` : '--'} <span className="text-lg text-[#86868b] font-medium">units</span>
                  </span>
                </div>

                <div className="bg-white rounded-3xl p-6 border border-black/5 shadow-sm flex flex-col gap-2 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 text-[#86868b]">
                    <Clock size={16} />
                    <span className="text-[11px] font-bold uppercase tracking-widest">Lead Time</span>
                  </div>
                  <span className="text-3xl font-bold text-[#1d1d1f] tracking-tight">
                    {product.lead_time_days ? `${product.lead_time_days}` : '--'} <span className="text-lg text-[#86868b] font-medium">days</span>
                  </span>
                </div>
              </motion.div>

              {/* Call to Action */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
                className="flex flex-col gap-4 mb-16"
              >
                <button
                  onClick={() => setModalOpen(true)}
                  className="w-full flex items-center justify-center gap-2 rounded-full bg-[#1d1d1f] text-white py-5 px-8 font-semibold text-lg hover:bg-[#333336] transition-all hover:scale-[1.01] shadow-xl shadow-black/10"
                >
                  <MessageSquare size={20} />
                  Request a Formal Quote
                </button>
                <p className="text-center text-xs font-medium text-[#86868b]">
                  No upfront payment. Secure checkout process. Fast turnaround.
                </p>
              </motion.div>

              {/* Long Description & Features */}
              {product.description && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
                  className="prose prose-lg max-w-none prose-p:text-[#6e6e73] prose-p:leading-relaxed prose-headings:text-[#1d1d1f] prose-headings:tracking-tight"
                >
                  <h3 className="text-2xl font-bold mb-4">Product Overview</h3>
                  <div className="text-[15px] whitespace-pre-wrap">{product.description}</div>
                </motion.div>
              )}

              {/* Tags */}
              {product.tags && product.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-8 pt-8 border-t border-black/5">
                  {product.tags.map((tag) => (
                    <span key={tag} className="bg-black/5 px-4 py-2 rounded-full text-xs font-semibold text-[#6e6e73]">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

            </div>
          </div>
        </section>

        {/* Live Branding Preview Section (If applicable) */}
        {product.is_customizable && product.branding_config && (
          <section className="bg-white py-20 md:py-32 border-t border-black/5">
            <div className="max-w-[1400px] mx-auto px-6">
              <div className="max-w-2xl mx-auto text-center mb-16">
                <div className="inline-flex items-center justify-center p-3 bg-red-50 rounded-2xl text-[#e3231c] mb-6">
                  <Sparkles size={28} />
                </div>
                <h2 className="text-3xl md:text-5xl font-bold text-[#1d1d1f] tracking-tight mb-4">
                  Make it yours.
                </h2>
                <p className="text-xl text-[#86868b] tracking-tight">
                  Experience our live branding studio. Type your company name to see exactly how it looks on the {product.name}.
                </p>
              </div>
              
              <ProductBrandingClient product={product as any} />
            </div>
          </section>
        )}
      </main>

      <LeadModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        productId={product.id}
        productName={product.name}
      />
    </>
  )
}

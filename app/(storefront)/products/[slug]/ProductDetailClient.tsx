'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Package, Clock, Users, Tag, MessageSquare, ShieldCheck, Sparkles, ShoppingCart, Plus, Minus, Phone } from 'lucide-react'
import ColorVariantPicker from '@/components/products/ColorVariantPicker'
import LeadModal from '@/components/products/LeadModal'
import type { ColorVariant } from '@/components/products/ProductCard'
import { useCartStore } from '@/lib/store/useCartStore'
import { siteConfig } from '@/lib/site-config'

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
  const router = useRouter()
  const variants: ColorVariant[] = product.color_variants ?? []
  const [activeVariant, setActiveVariant] = useState(0)
  const [activeImage, setActiveImage] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [quantity, setQuantity] = useState(1)
  
  const { addItem, setIsCartOpen } = useCartStore()

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

  const handleBack = (e: React.MouseEvent) => {
    e.preventDefault()
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      const fallbackCategory = product.categories?.slug
      router.push(fallbackCategory ? `/products?category=${fallbackCategory}` : '/products')
    }
  }

  const handleWhatsApp = () => {
    const text = `Hi, I'm interested in purchasing the following product in bulk: ${product.name}. I'm looking for approximately ${product.min_order_qty || 50} pieces. Please share the wholesale pricing, MOQ, availability, and delivery details. Thank you.`
    const encodedText = encodeURIComponent(text)
    const cleanPhone = siteConfig.phone.replace(/\s+/g, '')
    window.open(`https://wa.me/${cleanPhone}?text=${encodedText}`, '_blank')
  }

  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      price: product.base_price || 0,
      quantity,
      colorName: currentVariant?.name,
      imageUrl: mainImage || undefined,
    })
    setIsCartOpen(true)
  }

  return (
    <>
      <main className="min-h-screen bg-[#fbfbfd] pt-24 md:pt-28">
        {/* Clean Back Button preserving scroll & category */}
        <div className="max-w-[1400px] mx-auto px-6 pb-2 flex items-center">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#86868b] hover:text-[#1d1d1f] transition-colors py-1 cursor-pointer group"
          >
            <ChevronLeft size={18} className="transition-transform group-hover:-translate-x-1" />
            Back
          </button>
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
                  <p className="text-base md:text-lg text-[#6e6e73] font-medium leading-relaxed mb-6 max-w-xl">
                    {product.short_desc}
                  </p>
                )}

                {/* Retail Price Display */}
                {product.base_price && (
                  <div className="mb-6">
                    <div className="text-3xl font-bold text-[#1d1d1f]">
                      ₹{product.base_price.toLocaleString('en-IN')}
                    </div>
                    <div className="text-sm text-[#86868b] mt-1">Incl. of all taxes</div>
                  </div>
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

              {/* ── Action Sections: Retail & Bulk ── */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
                className="flex flex-col gap-6"
              >
                {/* Retail Section */}
                <div className="bg-white p-5 rounded-3xl border border-black/8 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <ShoppingCart size={18} className="text-[#1d1d1f]" />
                    <h3 className="font-bold text-[#1d1d1f] text-lg">Buy Retail</h3>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-4 items-end">
                    {/* Quantity Selector */}
                    <div className="flex flex-col gap-2 w-full sm:w-auto">
                      <label className="text-xs font-semibold text-[#86868b] uppercase tracking-wider">Quantity</label>
                      <div className="flex items-center bg-[#f5f5f7] rounded-full p-1 border border-black/5">
                        <button 
                          onClick={() => setQuantity(q => Math.max(1, q - 1))}
                          className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm text-[#1d1d1f] hover:bg-[#e3231c] hover:text-white transition-colors cursor-pointer"
                        >
                          <Minus size={16} />
                        </button>
                        <span className="w-12 text-center font-bold text-[#1d1d1f]">{quantity}</span>
                        <button 
                          onClick={() => setQuantity(q => q + 1)}
                          className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm text-[#1d1d1f] hover:bg-[#e3231c] hover:text-white transition-colors cursor-pointer"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={handleAddToCart}
                      disabled={!product.base_price}
                      className="flex-1 flex items-center justify-center gap-2 h-[48px] rounded-full bg-[#1d1d1f] text-white font-bold text-sm shadow-md hover:bg-black active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ShoppingCart size={16} />
                      {product.base_price ? 'Add to Cart' : 'Price Unavailable'}
                    </button>
                  </div>
                </div>

                {/* Bulk Section */}
                <div className="bg-[#fcf5f5] p-5 rounded-3xl border border-[#e3231c]/10 shadow-sm relative overflow-hidden">
                  <div className="absolute -right-4 -top-4 text-[#e3231c]/5 pointer-events-none">
                    <Package size={120} />
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Package size={18} className="text-[#e3231c]" />
                        <h3 className="font-bold text-[#1d1d1f] text-lg">Buy in Bulk / Wholesale</h3>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      <button
                        type="button"
                        onClick={() => setModalOpen(true)}
                        className="w-full flex items-center justify-center gap-2.5 h-[48px] rounded-full bg-[#e3231c] text-white font-bold text-sm shadow-[0_4px_14px_rgba(227,35,28,0.25)] hover:bg-[#c91d17] hover:shadow-[0_6px_20px_rgba(227,35,28,0.35)] active:scale-[0.98] transition-all cursor-pointer"
                      >
                        <MessageSquare size={16} />
                        Fill Inquiry Form
                      </button>

                      <div className="flex gap-3">
                        <button
                          onClick={handleWhatsApp}
                          className="flex-1 flex items-center justify-center gap-2 h-[44px] rounded-full bg-white text-[#25D366] font-bold text-sm border border-[#25D366]/30 hover:border-[#25D366] hover:bg-[#25D366]/5 active:scale-[0.98] transition-all cursor-pointer"
                        >
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                          </svg>
                          WhatsApp Us
                        </button>
                        
                        <a
                          href={`tel:${siteConfig.phone}`}
                          className="flex-1 flex items-center justify-center gap-2 h-[44px] rounded-full bg-white text-[#1d1d1f] font-bold text-sm border border-black/10 hover:border-black/20 hover:bg-[#f5f5f7] active:scale-[0.98] transition-all cursor-pointer"
                        >
                          <Phone size={16} />
                          Call Us
                        </a>
                      </div>

                      {product.is_customizable && (
                        <Link
                          href={`/branding?slug=${product.slug}`}
                          className="w-full mt-2 flex items-center justify-center gap-2.5 px-8 py-3 rounded-full bg-transparent text-[#e3231c] font-semibold text-xs border border-[#e3231c]/20 hover:bg-[#e3231c]/5 active:scale-[0.98] transition-all cursor-pointer"
                        >
                          <Sparkles size={14} />
                          Preview Custom Logo on Product
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
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

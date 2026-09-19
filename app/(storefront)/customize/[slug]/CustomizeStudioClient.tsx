'use client'

import React, { useState, useMemo, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ChevronLeft,
  Upload,
  Sparkles,
  Check,
  X,
  ShoppingCart,
  Plus,
  Minus,
  Eye,
  EyeOff,
  Palette,
  Type,
  ShieldCheck,
  Package,
  Phone,
  RotateCcw,
  Move,
  Maximize2,
  Image as ImageIcon
} from 'lucide-react'
import { useCartStore, type CustomBrandingData } from '@/lib/store/useCartStore'
import { optimizeImageToWebPUnder20Kb } from '@/lib/utils/imageOptimizer'
import { siteConfig } from '@/lib/site-config'
import type { ColorVariant } from '@/components/products/ProductCard'

interface CustomizeStudioClientProps {
  product: {
    id: string
    name: string
    slug: string
    description?: string | null
    short_desc?: string | null
    base_price?: number | null
    min_order_qty?: number | null
    color_variants?: ColorVariant[] | null
    primary_image_url?: string | null
    image_gallery?: string[] | null
    categories?: { id: string; name: string; slug: string } | null
    branding_config?: any
  }
}

// Curated high-contrast imprint colors
const IMPRINT_COLORS = [
  { hex: '#FFFFFF', name: 'Pure White', border: true },
  { hex: '#111827', name: 'Matte Black' },
  { hex: '#F59E0B', name: 'Amber Gold' },
  { hex: '#EF4444', name: 'Crimson Red' },
  { hex: '#2563EB', name: 'Royal Blue' },
  { hex: '#10B981', name: 'Emerald Green' },
]

// Professional standard imprint locations on corporate polo & t-shirts
// Left Chest (Wearer's Left, Viewer's Right) is the #1 industry standard
const PLACEMENT_PRESETS = [
  {
    id: 'left_chest',
    name: 'Left Chest',
    badge: 'Standard & Recommended',
    desc: '4" × 4" Pocket Crest Area',
    top: 49,
    left: 60,
    width: 16,
  },
  {
    id: 'right_chest',
    name: 'Right Chest',
    badge: 'Secondary',
    desc: '4" × 4" Name / Secondary Crest',
    top: 49,
    left: 40,
    width: 16,
  },
  {
    id: 'center_chest',
    name: 'Center Chest',
    badge: 'Below Placket',
    desc: '8" × 8" Statement Imprint',
    top: 57,
    left: 50,
    width: 22,
  },
]

// Quick showcase sample brand names
const SHOWCASE_NAMES = ['ALAM', 'OUTFLANK', 'GOOGLE', 'ACME CORP']

// Clean SVG Sample Logos for 1-click showcase demo (locally handled)
const SAMPLE_TECH_LOGO = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none"><circle cx="50" cy="50" r="46" stroke="%23ffffff" stroke-width="6"/><path d="M30 65 L50 25 L70 65 Z" fill="%23ffffff"/><circle cx="50" cy="52" r="7" fill="%23111827"/></svg>`
const SAMPLE_CREST_LOGO = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none"><path d="M50 10 L85 28 V55 C85 75 50 92 50 92 C50 92 15 75 15 55 V28 Z" stroke="%23ffffff" stroke-width="5" fill="none"/><text x="50" y="58" font-size="32" font-weight="900" text-anchor="middle" fill="%23ffffff" font-family="sans-serif">OF</text></svg>`

export default function CustomizeStudioClient({ product }: CustomizeStudioClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { items, addItem, setIsCartOpen } = useCartStore()

  // References for interactive canvas drag & resize
  const canvasRef = useRef<HTMLDivElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)

  // Garment Variant selection
  const variants: ColorVariant[] = useMemo(() => {
    if (product.color_variants && product.color_variants.length > 0) {
      return product.color_variants
    }
    return [
      {
        name: 'Default',
        hex: '#ea580c',
        images: product.image_gallery || (product.primary_image_url ? [product.primary_image_url] : [])
      }
    ]
  }, [product])

  const initialColorParam = searchParams.get('color')
  const initialVariantIndex = useMemo(() => {
    if (initialColorParam) {
      const idx = variants.findIndex(v => v.hex?.toLowerCase() === initialColorParam.toLowerCase())
      if (idx !== -1) return idx
    }
    return 0
  }, [variants, initialColorParam])

  const [activeVariant, setActiveVariant] = useState(initialVariantIndex)
  const [activeImage, setActiveImage] = useState(0)

  // Initial Box Coordinates from product.branding_config or default to Left Chest
  const initialTop = parseFloat(product.branding_config?.top || '49')
  const initialLeft = parseFloat(product.branding_config?.left || '60')
  const initialWidth = parseFloat(product.branding_config?.width || '16')

  const [boxPos, setBoxPos] = useState({
    top: initialTop,
    left: initialLeft,
    width: initialWidth,
  })

  // Dragging and resizing states
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [showPrintGuide, setShowPrintGuide] = useState(true)

  // MUTUALLY EXCLUSIVE BRANDING MODE: ONLY 'text' OR 'logo' (NO 'logo + text')
  const [brandingMode, setBrandingMode] = useState<'text' | 'logo'>('text')

  // Text Branding States
  const [brandText, setBrandText] = useState('Alam')
  const [imprintColor, setImprintColor] = useState(IMPRINT_COLORS[0].hex)
  const [textSize, setTextSize] = useState(16) // px

  // Logo Branding States (<20KB WebP generated 100% locally in browser)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [logoSizeKb, setLogoSizeKb] = useState<string | null>(null)
  const [logoBytes, setLogoBytes] = useState<number | null>(null)
  const [logoScale, setLogoScale] = useState(85) // %
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [optimizerError, setOptimizerError] = useState<string | null>(null)

  // Order Quantity
  const [quantity, setQuantity] = useState(1)
  const [addedSuccess, setAddedSuccess] = useState(false)

  const currentVariant = variants[activeVariant] || variants[0]
  const images = currentVariant?.images?.length
    ? currentVariant.images
    : product.image_gallery?.length
      ? product.image_gallery
      : product.primary_image_url
        ? [product.primary_image_url]
        : []

  const mainImage = images[activeImage] || images[0]

  // Dynamic pricing based on quantity tier
  const unitPrice = useMemo(() => {
    const base = product.base_price || 299
    if (quantity >= 100) return Math.round(base * 0.8)
    if (quantity >= 50) return Math.round(base * 0.85)
    if (quantity >= 20) return Math.round(base * 0.92)
    return base
  }, [product.base_price, quantity])

  const totalPrice = unitPrice * quantity

  // Derive human-readable current location name from coordinates
  const currentLocation = useMemo(() => {
    if (Math.abs(boxPos.left - 60) <= 3 && Math.abs(boxPos.top - 49) <= 3) {
      return { id: 'left_chest', name: 'Left Chest', badge: 'Standard Pocket' }
    }
    if (Math.abs(boxPos.left - 40) <= 3 && Math.abs(boxPos.top - 49) <= 3) {
      return { id: 'right_chest', name: 'Right Chest', badge: 'Right Crest' }
    }
    if (Math.abs(boxPos.left - 50) <= 3 && Math.abs(boxPos.top - 57) <= 4) {
      return { id: 'center_chest', name: 'Center Chest', badge: 'Below Buttons' }
    }
    return { id: 'custom', name: 'Custom Placement', badge: `${boxPos.left}% × ${boxPos.top}%` }
  }, [boxPos])

  // Apply a Preset Location
  const applyPreset = (preset: typeof PLACEMENT_PRESETS[0]) => {
    setBoxPos({
      top: preset.top,
      left: preset.left,
      width: preset.width,
    })
  }

  // Interactive Dragging on the Garment Canvas
  const handleBoxPointerDown = (e: React.PointerEvent) => {
    if (activeImage !== 0) return
    e.preventDefault()
    e.stopPropagation()

    const canvas = canvasRef.current
    if (!canvas) return

    const canvasRect = canvas.getBoundingClientRect()
    const startClientX = e.clientX
    const startClientY = e.clientY
    const startLeft = boxPos.left
    const startTop = boxPos.top

    setIsDragging(true)
    const target = e.currentTarget as HTMLElement
    target.setPointerCapture(e.pointerId)

    const handlePointerMove = (moveEv: PointerEvent) => {
      const dx = ((moveEv.clientX - startClientX) / canvasRect.width) * 100
      const dy = ((moveEv.clientY - startClientY) / canvasRect.height) * 100

      let newLeft = Math.max(22, Math.min(78, startLeft + dx))
      let newTop = Math.max(32, Math.min(72, startTop + dy))

      // Magnetic snap to standard preset locations within 2.5%
      if (Math.abs(newLeft - 60) < 2.5 && Math.abs(newTop - 49) < 2.5) {
        newLeft = 60
        newTop = 49
      } else if (Math.abs(newLeft - 40) < 2.5 && Math.abs(newTop - 49) < 2.5) {
        newLeft = 40
        newTop = 49
      } else if (Math.abs(newLeft - 50) < 2.5 && Math.abs(newTop - 57) < 2.5) {
        newLeft = 50
        newTop = 57
      }

      setBoxPos(prev => ({
        ...prev,
        left: Math.round(newLeft * 10) / 10,
        top: Math.round(newTop * 10) / 10,
      }))
    }

    const handlePointerUp = (upEv: PointerEvent) => {
      setIsDragging(false)
      target.releasePointerCapture(upEv.pointerId)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
  }

  // Interactive Resizing on Corner Handle
  const handleResizePointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const canvas = canvasRef.current
    if (!canvas) return

    const canvasRect = canvas.getBoundingClientRect()
    const startClientX = e.clientX
    const startWidth = boxPos.width

    setIsResizing(true)
    const target = e.currentTarget as HTMLElement
    target.setPointerCapture(e.pointerId)

    const handlePointerMove = (moveEv: PointerEvent) => {
      const dx = ((moveEv.clientX - startClientX) / canvasRect.width) * 100 * 2
      const newWidth = Math.max(10, Math.min(32, startWidth + dx))

      setBoxPos(prev => ({
        ...prev,
        width: Math.round(newWidth * 10) / 10,
      }))
    }

    const handlePointerUp = (upEv: PointerEvent) => {
      setIsResizing(false)
      target.releasePointerCapture(upEv.pointerId)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
  }

  // 100% LOCAL Client-Side File Optimization (<20KB WebP, ZERO server upload while browsing)
  const handleLocalImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setOptimizerError(null)
    setIsOptimizing(true)

    try {
      // Local client-side canvas optimization strictly under 20KB
      const clientOpt = await optimizeImageToWebPUnder20Kb(file)
      
      // Saved locally in memory/state
      setLogoUrl(clientOpt.dataUrl)
      setLogoSizeKb(clientOpt.fileSizeKb)
      setLogoBytes(clientOpt.fileSizeBytes)
    } catch (err: any) {
      console.error('Local image optimization failed:', err)
      setOptimizerError(err.message || 'Image processing failed. Please select a valid image.')
    } finally {
      setIsOptimizing(false)
    }
  }

  // Showcase Quick Sample Logo Loaders (Local)
  const loadSampleLogo = async (type: 'tech' | 'crest') => {
    setOptimizerError(null)
    setIsOptimizing(true)
    try {
      const sample = type === 'tech' ? SAMPLE_TECH_LOGO : SAMPLE_CREST_LOGO
      const opt = await optimizeImageToWebPUnder20Kb(sample)
      setLogoUrl(opt.dataUrl)
      setLogoSizeKb(opt.fileSizeKb)
      setLogoBytes(opt.fileSizeBytes)
    } catch (err: any) {
      console.error('Failed to load sample logo:', err)
    } finally {
      setIsOptimizing(false)
    }
  }

  // Handle Add to Cart - Stores configuration locally in cart (no server storage until checkout!)
  const handleAddToCart = () => {
    if (isOptimizing) return

    const isLogoMode = brandingMode === 'logo'
    const isTextMode = brandingMode === 'text'

    if (isLogoMode && !logoUrl) {
      alert('Please upload a logo or select a sample logo before adding to cart.')
      return
    }

    if (isTextMode && !brandText.trim()) {
      alert('Please enter your imprint text before adding to cart.')
      return
    }

    const label = isLogoMode
      ? `Custom Logo Imprint (${logoSizeKb ? `${logoSizeKb} KB WebP` : '< 20 KB'})`
      : `Custom Text: "${brandText.trim()}"`

    // Local cart payload
    const customBranding: CustomBrandingData = {
      isCustomized: true,
      brandText: isTextMode ? brandText.trim() : undefined,
      textColor: isTextMode ? imprintColor : undefined,
      logoUrl: isLogoMode ? (logoUrl || undefined) : undefined,
      fileSizeBytes: isLogoMode ? (logoBytes || undefined) : undefined,
      fileSizeKb: isLogoMode ? (logoSizeKb || undefined) : undefined,
      printPosition: `${currentLocation.name} (${boxPos.left}%, ${boxPos.top}%)`,
      customizationLabel: label,
      coordinates: {
        left: `${boxPos.left}%`,
        top: `${boxPos.top}%`,
        width: `${boxPos.width}%`,
      }
    }

    addItem({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      price: unitPrice,
      quantity,
      colorName: currentVariant?.name,
      imageUrl: mainImage || undefined,
      customization: label,
      customBranding
    })

    setAddedSuccess(true)
    setTimeout(() => setAddedSuccess(false), 2500)
    setIsCartOpen(true)
  }

  // WhatsApp Inquiry for Corporate Bulk
  const handleWhatsApp = () => {
    const imprintDesc = brandingMode === 'logo' ? 'Uploaded Custom Logo' : `Text: "${brandText || 'Custom'}"`
    const text = `Hi Outflank, I'm interested in ordering customized ${product.name} (Qty: ${quantity}, Color: ${currentVariant?.name}). Branding: ${imprintDesc}. Location: ${currentLocation.name}. Please share the bulk quotation.`
    const cleanPhone = siteConfig.phone.replace(/\s+/g, '')
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank')
  }

  return (
    <div className="min-h-screen bg-[#f8f9fb] pt-20 sm:pt-24 pb-20 select-none">
      
      {/* ── Fixed Studio Top Header Bar ── */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-b border-black/8 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-18 flex items-center justify-between">
          
          {/* Left: Brand Logo + Back button */}
          <div className="flex items-center gap-3 sm:gap-4">
            <Link href="/" className="flex items-center shrink-0">
              <Image
                src="/logo/outflank-logo.png"
                alt="Outflank"
                width={110}
                height={38}
                className="h-7 sm:h-8 w-auto object-contain"
                priority
              />
            </Link>
            <div className="h-4 w-px bg-gray-200 hidden sm:block" />
            <Link
              href={`/products/${product.slug}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 hover:text-gray-900 bg-[#f5f5f7] hover:bg-gray-200 px-3.5 py-1.5 rounded-full transition-colors shrink-0 cursor-pointer"
            >
              <ChevronLeft size={14} />
              <span className="hidden sm:inline">Back to Product</span>
              <span className="sm:hidden">Back</span>
            </Link>
          </div>

          {/* Center: Title & Studio Badge */}
          <div className="hidden md:flex flex-col items-center">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-gray-900 truncate max-w-xs lg:max-w-md">
                {product.name}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-blue-50 text-[#0066FF] border border-blue-200 uppercase tracking-wide">
                Customizer
              </span>
            </div>
            <span className="text-[10px] text-gray-400">
              Interactive Placement Canvas &amp; Live Preview
            </span>
          </div>

          {/* Right: Cart, Unit Price & Quick Order CTA */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right hidden sm:block">
              <span className="text-[9px] uppercase tracking-wider text-gray-400 block font-bold leading-none">Price</span>
              <span className="text-xs font-black text-gray-900">₹{unitPrice}/pc</span>
            </div>

            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 rounded-full hover:bg-gray-100 text-gray-700 transition-colors cursor-pointer"
              aria-label="View Cart"
            >
              <ShoppingCart size={19} />
              {items.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#0066FF] text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                  {items.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={handleAddToCart}
              disabled={isOptimizing}
              className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-gray-900 hover:bg-black text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
            >
              {addedSuccess ? (
                <>
                  <Check size={15} className="text-emerald-400" />
                  <span className="hidden sm:inline">Added!</span>
                </>
              ) : isOptimizing ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <ShoppingCart size={14} />
                  <span>Order (₹{totalPrice.toLocaleString('en-IN')})</span>
                </>
              )}
            </button>
          </div>

        </div>
      </header>

      {/* ── Main Studio Workspace ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* ── LEFT COLUMN: Photorealistic Interactive Garment Canvas ── */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-black/8 shadow-sm flex flex-col items-center sticky lg:top-24">
            
            {/* View Controls & Angle Badges */}
            <div className="w-full flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Angle:</span>
                {images.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImage(idx)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                      activeImage === idx
                        ? 'bg-gray-900 text-white'
                        : 'bg-[#f5f5f7] text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {idx === 0 ? 'Front View' : idx === 1 ? 'Side Profile' : `Angle ${idx + 1}`}
                  </button>
                ))}
              </div>

              {/* Canvas Controls: Reset & Toggle Guide */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => applyPreset(PLACEMENT_PRESETS[0])}
                  className="flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-[#f5f5f7] hover:bg-gray-200 px-3 py-1 rounded-full transition-colors cursor-pointer"
                  title="Reset imprint box to standard Left Chest"
                >
                  <RotateCcw size={12} />
                  <span className="hidden sm:inline">Reset</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowPrintGuide(!showPrintGuide)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-[#0066FF] bg-blue-50/80 hover:bg-blue-100 px-3 py-1 rounded-full transition-colors cursor-pointer"
                  title="Toggle dashed print area border"
                >
                  {showPrintGuide ? <EyeOff size={13} /> : <Eye size={13} />}
                  <span>{showPrintGuide ? 'Hide Guide' : 'Show Guide'}</span>
                </button>
              </div>
            </div>

            {/* The Main Interactive Garment Canvas */}
            <div
              ref={canvasRef}
              className="relative w-full aspect-square max-w-[500px] bg-[#fbfbfd] rounded-2xl overflow-hidden border border-black/5 flex items-center justify-center shadow-inner select-none"
            >
              
              {/* Garment Image */}
              {mainImage ? (
                <Image
                  src={mainImage}
                  alt={product.name}
                  fill
                  className="object-contain p-4 select-none pointer-events-none"
                  priority
                  unoptimized
                />
              ) : (
                <Package size={64} className="text-gray-300" />
              )}

              {/* Interactive Draggable Imprint Area Overlay (Front View Only) */}
              {activeImage === 0 && (
                <div
                  ref={boxRef}
                  onPointerDown={handleBoxPointerDown}
                  style={{
                    position: 'absolute',
                    top: `${boxPos.top}%`,
                    left: `${boxPos.left}%`,
                    width: `${boxPos.width}%`,
                    transform: 'translate(-50%, -50%)',
                    zIndex: 30,
                    touchAction: 'none',
                  }}
                  className={`group transition-shadow cursor-grab active:cursor-grabbing ${
                    isDragging ? 'cursor-grabbing scale-[1.02]' : ''
                  }`}
                >
                  <div
                    className={`relative w-full p-2.5 flex flex-col items-center justify-center rounded-xl transition-all duration-150 ${
                      showPrintGuide
                        ? isDragging
                          ? 'border-2 border-[#0066FF] bg-[#0066FF]/10 shadow-[0_8px_24px_rgba(0,102,255,0.25)] ring-4 ring-[#0066FF]/20'
                          : 'border-2 border-dashed border-[#0066FF]/70 bg-[#0066FF]/[0.05] hover:border-[#0066FF] hover:bg-[#0066FF]/10'
                        : isDragging
                          ? 'border border-[#0066FF]/50 bg-black/5'
                          : 'border border-transparent hover:border-black/10'
                    }`}
                  >
                    {/* Floating Location Tag & Drag Handle Indicator */}
                    {showPrintGuide && (
                      <div className="absolute -top-3.5 px-2 py-0.5 bg-[#0066FF] text-white text-[8px] font-extrabold rounded-full uppercase tracking-wider shadow-xs flex items-center gap-1 pointer-events-none whitespace-nowrap">
                        <Move size={8} />
                        <span>{currentLocation.name}</span>
                      </div>
                    )}

                    {/* Corner Resize Handle Knob */}
                    {showPrintGuide && (
                      <div
                        onPointerDown={handleResizePointerDown}
                        title="Drag to resize imprint area"
                        className="absolute -bottom-2 -right-2 w-5 h-5 bg-white border-2 border-[#0066FF] text-[#0066FF] rounded-full shadow-md flex items-center justify-center cursor-nwse-resize hover:scale-125 transition-transform"
                      >
                        <Maximize2 size={9} />
                      </div>
                    )}

                    {/* ── RENDER MUTUALLY EXCLUSIVE BRANDING ── */}
                    {/* 1. LOGO MODE ONLY */}
                    {brandingMode === 'logo' && (
                      logoUrl ? (
                        <div
                          style={{ width: `${logoScale}%` }}
                          className="transition-all duration-150 flex items-center justify-center pointer-events-none"
                        >
                          <img
                            src={logoUrl}
                            alt="Brand Logo"
                            className="max-h-24 max-w-full object-contain filter drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)]"
                          />
                        </div>
                      ) : showPrintGuide ? (
                        <div className="py-2.5 text-center pointer-events-none">
                          <span className="text-[10px] font-bold text-[#0066FF] uppercase tracking-wider block">
                            Logo Print Zone
                          </span>
                          <span className="text-[9px] text-gray-400">
                            Upload a logo on the right
                          </span>
                        </div>
                      ) : null
                    )}

                    {/* 2. TEXT MODE ONLY */}
                    {brandingMode === 'text' && (
                      brandText.trim() ? (
                        <p
                          className="font-black text-center leading-tight select-none uppercase tracking-wide px-1 pointer-events-none transition-all"
                          style={{
                            color: imprintColor,
                            fontSize: `${textSize}px`,
                            fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                            lineHeight: 1.1,
                            textShadow: imprintColor === '#FFFFFF'
                              ? '0 1px 3px rgba(0,0,0,0.8), 0 2px 5px rgba(0,0,0,0.4)'
                              : '0 1px 2px rgba(255,255,255,0.5)',
                            wordBreak: 'break-word',
                          }}
                        >
                          {brandText.trim()}
                        </p>
                      ) : showPrintGuide ? (
                        <div className="py-2.5 text-center pointer-events-none">
                          <span className="text-[10px] font-bold text-[#0066FF] uppercase tracking-wider block">
                            Text Print Zone
                          </span>
                          <span className="text-[9px] text-gray-400">
                            Type text on the right
                          </span>
                        </div>
                      ) : null
                    )}

                  </div>
                </div>
              )}

              {/* Side view banner */}
              {activeImage !== 0 && (
                <div className="absolute bottom-4 px-3 py-1.5 bg-black/60 backdrop-blur-md text-white text-[11px] font-semibold rounded-full">
                  Front view active for branding placement
                </div>
              )}
            </div>

            {/* Quick Location Presets ("Where We Usually Print") */}
            <div className="w-full mt-5 pt-4 border-t border-black/6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  Standard Print Placement:
                </span>
                <span className="text-[10px] font-semibold text-gray-400">
                  Click preset or drag box on shirt
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                {PLACEMENT_PRESETS.map(preset => {
                  const isActive = currentLocation.id === preset.id
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer relative overflow-hidden ${
                        isActive
                          ? 'border-[#0066FF] bg-blue-50/70 ring-2 ring-[#0066FF]/20 shadow-2xs'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-900 block leading-tight">
                          {preset.name}
                        </span>
                        {isActive && <Check size={13} className="text-[#0066FF]" />}
                      </div>
                      <span className="text-[9px] text-gray-500 block mt-0.5 leading-tight">
                        {preset.desc}
                      </span>
                      {preset.badge && (
                        <span className={`inline-block mt-1 text-[8px] font-extrabold uppercase px-1.5 py-0.2 rounded ${
                          isActive ? 'bg-[#0066FF] text-white' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {preset.badge}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

          </div>

          {/* ── RIGHT COLUMN: Mutually Exclusive Branding Controls (Logo OR Text) ── */}
          <div className="lg:col-span-5 flex flex-col gap-6">

            {/* ── MUTUALLY EXCLUSIVE BRANDING TOGGLE: LOGO OR TEXT ── */}
            <div className="bg-white rounded-3xl p-4 border border-black/8 shadow-sm space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
                Select Branding Option:
              </span>
              
              <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100/80 rounded-2xl">
                {/* Option 1: Custom Text */}
                <button
                  type="button"
                  onClick={() => setBrandingMode('text')}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    brandingMode === 'text'
                      ? 'bg-white text-gray-900 shadow-sm ring-1 ring-black/5'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                  }`}
                >
                  <Type size={16} className={brandingMode === 'text' ? 'text-[#0066FF]' : 'text-gray-500'} />
                  <span>Custom Text</span>
                </button>

                {/* Option 2: Upload Logo */}
                <button
                  type="button"
                  onClick={() => setBrandingMode('logo')}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    brandingMode === 'logo'
                      ? 'bg-white text-gray-900 shadow-sm ring-1 ring-black/5'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                  }`}
                >
                  <Upload size={16} className={brandingMode === 'logo' ? 'text-[#0066FF]' : 'text-gray-500'} />
                  <span>Upload Logo</span>
                </button>
              </div>
            </div>

            {/* ── OPTION A: CUSTOM TEXT BRANDING CONTROLS ── */}
            {brandingMode === 'text' && (
              <div className="bg-white rounded-3xl p-6 border border-black/8 shadow-sm space-y-5 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Custom Text Branding</h3>
                    <p className="text-[11px] text-gray-500 mt-0.5">High-definition screen print &amp; embroidery typography</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#0066FF] border border-blue-200 uppercase">
                    Modern Sans
                  </span>
                </div>

                {/* Text Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">Imprint Text:</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={brandText}
                      onChange={(e) => setBrandText(e.target.value)}
                      placeholder="Type name or brand (e.g. Alam, Outflank)..."
                      className="w-full text-sm font-bold px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] outline-none"
                    />
                    {brandText && (
                      <button
                        type="button"
                        onClick={() => setBrandText('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 p-0.5 cursor-pointer"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* 1-Tap Showcase Brand Presets */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-gray-500">Quick Brand Suggestions:</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {SHOWCASE_NAMES.map(name => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => setBrandText(name)}
                        className={`text-xs font-bold px-3 py-1 rounded-lg border transition-all cursor-pointer ${
                          brandText === name
                            ? 'border-[#0066FF] bg-[#0066FF]/10 text-[#0066FF]'
                            : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 hover:border-gray-300'
                        }`}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Imprint Color Palette */}
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-gray-700">Print Ink Color:</label>
                    <span className="text-xs font-bold text-gray-600">
                      {IMPRINT_COLORS.find(c => c.hex === imprintColor)?.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 flex-wrap bg-[#f5f5f7] p-2.5 rounded-2xl border border-black/5">
                    {IMPRINT_COLORS.map(c => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setImprintColor(c.hex)}
                        title={c.name}
                        className={`w-7 h-7 rounded-full transition-transform cursor-pointer ${
                          c.border ? 'border border-neutral-300' : ''
                        } ${
                          imprintColor === c.hex
                            ? 'scale-125 ring-2 ring-[#0066FF] ring-offset-2 shadow-xs'
                            : 'hover:scale-110'
                        }`}
                        style={{ backgroundColor: c.hex }}
                      />
                    ))}
                  </div>
                </div>

                {/* Font Size Preset Slider */}
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between text-xs font-semibold text-gray-600">
                    <span>Text Size:</span>
                    <span className="font-bold text-gray-900">{textSize}px</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={12}
                      max={24}
                      value={textSize}
                      onChange={(e) => setTextSize(Number(e.target.value))}
                      className="flex-1 accent-[#0066FF] cursor-pointer"
                    />
                    <div className="flex items-center gap-1 text-[11px] font-bold">
                      {[14, 17, 22].map((sz, i) => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => setTextSize(sz)}
                          className={`px-2 py-0.5 rounded border text-[10px] ${
                            textSize === sz ? 'bg-gray-900 text-white border-gray-900' : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {i === 0 ? 'S' : i === 1 ? 'M' : 'L'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── OPTION B: UPLOAD LOGO BRANDING CONTROLS (100% LOCAL PROCESSING <20KB) ── */}
            {brandingMode === 'logo' && (
              <div className="bg-white rounded-3xl p-6 border border-black/8 shadow-sm space-y-5 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Custom Logo Imprint</h3>
                    <p className="text-[11px] text-gray-500 mt-0.5">Instant local WebP optimization (&lt; 20KB)</p>
                  </div>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-50 text-[#0066FF] border border-blue-200 uppercase">
                    Client WebP &lt; 20KB
                  </span>
                </div>

                {/* Upload Dropzone */}
                <label className={`block border-2 border-dashed rounded-2xl p-5 text-center transition-all cursor-pointer ${
                  isOptimizing ? 'border-[#0066FF] bg-blue-50/50 pointer-events-none' : 'border-gray-300 hover:border-[#0066FF] hover:bg-blue-50/30'
                }`}>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif,image/bmp"
                    className="hidden"
                    disabled={isOptimizing}
                    onChange={handleLocalImagePick}
                  />
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-11 h-11 rounded-2xl bg-blue-50 text-[#0066FF] flex items-center justify-center">
                      <Upload size={20} />
                    </div>
                    {isOptimizing ? (
                      <div>
                        <p className="text-xs font-bold text-[#0066FF]">Optimizing into WebP &lt; 20KB locally...</p>
                        <p className="text-[11px] text-gray-400">Preserving alpha transparency &amp; sharpness</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs font-bold text-gray-900">
                          {logoUrl ? 'Click to Change Uploaded Logo' : 'Upload Any Logo (PNG, SVG, JPG, etc.)'}
                        </p>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          Compressed locally in your browser strictly &lt; 20KB
                        </p>
                      </div>
                    )}
                  </div>
                </label>

                {/* 1-Tap Sample Logos for Showcase Demo */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-semibold text-gray-500">Or Try Showcase Sample Logo:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => loadSampleLogo('crest')}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-xs font-bold text-gray-700 transition-colors cursor-pointer"
                    >
                      <Sparkles size={13} className="text-[#0066FF]" />
                      <span>Monogram Crest</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => loadSampleLogo('tech')}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-xs font-bold text-gray-700 transition-colors cursor-pointer"
                    >
                      <Sparkles size={13} className="text-emerald-600" />
                      <span>Vector Logo</span>
                    </button>
                  </div>
                </div>

                {/* Error Banner */}
                {optimizerError && (
                  <div className="text-xs text-red-600 bg-red-50 border border-red-200 p-3 rounded-xl flex items-center justify-between">
                    <span>{optimizerError}</span>
                    <button type="button" onClick={() => setOptimizerError(null)} className="text-red-400 hover:text-red-700">
                      <X size={14} />
                    </button>
                  </div>
                )}

                {/* Active Uploaded Logo Card */}
                {logoUrl && !isOptimizing && (
                  <div className="bg-slate-50 border border-blue-200 p-3.5 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-11 h-11 rounded-xl border border-gray-300 flex items-center justify-center bg-white overflow-hidden shrink-0"
                          style={{
                            backgroundImage: 'linear-gradient(45deg, #e5e5e5 25%, transparent 25%), linear-gradient(-45deg, #e5e5e5 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e5e5 75%), linear-gradient(-45deg, transparent 75%, #e5e5e5 75%)',
                            backgroundSize: '8px 8px',
                            backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0'
                          }}
                        >
                          <img src={logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-gray-900">Custom Logo Ready</span>
                            <span className="text-[9px] font-extrabold px-1.5 py-0.2 bg-emerald-100 text-emerald-700 rounded">
                              {logoSizeKb ? `${logoSizeKb} KB WebP` : '< 20 KB'}
                            </span>
                          </div>
                          <span className="text-[10px] text-gray-500">Saved locally · Ready for cart</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setLogoUrl(null)
                          setLogoSizeKb(null)
                          setLogoBytes(null)
                        }}
                        className="text-xs text-red-600 hover:text-red-800 font-semibold p-1 transition-colors cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>

                    {/* Logo Scale Slider */}
                    <div className="pt-2 border-t border-gray-200">
                      <div className="flex items-center justify-between text-xs font-semibold text-gray-600 mb-1">
                        <span>Logo Size Scale:</span>
                        <span className="font-bold text-gray-900">{logoScale}%</span>
                      </div>
                      <input
                        type="range"
                        min={50}
                        max={100}
                        value={logoScale}
                        onChange={(e) => setLogoScale(Number(e.target.value))}
                        className="w-full accent-[#0066FF] cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── GARMENT COLOR SELECTOR ── */}
            <div className="bg-white rounded-3xl p-5 border border-black/8 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-900">Garment Color:</span>
                <span className="text-xs font-bold text-gray-900 bg-gray-100 px-2.5 py-0.5 rounded-full">
                  {currentVariant?.name}
                </span>
              </div>

              {/* Color Variants Swatches */}
              <div className="flex items-center gap-2 flex-wrap">
                {variants.map((v, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setActiveVariant(i)
                      setActiveImage(0)
                    }}
                    title={v.name}
                    className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
                      activeVariant === i
                        ? 'ring-2 ring-gray-900 ring-offset-2 scale-110 shadow-xs'
                        : 'border-black/15 hover:scale-105'
                    }`}
                    style={{ backgroundColor: v.hex || '#000000' }}
                  >
                    {activeVariant === i && (
                      <Check
                        size={13}
                        className={v.hex?.toLowerCase() === '#ffffff' ? 'text-black' : 'text-white'}
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* ── PURCHASE CARD (Direct Order with Full Placement Coordinates) ── */}
            <div className="bg-white rounded-3xl p-6 border border-black/8 shadow-sm space-y-5">
              
              {/* Production Design Summary */}
              <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-200/80 flex items-center justify-between text-xs">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-gray-400">Design Specification</span>
                  <span className="font-bold text-gray-900">
                    {currentLocation.name} · {brandingMode === 'logo' ? (logoUrl ? 'Custom Logo' : 'Logo Pending') : `Text "${brandText}"`}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
                  Print Ready
                </span>
              </div>

              {/* Quantity Selector & Price Summary */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Quantity</span>
                  <div className="flex items-center bg-[#f5f5f7] rounded-full p-1 border border-black/5 mt-1">
                    <button
                      type="button"
                      onClick={() => setQuantity(q => Math.max(1, q - 1))}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-white text-gray-900 hover:bg-[#e3231c] hover:text-white transition-colors cursor-pointer"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-10 text-center text-xs font-bold text-gray-900">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity(q => q + 1)}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-white text-gray-900 hover:bg-[#e3231c] hover:text-white transition-colors cursor-pointer"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Subtotal</span>
                  <span className="text-2xl font-black text-gray-900">₹{totalPrice.toLocaleString('en-IN')}</span>
                  <span className="text-[10px] text-gray-500 block">Incl. customization &amp; GST</span>
                </div>
              </div>

              {/* Direct Add to Cart Action */}
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={isOptimizing}
                className="w-full flex items-center justify-center gap-2.5 h-[52px] rounded-full bg-gray-900 hover:bg-black text-white text-sm font-bold shadow-lg hover:shadow-xl active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
              >
                {addedSuccess ? (
                  <>
                    <Check size={18} className="text-emerald-400" />
                    <span>Added to Cart Successfully!</span>
                  </>
                ) : isOptimizing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Optimizing Logo Locally...</span>
                  </>
                ) : (
                  <>
                    <ShoppingCart size={18} />
                    <span>Add Customized Item to Cart</span>
                  </>
                )}
              </button>

              {/* Corporate Wholesale Button */}
              <button
                type="button"
                onClick={handleWhatsApp}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full border border-gray-200 hover:border-gray-400 text-gray-700 text-xs font-semibold hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <Phone size={13} className="text-emerald-600" />
                <span>Need 50+ Bulk Order? Chat on WhatsApp</span>
              </button>

              {/* Quality & Policy Assurances */}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                <span className="flex items-center gap-1">
                  <ShieldCheck size={14} className="text-emerald-600" /> 100% Quality Print
                </span>
                <span>•</span>
                <span>Pan-India Delivery</span>
                <span>•</span>
                <span>GST Invoicing</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

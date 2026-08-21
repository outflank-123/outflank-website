'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import {
  ArrowRight, ArrowDown, ChevronRight, Star, Package, Zap, Leaf, Coffee,
  Smartphone, Gift, ShieldCheck, Clock, Users, CheckCircle2,
  Building2, Headphones, BadgeCheck
} from 'lucide-react'

// ─── Category highlights (subset for homepage) ────────────
const categories = [
  { icon: Smartphone,   label: 'Electronics',       slug: 'electronics-and-mobile-accessories', color: '#0071e3' },
  { icon: Coffee,       label: 'Drinkware',          slug: 'flasks-sippers-mugs',               color: '#8b5cf6' },
  { icon: Package,      label: 'Joining Kits',       slug: 'employee-joining-kits',             color: '#e3231c' },
  { icon: Gift,         label: 'Gift Sets',           slug: 'gift-sets',                         color: '#f59e0b' },
  { icon: Leaf,         label: 'Eco-Friendly',        slug: 'eco-friendly-products',             color: '#22c55e' },
  { icon: Zap,          label: 'Power Banks',         slug: 'power-banks',                       color: '#6366f1' },
  { icon: ShieldCheck,  label: 'Prevention Kits',     slug: 'covid-corona-epidemic-prevention-items', color: '#14b8a6' },
  { icon: Headphones,   label: 'Audio',               slug: 'speakers-headphones-earphones',    color: '#ec4899' },
]

// ─── Stats ────────────────────────────────────────────────
const stats = [
  { value: '500+', label: 'Products Catalogued' },
  { value: '50+', label: 'Corporate Clients' },
  { value: '17', label: 'Gift Categories' },
  { value: '15 Days', label: 'Avg. Lead Time' },
]

// ─── Why Outflank ─────────────────────────────────────────
const whyItems = [
  {
    icon: BadgeCheck,
    title: 'Premium Quality Assured',
    desc: 'Every product is vetted for build quality and brand-worthiness before making it to our catalog.',
  },
  {
    icon: Zap,
    title: 'Custom Branding',
    desc: 'Your logo, your colours. We handle end-to-end branding so gifts feel authentically yours.',
  },
  {
    icon: Users,
    title: 'Bulk Order Specialists',
    desc: 'From 50 to 50,000 units — we scale with your needs without compromising on quality.',
  },
  {
    icon: Clock,
    title: 'Fast Turnaround',
    desc: 'Streamlined production and logistics mean you get your gifts on time, every time.',
  },
]

// ─── Floating badge component ──────────────────────────────
function FloatingBadge({ icon: Icon, label, delay = 0, className = '' }: {
  icon: React.ElementType; label: string; delay?: number; className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.5, type: 'spring' }}
      className={`absolute glass-card rounded-2xl px-4 py-2.5 flex items-center gap-2 shadow-lg ${className}`}
    >
      <div className="w-7 h-7 rounded-full bg-[#e3231c]/10 flex items-center justify-center">
        <Icon size={14} className="text-[#e3231c]" />
      </div>
      <span className="text-xs font-semibold text-[#1d1d1f]">{label}</span>
    </motion.div>
  )
}

export interface Banner {
  id: string
  title: string
  image_url: string
  cta_text: string | null
  cta_link: string | null
}

export interface FeaturedProduct {
  id: string
  name: string
  slug: string
  base_price: number | null
  min_order_qty: number | null
  primary_image_url: string | null
  categories?: { name: string, slug: string } | null
}

export default function LandingClient({ 
  banners = [], 
  featuredProducts = [] 
}: { 
  banners?: Banner[]
  featuredProducts?: FeaturedProduct[] 
}) {
  const heroRef = useRef<HTMLElement>(null)
  const { scrollY } = useScroll()
  const heroY = useTransform(scrollY, [0, 500], [0, 120])
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0])

  const [currentBanner, setCurrentBanner] = useState(0)

  useEffect(() => {
    if (banners.length <= 1) return
    const interval = setInterval(() => {
      setCurrentBanner(prev => (prev + 1) % banners.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [banners.length])

  // Animated counter
  const [counted, setCounted] = useState(false)
  const statsRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setCounted(true) },
      { threshold: 0.3 }
    )
    if (statsRef.current) observer.observe(statsRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <main className="flex flex-col bg-[#fbfbfd] overflow-x-hidden">

      {/* ═══════════════════════════════════════════════
          HERO (DYNAMIC)
      ═══════════════════════════════════════════════ */}
      <section
        ref={heroRef}
        className="relative flex flex-col items-center justify-center text-center p-3 md:p-5"
      >
        {banners.length > 0 ? (
          <div className="relative w-full max-w-[1400px] mx-auto min-h-[75vh] rounded-[32px] overflow-hidden flex flex-col items-center justify-center shadow-2xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentBanner}
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8 }}
                className="absolute inset-0 w-full h-full"
              >
                <Image
                  src={banners[currentBanner].image_url}
                  alt={banners[currentBanner].title}
                  fill
                  className="object-cover"
                  priority
                  unoptimized
                />
                <div className="absolute inset-0 bg-black/40" /> {/* Dark overlay for text readability */}
              </motion.div>
            </AnimatePresence>

            <motion.div style={{ y: heroY, opacity: heroOpacity }} className="relative z-10 max-w-5xl mx-auto px-5 md:px-8 mt-20">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`text-${currentBanner}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white tracking-tight-xl leading-[1.05] mb-6 drop-shadow-lg">
                    {banners[currentBanner].title}
                  </h1>
                  
                  {banners[currentBanner].cta_text && banners[currentBanner].cta_link && (
                    <div className="mt-10">
                      <Link
                        href={banners[currentBanner].cta_link}
                        className="group inline-flex items-center gap-2 rounded-full bg-[#e3231c] text-white px-8 py-4 text-base font-semibold hover:bg-[#b91a14] transition-all duration-200 hover:scale-[1.03] shadow-[0_4px_20px_rgba(227,35,28,0.35)]"
                      >
                        {banners[currentBanner].cta_text}
                        <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </motion.div>

            {/* Slider Dots */}
            {banners.length > 1 && (
              <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-3 z-20">
                {banners.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentBanner(idx)}
                    className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${idx === currentBanner ? 'bg-white scale-125' : 'bg-white/40 hover:bg-white/60'}`}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Fallback Static Hero */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] rounded-full bg-[#e3231c]/8 blur-[100px]" />
              <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-[#6366f1]/6 blur-[100px]" />
              <div className="absolute top-[30%] left-[50%] -translate-x-1/2 w-[400px] h-[400px] rounded-full bg-[#e3231c]/4 blur-[80px]" />
            </div>

            <div
              className="absolute inset-0 opacity-[0.025] pointer-events-none"
              style={{
                backgroundImage: 'linear-gradient(#1d1d1f 1px, transparent 1px), linear-gradient(90deg, #1d1d1f 1px, transparent 1px)',
                backgroundSize: '60px 60px',
              }}
            />

            <motion.div style={{ y: heroY, opacity: heroOpacity }} className="relative z-10 max-w-5xl mx-auto px-5 md:px-8">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="inline-flex items-center gap-2 rounded-full bg-[#e3231c]/8 border border-[#e3231c]/20 px-4 py-1.5 mb-8"
              >
                <Star size={12} className="text-[#e3231c] fill-[#e3231c]" />
                <span className="text-xs font-semibold text-[#e3231c] uppercase tracking-wider">
                  Premium B2B Corporate Gifting
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-[#1d1d1f] tracking-tight-xl leading-[1.05] mb-6"
              >
                Gifts That Say{' '}
                <br className="hidden sm:block" />
                <span className="relative inline-block">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#e3231c] to-[#ff6b35]">
                    Get the Better Of
                  </span>
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.35 }}
                className="text-lg md:text-xl text-[#6e6e73] mb-10 max-w-2xl mx-auto leading-relaxed text-balance"
              >
                Outflank delivers curated, custom-branded corporate gifts across 17 categories — 
                from premium electronics to eco-friendly kits. Minimum 50 units. Maximum impact.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-4"
              >
                <Link
                  href="/catalog"
                  id="hero-cta-catalog"
                  className="group inline-flex items-center gap-2 rounded-full bg-[#e3231c] text-white px-8 py-4 text-base font-semibold hover:bg-[#b91a14] transition-all duration-200 hover:scale-[1.03] shadow-[0_4px_20px_rgba(227,35,28,0.35)]"
                >
                  Browse the Catalog
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  href="/branding"
                  id="hero-cta-branding"
                  className="inline-flex items-center gap-2 rounded-full border border-black/12 bg-white px-8 py-4 text-base font-semibold text-[#1d1d1f] hover:bg-[#f5f5f7] hover:border-black/20 transition-all duration-200"
                >
                  Try Branding Preview
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.75, duration: 0.6 }}
                className="mt-12 flex flex-wrap items-center justify-center gap-6"
              >
                {['500+ Products', 'MOQ from 50 units', 'Custom Branding', 'Pan-India Delivery'].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm text-[#6e6e73]">
                    <CheckCircle2 size={14} className="text-[#22c55e]" />
                    {item}
                  </div>
                ))}
              </motion.div>
            </motion.div>

            <div className="absolute inset-0 pointer-events-none hidden lg:block">
              <FloatingBadge icon={Gift}         label="Gift Sets"    delay={0.9}  className="top-[22%] left-[8%]" />
              <FloatingBadge icon={Smartphone}   label="Electronics" delay={1.0}  className="top-[35%] right-[7%]" />
              <FloatingBadge icon={Leaf}         label="Eco-Friendly" delay={1.1} className="bottom-[28%] left-[10%]" />
              <FloatingBadge icon={Package}      label="Joining Kits" delay={1.2} className="bottom-[25%] right-[9%]" />
            </div>
          </>
        )}
      </section>

      {/* ═══════════════════════════════════════════════
          INFINITE LOGO MARQUEE
      ═══════════════════════════════════════════════ */}
      <section className="py-12 border-b border-black/5 bg-white overflow-hidden flex flex-col items-center">
        <p className="text-xs font-semibold text-[#6e6e73] uppercase tracking-widest mb-8">Trusted by industry leaders</p>
        <div className="relative w-full flex overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-r from-white to-transparent pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-l from-white to-transparent pointer-events-none" />
          <motion.div
            className="flex gap-16 items-center whitespace-nowrap pl-16"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ ease: "linear", duration: 30, repeat: Infinity }}
          >
            {[...Array(2)].map((_, i) => (
              <div key={i} className="flex gap-16 items-center">
                <span className="text-2xl font-bold text-black/20 flex items-center gap-2"><Building2 size={28}/> ACME Corp</span>
                <span className="text-2xl font-bold text-black/20 flex items-center gap-2"><Zap size={28}/> TechFlow</span>
                <span className="text-2xl font-bold text-black/20 flex items-center gap-2"><Users size={28}/> Global HR</span>
                <span className="text-2xl font-bold text-black/20 flex items-center gap-2"><Coffee size={28}/> StartupInc</span>
                <span className="text-2xl font-bold text-black/20 flex items-center gap-2"><ShieldCheck size={28}/> MedTech</span>
                <span className="text-2xl font-bold text-black/20 flex items-center gap-2"><Leaf size={28}/> EcoBrands</span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          FEATURED PRODUCTS SLIDER
      ═══════════════════════════════════════════════ */}
      {featuredProducts.length > 0 && (
        <section className="py-20 md:py-28 px-5 md:px-8 bg-[#fbfbfd]">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <p className="text-xs font-semibold uppercase tracking-widest text-[#e3231c] mb-3">Trending Now</p>
                <h2 className="text-4xl md:text-5xl font-bold text-[#1d1d1f] tracking-tight-xl">
                  Featured Products
                </h2>
              </motion.div>
              <Link
                href="/catalog"
                className="hidden md:inline-flex items-center gap-2 text-sm font-semibold text-[#e3231c] hover:text-[#b91a14] transition-colors group"
              >
                View Full Catalog
                <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {/* Draggable Slider */}
            <div className="relative w-full overflow-hidden" ref={statsRef}>
              <motion.div 
                drag="x" 
                dragConstraints={{ right: 0, left: -((featuredProducts.length * 320) - (typeof window !== 'undefined' ? window.innerWidth : 1000) + 100) }}
                className="flex gap-6 cursor-grab active:cursor-grabbing pb-12 pt-4 px-4 -mx-4"
              >
                {featuredProducts.map((product, i) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1, duration: 0.4 }}
                    className="min-w-[280px] md:min-w-[320px] bg-white rounded-3xl p-4 shadow-[0_8px_24px_rgba(0,0,0,0.04)] border border-black/5 flex flex-col group hover:shadow-[0_16px_40px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all"
                  >
                    <Link href={`/catalog/${product.slug}`} className="block flex-1 flex flex-col">
                      <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-[#f5f5f7] mb-4">
                        {product.primary_image_url ? (
                          <Image
                            src={product.primary_image_url}
                            alt={product.name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-black/10">
                            <Package size={48} />
                          </div>
                        )}
                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="bg-white/90 backdrop-blur-md text-black text-sm font-semibold px-4 py-2 rounded-full shadow-lg translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                            View Details
                          </span>
                        </div>
                      </div>
                      
                      <div className="px-2 pb-2">
                        {product.categories && (
                          <p className="text-xs font-semibold text-[#6e6e73] mb-1.5 uppercase tracking-wider">
                            {product.categories.name}
                          </p>
                        )}
                        <h3 className="text-lg font-bold text-[#1d1d1f] leading-snug line-clamp-2 mb-2 group-hover:text-[#e3231c] transition-colors">
                          {product.name}
                        </h3>
                        <div className="flex items-center justify-between mt-auto pt-2 border-t border-black/5">
                          {product.base_price && (
                            <span className="text-base font-semibold text-[#1d1d1f]">₹{product.base_price.toLocaleString('en-IN')}</span>
                          )}
                          {product.min_order_qty && (
                            <span className="text-xs text-[#6e6e73] font-medium border border-black/10 px-2 py-1 rounded-md">MOQ: {product.min_order_qty}</span>
                          )}
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            </div>
            
            <div className="flex justify-center md:hidden mt-4">
              <Link
                href="/catalog"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#e3231c]"
              >
                View Full Catalog <ChevronRight size={16} />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════
          BENTO CATEGORY GRID
      ═══════════════════════════════════════════════ */}
      <section className="py-20 md:py-28 px-5 md:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          {/* Section header */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55 }}
            className="text-center mb-14"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-[#e3231c] mb-3">Gift Categories</p>
            <h2 className="text-4xl md:text-5xl font-bold text-[#1d1d1f] tracking-tight-xl mb-4">
              17 Categories,<br className="hidden sm:block" /> Endless Impressions
            </h2>
            <p className="text-lg text-[#6e6e73] max-w-xl mx-auto">
              From premium electronics to eco-friendly kits — discover curated collections designed to impress.
            </p>
          </motion.div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5 mb-12 auto-rows-[240px]">
            {/* Main Featured Category */}
            <Link href="/catalog?category=electronics-and-mobile-accessories" className="group relative col-span-1 md:col-span-2 lg:col-span-2 row-span-2 rounded-[32px] overflow-hidden bg-[#f5f5f7] block">
              <Image 
                src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1000&auto=format&fit=crop" 
                alt="Premium Electronics" fill className="object-cover transition-transform duration-700 group-hover:scale-105" unoptimized 
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/80" />
              <div className="absolute bottom-0 left-0 p-8 w-full flex flex-col justify-end">
                <Smartphone size={32} className="text-white mb-4 opacity-80" />
                <h3 className="text-3xl font-bold text-white mb-2">Premium Electronics</h3>
                <p className="text-white/80 font-medium">Headphones, Power Banks, & Tech Gear</p>
              </div>
            </Link>

            {/* Sub Category 1 */}
            <Link href="/catalog?category=gift-sets" className="group relative col-span-1 md:col-span-1 lg:col-span-2 row-span-1 rounded-[32px] overflow-hidden bg-[#f5f5f7] block">
              <Image 
                src="https://images.unsplash.com/photo-1549465220-1a8b9238cd48?q=80&w=800&auto=format&fit=crop" 
                alt="Curated Gift Sets" fill className="object-cover transition-transform duration-700 group-hover:scale-105" unoptimized 
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 p-6 h-full flex flex-col justify-center">
                <Gift size={24} className="text-white mb-3 opacity-80" />
                <h3 className="text-2xl font-bold text-white mb-1">Curated Gift Sets</h3>
                <p className="text-white/80 text-sm font-medium max-w-[200px]">Ready-to-gift premium combos</p>
              </div>
            </Link>

            {/* Sub Category 2 */}
            <Link href="/catalog?category=flasks-sippers-mugs" className="group relative col-span-1 md:col-span-1 lg:col-span-1 row-span-1 rounded-[32px] overflow-hidden bg-[#fbfbfd] border border-black/5 block">
              <Image 
                src="https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?q=80&w=600&auto=format&fit=crop" 
                alt="Drinkware" fill className="object-cover opacity-80 transition-transform duration-700 group-hover:scale-105" unoptimized 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 p-6">
                <Coffee size={24} className="text-white mb-2" />
                <h3 className="text-xl font-bold text-white">Drinkware</h3>
              </div>
            </Link>

            {/* Sub Category 3 */}
            <Link href="/catalog?category=eco-friendly-products" className="group relative col-span-1 md:col-span-1 lg:col-span-1 row-span-1 rounded-[32px] overflow-hidden bg-[#22c55e]/10 border border-[#22c55e]/20 block">
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 group-hover:scale-110 transition-transform duration-700">
                <Leaf size={160} className="text-[#22c55e]" />
              </div>
              <div className="absolute bottom-0 left-0 p-6">
                <h3 className="text-xl font-bold text-[#1d1d1f] mb-1">Eco-Friendly</h3>
                <p className="text-[#6e6e73] text-sm font-medium">Sustainable gifting choices</p>
              </div>
            </Link>
          </div>

          <div className="flex justify-center">
            <Link
              href="/catalog"
              className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-6 py-3 text-sm font-semibold text-[#1d1d1f] hover:bg-[#f5f5f7] hover:border-black/20 transition-all duration-200"
            >
              Browse All 17 Categories
              <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      </section>



      {/* ═══════════════════════════════════════════════
          PROCESS SECTION (Sticky Scroll)
      ═══════════════════════════════════════════════ */}
      <section id="process" className="py-20 md:py-32 px-5 md:px-8 bg-[#fbfbfd]">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16 md:mb-24"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-[#e3231c] mb-3">How It Works</p>
            <h2 className="text-4xl md:text-5xl font-bold text-[#1d1d1f] tracking-tight-xl">
              Simple. Seamless. Stunning.
            </h2>
          </motion.div>

          <div className="flex flex-col md:flex-row gap-12 lg:gap-20 relative items-start">
            {/* Sticky Visual Column */}
            <div className="w-full md:w-1/2 md:sticky top-32 h-[400px] md:h-[600px] rounded-[32px] overflow-hidden bg-[#1d1d1f] shadow-2xl order-2 md:order-1 relative group">
              <Image 
                src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=1000&auto=format&fit=crop" 
                alt="Corporate Gifting Process" fill className="object-cover opacity-80 group-hover:scale-105 transition-transform duration-1000" unoptimized
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 w-full p-8">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-md px-4 py-2 text-white mb-4 border border-white/20">
                  <Star size={14} className="fill-white" />
                  <span className="text-sm font-semibold tracking-wide">End-to-End Service</span>
                </div>
                <h3 className="text-2xl md:text-3xl font-bold text-white leading-snug">
                  From concept to delivery, we handle the heavy lifting.
                </h3>
              </div>
            </div>

            {/* Scrollable Steps Column */}
            <div className="w-full md:w-1/2 flex flex-col gap-12 md:gap-32 py-10 order-1 md:order-2">
              {[
                { step: '01', title: 'Browse the Catalog', desc: 'Explore our 500+ products across 17 categories. Filter by use-case, category or budget.' },
                { step: '02', title: 'Preview Your Branding', desc: 'Use our live Branding Preview tool to see your logo and colors on products in real time before you ever speak to sales.' },
                { step: '03', title: 'Submit an Inquiry', desc: 'Click "Inquire" on any product. Fill in your details and requirements — zero commitment required.' },
                { step: '04', title: 'We Get to Work', desc: 'Our team reaches out within 24 hours with a detailed quote, timeline, and physical samples if requested.' },
              ].map((step, i) => (
                <motion.div
                  key={step.step}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ margin: "-20% 0px -20% 0px", once: false }}
                  transition={{ duration: 0.5 }}
                  className="flex flex-col gap-4"
                >
                  <span className="text-6xl md:text-8xl font-black text-black/10 leading-none -mb-8 md:-mb-12">
                    {step.step}
                  </span>
                  <h3 className="text-2xl md:text-3xl font-bold text-[#1d1d1f] relative z-10">{step.title}</h3>
                  <p className="text-lg text-[#6e6e73] leading-relaxed relative z-10">{step.desc}</p>
                  
                  {/* Connecting Arrow */}
                  {i !== 3 && (
                    <div className="hidden md:flex justify-start pt-6 -mb-6 relative z-10">
                      <ArrowDown size={32} className="text-black/15" strokeWidth={1.5} />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          BOTTOM CTA
      ═══════════════════════════════════════════════ */}
      <section className="py-20 md:py-28 px-5 md:px-8 bg-[#1d1d1f] relative overflow-hidden">
        {/* Red glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#e3231c]/25 blur-[100px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center relative z-10"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-[#e3231c] mb-4">Ready to Impress?</p>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight-xl mb-6">
            Start Building Your{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#e3231c] to-[#ff6b35]">
              Gifting Strategy
            </span>
          </h2>
          <p className="text-lg text-white/60 mb-10 max-w-xl mx-auto">
            Browse 500+ curated products and get a quote in under 24 hours. 
            No commitments, just possibilities.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/catalog"
              id="bottom-cta-catalog"
              className="group inline-flex items-center gap-2 rounded-full bg-[#e3231c] text-white px-8 py-4 text-base font-semibold hover:bg-[#ff4038] transition-all duration-200 hover:scale-[1.03] shadow-[0_4px_24px_rgba(227,35,28,0.40)]"
            >
              Explore the Catalog
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <a
              href="https://wa.me/918447334407?text=Hi!%20I'd%20like%20to%20discuss%20corporate%20gifting."
              target="_blank"
              rel="noopener noreferrer"
              id="bottom-cta-whatsapp"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 text-white/90 px-8 py-4 text-base font-semibold hover:bg-white/8 transition-all duration-200"
            >
              WhatsApp Us
            </a>
          </div>

          {/* Client logos / social proof strip */}
          <div className="mt-14 pt-10 border-t border-white/10">
            <p className="text-xs text-white/40 uppercase tracking-widest mb-6">Trusted by teams at</p>
            <div className="flex flex-wrap items-center justify-center gap-8">
              {['Enterprise Corp', 'StartupXYZ', 'MedTech Co', 'RetailBrand'].map((name) => (
                <div key={name} className="flex items-center gap-2">
                  <Building2 size={16} className="text-white/25" />
                  <span className="text-sm text-white/30 font-medium">{name}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>
    </main>
  )
}

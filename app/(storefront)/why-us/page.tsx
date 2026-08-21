'use client'

import { motion } from 'framer-motion'
import { BadgeCheck, Zap, Users, Clock, ArrowRight } from 'lucide-react'
import Link from 'next/link'

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

export default function WhyUsPage() {
  return (
    <main className="min-h-screen bg-[#fbfbfd] pt-32 pb-20 px-5 md:px-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="text-center mb-14"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-[#e3231c] mb-3">Why Choose Us</p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#1d1d1f] tracking-tight-xl">
            The Outflank Difference
          </h1>
          <p className="text-lg text-[#6e6e73] max-w-2xl mx-auto mt-6 leading-relaxed">
            We don't just supply products; we engineer gifting experiences. Discover why top enterprises trust us with their corporate gifting needs.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 mt-16">
          {whyItems.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="bg-white rounded-3xl p-8 border border-black/6 hover:border-[#e3231c]/20 hover:shadow-[0_8px_32px_rgba(227,35,28,0.06)] transition-all duration-300 group"
            >
              <div className="w-14 h-14 rounded-2xl bg-[#e3231c]/8 flex items-center justify-center mb-6 group-hover:bg-[#e3231c]/15 transition-colors">
                <item.icon size={26} className="text-[#e3231c]" />
              </div>
              <h3 className="text-xl font-semibold text-[#1d1d1f] mb-3">{item.title}</h3>
              <p className="text-[#6e6e73] leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
        
        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="mt-20 text-center"
        >
          <Link
            href="/catalog"
            className="inline-flex items-center gap-2 rounded-full bg-[#1d1d1f] text-white px-8 py-4 text-base font-semibold hover:bg-black transition-all duration-200 hover:scale-[1.03] shadow-lg shadow-black/10"
          >
            Explore the Catalog
            <ArrowRight size={16} />
          </Link>
        </motion.div>
      </div>
    </main>
  )
}

import Link from 'next/link'
import Image from 'next/image'
import { Mail, Phone, MapPin, ArrowUpRight } from 'lucide-react'

const catalogLinks = [
  { href: '/catalog?category=electronics-and-mobile-accessories', label: 'Electronics' },
  { href: '/catalog?category=employee-joining-kits', label: 'Joining Kits' },
  { href: '/catalog?category=flasks-sippers-mugs', label: 'Drinkware' },
  { href: '/catalog?category=gift-sets', label: 'Gift Sets' },
  { href: '/catalog?category=eco-friendly-products', label: 'Eco-Friendly' },
]

export default function GiftingFooter() {
  return (
    <footer className="bg-[#1d1d1f] text-white">
      {/* Main footer content */}
      <div className="max-w-7xl mx-auto px-5 md:px-8 py-16 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand column */}
          <div className="lg:col-span-2">
            <Image
              src="/logo/outflank-logo.png"
              alt="Outflank"
              width={140}
              height={56}
              className="h-12 w-auto object-contain mb-5 brightness-0 invert"
            />
            <p className="text-[#aeaeb2] text-sm leading-relaxed max-w-xs mb-6">
              Premium B2B corporate gifting solutions. Elevate your brand with curated, 
              customizable gifts that leave a lasting impression.
            </p>
            <div className="flex flex-col gap-3">
              <a href="mailto:hello@outflank.in" className="flex items-center gap-2.5 text-sm text-[#aeaeb2] hover:text-white transition-colors group">
                <Mail size={14} className="text-[#e3231c]" />
                hello@outflank.in
              </a>
              <a href="tel:+918447334407" className="flex items-center gap-2.5 text-sm text-[#aeaeb2] hover:text-white transition-colors">
                <Phone size={14} className="text-[#e3231c]" />
                +91 84473 34407
              </a>
              <span className="flex items-center gap-2.5 text-sm text-[#aeaeb2]">
                <MapPin size={14} className="text-[#e3231c]" />
                India · Serving Globally
              </span>
            </div>
          </div>

          {/* Catalog links */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-[#6e6e73] mb-5">
              Catalog
            </h4>
            <ul className="flex flex-col gap-3">
              {catalogLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-[#aeaeb2] hover:text-white transition-colors flex items-center gap-1 group"
                  >
                    {link.label}
                    <ArrowUpRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/catalog" className="text-sm text-[#e3231c] hover:text-[#ff4038] font-medium transition-colors">
                  View All Categories →
                </Link>
              </li>
            </ul>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-[#6e6e73] mb-5">
              Company
            </h4>
            <ul className="flex flex-col gap-3">
              {[
                { href: '/branding', label: 'Branding Preview' },
                { href: '/#why-outflank', label: 'Why Outflank' },
                { href: '/#process', label: 'Our Process' },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-[#aeaeb2] hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/8">
        <div className="max-w-7xl mx-auto px-5 md:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-[#6e6e73]">
            © {new Date().getFullYear()} Outflank. All rights reserved.
          </p>
          <p className="text-xs text-[#6e6e73]">
            <em>get the better of</em>
          </p>
        </div>
      </div>
    </footer>
  )
}

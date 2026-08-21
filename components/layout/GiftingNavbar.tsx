'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Menu, X, ChevronRight } from 'lucide-react'

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/catalog', label: 'Products' },
  { href: '/branding', label: 'Branding Preview' },
  { href: '/why-us', label: 'Why Us' },
]

export default function GiftingNavbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <header className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4 sm:px-6 pointer-events-none">
        <div
          className={`mx-auto pointer-events-auto transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] rounded-full flex items-center justify-between ${
            scrolled
              ? 'w-[90%] max-w-[1000px] px-3 py-2 bg-white/60 backdrop-blur-3xl saturate-200 border border-black/10 shadow-[0_8px_32px_rgba(0,0,0,0.08)]'
              : 'w-[95%] max-w-[1100px] px-4 py-2.5 bg-white/60 backdrop-blur-3xl saturate-200 border border-black/10 shadow-[0_8px_32px_rgba(0,0,0,0.08)]'
          }`}
        >
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 pl-2">
            <Image
              src="/logo/outflank-logo.png"
              alt="Outflank"
              width={160}
              height={64}
              className="h-11 md:h-12 w-auto object-contain"
              priority
            />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href || (link.href !== '/' && !link.href.includes('#') && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-5 py-2 text-[14px] font-semibold transition-all duration-200 rounded-full ${
                    isActive
                      ? 'bg-white text-[#e3231c] shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
                      : 'text-[#1d1d1f] hover:text-black'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center pr-1">
            <Link
              href="/catalog"
              className="inline-flex items-center rounded-full px-6 py-2.5 text-[14px] font-medium transition-all duration-200 bg-[#0B1120] text-white hover:bg-black"
              id="navbar-cta-btn"
            >
              Contact Us
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-full text-slate-800 hover:bg-white/50 transition-colors mr-1"
            aria-label="Toggle menu"
            id="navbar-mobile-toggle"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute top-16 left-0 right-0 bg-white border-b border-black/8 shadow-xl p-4 flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="px-4 py-3 text-base font-medium text-[#1d1d1f] rounded-xl hover:bg-[#f5f5f7] transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/catalog"
              onClick={() => setMobileOpen(false)}
              className="mt-2 flex items-center justify-center gap-2 rounded-full bg-[#e3231c] text-white px-5 py-3 font-semibold text-sm"
            >
              View Products <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      )}

    </>
  )
}

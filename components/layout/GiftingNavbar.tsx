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

          {/* Mobile CTA (optional) or just rely on bottom nav */}
        </div>
      </header>
    </>
  )
}

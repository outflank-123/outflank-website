'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, LayoutGrid, Info, ShoppingCart } from 'lucide-react'
import { useCartStore } from '@/lib/store/useCartStore'
import { useState, useEffect } from 'react'

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/products', label: 'Catalog', icon: LayoutGrid },
  { href: '/why-us', label: 'Why Us', icon: Info },
]

export default function BottomNav() {
  const pathname = usePathname()
  const { items, setIsCartOpen } = useCartStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white/80 backdrop-blur-md border-t border-gray-200/50 pb-safe">
      <nav className="flex justify-around items-center h-16 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                isActive ? 'text-black' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <item.icon className={`w-6 h-6 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
            </Link>
          )
        })}
        
        {/* Cart Button */}
        <button
          onClick={() => setIsCartOpen(true)}
          className="relative flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors text-gray-400 hover:text-gray-600"
        >
          <div className="relative">
            <ShoppingCart className="w-6 h-6 stroke-2" />
            {mounted && items.length > 0 && (
              <span className="absolute -top-1 -right-2 w-4 h-4 bg-[#e3231c] text-white text-[9px] font-bold flex items-center justify-center rounded-full border border-white">
                {items.length}
              </span>
            )}
          </div>
          <span className="text-[10px] font-medium leading-none">Cart</span>
        </button>
      </nav>
    </div>
  )
}

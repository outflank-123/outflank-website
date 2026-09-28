'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Search } from 'lucide-react'
import { motion } from 'framer-motion'

export default function LiveSearch({ initialQuery = '' }: { initialQuery?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(initialQuery)
  const [mounted, setMounted] = useState(false)
  const [isFocused, setIsFocused] = useState(false)

  // Avoid running effect on initial mount
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const timer = setTimeout(() => {
      const currentQ = searchParams.get('q') || ''
      if (currentQ === query) return // Prevent infinite loop

      const params = new URLSearchParams(searchParams.toString())
      if (query) {
        params.set('q', query)
      } else {
        params.delete('q')
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    }, 300) // 300ms debounce

    return () => clearTimeout(timer)
  }, [query, pathname, router, searchParams, mounted])

  return (
    <motion.div 
      initial={false}
      animate={{ width: isFocused ? '100%' : '100%' }}
      className="relative w-full lg:min-w-[320px]"
    >
      <div className={`
        relative flex items-center w-full transition-all duration-300
        ${isFocused ? 'ring-2 ring-[#e3231c]/20' : ''}
        rounded-xl overflow-hidden bg-white border border-black/10 hover:border-black/20
      `}>
        <div className="pl-3.5 flex items-center justify-center shrink-0 text-[#86868b]">
          <Search size={16} className={isFocused ? "text-[#e3231c] transition-colors" : "transition-colors"} />
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Search corporate gifts..."
          className="w-full py-2.5 px-3 text-sm text-[#1d1d1f] placeholder-[#86868b] bg-transparent focus:outline-none"
        />
        <div className="pr-3 flex items-center shrink-0 pointer-events-none">
          <kbd className="hidden sm:inline-flex items-center gap-1 font-sans text-[10px] font-medium text-[#86868b] bg-[#f5f5f7] px-1.5 py-0.5 rounded border border-black/5">
            <span className="text-xs">⌘</span>K
          </kbd>
        </div>
      </div>
    </motion.div>
  )
}

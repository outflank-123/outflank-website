'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Search } from 'lucide-react'

export default function LiveSearch({ initialQuery = '' }: { initialQuery?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(initialQuery)
  const [mounted, setMounted] = useState(false)

  // Avoid running effect on initial mount
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const timer = setTimeout(() => {
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
    <div className="relative w-full sm:w-auto">
      <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#aeaeb2]" />
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search products..."
        className="pl-9 pr-4 py-2 rounded-full border border-black/10 bg-white text-sm text-[#1d1d1f] placeholder-[#aeaeb2] focus:outline-none focus:border-[#e3231c] transition-colors w-full sm:w-56 md:w-64 shadow-xs"
      />
    </div>
  )
}

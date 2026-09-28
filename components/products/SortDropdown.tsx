'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useState, useEffect, useTransition, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { startNavigationProgress } from '@/components/layout/NavigationProgressBar'
import { ChevronDown, Check, ArrowDownAZ } from 'lucide-react'

const SORT_OPTIONS = [
  { id: 'featured', label: 'Featured' },
  { id: 'newest', label: 'Newest Arrivals' },
  { id: 'price_asc', label: 'Price: Low to High' },
  { id: 'price_desc', label: 'Price: High to Low' },
]

export default function SortDropdown() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeSort = searchParams.get('sort') ?? 'featured'

  const [optimisticSort, setOptimisticSort] = useState(activeSort)
  const [, startTransition] = useTransition()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setOptimisticSort(activeSort)
  }, [activeSort])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const setSort = useCallback(
    (sortId: string) => {
      setOptimisticSort(sortId)
      setIsOpen(false)
      startNavigationProgress()

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('category-switch-start')) // Reuse same skeleton trigger
      }

      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString())
        if (sortId && sortId !== 'featured') {
          params.set('sort', sortId)
        } else {
          params.delete('sort')
        }
        params.delete('page')
        router.push(`${pathname}?${params.toString()}`, { scroll: false })
      })
    },
    [router, pathname, searchParams]
  )

  const activeSortName = SORT_OPTIONS.find(s => s.id === optimisticSort)?.label || 'Featured'

  return (
    <div className="relative z-20 w-full sm:w-48 shrink-0" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-white border border-black/10 hover:border-black/25 text-[#1d1d1f] text-sm font-medium px-4 py-2.5 rounded-xl shadow-xs transition-colors"
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <ArrowDownAZ size={16} className="text-[#86868b] shrink-0" />
          <span className="truncate">{activeSortName}</span>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={16} className="text-[#6e6e73]" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-black/5 py-2 max-h-[60vh] overflow-y-auto no-scrollbar"
          >
            {SORT_OPTIONS.map((option) => (
              <button
                key={option.id}
                onClick={() => setSort(option.id)}
                className={`w-full text-left flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                  optimisticSort === option.id 
                    ? 'bg-[#f5f5f7] text-[#e3231c] font-semibold' 
                    : 'text-[#1d1d1f] hover:bg-[#fbfbfd]'
                }`}
              >
                <span className="truncate">{option.label}</span>
                {optimisticSort === option.id && <Check size={16} className="shrink-0 text-[#e3231c]" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

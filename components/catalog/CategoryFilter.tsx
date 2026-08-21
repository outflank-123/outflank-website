'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import { motion } from 'framer-motion'
import { SlidersHorizontal } from 'lucide-react'

interface Category {
  id: string
  name: string
  slug: string
}

interface CategoryFilterProps {
  categories: Category[]
}

export default function CategoryFilter({ categories }: CategoryFilterProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeSlug = searchParams.get('category') ?? ''

  const setCategory = useCallback(
    (slug: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (slug) {
        params.set('category', slug)
      } else {
        params.delete('category')
      }
      params.delete('page') // reset pagination
      router.push(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [router, pathname, searchParams]
  )

  return (
    <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap scroll-smooth pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <SlidersHorizontal size={14} className="text-[#aeaeb2] shrink-0" />

      {/* "All" pill */}
      <FilterPill
        label="All"
        active={!activeSlug}
        onClick={() => setCategory('')}
        id="filter-all"
      />

      {categories.map((cat) => (
        <FilterPill
          key={cat.id}
          label={cat.name}
          active={activeSlug === cat.slug}
          onClick={() => setCategory(cat.slug)}
          id={`filter-${cat.slug}`}
        />
      ))}
    </div>
  )
}

function FilterPill({
  label,
  active,
  onClick,
  id,
}: {
  label: string
  active: boolean
  onClick: () => void
  id: string
}) {
  return (
    <motion.button
      layout
      id={id}
      onClick={onClick}
      whileTap={{ scale: 0.96 }}
      className={`relative rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-200 ${
        active
          ? 'bg-[#e3231c] text-white shadow-[0_2px_8px_rgba(227,35,28,0.30)]'
          : 'bg-white border border-black/10 text-[#6e6e73] hover:border-black/20 hover:text-[#1d1d1f]'
      }`}
    >
      {label}
    </motion.button>
  )
}

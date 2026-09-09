'use client'

import { useSearchParams } from 'next/navigation'

interface Category {
  id: string
  name: string
  slug: string
}

interface CategoryHeaderProps {
  categories: Category[]
  totalProductsCount: number
}

export default function CategoryHeader({ categories, totalProductsCount }: CategoryHeaderProps) {
  const searchParams = useSearchParams()
  const activeSlug = searchParams.get('category') ?? ''

  const activeCategory = categories.find((c) => c.slug === activeSlug)
  const title = activeCategory ? activeCategory.name : 'All Products'

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-[#e3231c] mb-2">
        Product Catalog
      </p>
      <h1 className="text-4xl md:text-5xl font-bold text-[#1d1d1f] tracking-tight mb-3 transition-all duration-200">
        {title}
      </h1>
      <p className="text-[#6e6e73] mb-8 max-w-xl">
        {totalProductsCount} products{activeCategory ? ` in ${activeCategory.name}` : ''}. Click &quot;Inquire&quot; on any product to request a quote.
      </p>
    </div>
  )
}

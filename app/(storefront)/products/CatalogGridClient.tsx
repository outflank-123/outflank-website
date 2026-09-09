'use client'

import { useState, useEffect, useCallback } from 'react'
import { useInView } from 'react-intersection-observer'
import ProductCard, { Product } from '@/components/catalog/ProductCard'
import { fetchProductsPage } from '@/app/actions/catalog'
import { Loader2 } from 'lucide-react'

interface CatalogGridClientProps {
  initialProducts: Product[]
  categoryId?: string
  searchQuery?: string
  totalCount: number
}

const PAGE_SIZE = 24

export default function CatalogGridClient({
  initialProducts,
  categoryId,
  searchQuery,
  totalCount,
}: CatalogGridClientProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(initialProducts.length >= PAGE_SIZE)

  const { ref, inView } = useInView({
    threshold: 0,
    rootMargin: '400px',
  })

  const loadMoreProducts = useCallback(async () => {
    if (loading || !hasMore) return

    setLoading(true)
    try {
      const nextProducts = await fetchProductsPage(page, categoryId, searchQuery)
      
      if (nextProducts.length > 0) {
        setProducts((prev) => [...prev, ...nextProducts])
        setPage((prev) => prev + 1)
      }
      
      if (nextProducts.length < PAGE_SIZE) {
        setHasMore(false)
      }
    } catch (error) {
      console.error('Error loading more products:', error)
    } finally {
      setLoading(false)
    }
  }, [page, categoryId, searchQuery, loading, hasMore])

  useEffect(() => {
    if (inView) {
      loadMoreProducts()
    }
  }, [inView, loadMoreProducts])

  // Reset when initial products change (e.g. search or category changes)
  useEffect(() => {
    setProducts(initialProducts)
    setPage(1)
    setHasMore(initialProducts.length >= PAGE_SIZE)
  }, [initialProducts])

  if (products.length === 0) {
    return (
      <div className="py-20 text-center bg-white rounded-[32px] border border-[#f0f0f2]">
        <h3 className="text-xl font-semibold text-[#1d1d1f] mb-2">No products found</h3>
        <p className="text-[#6e6e73]">
          We couldn&apos;t find any products matching your current filters.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {products.map((product, i) => (
          <ProductCard key={`${product.id}-${i}`} product={product} index={i} />
        ))}
      </div>

      {hasMore && (
        <div ref={ref} className="py-12 flex justify-center items-center">
          <Loader2 className="animate-spin text-[#aeaeb2]" size={32} />
        </div>
      )}

      {!hasMore && products.length > 0 && (
        <div className="py-12 flex flex-col items-center justify-center text-center">
          <p className="text-[#86868b] text-sm font-medium">You&apos;ve reached the end</p>
          <p className="text-[#aeaeb2] text-xs mt-1">Showing all {products.length} products</p>
        </div>
      )}
    </>
  )
}

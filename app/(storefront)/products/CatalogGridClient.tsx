'use client'

import { useState, useEffect, useRef } from 'react'
import { useInView } from 'react-intersection-observer'
import ProductCard, { Product } from '@/components/products/ProductCard'
import { fetchProductsPage } from '@/app/actions/catalog'
import { Loader2 } from 'lucide-react'

interface CatalogGridClientProps {
  initialProducts: Product[]
  categoryId?: string
  searchQuery?: string
  totalCount: number
}

const PAGE_SIZE = 36

export function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-3xl border border-[#f0f0f2] p-3 md:p-4 flex flex-col gap-3 shadow-xs"
        >
          {/* Image Skeleton */}
          <div className="w-full aspect-square bg-gray-100 rounded-2xl animate-pulse" />
          {/* Text Skeletons */}
          <div className="space-y-2 mt-1">
            <div className="h-4 w-3/4 bg-gray-200 rounded-md animate-pulse" />
            <div className="h-3 w-1/2 bg-gray-100 rounded-md animate-pulse" />
          </div>
          {/* Footer Row Skeleton */}
          <div className="mt-auto pt-3 border-t border-black/5 flex items-center justify-between">
            <div className="h-3 w-16 bg-gray-100 rounded-md animate-pulse" />
            <div className="h-7 w-20 bg-gray-200 rounded-full animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function CatalogGridClient({
  initialProducts,
  categoryId,
  searchQuery,
  totalCount,
}: CatalogGridClientProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [isSwitchingCategory, setIsSwitchingCategory] = useState(false)
  const [hasMore, setHasMore] = useState(initialProducts.length < totalCount)
  const isLoadingRef = useRef(false)

  const { ref, inView } = useInView({
    threshold: 0,
    rootMargin: '250px',
  })

  // Listen for category switch start to show instant grid skeleton
  useEffect(() => {
    const handleSwitchStart = () => {
      setIsSwitchingCategory(true)
    }
    window.addEventListener('category-switch-start', handleSwitchStart)
    return () => window.removeEventListener('category-switch-start', handleSwitchStart)
  }, [])

  // Sync state when new initialProducts arrive from server
  useEffect(() => {
    setProducts(initialProducts)
    setIsSwitchingCategory(false)
    setPage(1)
    setHasMore(initialProducts.length < totalCount)
    isLoadingRef.current = false
    setLoading(false)
  }, [initialProducts, totalCount])

  const loadMore = () => {
    if (!hasMore || isLoadingRef.current || isSwitchingCategory) return

    isLoadingRef.current = true
    setLoading(true)

    fetchProductsPage(page, categoryId, searchQuery)
      .then((nextProducts) => {
        if (nextProducts.length > 0) {
          setProducts((prev) => {
            const existingIds = new Set(prev.map(p => p.id))
            const filtered = nextProducts.filter(p => !existingIds.has(p.id))
            const updated = [...prev, ...filtered]
            if (updated.length >= totalCount || nextProducts.length < PAGE_SIZE) {
              setHasMore(false)
            }
            return updated
          })
          setPage((prev) => prev + 1)
        } else {
          setHasMore(false)
        }
      })
      .catch((error) => {
        console.error('Error fetching next products page:', error)
      })
      .finally(() => {
        isLoadingRef.current = false
        setLoading(false)
      })
  }

  // Infinite scroll trigger
  useEffect(() => {
    if (inView && hasMore && !isLoadingRef.current && !isSwitchingCategory) {
      loadMore()
    }
  }, [inView, hasMore, isSwitchingCategory])

  if (isSwitchingCategory) {
    return <ProductGridSkeleton />
  }

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
        <div ref={ref} className="py-12 flex flex-col justify-center items-center gap-3">
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="px-8 py-3.5 rounded-full bg-white border border-black/10 hover:border-black/30 hover:bg-[#f5f5f7] text-[#1d1d1f] font-semibold text-sm shadow-sm hover:shadow transition-all flex items-center gap-2.5 cursor-pointer disabled:opacity-50 group"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin text-[#e3231c]" size={18} />
                <span>Loading more products...</span>
              </>
            ) : (
              <>
                <span>Load More Products</span>
                <span className="text-xs bg-[#f5f5f7] px-2.5 py-0.5 rounded-full text-[#86868b] border border-black/5 font-medium group-hover:bg-white transition-colors">
                  {products.length} of {totalCount}
                </span>
              </>
            )}
          </button>
          <span className="text-xs text-[#86868b]">Scroll or click button to load more</span>
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

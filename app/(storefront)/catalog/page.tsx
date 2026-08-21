import { Suspense } from 'react'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import ProductCard from '@/components/catalog/ProductCard'
import CategoryFilter from '@/components/catalog/CategoryFilter'
import { Search, Package } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Product Catalog | Outflank Corporate Gifting',
  description: 'Browse 500+ premium corporate gifts across 17 categories. Custom branding available. MOQ from 50 units.',
}

interface CatalogPageProps {
  searchParams: Promise<{ category?: string; q?: string }>
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const { category, q } = await searchParams
  const supabase = await createClient()

  // Fetch categories
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, slug')
    .order('sort_order', { ascending: true })

  // Build products query
  let query = supabase
    .from('products')
    .select(`
      id, name, slug, short_desc, base_price, min_order_qty,
      color_variants, primary_image_url,
      categories ( name, slug )
    `)
    .eq('is_active', true)
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })

  if (category) {
    // Join via category slug
    const { data: cat } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', category)
      .single()
    if (cat?.id) {
      query = query.eq('category_id', cat.id)
    }
  }

  if (q) {
    query = query.ilike('name', `%${q}%`)
  }

  const { data: products } = await query

  const activeCategory = categories?.find((c) => c.slug === category)

  return (
    <main className="min-h-screen bg-[#fbfbfd]">
      {/* Header */}
      <section className="px-5 md:px-8 pt-32 pb-10 md:pt-36 md:pb-14">
        <div className="max-w-7xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#e3231c] mb-2">Product Catalog</p>
          <h1 className="text-4xl md:text-5xl font-bold text-[#1d1d1f] tracking-tight mb-3">
            {activeCategory ? activeCategory.name : 'All Products'}
          </h1>
          <p className="text-[#6e6e73] mb-8 max-w-xl">
            {products?.length ?? 0} products{activeCategory ? ` in ${activeCategory.name}` : ''}.
            Click &quot;Inquire&quot; on any product to request a quote.
          </p>

          {/* Filters row */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6 justify-between mt-8">
            <div className="flex-1 w-full overflow-hidden">
              <Suspense fallback={<div className="h-8 w-64 rounded-full bg-[#f5f5f7] animate-pulse" />}>
                <CategoryFilter categories={categories ?? []} />
              </Suspense>
            </div>

            {/* Search */}
            <form method="GET" className="flex items-center gap-2 shrink-0">
              {category && <input type="hidden" name="category" value={category} />}
              <div className="relative">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#aeaeb2]" />
                <input
                  id="catalog-search"
                  type="search"
                  name="q"
                  defaultValue={q}
                  placeholder="Search products..."
                  className="pl-9 pr-4 py-2 rounded-full border border-black/10 bg-white text-sm text-[#1d1d1f] placeholder-[#aeaeb2] focus:outline-none focus:border-[#e3231c] transition-colors w-48 md:w-64"
                />
              </div>
              <button
                type="submit"
                id="catalog-search-submit"
                className="rounded-full bg-[#1d1d1f] text-white px-4 py-2 text-xs font-semibold hover:bg-[#3a3a3c] transition-colors"
              >
                Search
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Products grid */}
      <section className="max-w-7xl mx-auto px-5 md:px-8 py-10 md:py-14">
        {products && products.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 md:gap-8">
            {products.map((product, i) => (
          <ProductCard key={product.id} product={{
              ...product,
              categories: Array.isArray(product.categories)
                ? (product.categories[0] ?? null)
                : (product.categories ?? null),
            }} index={i} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-20 h-20 rounded-full bg-[#f5f5f7] flex items-center justify-center mb-5">
              <Package size={32} className="text-[#aeaeb2]" />
            </div>
            <h2 className="text-xl font-semibold text-[#1d1d1f] mb-2">No products found</h2>
            <p className="text-[#6e6e73] text-sm mb-6">
              {q
                ? `No results for "${q}". Try a different search term.`
                : 'No products in this category yet. Check back soon!'}
            </p>
            <a
              href="/catalog"
              className="rounded-full bg-[#e3231c] text-white px-6 py-2.5 text-sm font-semibold hover:bg-[#b91a14] transition-colors"
            >
              View All Products
            </a>
          </div>
        )}
      </section>
    </main>
  )
}

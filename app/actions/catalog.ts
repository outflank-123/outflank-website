'use server'

import { createClient } from '@/lib/supabase/server'
import { Product } from '@/components/products/ProductCard'

const PAGE_SIZE = 24

export async function fetchProductsPage(
  page: number,
  categoryId?: string,
  searchQuery?: string
): Promise<Product[]> {
  const supabase = await createClient()

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

  if (categoryId) {
    query = query.eq('category_id', categoryId)
  }

  if (searchQuery) {
    query = query.ilike('name', `%${searchQuery}%`)
  }

  const from = page * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  query = query.range(from, to)

  const { data, error } = await query

  if (error) {
    console.error('Error fetching products page:', error)
    return []
  }

  return (data as unknown) as Product[]
}

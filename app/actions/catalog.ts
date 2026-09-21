'use server'

import { createClient } from '@/lib/supabase/server'
import { Product } from '@/components/products/ProductCard'

const PAGE_SIZE = 36

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
      color_variants, primary_image_url, branding_config, is_retail, is_customizable,
      categories ( name, slug )
    `)
    .eq('is_active', true)
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })
    .order('id', { ascending: true }) // Tie-breaker to prevent pagination duplicates

  if (categoryId) {
    query = query.eq('category_id', categoryId)
  }

  if (searchQuery) {
    query = query.ilike('name', `%${searchQuery}%`)
  }

  const from = page * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  query = query.range(from, to)

  let { data: initialData, error } = await query
  let data: any = initialData

  if (error && error.code === '42703') {
    let fallbackQuery = supabase
      .from('products')
      .select(`
        id, name, slug, short_desc, base_price, min_order_qty,
        color_variants, primary_image_url, branding_config,
        categories ( name, slug )
      `)
      .eq('is_active', true)
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false })
      .order('id', { ascending: true })

    if (categoryId) {
      fallbackQuery = fallbackQuery.eq('category_id', categoryId)
    }
    if (searchQuery) {
      fallbackQuery = fallbackQuery.ilike('name', `%${searchQuery}%`)
    }
    fallbackQuery = fallbackQuery.range(from, to)
    const fallbackRes = await fallbackQuery
    data = fallbackRes.data
    error = fallbackRes.error
  }

  if (error) {
    console.error('Error fetching products page:', error)
    return []
  }

  return (data || []).map((p: any) => ({
    ...p,
    is_retail: p.is_retail !== undefined ? p.is_retail : (p.branding_config?._is_retail ?? true),
  })) as Product[]
}

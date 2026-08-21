import { createClient } from '@/lib/supabase/server'
import LandingClient from './LandingClient'

export const revalidate = 60 // Revalidate every minute

export default async function StorefrontPage() {
  const supabase = await createClient()
  
  const [bannersResponse, productsResponse] = await Promise.all([
    supabase
      .from('banners')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    supabase
      .from('products')
      .select(`
        id, name, slug, base_price, min_order_qty, primary_image_url,
        categories ( name, slug )
      `)
      .eq('is_featured', true)
      .limit(8)
  ])

  if (bannersResponse.error) console.error('Error fetching banners:', bannersResponse.error)
  if (productsResponse.error) console.error('Error fetching featured products:', productsResponse.error)

  const featuredProducts = (productsResponse.data || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    base_price: p.base_price,
    min_order_qty: p.min_order_qty,
    primary_image_url: p.primary_image_url,
    categories: Array.isArray(p.categories) ? p.categories[0] : p.categories
  }))

  return (
    <LandingClient 
      banners={bannersResponse.data || []} 
      featuredProducts={featuredProducts}
    />
  )
}

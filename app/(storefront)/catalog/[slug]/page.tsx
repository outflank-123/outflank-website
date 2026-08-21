import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import ProductDetailClient from './ProductDetailClient'

interface ProductPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data: product } = await supabase
    .from('products')
    .select('name, short_desc')
    .eq('slug', slug)
    .single()

  if (!product) return { title: 'Product Not Found | Outflank' }

  return {
    title: `${product.name} | Outflank Corporate Gifting`,
    description: product.short_desc ?? `Premium corporate gift: ${product.name}. Custom branding available. Request a quote from Outflank.`,
  }
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: product } = await supabase
    .from('products')
    .select(`
      id, name, slug, description, short_desc, base_price,
      min_order_qty, lead_time_days, is_featured, tags,
      color_variants, primary_image_url, image_gallery, source_pdf,
      is_customizable, branding_config,
      categories ( id, name, slug )
    `)
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (!product) notFound()

  return (
    <ProductDetailClient
      product={{
        ...product,
        categories: Array.isArray(product.categories)
          ? (product.categories[0] ?? null)
          : (product.categories ?? null),
      }}
    />
  )
}

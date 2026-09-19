import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import CustomizeStudioClient from './CustomizeStudioClient'

interface CustomizePageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: CustomizePageProps): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data: product } = await supabase
    .from('products')
    .select('name, short_desc')
    .eq('slug', slug)
    .single()

  if (!product) return { title: 'Customize Product | Outflank' }

  return {
    title: `Customize ${product.name} | Outflank Studio`,
    description: `Personalize ${product.name} with your custom company logo, brand text, and colors. Real-time preview and instant ordering.`,
  }
}

export default async function CustomizePage({ params }: CustomizePageProps) {
  const { slug } = await params
  const supabase = await createClient()

  let { data, error } = await supabase
    .from('products')
    .select(`
      id, name, slug, description, short_desc, base_price,
      min_order_qty, lead_time_days, is_featured, tags,
      color_variants, primary_image_url, image_gallery, source_pdf,
      is_customizable, branding_config, is_retail,
      categories ( id, name, slug )
    `)
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  let product: any = data

  if (error && error.code === '42703') {
    const fallback = await supabase
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
    product = fallback.data
  }

  if (!product) {
    notFound()
  }

  return <CustomizeStudioClient product={product} />
}

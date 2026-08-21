'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// --- Categories ---

export async function createCategory(data: any) {
  const supabase = await createClient()
  const { error } = await supabase.from('categories').insert([data])
  if (error) throw new Error(error.message)
  revalidatePath('/admin/categories')
  return { success: true }
}

export async function updateCategory(id: string, data: any) {
  const supabase = await createClient()
  const { error } = await supabase.from('categories').update(data).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/categories')
  return { success: true }
}

export async function deleteCategory(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/categories')
  return { success: true }
}

// --- Products ---

export async function createProduct(data: any) {
  const supabase = await createClient()
  const { error } = await supabase.from('products').insert([data])
  if (error) throw new Error(error.message)
  revalidatePath('/admin/products')
  revalidatePath('/catalog')
  return { success: true }
}

export async function updateProduct(id: string, data: any) {
  const supabase = await createClient()
  const { error } = await supabase.from('products').update(data).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/products')
  revalidatePath('/catalog')
  revalidatePath(`/catalog/${data.slug}`)
  return { success: true }
}

export async function deleteProduct(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/products')
  revalidatePath('/admin/products')
  revalidatePath('/catalog')
  return { success: true }
}

export async function uploadProductImage(formData: FormData) {
  const file = formData.get('file') as File
  if (!file) throw new Error('No file provided')

  const supabase = await createClient()
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const ext = file.name.split('.').pop()
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`

  const { data, error } = await supabase.storage
    .from('product-images')
    .upload(fileName, buffer, {
      contentType: file.type,
      upsert: false
    })

  if (error) {
    console.error('Upload Error:', error)
    throw new Error(error.message)
  }

  const { data: publicUrlData } = supabase.storage
    .from('product-images')
    .getPublicUrl(data.path)

  return publicUrlData.publicUrl
}

// --- Banners ---

export async function createBanner(data: any) {
  const supabase = await createClient()
  const { error } = await supabase.from('banners').insert([data])
  if (error) throw new Error(error.message)
  revalidatePath('/admin/banners')
  revalidatePath('/')
  return { success: true }
}

export async function updateBanner(id: string, data: any) {
  const supabase = await createClient()
  const { error } = await supabase.from('banners').update(data).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/banners')
  revalidatePath('/')
  return { success: true }
}

export async function deleteBanner(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('banners').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/banners')
  revalidatePath('/')
  return { success: true }
}

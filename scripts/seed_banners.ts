import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const envPath = path.resolve(process.cwd(), '.env')
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8')
  envFile.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
    if (match) {
      const key = match[1]
      let value = match[2] || ''
      if (value.length > 0 && value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') {
        value = value.replace(/\\n/gm, '\n')
      }
      value = value.replace(/(^['"]|['"]$)/g, '').trim()
      process.env[key] = value
    }
  })
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const bannersToAdd = [
  {
    title: 'Gifts That Inspire Success',
    cta_text: 'Explore Corporate Gifts',
    cta_link: '/catalog',
    url: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?q=80&w=2000&auto=format&fit=crop',
    sort_order: 10
  },
  {
    title: 'Elevate Your Workspace',
    cta_text: 'View Tech & Electronics',
    cta_link: '/catalog?category=electronics-and-mobile-accessories',
    url: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=2000&auto=format&fit=crop',
    sort_order: 20
  },
  {
    title: 'Celebrate Every Milestone',
    cta_text: 'Browse Gift Sets',
    cta_link: '/catalog?category=gift-sets',
    url: 'https://images.unsplash.com/photo-1513885535851-86f1e1d0dfdf?q=80&w=2000&auto=format&fit=crop',
    sort_order: 30
  }
]

async function seedBanners() {
  console.log('Starting banner seeding...')

  // Step 0: Check if banners table exists
  const { error: checkError } = await supabase.from('banners').select('id').limit(1)
  if (checkError && checkError.code === '42P01') {
    console.error('\n❌ ERROR: The "banners" table does not exist!')
    console.error('Please run the SQL command provided in the walkthrough to create the table first.')
    process.exit(1)
  }

  // Clear existing banners
  console.log('Clearing existing banners...')
  await supabase.from('banners').delete().neq('id', '00000000-0000-0000-0000-000000000000')

  for (const banner of bannersToAdd) {
    try {
      console.log(`\nDownloading image for: ${banner.title}`)
      const res = await fetch(banner.url)
      if (!res.ok) throw new Error(`Failed to fetch image: ${res.statusText}`)
      
      const buffer = await res.arrayBuffer()
      const fileName = `banners/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`

      console.log(`Uploading to Supabase Storage: ${fileName}`)
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, buffer, {
          contentType: 'image/jpeg',
          upsert: false
        })

      if (uploadError) {
        console.error('Storage upload error:', uploadError)
        continue
      }

      const { data: publicUrlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(uploadData.path)

      console.log(`Inserting into database...`)
      const { error: insertError } = await supabase.from('banners').insert([{
        title: banner.title,
        image_url: publicUrlData.publicUrl,
        cta_text: banner.cta_text,
        cta_link: banner.cta_link,
        is_active: true,
        sort_order: banner.sort_order
      }])

      if (insertError) {
        console.error('Database insert error:', insertError)
      } else {
        console.log(`✅ Successfully added banner: ${banner.title}`)
      }
    } catch (e) {
      console.error(`Failed to process banner ${banner.title}:`, e)
    }
  }

  console.log('\n🎉 Finished seeding banners!')
}

seedBanners()

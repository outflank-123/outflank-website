import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envFile = fs.readFileSync(path.resolve(__dirname, '../.env'), 'utf-8')
const envVars = Object.fromEntries(
  envFile.split('\n')
    .filter(line => line && !line.startsWith('#') && line.includes('='))
    .map(line => line.split('=', 2).map(s => s.trim().replace(/^['"]|['"]$/g, '')))
)

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase credentials in .env")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function seed() {
  console.log("Fetching categories...")
  const { data: categories, error: catError } = await supabase
    .from('categories')
    .select('id, slug')
    .in('slug', ['gift-sets', 'eco-friendly-products', 'work-from-home'])

  if (catError) {
    console.error("Failed to fetch categories:", catError)
    return
  }

  const giftSets = categories.find(c => c.slug === 'gift-sets')?.id
  const ecoFriendly = categories.find(c => c.slug === 'eco-friendly-products')?.id
  const wfh = categories.find(c => c.slug === 'work-from-home')?.id

  const dummyProducts = [
    {
      category_id: giftSets,
      name: "Executive Welcome Box",
      slug: "executive-welcome-box",
      short_desc: "Premium onboarding gift set for executives.",
      description: "A beautifully curated box featuring a stainless steel tumbler, a premium leather notebook, a multifunction pen, and gourmet chocolates.",
      base_price: 129.99,
      min_order_qty: 25,
      is_featured: true,
      is_active: true,
      primary_image_url: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?q=80&w=800&auto=format&fit=crop"
    },
    {
      category_id: giftSets,
      name: "The Coffee Connoisseur Set",
      slug: "coffee-connoisseur-set",
      short_desc: "Everything needed for the perfect pour-over.",
      description: "Includes a sleek matte-black gooseneck kettle, ceramic dripper, and two bags of artisanal roasted coffee beans.",
      base_price: 89.50,
      min_order_qty: 50,
      is_featured: false,
      is_active: true,
      primary_image_url: "https://images.unsplash.com/photo-1559525839-b184a4d698c7?q=80&w=800&auto=format&fit=crop"
    },
    {
      category_id: ecoFriendly,
      name: "Bamboo Tech Organizer",
      slug: "bamboo-tech-organizer",
      short_desc: "Sustainable desktop organization.",
      description: "A beautifully crafted bamboo organizer with built-in wireless charging pad for smartphones and AirPods.",
      base_price: 45.00,
      min_order_qty: 100,
      is_featured: true,
      is_active: true,
      primary_image_url: "https://images.unsplash.com/photo-1585241936939-f470a1aee59b?q=80&w=800&auto=format&fit=crop"
    },
    {
      category_id: wfh,
      name: "Ergonomic Desk Mat",
      slug: "ergonomic-desk-mat",
      short_desc: "Premium vegan leather desk pad.",
      description: "Protects your desk while providing a smooth, elegant surface for your mouse and keyboard. Water-resistant and easy to clean.",
      base_price: 35.00,
      min_order_qty: 100,
      is_featured: false,
      is_active: true,
      primary_image_url: "https://images.unsplash.com/photo-1616423640778-28d1b53229bd?q=80&w=800&auto=format&fit=crop"
    },
    {
      category_id: ecoFriendly,
      name: "Recycled RPET Tote Bag",
      slug: "recycled-rpet-tote-bag",
      short_desc: "Durable tote made from recycled water bottles.",
      description: "A spacious and stylish tote bag perfect for daily commutes or grocery runs. Fully customizable with your company logo.",
      base_price: 15.50,
      min_order_qty: 250,
      is_featured: false,
      is_active: true,
      primary_image_url: "https://images.unsplash.com/photo-1597484661643-2f5fef640df1?q=80&w=800&auto=format&fit=crop"
    }
  ]

  console.log("Seeding dummy products...")
  const { error } = await supabase.from('products').upsert(dummyProducts, { onConflict: 'slug' })
  
  if (error) {
    console.error("Failed to seed products:", error)
  } else {
    console.log("Successfully seeded 5 dummy products!")
  }
}

seed()

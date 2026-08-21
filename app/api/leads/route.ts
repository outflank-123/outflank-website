import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { name, company, email, phone, requirements, product_id, product_name } = body

    // Validate required fields
    if (!name?.trim() || !company?.trim() || !email?.trim() || !requirements?.trim()) {
      return NextResponse.json(
        { error: 'Name, company, email, and requirements are required.' },
        { status: 400 }
      )
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { error } = await supabase.from('leads').insert({
      name: name.trim(),
      company: company.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim() ?? null,
      requirements: requirements.trim(),
      product_id: product_id ?? null,
      product_name: product_name ?? null,
      status: 'new',
      source: 'website',
    })

    if (error) {
      console.error('[leads/POST] Supabase error:', error)
      return NextResponse.json({ error: 'Failed to save your inquiry. Please try again.' }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err) {
    console.error('[leads/POST] Unexpected error:', err)
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    // 1. IP Rate Limiting (max 5 submissions per minute per IP)
    const clientIp = getClientIp(request)
    const rateLimit = checkRateLimit(`leads:${clientIp}`, { limit: 5, windowSeconds: 60 })

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: `Too many inquiries submitted. Please wait ${rateLimit.resetInSeconds} seconds before trying again.` },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.resetInSeconds),
            'X-RateLimit-Limit': String(rateLimit.limit),
            'X-RateLimit-Remaining': String(rateLimit.remaining),
          },
        }
      )
    }

    const body = await request.json().catch(() => ({}))

    // 2. Honeypot Bot Detection
    // If hidden bot fields are populated, return fake success without writing to DB
    if (body._gotcha || body.website_url_hp || body.fax) {
      return NextResponse.json({ success: true }, { status: 200 })
    }

    const { name, company, email, phone, requirements, product_id, product_name } = body

    // 3. Validation & Sanitization
    if (
      !name || typeof name !== 'string' || !name.trim() ||
      !company || typeof company !== 'string' || !company.trim() ||
      !email || typeof email !== 'string' || !email.trim() ||
      !requirements || typeof requirements !== 'string' || !requirements.trim()
    ) {
      return NextResponse.json(
        { error: 'Name, company, email, and requirements are required.' },
        { status: 400 }
      )
    }

    const cleanName = name.trim().slice(0, 150)
    const cleanCompany = company.trim().slice(0, 150)
    const cleanEmail = email.trim().toLowerCase().slice(0, 150)
    const cleanPhone = typeof phone === 'string' ? phone.trim().slice(0, 50) : null
    const cleanRequirements = requirements.trim().slice(0, 3000)
    const cleanProductId = typeof product_id === 'string' && product_id.length === 36 ? product_id : null
    const cleanProductName = typeof product_name === 'string' ? product_name.trim().slice(0, 200) : null

    // Email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 })
    }

    // 4. Database insertion via Admin Client
    const supabase = createAdminClient()
    const { error } = await supabase.from('leads').insert({
      name: cleanName,
      company: cleanCompany,
      email: cleanEmail,
      phone: cleanPhone,
      requirements: cleanRequirements,
      product_id: cleanProductId,
      product_name: cleanProductName,
      status: 'new',
      source: 'website',
    })

    if (error) {
      console.error('[leads/POST] Database Error:', error)
      return NextResponse.json(
        { error: 'Failed to save your inquiry. Please try again later.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err) {
    console.error('[leads/POST] Unexpected error:', err)
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 })
  }
}

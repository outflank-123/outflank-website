import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export async function POST(req: Request) {
  try {
    // 1. IP Rate Limiting (max 3 contact emails per 10 minutes per IP)
    const clientIp = getClientIp(req)
    const rateLimit = checkRateLimit(`contact:${clientIp}`, { limit: 3, windowSeconds: 600 })

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: `Too many messages sent. Please wait ${Math.ceil(rateLimit.resetInSeconds / 60)} minute(s) before trying again.` },
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

    const body = await req.json().catch(() => ({}))

    // 2. Honeypot Bot Detection
    if (body._gotcha || body.website_url_hp || body.fax) {
      return NextResponse.json({ message: 'Message sent successfully.' }, { status: 200 })
    }

    const { name, email, mobile, company, projectType, message } = body

    // 3. Validate required fields
    if (
      !name || typeof name !== 'string' || !name.trim() ||
      !email || typeof email !== 'string' || !email.trim() ||
      !mobile || typeof mobile !== 'string' || !mobile.trim() ||
      !message || typeof message !== 'string' || !message.trim()
    ) {
      return NextResponse.json(
        { error: 'Name, email, mobile number, and message are required.' },
        { status: 400 }
      )
    }

    const cleanName = name.trim().slice(0, 100)
    const cleanEmail = email.trim().toLowerCase().slice(0, 150)
    const cleanMobile = mobile.trim().slice(0, 50)
    const cleanCompany = typeof company === 'string' ? company.trim().slice(0, 100) : 'N/A'
    const cleanProjectType = typeof projectType === 'string' ? projectType.trim().slice(0, 100) : 'General'
    const cleanMessage = message.trim().slice(0, 5000)

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 })
    }

    // Verify SMTP configuration exists
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn('[contact/POST] SMTP credentials not configured in environment.')
      return NextResponse.json(
        { error: 'Contact service is currently unavailable. Please reach out directly via email.' },
        { status: 503 }
      )
    }

    // 4. Configure SMTP transport
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 465,
      secure: Number(process.env.SMTP_PORT) === 465 || !process.env.SMTP_PORT,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })

    const safeName = escapeHtml(cleanName)
    const safeEmail = escapeHtml(cleanEmail)
    const safeMobile = escapeHtml(cleanMobile)
    const safeCompany = escapeHtml(cleanCompany)
    const safeProjectType = escapeHtml(cleanProjectType)
    const safeMessageHtml = escapeHtml(cleanMessage).replace(/\n/g, '<br/>')

    // Email content
    const mailOptions = {
      from: `"Outflank Inquiry" <${process.env.SMTP_USER}>`,
      to: process.env.SMTP_TO_EMAIL || process.env.SMTP_USER,
      replyTo: cleanEmail,
      subject: `New Inquiry from ${cleanName} (${cleanCompany})`,
      text: `
Name: ${cleanName}
Email: ${cleanEmail}
Mobile: ${cleanMobile}
Company: ${cleanCompany}
Project Type: ${cleanProjectType}

Message:
${cleanMessage}
      `,
      html: `
        <h2>New Inquiry Submission</h2>
        <p><strong>Name:</strong> ${safeName}</p>
        <p><strong>Email:</strong> ${safeEmail}</p>
        <p><strong>Mobile:</strong> ${safeMobile}</p>
        <p><strong>Company:</strong> ${safeCompany}</p>
        <p><strong>Project Type:</strong> ${safeProjectType}</p>
        <br/>
        <p><strong>Message:</strong></p>
        <p>${safeMessageHtml}</p>
      `,
    }

    await transporter.sendMail(mailOptions)

    return NextResponse.json(
      { message: 'Message sent successfully.' },
      { status: 200 }
    )
  } catch (error) {
    console.error('[contact/POST] Error sending email:', error)
    return NextResponse.json(
      { error: 'Failed to send the message. Please try again later.' },
      { status: 500 }
    )
  }
}

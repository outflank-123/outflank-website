import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { createAdminClient } from '@/lib/supabase/admin'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

const BUCKET_NAME = 'custom-branding-assets'
const MAX_TARGET_BYTES = 20 * 1024 // 20,480 bytes (strictly 20KB)

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 })
    }

    // Security check: validate MIME type or extension
    const validMimes = [
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/webp',
      'image/svg+xml',
      'image/gif'
    ]
    if (!validMimes.includes(file.type) && !file.name.match(/\.(png|jpe?g|webp|svg|gif)$/i)) {
      return NextResponse.json(
        { error: 'Invalid file format. Please upload a PNG, JPG, SVG, or WebP logo.' },
        { status: 400 }
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const inputBuffer = Buffer.from(arrayBuffer)

    // Run Sharp image pipeline:
    // 1. Initial dimension clamping and EXIF stripping
    let maxDim = 800
    let quality = 80
    let outputBuffer: Buffer | null = null
    let finalWidth = 0
    let finalHeight = 0

    for (let attempt = 0; attempt < 8; attempt++) {
      const pipeline = sharp(inputBuffer, { density: 300 }) // High density for SVG rendering
        .rotate() // Auto-orient according to EXIF
        .resize({
          width: maxDim,
          height: maxDim,
          fit: 'inside',
          withoutEnlargement: true
        })
        .webp({
          quality,
          effort: 6, // Maximum compression search efficiency
          alphaQuality: 100, // 100% preservation of transparent alpha channels
          lossless: false
        })

      outputBuffer = await pipeline.toBuffer()
      const metadata = await sharp(outputBuffer).metadata()
      finalWidth = metadata.width || maxDim
      finalHeight = metadata.height || maxDim

      // Check if within 20KB limit
      if (outputBuffer.length <= MAX_TARGET_BYTES) {
        break
      }

      // Stepped decay for complex / noisy images
      if (quality > 60) {
        quality -= 10
      } else {
        maxDim = Math.round(maxDim * 0.85)
        quality = 70
      }
    }

    if (!outputBuffer || outputBuffer.length > MAX_TARGET_BYTES) {
      // Emergency failsafe clamp
      outputBuffer = await sharp(inputBuffer, { density: 150 })
        .resize({ width: 500, height: 500, fit: 'inside' })
        .webp({ quality: 50, effort: 6 })
        .toBuffer()
    }

    // Generate unique storage path in pending folder
    const uniqueId = crypto.randomUUID()
    const storagePath = `pending/${uniqueId}.webp`

    const supabase = createAdminClient()

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, outputBuffer, {
        contentType: 'image/webp',
        cacheControl: '31536000',
        upsert: true
      })

    if (uploadError) {
      console.error('Supabase storage upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload logo to storage' },
        { status: 500 }
      )
    }

    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(storagePath)

    return NextResponse.json({
      success: true,
      publicUrl: publicUrlData.publicUrl,
      storagePath,
      fileSizeBytes: outputBuffer.length,
      fileSizeKb: (outputBuffer.length / 1024).toFixed(1),
      dimensions: { width: finalWidth, height: finalHeight },
      originalName: file.name
    })
  } catch (error: any) {
    console.error('Logo processing error:', error)
    return NextResponse.json(
      { error: error.message || 'Image processing failed' },
      { status: 500 }
    )
  }
}

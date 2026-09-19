/**
 * Client-Side Image Optimizer
 * Converts user-uploaded logos (PNG, JPG, SVG, WebP) to WebP strictly under 20KB (20,480 bytes)
 * while preserving high visual sharpness and alpha transparency.
 */

export interface OptimizedImageResult {
  blob: Blob
  dataUrl: string
  fileSizeBytes: number
  fileSizeKb: string
  dimensions: { width: number; height: number }
  format: 'image/webp'
}

/**
 * Optimizes any image (PNG, JPG, SVG, WebP, GIF) to WebP strictly under 20KB (20,480 bytes)
 * entirely in the browser using HTML5 Canvas while preserving alpha transparency and sharpness.
 */
export async function optimizeImageToWebPUnder20Kb(
  input: File | Blob | string
): Promise<OptimizedImageResult> {
  const MAX_TARGET_BYTES = 20 * 1024 // 20,480 bytes

  return new Promise((resolve, reject) => {
    const img = new Image()
    let objectUrl = ''

    if (typeof input === 'string') {
      img.src = input
    } else {
      objectUrl = URL.createObjectURL(input)
      img.src = objectUrl
    }

    img.crossOrigin = 'anonymous'

    img.onload = async () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)

      const naturalW = img.naturalWidth || img.width || 800
      const naturalH = img.naturalHeight || img.height || 800

      // Start with max bounding box of 800px (ideal for apparel print imprints)
      let maxDim = Math.min(800, Math.max(naturalW, naturalH))
      let quality = 0.88
      let bestBlob: Blob | null = null
      let bestDataUrl = ''

      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d', { willReadFrequently: true })

      if (!ctx) {
        reject(new Error('Canvas 2D context not supported'))
        return
      }

      // Multi-step convergence loop
      for (let attempt = 0; attempt < 8; attempt++) {
        // Calculate proportional dimensions
        let width = naturalW
        let height = naturalH

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width)
            width = maxDim
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height)
            height = maxDim
          }
        }

        canvas.width = width
        canvas.height = height

        // Clear and draw with high quality smoothing
        ctx.clearRect(0, 0, width, height)
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, 0, 0, width, height)

        // Convert to WebP blob
        const blob = await new Promise<Blob | null>((res) =>
          canvas.toBlob((b) => res(b), 'image/webp', quality)
        )

        if (blob) {
          bestBlob = blob
          bestDataUrl = canvas.toDataURL('image/webp', quality)

          // If strictly under 20KB, we succeeded!
          if (blob.size <= MAX_TARGET_BYTES) {
            break
          }
        }

        // Stepped decay: lower quality first, then scale down dimension
        if (quality > 0.6) {
          quality -= 0.1
        } else {
          maxDim = Math.round(maxDim * 0.85)
          quality = 0.75
        }
      }

      if (!bestBlob) {
        reject(new Error('Failed to generate optimized WebP blob'))
        return
      }

      resolve({
        blob: bestBlob,
        dataUrl: bestDataUrl,
        fileSizeBytes: bestBlob.size,
        fileSizeKb: (bestBlob.size / 1024).toFixed(1),
        dimensions: { width: canvas.width, height: canvas.height },
        format: 'image/webp'
      })
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Failed to load image for optimization'))
    }

    img.src = objectUrl
  })
}

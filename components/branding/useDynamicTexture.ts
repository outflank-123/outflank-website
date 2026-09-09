import { useMemo, useEffect, useState } from 'react'
import * as THREE from 'three'

export function useDynamicTexture(
  brandName: string, 
  uploadedLogo: string | null,
  font: string = 'Inter',
  scale: number = 120
) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null)

  useEffect(() => {
    if (uploadedLogo) {
      // If user uploaded a logo, load it as a texture
      const loader = new THREE.TextureLoader()
      loader.load(uploadedLogo, (tex) => {
        tex.anisotropy = 16
        setTexture(tex)
      })
      return
    }

    // Otherwise, generate text canvas
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 256
    const context = canvas.getContext('2d')
    
    if (context) {
      context.fillStyle = 'rgba(0,0,0,0)'
      context.fillRect(0, 0, canvas.width, canvas.height)
      
      context.fillStyle = '#1d1d1f'
      // Use the provided font and scale. Scale from UI is 20-120, map it to a reasonable canvas size (e.g., 40-240)
      const fontSize = scale * 2
      context.font = `bold ${fontSize}px "${font}", sans-serif`
      context.textAlign = 'center'
      context.textBaseline = 'middle'
      context.fillText(brandName || 'Your Brand', canvas.width / 2, canvas.height / 2)
    }
    
    const tex = new THREE.CanvasTexture(canvas)
    tex.anisotropy = 16
    setTexture(tex)
  }, [brandName, uploadedLogo, font, scale])

  return texture
}

'use client'

import { useRef, useMemo } from 'react'
import * as THREE from 'three'
import { Decal, RoundedBox } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useDynamicTexture } from './useDynamicTexture'

interface NotebookModelProps {
  brandName: string
  color: string
  uploadedLogo: string | null
  font: string
  scale: number
}

export default function NotebookModel({ brandName, color, uploadedLogo, font, scale }: NotebookModelProps) {
  const groupRef = useRef<THREE.Group>(null)
  const texture = useDynamicTexture(brandName, uploadedLogo, font, scale)

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.2
      // Add slight tilt to make it look like a notebook laying/standing
      groupRef.current.rotation.x = Math.PI / 8
    }
  })

  // Material for the leather cover
  const coverMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      roughness: 0.8,
      metalness: 0.1,
    })
  }, [color])
  
  // Material for the paper pages
  const pagesMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color('#f4f4f0'),
      roughness: 1,
      metalness: 0,
    })
  }, [])

  return (
    <group ref={groupRef} dispose={null} position={[0, -0.5, 0]}>
      {/* Notebook Cover */}
      <RoundedBox args={[3.5, 4.5, 0.4]} radius={0.1} smoothness={4} castShadow receiveShadow material={coverMaterial}>
        {/* Decal projected onto the front cover */}
        {texture && (
          <Decal
            position={[0, 0, 0.2]} 
            rotation={[0, 0, 0]}
            scale={[2.5, 0.6, 1]} 
          >
            <meshStandardMaterial
              map={texture}
              transparent
              polygonOffset
              polygonOffsetFactor={-1}
              roughness={0.7}
            />
          </Decal>
        )}
      </RoundedBox>

      {/* Notebook Pages (inset slightly) */}
      <mesh castShadow receiveShadow material={pagesMaterial} position={[0.1, 0, 0]}>
        <boxGeometry args={[3.3, 4.3, 0.38]} />
      </mesh>
    </group>
  )
}

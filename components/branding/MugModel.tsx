'use client'

import { useRef, useMemo } from 'react'
import * as THREE from 'three'
import { Decal } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useDynamicTexture } from './useDynamicTexture'

interface MugModelProps {
  brandName: string
  color: string
  uploadedLogo: string | null
  font: string
  scale: number
}

export default function MugModel({ brandName, color, uploadedLogo, font, scale }: MugModelProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const texture = useDynamicTexture(brandName, uploadedLogo, font, scale)

  // Simple rotation effect
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.2
    }
  })

  // Material for the mug
  const mugMaterial = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(color),
      roughness: 0.1,
      metalness: 0.1,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
    })
  }, [color])

  return (
    <group dispose={null}>
      {/* Mug Body */}
      <mesh ref={meshRef} position={[0, 0, 0]} castShadow receiveShadow material={mugMaterial}>
        <cylinderGeometry args={[1.5, 1.5, 3.5, 64]} />
        
        {/* Dynamic Decal projected onto the side of the cylinder */}
        {texture && (
          <Decal
            position={[0, 0, 1.5]} // Position on the front face (+Z)
            rotation={[0, 0, 0]}
            scale={[3, 0.75, 1]} // Scale to fit the 1024x256 aspect ratio
          >
            <meshPhysicalMaterial
              map={texture}
              transparent
              polygonOffset
              polygonOffsetFactor={-1}
              roughness={0.2}
              metalness={0.1}
            />
          </Decal>
        )}
      </mesh>

      {/* Mug Handle */}
      <mesh position={[1.5, 0, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow receiveShadow material={mugMaterial}>
        <torusGeometry args={[0.8, 0.2, 16, 32]} />
      </mesh>
      
      {/* Mug Inner Bottom */}
      <mesh position={[0, -1.6, 0]} material={mugMaterial}>
        <cylinderGeometry args={[1.45, 1.45, 0.2, 64]} />
      </mesh>
    </group>
  )
}

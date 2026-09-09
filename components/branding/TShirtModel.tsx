'use client'

import { useRef, useMemo } from 'react'
import * as THREE from 'three'
import { Decal } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useDynamicTexture } from './useDynamicTexture'

interface TShirtModelProps {
  brandName: string
  color: string
  uploadedLogo: string | null
  font: string
  scale: number
}

export default function TShirtModel({ brandName, color, uploadedLogo, font, scale }: TShirtModelProps) {
  const groupRef = useRef<THREE.Group>(null)
  const texture = useDynamicTexture(brandName, uploadedLogo, font, scale)

  // Simple rotation effect
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.2
    }
  })

  // Material for the fabric
  const fabricMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      roughness: 0.9, // Fabric is rough
      metalness: 0.0,
    })
  }, [color])

  return (
    <group ref={groupRef} dispose={null} position={[0, -0.5, 0]}>
      {/* Torso (Flattened Cylinder) */}
      <mesh castShadow receiveShadow material={fabricMaterial} scale={[1, 1, 0.4]} position={[0, 0, 0]}>
        <cylinderGeometry args={[1.5, 1.5, 4, 32]} />
        
        {/* Decal projected onto the chest */}
        {texture && (
          <Decal
            position={[0, 0.8, 1.5]} 
            rotation={[0, 0, 0]}
            scale={[2, 0.5, 1]} 
          >
            <meshStandardMaterial
              map={texture}
              transparent
              polygonOffset
              polygonOffsetFactor={-1}
              roughness={0.9}
            />
          </Decal>
        )}
      </mesh>

      {/* Left Sleeve */}
      <mesh castShadow receiveShadow material={fabricMaterial} position={[-1.7, 1.2, 0]} rotation={[0, 0, Math.PI / 4]} scale={[1, 1, 0.4]}>
        <cylinderGeometry args={[0.6, 0.6, 1.5, 32]} />
      </mesh>

      {/* Right Sleeve */}
      <mesh castShadow receiveShadow material={fabricMaterial} position={[1.7, 1.2, 0]} rotation={[0, 0, -Math.PI / 4]} scale={[1, 1, 0.4]}>
        <cylinderGeometry args={[0.6, 0.6, 1.5, 32]} />
      </mesh>

      {/* Neck Hole (Subtracted visually by coloring darker or just adding a torus) */}
      <mesh position={[0, 2.05, 0]} rotation={[Math.PI / 2, 0, 0]} material={new THREE.MeshStandardMaterial({ color: '#2a2a2a' })}>
        <cylinderGeometry args={[0.8, 0.8, 0.4, 32]} />
      </mesh>
    </group>
  )
}

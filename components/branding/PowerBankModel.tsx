'use client'

import { useRef, useMemo } from 'react'
import * as THREE from 'three'
import { Decal, RoundedBox } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useDynamicTexture } from './useDynamicTexture'

interface PowerBankModelProps {
  brandName: string
  color: string
  uploadedLogo: string | null
  font: string
  scale: number
}

export default function PowerBankModel({ brandName, color, uploadedLogo, font, scale }: PowerBankModelProps) {
  const groupRef = useRef<THREE.Group>(null)
  const texture = useDynamicTexture(brandName, uploadedLogo, font, scale)

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.2
      groupRef.current.rotation.x = Math.PI / 6
    }
  })

  const bankMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      roughness: 0.2,
      metalness: 0.3,
    })
  }, [color])
  
  const portMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color('#1a1a1a'),
      roughness: 0.8,
      metalness: 0.8,
    })
  }, [])

  return (
    <group ref={groupRef} dispose={null} position={[0, -0.5, 0]}>
      {/* Power Bank Body */}
      <RoundedBox args={[2.5, 4.5, 0.6]} radius={0.15} smoothness={4} castShadow receiveShadow material={bankMaterial}>
        {/* Decal projected onto the front face */}
        {texture && (
          <Decal
            position={[0, 0, 0.3]} 
            rotation={[0, 0, 0]}
            scale={[2, 0.5, 1]} 
          >
            <meshStandardMaterial
              map={texture}
              transparent
              polygonOffset
              polygonOffsetFactor={-1}
              roughness={0.2}
              metalness={0.4}
            />
          </Decal>
        )}
      </RoundedBox>

      {/* USB Ports Area */}
      <mesh position={[0, 2.26, 0]} material={portMaterial}>
        <boxGeometry args={[2.2, 0.05, 0.4]} />
      </mesh>
    </group>
  )
}

'use client'

import { useRef, useMemo } from 'react'
import * as THREE from 'three'
import { Decal } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useDynamicTexture } from './useDynamicTexture'

interface FlaskModelProps {
  brandName: string
  color: string
  uploadedLogo: string | null
  font: string
  scale: number
}

export default function FlaskModel({ brandName, color, uploadedLogo, font, scale }: FlaskModelProps) {
  const groupRef = useRef<THREE.Group>(null)
  const texture = useDynamicTexture(brandName, uploadedLogo, font, scale)

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.2
    }
  })

  // Material for the flask body (metallic)
  const flaskMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      roughness: 0.3,
      metalness: 0.8,
    })
  }, [color])
  
  // Material for the cap (dark plastic/metal)
  const capMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color('#1a1a1a'),
      roughness: 0.5,
      metalness: 0.5,
    })
  }, [])

  return (
    <group ref={groupRef} dispose={null} position={[0, -0.5, 0]}>
      {/* Flask Body */}
      <mesh castShadow receiveShadow material={flaskMaterial} position={[0, 0, 0]}>
        <cylinderGeometry args={[1.2, 1.2, 4.5, 64]} />
        
        {/* Decal projected onto the flask */}
        {texture && (
          <Decal
            position={[0, 0, 1.2]} 
            rotation={[0, 0, 0]}
            scale={[2.2, 0.55, 1]} 
          >
            <meshStandardMaterial
              map={texture}
              transparent
              polygonOffset
              polygonOffsetFactor={-1}
              roughness={0.4}
              metalness={0.6}
            />
          </Decal>
        )}
      </mesh>

      {/* Flask Neck */}
      <mesh castShadow receiveShadow material={flaskMaterial} position={[0, 2.4, 0]}>
        <cylinderGeometry args={[0.8, 1.2, 0.4, 64]} />
      </mesh>

      {/* Flask Cap */}
      <mesh castShadow receiveShadow material={capMaterial} position={[0, 2.8, 0]}>
        <cylinderGeometry args={[0.85, 0.85, 0.6, 64]} />
      </mesh>
    </group>
  )
}

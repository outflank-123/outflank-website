'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei'
import { Suspense } from 'react'
import MugModel from './MugModel'
import TShirtModel from './TShirtModel'
import FlaskModel from './FlaskModel'
import NotebookModel from './NotebookModel'
import PowerBankModel from './PowerBankModel'

interface SceneProps {
  brandName: string
  color: string
  uploadedLogo: string | null
  activeModel: string
  font: string
  scale: number
}

export default function Scene({ brandName, color, uploadedLogo, activeModel, font, scale }: SceneProps) {
  return (
    <div className="w-full h-full relative bg-[#1a1a2e] overflow-hidden">
      {/* Zoomed out camera to ensure tall objects like Flask fit perfectly */}
      <Canvas shadows camera={{ position: [0, 1, 13], fov: 35 }}>
        <Suspense fallback={null}>
          <ambientLight intensity={1.2} />
          <directionalLight
            castShadow
            position={[5, 8, 5]}
            intensity={2.5}
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
            shadow-bias={-0.0001}
          />
          <directionalLight position={[-5, 3, -5]} intensity={0.8} />
          
          {activeModel === 'mug' && <MugModel brandName={brandName} color={color} uploadedLogo={uploadedLogo} font={font} scale={scale} />}
          {activeModel === 'tshirt' && <TShirtModel brandName={brandName} color={color} uploadedLogo={uploadedLogo} font={font} scale={scale} />}
          {activeModel === 'flask' && <FlaskModel brandName={brandName} color={color} uploadedLogo={uploadedLogo} font={font} scale={scale} />}
          {activeModel === 'notebook' && <NotebookModel brandName={brandName} color={color} uploadedLogo={uploadedLogo} font={font} scale={scale} />}
          {activeModel === 'powerbank' && <PowerBankModel brandName={brandName} color={color} uploadedLogo={uploadedLogo} font={font} scale={scale} />}

          <ContactShadows
            position={[0, -1.75, 0]}
            opacity={0.5}
            scale={10}
            blur={2}
            far={4}
          />
          
          <Environment preset="city" />
          <OrbitControls 
            enablePan={false} 
            enableZoom={false} 
            minPolarAngle={Math.PI / 4} 
            maxPolarAngle={Math.PI / 1.5} 
          />
        </Suspense>
      </Canvas>
      
    </div>
  )
}

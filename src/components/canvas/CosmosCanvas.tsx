import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import { Preload } from '@react-three/drei';
import Nebula from './Nebula';

interface CosmosCanvasProps {
  children?: React.ReactNode;
}

/**
 * CosmosCanvas - The main entry point for the R3F scene.
 * Renders behind the DOM layer and handles responsive viewport filling.
 * Implements a "Magical" cosmic theme with deep navy/black gradients.
 */
const CosmosCanvas = ({ children }: CosmosCanvasProps) => {
  return (
    <div 
      className="fixed inset-0 z-0 bg-cosmic-gradient transition-colors duration-1000"
      aria-hidden="true"
    >
      <Canvas
        camera={{ position: [0, 0, 1], fov: 75 }}
        dpr={[1, 2]} // Performance optimization: limit resolution on high-DPI screens
        gl={{ 
          antialias: false, // Stars usually look better and perform better without heavy antialiasing
          alpha: true,
          powerPreference: "high-performance"
        }}
        style={{ width: '100%', height: '100%' }}
      >
        <Suspense fallback={null}>
          <Nebula />
          {children}
          <Preload all />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default CosmosCanvas;

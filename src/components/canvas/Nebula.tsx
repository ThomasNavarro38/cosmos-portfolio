import { Cloud } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

/**
 * Nebula - Adds cosmic gas clouds to the background for a "Magical" theme.
 * Uses Drei's Cloud component with customized colors and movement.
 */
const Nebula = () => {
  const group = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (group.current) {
      group.current.rotation.y = state.clock.getElapsedTime() * 0.05;
    }
  });

  return (
    <group ref={group}>
      {/* Primary Nebula Cloud */}
      <Cloud
        opacity={0.15}
        speed={0.4}
        bounds={[10, 5, 1.5]}
        volume={10}
        segments={20}
        color="#7c3aed" // nebula color
        position={[-5, 2, -10]}
      />
      
      {/* Secondary Nebula Cloud */}
      <Cloud
        opacity={0.1}
        speed={0.3}
        bounds={[15, 5, 2]}
        volume={15}
        segments={15}
        color="#2dd4bf" // magic color
        position={[5, -2, -12]}
      />

      {/* Tertiary Distant Cloud */}
      <Cloud
        opacity={0.05}
        speed={0.2}
        bounds={[20, 5, 1]}
        volume={20}
        segments={10}
        color="#0f172a" // void color
        position={[0, 0, -15]}
      />
    </group>
  );
};

export default Nebula;

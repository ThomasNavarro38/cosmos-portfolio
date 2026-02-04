import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useStore } from '../../engine/store';
import { getCameraPose } from '../../engine/camera';
import * as THREE from 'three';

const CameraRail: React.FC = () => {
  const { camera } = useThree();
  
  // Use refs to avoid re-allocations in useFrame
  const lookTarget = useRef(new THREE.Vector3());
  const currentLookAt = useRef(new THREE.Vector3());
  
  // Performance measurement ref
  const perf = useRef({ frameCount: 0, totalDelta: 0, startTime: 0, active: true });

  useFrame((_state, delta) => {
    // Read from store state directly to avoid component re-renders
    const scrollProgress = useStore.getState().scrollProgress;
    const { position, target } = getCameraPose(scrollProgress);
    
    // Damping factor - higher is snappier
    const k = 5;
    const alpha = 1 - Math.exp(-k * delta);

    // Smoothly interpolate camera position
    camera.position.lerp(position, alpha);

    // Smoothly interpolate look-at target
    currentLookAt.current.lerp(target, alpha);
    camera.lookAt(currentLookAt.current);

    // Performance check in DEV
    if (import.meta.env.DEV && perf.current.active) {
      if (perf.current.startTime === 0) perf.current.startTime = performance.now();
      
      perf.current.frameCount++;
      perf.current.totalDelta += delta;
      
      const elapsed = (performance.now() - perf.current.startTime) / 1000;
      if (elapsed >= 3) {
        const avgDelta = (perf.current.totalDelta / perf.current.frameCount) * 1000;
        const fps = perf.current.frameCount / elapsed;
        console.log(`[CameraRail Performance] Avg delta: ${avgDelta.toFixed(2)}ms, FPS: ${fps.toFixed(1)}`);
        perf.current.active = false; // Log once
      }
    }
  });

  return null;
};

export default CameraRail;

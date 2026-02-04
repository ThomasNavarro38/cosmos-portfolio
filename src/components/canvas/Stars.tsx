import { Stars as DreiStars } from '@react-three/drei';

interface StarsProps {
  radius?: number;
  depth?: number;
  count?: number;
  factor?: number;
  saturation?: number;
  fade?: boolean;
  speed?: number;
}

/**
 * Stars - A cosmic background component using Drei's optimized Stars.
 * Configured for the "Magical" theme with appropriate density and depth.
 */
const Stars = ({
  radius = 100,
  depth = 50,
  count = 5000,
  factor = 4,
  saturation = 0,
  fade = true,
  speed = 0.5,
}: StarsProps) => {
  return (
    <DreiStars 
      radius={radius} 
      depth={depth} 
      count={count} 
      factor={factor} 
      saturation={saturation} 
      fade={fade} 
      speed={speed} 
    />
  );
};

export default Stars;

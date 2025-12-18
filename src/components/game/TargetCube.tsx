import { useRef, useState, useEffect } from 'react';
import { useBox } from '@react-three/cannon';
import { Mesh } from 'three';

interface TargetCubeProps {
  position: [number, number, number];
  color: string;
  id: number;
  onHit: (id: number) => void;
  isHit: boolean;
}

export const TargetCube = ({ position, color, id, onHit, isHit }: TargetCubeProps) => {
  const [hasBeenHit, setHasBeenHit] = useState(false);
  const [isReady, setIsReady] = useState(false);
  
  // Delay collision detection to prevent false positives on init
  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 500);
    return () => clearTimeout(timer);
  }, []);
  
  const [cubeRef, api] = useBox<Mesh>(() => ({
    mass: hasBeenHit ? 1.5 : 0, // Static until hit, lighter for easier knockdown
    position,
    args: [0.3, 0.6, 0.3], // Smaller, 2x taller than wide (kubb proportions)
    type: hasBeenHit ? 'Dynamic' : 'Static',
    onCollide: (e) => {
      if (!hasBeenHit && isReady && e.body) {
        const velocity = e.contact?.impactVelocity || 0;
        if (velocity > 1.5) { // Lower threshold for lighter kubbs
          setHasBeenHit(true);
          onHit(id);
          // Apply force to knock it over
          api.mass.set(1.5);
          api.applyImpulse([0, 3, -6], [0, 0, 0]);
        }
      }
    },
  }));

  return (
    <mesh ref={cubeRef} castShadow receiveShadow>
      <boxGeometry args={[0.3, 0.6, 0.3]} />
      <meshStandardMaterial
        color={hasBeenHit || isHit ? '#888888' : color}
        roughness={0.3}
        metalness={0.1}
        emissive={hasBeenHit || isHit ? '#000000' : color}
        emissiveIntensity={hasBeenHit || isHit ? 0 : 0.15}
      />
    </mesh>
  );
};

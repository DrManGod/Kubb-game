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
    mass: hasBeenHit ? 0.03 : 0,
    position,
    args: [0.3, 0.6, 0.3],
    type: 'Dynamic',
    material: {
      friction: 0.1,
      restitution: 0.01,
    },
    onCollide: (e) => {
      if (!hasBeenHit && isReady && e.body) {
        const velocity = e.contact?.impactVelocity || 0;
        if (velocity > 0.05) {
          setHasBeenHit(true);
          onHit(id);
          api.mass.set(0.03);
          // Gentle topple - just enough to tip over
          const impulseX = (Math.random() - 0.5) * 0.3;
          api.applyImpulse([impulseX, 0.1, -0.5], [0, 0.3, 0]);
          api.angularVelocity.set(
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 1,
            -3 + Math.random() * 0.5
          );
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

import { useState, useEffect } from 'react';
import { useBox } from '@react-three/cannon';
import { Mesh } from 'three';

interface KingKubbProps {
  position: [number, number, number];
  onHit: () => void;
  isHit: boolean;
}

export const KingKubb = ({ position, onHit, isHit }: KingKubbProps) => {
  const [hasBeenHit, setHasBeenHit] = useState(false);
  const [isReady, setIsReady] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 500);
    return () => clearTimeout(timer);
  }, []);
  
  const [cubeRef, api] = useBox<Mesh>(() => ({
    mass: hasBeenHit ? 2.5 : 0,
    position,
    args: [0.4, 1.0, 0.4], // Taller king kubb
    type: hasBeenHit ? 'Dynamic' : 'Static',
    onCollide: (e) => {
      if (!hasBeenHit && isReady && e.body) {
        const velocity = e.contact?.impactVelocity || 0;
        if (velocity > 1.5) {
          setHasBeenHit(true);
          onHit();
          api.mass.set(2.5);
          api.applyImpulse([0, 4, -8], [0, 0, 0]);
        }
      }
    },
  }));

  return (
    <group>
      {/* Main body */}
      <mesh ref={cubeRef} castShadow receiveShadow>
        <boxGeometry args={[0.4, 1.0, 0.4]} />
        <meshStandardMaterial
          color={hasBeenHit || isHit ? '#555555' : '#FFD700'}
          roughness={0.2}
          metalness={0.3}
          emissive={hasBeenHit || isHit ? '#000000' : '#FFD700'}
          emissiveIntensity={hasBeenHit || isHit ? 0 : 0.3}
        />
      </mesh>
      {/* Crown indicator on top - visual only */}
      {!hasBeenHit && !isHit && (
        <mesh position={[position[0], position[1] + 0.6, position[2]]} castShadow>
          <cylinderGeometry args={[0.15, 0.2, 0.15, 6]} />
          <meshStandardMaterial
            color="#FFD700"
            roughness={0.2}
            metalness={0.5}
            emissive="#FFD700"
            emissiveIntensity={0.4}
          />
        </mesh>
      )}
    </group>
  );
};

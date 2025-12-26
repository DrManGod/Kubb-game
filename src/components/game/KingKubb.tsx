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
    // Mass slightly higher than cubes (0.03 + 0.01 = 0.04)
    mass: 0.04,
    position,
    args: [0.4, 1.0, 0.4],
    type: 'Dynamic',
    linearDamping: 0.25,
    angularDamping: 0.35,
    material: {
      friction: 0.1,
      restitution: 0.01,
    },
    onCollide: (e) => {
      if (!hasBeenHit && isReady && e.body) {
        const contactImpact = e.contact?.impactVelocity;
        const v = (e.body as any)?.velocity as { x: number; y: number; z: number } | undefined;
        const bodySpeed = v ? Math.hypot(v.x, v.y, v.z) : 0;
        const velocity = contactImpact ?? bodySpeed;
        // Same threshold as cubes (0.03)
        if (velocity > 0.03) {
          setHasBeenHit(true);
          onHit();
          api.wakeUp();
          const impulseX = (Math.random() - 0.5) * 0.6;
          api.applyImpulse([impulseX, 0.2, -1.2], [0, 0.4, 0]);
          api.angularVelocity.set(
            (Math.random() - 0.5) * 3,
            (Math.random() - 0.5) * 1.5,
            -5 + Math.random() * 1
          );
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

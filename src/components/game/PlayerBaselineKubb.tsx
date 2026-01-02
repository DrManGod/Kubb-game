import { useState, useEffect } from 'react';
import { useBox } from '@react-three/cannon';
import { Mesh } from 'three';

interface PlayerBaselineKubbProps {
  id: number;
  position: [number, number, number];
  onHit: (id: number) => void;
  isHit: boolean;
}

export const PlayerBaselineKubb = ({ id, position, onHit, isHit }: PlayerBaselineKubbProps) => {
  const [hasBeenHit, setHasBeenHit] = useState(false);
  const [isReady, setIsReady] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 500);
    return () => clearTimeout(timer);
  }, []);
  
  const [cubeRef, api] = useBox<Mesh>(() => ({
    mass: 0.03,
    position,
    args: [0.3, 0.6, 0.3],
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
        if (velocity > 0.03) {
          setHasBeenHit(true);
          onHit(id);
          api.wakeUp();
          const impulseX = (Math.random() - 0.5) * 0.6;
          // Fall backward (toward player's back)
          api.applyImpulse([impulseX, 0.2, 1.2], [0, 0.3, 0]);
          api.angularVelocity.set(
            (Math.random() - 0.5) * 3,
            (Math.random() - 0.5) * 1.5,
            5 + Math.random() * 1
          );
        }
      }
    },
  }));

  return (
    <mesh ref={cubeRef} castShadow receiveShadow>
      <boxGeometry args={[0.3, 0.6, 0.3]} />
      <meshStandardMaterial
        color={hasBeenHit || isHit ? '#555555' : '#2563eb'} // Blue for player kubbs
        roughness={0.4}
        metalness={0.05}
        emissive={hasBeenHit || isHit ? '#000000' : '#1d4ed8'}
        emissiveIntensity={hasBeenHit || isHit ? 0 : 0.15}
      />
    </mesh>
  );
};

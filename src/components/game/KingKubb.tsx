import { useState, useEffect } from 'react';
import { useCompoundBody } from '@react-three/cannon';
import { Group } from 'three';
import { COLLISION_GROUPS, COLLISION_MASKS } from './Baton';

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
  
  // Single compound body containing all shapes
  const [ref, api] = useCompoundBody<Group>(() => ({
    mass: 0.04,
    position,
    type: 'Dynamic',
    linearDamping: 0.25,
    angularDamping: 0.35,
    material: {
      friction: 0.1,
      restitution: 0.01,
    },
    collisionFilterGroup: COLLISION_GROUPS.KING,
    collisionFilterMask: COLLISION_MASKS.KING,
    shapes: [
      // Main body
      { type: 'Box', args: [0.4, 1.0, 0.4], position: [0, 0, 0] },
      // Crown platform
      { type: 'Box', args: [0.5, 0.1, 0.5], position: [0, 0.55, 0] },
      // 9 crown tip collision boxes (approximating cones)
      ...[...Array(9)].map((_, i) => {
        const angle = (2 * Math.PI * i) / 9;
        const radius = 0.18;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        return { type: 'Box' as const, args: [0.06, 0.2, 0.06] as [number, number, number], position: [x, 0.7, z] as [number, number, number] };
      }),
    ],
    onCollide: (e) => {
      if (!hasBeenHit && isReady && e.body) {
        const contactImpact = e.contact?.impactVelocity;
        const v = (e.body as any)?.velocity as { x: number; y: number; z: number } | undefined;
        const bodySpeed = v ? Math.hypot(v.x, v.y, v.z) : 0;
        const velocity = contactImpact ?? bodySpeed;
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

  const woodColor = hasBeenHit || isHit ? '#8B7355' : '#D4A574';
  const crownColor = hasBeenHit || isHit ? '#8B7355' : '#C4A35A';

  return (
    <group ref={ref}>
      {/* Main body */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.4, 1.0, 0.4]} />
        <meshStandardMaterial color={woodColor} roughness={0.7} metalness={0.05} />
      </mesh>
      
      {/* Crown platform */}
      <mesh position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[0.5, 0.1, 0.5]} />
        <meshStandardMaterial color={crownColor} roughness={0.6} metalness={0.1} />
      </mesh>
      
      {/* 9 triangular crown tips */}
      {[...Array(9)].map((_, i) => {
        const angle = (2 * Math.PI * i) / 9;
        const radius = 0.18;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        return (
          <mesh key={i} position={[x, 0.7, z]} castShadow>
            <coneGeometry args={[0.05, 0.2, 4]} />
            <meshStandardMaterial color={crownColor} roughness={0.6} metalness={0.1} />
          </mesh>
        );
      })}
    </group>
  );
};

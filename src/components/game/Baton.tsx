import { useState, forwardRef, useImperativeHandle } from 'react';
import { useCylinder } from '@react-three/cannon';
import { Mesh } from 'three';

interface BatonProps {
  position: [number, number, number];
}

export interface BatonRef {
  throw: (velocity: [number, number, number], angularVelocity: [number, number, number]) => void;
  reset: (position: [number, number, number]) => void;
}

export const Baton = forwardRef<BatonRef, BatonProps>(({ position }, ref) => {
  const [isThrown, setIsThrown] = useState(false);
  
  // Heavier baton for more realistic Kubb physics
  const [cylinderRef, api] = useCylinder<Mesh>(() => ({
    mass: isThrown ? 3.5 : 0, // Heavier baton (was 1.5)
    position,
    args: [0.12, 0.12, 1.8, 16],
    rotation: [0, 0, Math.PI / 2],
    linearDamping: 0.1, // Less air resistance
    angularDamping: 0.15,
    type: isThrown ? 'Dynamic' : 'Kinematic',
    material: {
      friction: 0.6,
      restitution: 0.2, // Less bouncy
    },
  }));

  useImperativeHandle(ref, () => ({
    throw: (velocity: [number, number, number], angularVelocity: [number, number, number]) => {
      setIsThrown(true);
      api.mass.set(3.5);
      api.velocity.set(...velocity);
      api.angularVelocity.set(...angularVelocity);
    },
    reset: (newPosition: [number, number, number]) => {
      setIsThrown(false);
      api.mass.set(0);
      api.position.set(...newPosition);
      api.velocity.set(0, 0, 0);
      api.angularVelocity.set(0, 0, 0);
      api.rotation.set(0, 0, Math.PI / 2);
    },
  }));

  return (
    <mesh ref={cylinderRef} castShadow>
      <cylinderGeometry args={[0.12, 0.12, 1.8, 16]} />
      <meshStandardMaterial 
        color="#8B5A2B" 
        roughness={0.7}
        metalness={0.1}
      />
    </mesh>
  );
});

Baton.displayName = 'Baton';

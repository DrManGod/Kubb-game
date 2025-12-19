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
  
  // Vertical baton for end-over-end throw
  const [cylinderRef, api] = useCylinder<Mesh>(() => ({
    mass: isThrown ? 2 : 0,
    position,
    args: [0.08, 0.08, 1.2, 16],
    rotation: [Math.PI / 2, 0, 0], // Vertical orientation
    linearDamping: 0.1,
    angularDamping: 0.05,
    type: isThrown ? 'Dynamic' : 'Kinematic',
    material: {
      friction: 0.5,
      restitution: 0.4, // Better bouncing
    },
    collisionFilterGroup: 1,
    collisionFilterMask: -1, // Collide with everything
  }));

  useImperativeHandle(ref, () => ({
    throw: (velocity: [number, number, number], angularVelocity: [number, number, number]) => {
      setIsThrown(true);
      api.mass.set(1.5);
      api.velocity.set(...velocity);
      api.angularVelocity.set(...angularVelocity);
    },
    reset: (newPosition: [number, number, number]) => {
      setIsThrown(false);
      api.mass.set(0);
      api.position.set(...newPosition);
      api.velocity.set(0, 0, 0);
      api.angularVelocity.set(0, 0, 0);
      api.rotation.set(Math.PI / 2, 0, 0); // Reset to vertical
    },
  }));

  return (
    <mesh ref={cylinderRef} castShadow>
      <cylinderGeometry args={[0.08, 0.08, 1.2, 16]} />
      <meshStandardMaterial 
        color="#8B5A2B" 
        roughness={0.7}
        metalness={0.1}
      />
    </mesh>
  );
});

Baton.displayName = 'Baton';

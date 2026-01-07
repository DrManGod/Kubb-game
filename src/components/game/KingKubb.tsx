import { useState, useEffect, useRef } from 'react';
import { useBox } from '@react-three/cannon';
import { Mesh, Group } from 'three';
import { useFrame } from '@react-three/fiber';
import { COLLISION_GROUPS, COLLISION_MASKS } from './Baton';

interface KingKubbProps {
  position: [number, number, number];
  onHit: () => void;
  isHit: boolean;
}

export const KingKubb = ({ position, onHit, isHit }: KingKubbProps) => {
  const [hasBeenHit, setHasBeenHit] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const crownRef = useRef<Group>(null);
  
  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 500);
    return () => clearTimeout(timer);
  }, []);
  
  const [cubeRef, api] = useBox<Mesh>(() => ({
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
    // King collides with both player and bot batons
    collisionFilterGroup: COLLISION_GROUPS.KING,
    collisionFilterMask: COLLISION_MASKS.KING,
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

  // Sync crown group with physics body
  useFrame(() => {
    if (cubeRef.current && crownRef.current) {
      crownRef.current.position.copy(cubeRef.current.position);
      crownRef.current.quaternion.copy(cubeRef.current.quaternion);
    }
  });

  const woodColor = hasBeenHit || isHit ? '#8B7355' : '#D4A574';
  const crownColor = hasBeenHit || isHit ? '#8B7355' : '#C4A35A';

  return (
    <group>
      {/* Main body - taller rectangular kubb shape */}
      <mesh ref={cubeRef} castShadow receiveShadow>
        <boxGeometry args={[0.4, 1.0, 0.4]} />
        <meshStandardMaterial
          color={woodColor}
          roughness={0.7}
          metalness={0.05}
        />
      </mesh>
      
      {/* Crown - attached to body via ref sync */}
      <group ref={crownRef}>
        {/* Crown platform */}
        <mesh position={[0, 0.55, 0]} castShadow>
          <boxGeometry args={[0.5, 0.1, 0.5]} />
          <meshStandardMaterial
            color={crownColor}
            roughness={0.6}
            metalness={0.1}
          />
        </mesh>
        
        {/* Crown points - four corners */}
        <mesh position={[-0.18, 0.72, -0.18]} castShadow>
          <boxGeometry args={[0.1, 0.24, 0.1]} />
          <meshStandardMaterial color={crownColor} roughness={0.6} metalness={0.1} />
        </mesh>
        <mesh position={[0.18, 0.72, -0.18]} castShadow>
          <boxGeometry args={[0.1, 0.24, 0.1]} />
          <meshStandardMaterial color={crownColor} roughness={0.6} metalness={0.1} />
        </mesh>
        <mesh position={[-0.18, 0.72, 0.18]} castShadow>
          <boxGeometry args={[0.1, 0.24, 0.1]} />
          <meshStandardMaterial color={crownColor} roughness={0.6} metalness={0.1} />
        </mesh>
        <mesh position={[0.18, 0.72, 0.18]} castShadow>
          <boxGeometry args={[0.1, 0.24, 0.1]} />
          <meshStandardMaterial color={crownColor} roughness={0.6} metalness={0.1} />
        </mesh>
        
        {/* Center crown point - taller */}
        <mesh position={[0, 0.78, 0]} castShadow>
          <boxGeometry args={[0.12, 0.36, 0.12]} />
          <meshStandardMaterial color={crownColor} roughness={0.6} metalness={0.1} />
        </mesh>
      </group>
    </group>
  );
};

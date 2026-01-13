import { useState, useEffect } from 'react';
import { useBox } from '@react-three/cannon';
import { Mesh } from 'three';
import { COLLISION_GROUPS, COLLISION_MASKS } from './Baton';

interface TargetCubeProps {
  position: [number, number, number];
  color: string;
  id: number;
  onHit: (id: number) => void;
  isHit: boolean;
  disabled?: boolean;
}

export type { TargetCubeProps };

export const TargetCube = ({ position, color, id, onHit, isHit, disabled = false }: TargetCubeProps) => {
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
    // Bot baseline kubbs - only collide with player batons
    collisionFilterGroup: COLLISION_GROUPS.BOT_KUBBS,
    collisionFilterMask: COLLISION_MASKS.BOT_KUBBS,
    onCollide: (e) => {
      console.log('🔔 Bot baseline kubb collision detected! ID:', id, 'hasBeenHit:', hasBeenHit, 'isReady:', isReady, 'disabled:', disabled, 'hasBody:', !!e.body);
      if (!hasBeenHit && isReady && !disabled && e.body) {
        const contactImpact = e.contact?.impactVelocity;
        const v = (e.body as any)?.velocity as { x: number; y: number; z: number } | undefined;
        const bodySpeed = v ? Math.hypot(v.x, v.y, v.z) : 0;
        const velocity = contactImpact ?? bodySpeed;
        console.log('💥 Collision velocity:', velocity, 'threshold: 0.03');
        if (velocity > 0.03) {
          console.log('✅ Velocity threshold met, calling onHit for kubb', id);
          setHasBeenHit(true);
          onHit(id);
          api.mass.set(0.03);
          api.wakeUp();
          const impulseX = (Math.random() - 0.5) * 0.6;
          api.applyImpulse([impulseX, 0.2, -1.2], [0, 0.3, 0]);
          api.angularVelocity.set(
            (Math.random() - 0.5) * 3,
            (Math.random() - 0.5) * 1.5,
            -5 + Math.random() * 1
          );
        } else {
          console.log('❌ Velocity too low, ignoring collision');
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

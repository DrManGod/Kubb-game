import { useState, useEffect } from 'react';
import { useBox } from '@react-three/cannon';
import { Mesh } from 'three';
import { COLLISION_GROUPS, COLLISION_MASKS } from './Baton';

interface FieldKubbProps {
  id: string;
  position: [number, number, number];
  onHit: (id: string) => void;
  isHit: boolean;
  side: 'player' | 'bot'; // Which side of the field this kubb is on
}

export const FieldKubb = ({ id, position, onHit, isHit, side }: FieldKubbProps) => {
  const [hasBeenHit, setHasBeenHit] = useState(false);
  const [isReady, setIsReady] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 500);
    return () => clearTimeout(timer);
  }, []);
  
  // Field kubbs on player's side can only be hit by bot batons
  // Field kubbs on bot's side can only be hit by player batons
  const collisionGroup = side === 'player' ? COLLISION_GROUPS.PLAYER_KUBBS : COLLISION_GROUPS.BOT_KUBBS;
  const collisionMask = side === 'player' ? COLLISION_MASKS.PLAYER_KUBBS : COLLISION_MASKS.BOT_KUBBS;
  
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
    collisionFilterGroup: collisionGroup,
    collisionFilterMask: collisionMask,
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
          const impulseZ = side === 'player' ? 1.2 : -1.2; // Fall toward the back
          api.applyImpulse([impulseX, 0.2, impulseZ], [0, 0.3, 0]);
          api.angularVelocity.set(
            (Math.random() - 0.5) * 3,
            (Math.random() - 0.5) * 1.5,
            (side === 'player' ? 5 : -5) + Math.random() * 1
          );
        }
      }
    },
  }));

  // Color based on side - blue tint for player side (to be hit by bot), brown for bot side (to be hit by player)
  const baseColor = side === 'player' ? '#6B4423' : '#8B6914';
  const emissiveColor = side === 'player' ? '#5C3A1D' : '#7A5812';

  return (
    <mesh ref={cubeRef} castShadow receiveShadow>
      <boxGeometry args={[0.3, 0.6, 0.3]} />
      <meshStandardMaterial
        color={hasBeenHit || isHit ? '#888888' : baseColor}
        roughness={0.4}
        metalness={0.05}
        emissive={hasBeenHit || isHit ? '#000000' : emissiveColor}
        emissiveIntensity={hasBeenHit || isHit ? 0 : 0.1}
      />
    </mesh>
  );
};

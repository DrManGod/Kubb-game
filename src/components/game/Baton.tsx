import { useState, forwardRef, useImperativeHandle, useEffect } from 'react';
import { useCylinder } from '@react-three/cannon';
import { Mesh } from 'three';

// Collision groups for filtering
export const COLLISION_GROUPS = {
  GROUND: 1,
  PLAYER_BATON: 2,
  BOT_BATON: 4,
  PLAYER_KUBBS: 8,   // Player baseline + player-side field kubbs
  BOT_KUBBS: 16,     // Bot baseline + bot-side field kubbs
  KING: 32,
};

// Masks define what each group collides with
export const COLLISION_MASKS = {
  GROUND: -1, // Collide with everything
  PLAYER_BATON: COLLISION_GROUPS.GROUND | COLLISION_GROUPS.BOT_KUBBS | COLLISION_GROUPS.KING,
  BOT_BATON: COLLISION_GROUPS.GROUND | COLLISION_GROUPS.PLAYER_KUBBS | COLLISION_GROUPS.KING,
  PLAYER_KUBBS: COLLISION_GROUPS.GROUND | COLLISION_GROUPS.BOT_BATON | COLLISION_GROUPS.PLAYER_KUBBS,
  BOT_KUBBS: COLLISION_GROUPS.GROUND | COLLISION_GROUPS.PLAYER_BATON | COLLISION_GROUPS.BOT_KUBBS,
  KING: COLLISION_GROUPS.GROUND | COLLISION_GROUPS.PLAYER_BATON | COLLISION_GROUPS.BOT_BATON,
};

interface BatonProps {
  position: [number, number, number];
  isPlayerBaton?: boolean; // true for player, false for bot
}

export interface BatonRef {
  throw: (velocity: [number, number, number], angularVelocity: [number, number, number]) => void;
  reset: (position: [number, number, number]) => void;
  setOwner: (isPlayer: boolean) => void;
}

export const Baton = forwardRef<BatonRef, BatonProps>(({ position, isPlayerBaton = true }, ref) => {
  const [isThrown, setIsThrown] = useState(false);
  const [isPlayer, setIsPlayer] = useState(isPlayerBaton);
  
  // Vertical baton for end-over-end throw
  const [cylinderRef, api] = useCylinder<Mesh>(() => ({
    mass: isThrown ? 1.5 : 0,
    position,
    args: [0.08, 0.08, 1.2, 16],
    rotation: [Math.PI / 2, 0, 0],
    linearDamping: 0.1,
    angularDamping: 0.05,
    type: 'Dynamic',
    material: {
      friction: 0.5,
      restitution: 0.4,
    },
    collisionFilterGroup: isPlayer ? COLLISION_GROUPS.PLAYER_BATON : COLLISION_GROUPS.BOT_BATON,
    collisionFilterMask: isPlayer ? COLLISION_MASKS.PLAYER_BATON : COLLISION_MASKS.BOT_BATON,
  }));

  // Update collision groups when owner changes
  useEffect(() => {
    // This is handled by the physics body setup
  }, [isPlayer]);

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
      api.rotation.set(Math.PI / 2, 0, 0);
    },
    setOwner: (isPlayerOwner: boolean) => {
      setIsPlayer(isPlayerOwner);
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

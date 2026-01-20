import { useState, useEffect, useRef, useCallback } from 'react';
import { useBox } from '@react-three/cannon';
import { Mesh } from 'three';
import { COLLISION_GROUPS, COLLISION_MASKS } from './Baton';

interface PlayerBaselineKubbProps {
  id: number;
  position: [number, number, number];
  onHit: (id: number) => void;
  isHit: boolean;
}

export const PlayerBaselineKubb = ({ id, position, onHit, isHit }: PlayerBaselineKubbProps) => {
  const [hasBeenHit, setHasBeenHit] = useState(false);
  const [isReady, setIsReady] = useState(false);
  
  // Use refs to avoid stale closure in physics callback
  const hasBeenHitRef = useRef(hasBeenHit);
  const isReadyRef = useRef(isReady);
  const onHitRef = useRef(onHit);
  
  useEffect(() => { hasBeenHitRef.current = hasBeenHit; }, [hasBeenHit]);
  useEffect(() => { isReadyRef.current = isReady; }, [isReady]);
  useEffect(() => { onHitRef.current = onHit; }, [onHit]);
  
  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 500);
    return () => clearTimeout(timer);
  }, []);
  
  const handleCollision = useCallback((e: any, apiRef: any) => {
    if (!hasBeenHitRef.current && isReadyRef.current && e.body) {
      const contactImpact = e.contact?.impactVelocity;
      const v = (e.body as any)?.velocity as { x: number; y: number; z: number } | undefined;
      const bodySpeed = v ? Math.hypot(v.x, v.y, v.z) : 0;
      const velocity = contactImpact ?? bodySpeed;
      if (velocity > 0.03) {
        console.log('🎯 PlayerBaselineKubb collision detected! ID:', id, 'velocity:', velocity);
        hasBeenHitRef.current = true;
        setHasBeenHit(true);
        onHitRef.current(id);
        apiRef.wakeUp();
        const impulseX = (Math.random() - 0.5) * 0.6;
        apiRef.applyImpulse([impulseX, 0.2, 1.2], [0, 0.3, 0]);
        apiRef.angularVelocity.set(
          (Math.random() - 0.5) * 3,
          (Math.random() - 0.5) * 1.5,
          5 + Math.random() * 1
        );
      }
    }
  }, [id]);
  
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
    // Player baseline kubbs - only collide with bot batons
    collisionFilterGroup: COLLISION_GROUPS.PLAYER_KUBBS,
    collisionFilterMask: COLLISION_MASKS.PLAYER_KUBBS,
    onCollide: (e) => handleCollision(e, api),
  }));

  return (
    <mesh ref={cubeRef} castShadow receiveShadow>
      <boxGeometry args={[0.3, 0.6, 0.3]} />
      <meshStandardMaterial
        color={hasBeenHit || isHit ? '#555555' : '#2563eb'}
        roughness={0.4}
        metalness={0.05}
        emissive={hasBeenHit || isHit ? '#000000' : '#1d4ed8'}
        emissiveIntensity={hasBeenHit || isHit ? 0 : 0.15}
      />
    </mesh>
  );
};

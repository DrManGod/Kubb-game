import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useBox } from '@react-three/cannon';
import { Mesh } from 'three';
import * as THREE from 'three';

interface ThrownKubbProps {
  startPosition: [number, number, number];
  power: number;
  angle: number;
  spin: number;
  targetSide: 'player' | 'bot';
  onLanded: (finalPosition: [number, number, number]) => void;
}

export const ThrownKubb = ({
  startPosition,
  power,
  angle,
  spin,
  targetSide,
  onLanded
}: ThrownKubbProps) => {
  const [hasLanded, setHasLanded] = useState(false);
  const landingTimerRef = useRef<NodeJS.Timeout>();
  const lastVelocityRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 10, 0));
  const positionRef = useRef<[number, number, number]>(startPosition);

  // Create physics body for kubb
  const [ref, api] = useBox<Mesh>(() => ({
    mass: 1.5,
    position: startPosition,
    args: [0.5, 1.5, 0.5],
    material: {
      friction: 0.8,
      restitution: 0.3,
    },
  }));

  // Subscribe to velocity to detect when kubb stops
  useEffect(() => {
    const unsubscribe = api.velocity.subscribe((v) => {
      lastVelocityRef.current.set(v[0], v[1], v[2]);
    });
    return unsubscribe;
  }, [api]);

  // Subscribe to position
  useEffect(() => {
    const unsubscribe = api.position.subscribe((pos) => {
      positionRef.current = [pos[0], pos[1], pos[2]];
    });
    return unsubscribe;
  }, [api]);

  // Throw the kubb on mount
  useEffect(() => {
    // Bot throws toward player (positive Z), player throws toward bot (negative Z)
    const direction = targetSide === 'player' ? 1 : -1;
    const angleRad = (angle * Math.PI) / 180;
    
    // Calculate velocity (higher arc than batons)
    const horizontalSpeed = power * 0.15;
    const verticalSpeed = power * 0.2;
    
    const velocityX = (Math.random() - 0.5) * 0.5; // Small random horizontal
    const velocityY = Math.sin(angleRad) * verticalSpeed;
    const velocityZ = direction * Math.cos(angleRad) * horizontalSpeed;

    // Apply throw force
    api.velocity.set(velocityX, velocityY, velocityZ);
    
    // Apply spin
    api.angularVelocity.set(
      0,
      spin * 0.05, // Spin around vertical axis
      0
    );

    console.log('🎾 Kubb thrown:', { 
      velocity: [velocityX, velocityY, velocityZ], 
      spin,
      targetSide,
      direction
    });
  }, [power, angle, spin, targetSide, api]);

  // Check if kubb has landed (velocity near zero) OR fell out of bounds
  useFrame(() => {
    if (hasLanded) return;

    const pos = positionRef.current;

    // If the kubb falls through the world or flies way out, treat it as landed.
    // This prevents the game from getting stuck waiting for a "landing" that never happens.
    const isOutOfBounds = pos[1] < -5 || Math.abs(pos[0]) > 20 || Math.abs(pos[2]) > 25;
    if (isOutOfBounds) {
      setHasLanded(true);

      const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
      const clampedX = clamp(pos[0], -3.5, 3.5);
      const clampedZ =
        targetSide === 'player'
          ? clamp(pos[2], -1.5, 2.5)
          : clamp(pos[2], -8, -5);

      console.log('🧯 Kubb went out of bounds, clamping landing to:', [clampedX, -1.7, clampedZ]);

      // Stop physics
      api.rotation.set(0, 0, 0);
      api.velocity.set(0, 0, 0);
      api.angularVelocity.set(0, 0, 0);

      onLanded([clampedX, -1.7, clampedZ]);
      return;
    }

    const velocity = lastVelocityRef.current;
    const speed = velocity.length();

    // Kubb has landed if speed is very low
    if (speed < 0.5) {
      if (!landingTimerRef.current) {
        // Wait 500ms to make sure it's really stopped
        landingTimerRef.current = setTimeout(() => {
          if (hasLanded) return;

          setHasLanded(true);

          const landedPos = positionRef.current;
          console.log('🎯 Kubb landed at:', landedPos);

          // Stand kubb upright
          api.rotation.set(0, 0, 0);
          api.velocity.set(0, 0, 0);
          api.angularVelocity.set(0, 0, 0);

          // Call landed callback with final position
          onLanded([landedPos[0], landedPos[1], landedPos[2]]);
        }, 500);
      }
    } else {
      // Still moving, clear timer
      if (landingTimerRef.current) {
        clearTimeout(landingTimerRef.current);
        landingTimerRef.current = undefined;
      }
    }
  });

  // Cleanup
  useEffect(() => {
    return () => {
      if (landingTimerRef.current) {
        clearTimeout(landingTimerRef.current);
      }
    };
  }, []);

  return (
    <mesh ref={ref} castShadow receiveShadow>
      <boxGeometry args={[0.5, 1.5, 0.5]} />
      <meshStandardMaterial 
        color={targetSide === 'player' ? '#FF6B6B' : '#4ECDC4'} 
        transparent
        opacity={hasLanded ? 0 : 1}
      />
    </mesh>
  );
};

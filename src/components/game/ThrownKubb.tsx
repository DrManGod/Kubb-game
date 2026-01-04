import { useRef, useEffect, useState } from 'react';
import { useBox } from '@react-three/cannon';
import { Mesh } from 'three';
import { useFrame } from '@react-three/fiber';

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
  onLanded,
}: ThrownKubbProps) => {
  const hasLanded = useRef(false);
  const [landed, setLanded] = useState(false);
  const positionRef = useRef<[number, number, number]>(startPosition);
  const velocityRef = useRef<[number, number, number]>([0, 0, 0]);
  const checkStartTime = useRef(Date.now() + 800);

  // Kubb physics body
  const [ref, api] = useBox<Mesh>(() => ({
    mass: 0.5,
    position: startPosition,
    args: [0.3, 0.6, 0.3],
    material: { friction: 0.8, restitution: 0.2 },
    linearDamping: 0.1,
    angularDamping: 0.2,
  }));

  // Apply initial throw velocity
  useEffect(() => {
    const angleRad = (angle * Math.PI) / 180;
    const powerMultiplier = power / 100;
    
    // Direction based on target side
    const zDirection = targetSide === 'bot' ? -1 : 1;
    
    // Calculate velocities - higher arc for kubb throws
    const velocityZ = zDirection * (5 + powerMultiplier * 5);
    const velocityY = Math.sin(angleRad) * (4 + powerMultiplier * 4);
    const velocityX = (spin / 100) * 1.5;

    api.velocity.set(velocityX, velocityY, velocityZ);
    api.angularVelocity.set(
      (Math.random() - 0.5) * 4,
      (spin / 100) * 6,
      zDirection * 5 + (Math.random() - 0.5) * 2
    );
  }, [api, power, angle, spin, targetSide]);

  // Track position
  useEffect(() => {
    const unsubscribe = api.position.subscribe((pos) => {
      positionRef.current = [pos[0], pos[1], pos[2]];
    });
    return unsubscribe;
  }, [api]);

  // Track velocity
  useEffect(() => {
    const unsubscribe = api.velocity.subscribe((vel) => {
      velocityRef.current = [vel[0], vel[1], vel[2]];
    });
    return unsubscribe;
  }, [api]);

  // Check for landing
  useFrame(() => {
    if (hasLanded.current) return;
    if (Date.now() < checkStartTime.current) return;

    const [vx, vy, vz] = velocityRef.current;
    const [px, py, pz] = positionRef.current;
    const speed = Math.sqrt(vx * vx + vy * vy + vz * vz);

    // Check if kubb has landed (near ground and slow)
    if (py < -1.2 && speed < 1.0) {
      hasLanded.current = true;
      setLanded(true);

      // Stop movement
      api.velocity.set(0, 0, 0);
      api.angularVelocity.set(0, 0, 0);
      
      // Stand kubb upright
      api.rotation.set(0, 0, 0);
      
      // Clamp position to valid field area
      let finalX = Math.max(-3.5, Math.min(3.5, px));
      let finalZ: number;
      
      if (targetSide === 'bot') {
        // Thrown to bot's side - clamp to bot's field area
        finalZ = Math.max(-8.5, Math.min(-4.5, pz));
      } else {
        // Thrown to player's side - clamp to player's field area
        finalZ = Math.max(-1.5, Math.min(2.0, pz));
      }
      
      const finalPos: [number, number, number] = [finalX, -1.7, finalZ];
      
      // Set final position (standing upright)
      api.position.set(finalPos[0], finalPos[1], finalPos[2]);
      
      // Notify parent after a short delay for visual effect
      setTimeout(() => {
        onLanded(finalPos);
      }, 300);
    }
  });

  return (
    <mesh ref={ref} castShadow>
      <boxGeometry args={[0.3, 0.6, 0.3]} />
      <meshStandardMaterial 
        color={landed ? '#f59e0b' : '#fbbf24'}
        emissive={landed ? '#000000' : '#fbbf24'}
        emissiveIntensity={landed ? 0 : 0.2}
      />
    </mesh>
  );
};

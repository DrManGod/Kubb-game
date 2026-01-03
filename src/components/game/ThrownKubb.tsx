import { useRef, useEffect, useState } from 'react';
import { useBox } from '@react-three/cannon';
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
  onLanded,
}: ThrownKubbProps) => {
  const hasLanded = useRef(false);
  const [landed, setLanded] = useState(false);

  // Kubb physics body
  const [ref, api] = useBox(() => ({
    mass: 0.5,
    position: startPosition,
    args: [0.25, 0.5, 0.25],
    material: { friction: 0.8, restitution: 0.2 },
  }));

  // Apply initial throw velocity
  useEffect(() => {
    const angleRad = (angle * Math.PI) / 180;
    const powerMultiplier = power / 100;
    
    // Direction based on target side
    const zDirection = targetSide === 'bot' ? -1 : 1;
    
    // Calculate velocities
    const velocityZ = zDirection * (4 + powerMultiplier * 6);
    const velocityY = Math.sin(angleRad) * (3 + powerMultiplier * 4);
    const velocityX = (spin / 100) * 2; // Spin affects horizontal drift

    api.velocity.set(velocityX, velocityY, velocityZ);
    api.angularVelocity.set(
      (Math.random() - 0.5) * 3,
      (spin / 100) * 8, // Spin rotation
      (Math.random() - 0.5) * 3
    );
  }, [api, power, angle, spin, targetSide]);

  // Track position for landing detection
  useEffect(() => {
    const unsubscribe = api.position.subscribe((position) => {
      // Check if kubb has landed (low velocity, on ground)
      if (!hasLanded.current && position[1] < -1.4) {
        api.velocity.subscribe((vel) => {
          const speed = Math.sqrt(vel[0] ** 2 + vel[1] ** 2 + vel[2] ** 2);
          if (speed < 0.5 && !hasLanded.current) {
            hasLanded.current = true;
            setLanded(true);
            
            // Get final position
            const finalPos: [number, number, number] = [
              Math.max(-3.5, Math.min(3.5, position[0])),
              -1.7,
              position[2],
            ];
            
            // Clamp to correct field side
            if (targetSide === 'bot') {
              finalPos[2] = Math.max(-8, Math.min(-5, position[2]));
            } else {
              finalPos[2] = Math.max(-1.5, Math.min(2.5, position[2]));
            }
            
            setTimeout(() => onLanded(finalPos), 500);
          }
        });
      }
    });

    return () => unsubscribe();
  }, [api, onLanded, targetSide]);

  return (
    <mesh ref={ref as any} castShadow>
      <boxGeometry args={[0.25, 0.5, 0.25]} />
      <meshStandardMaterial 
        color={landed ? '#f59e0b' : '#fbbf24'}
        emissive={landed ? '#000000' : '#fbbf24'}
        emissiveIntensity={landed ? 0 : 0.2}
      />
    </mesh>
  );
};

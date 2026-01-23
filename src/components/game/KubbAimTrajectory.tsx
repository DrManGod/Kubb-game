import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';

interface KubbAimTrajectoryProps {
  startPosition: [number, number, number];
  power: number;
  angle: number;
  spin: number;
  targetSide: 'player' | 'bot';
  visible: boolean;
}

export const KubbAimTrajectory = ({ 
  startPosition, 
  power, 
  angle, 
  spin, 
  targetSide,
  visible 
}: KubbAimTrajectoryProps) => {
  const fluctuationRef = useRef(0);
  
  useFrame((state) => {
    fluctuationRef.current = Math.sin(state.clock.elapsedTime * 2) * 0.1;
  });
  
  const points = useMemo(() => {
    if (!visible || power < 10) return [];
    
    // Match the throw physics from ThrownKubb.tsx exactly
    const gravity = -9.81;
    const direction = targetSide === 'player' ? 1 : -1;
    const angleRad = (angle * Math.PI) / 180;
    
    // Calculate velocity (higher arc than batons)
    const horizontalSpeed = power * 0.15;
    const verticalSpeed = power * 0.2;
    
    // Add spin effect to horizontal drift
    const spinDrift = spin * 0.002;
    
    const velocityX = spinDrift + fluctuationRef.current;
    const velocityY = Math.sin(angleRad) * verticalSpeed;
    const velocityZ = direction * Math.cos(angleRad) * horizontalSpeed;
    
    const trajectoryPoints: THREE.Vector3[] = [];
    const steps = 50;
    const timeStep = 0.08;
    
    for (let i = 0; i <= steps; i++) {
      const t = i * timeStep;
      const x = startPosition[0] + velocityX * t;
      const y = startPosition[1] + velocityY * t + 0.5 * gravity * t * t;
      const z = startPosition[2] + velocityZ * t;
      
      // Stop if below ground
      if (y < -2) break;
      
      trajectoryPoints.push(new THREE.Vector3(x, y, z));
    }
    
    return trajectoryPoints;
  }, [startPosition, power, angle, spin, targetSide, visible, fluctuationRef.current]);
  
  if (!visible || points.length < 2) return null;
  
  return (
    <Line
      points={points}
      color="#8B4513"
      lineWidth={4}
      opacity={0.7}
      transparent
      dashed
      dashSize={0.4}
      gapSize={0.2}
    />
  );
};

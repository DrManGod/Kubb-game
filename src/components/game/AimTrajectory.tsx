import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';

interface AimTrajectoryProps {
  startPosition: [number, number, number];
  power: number;
  aimOffset: number;
  visible: boolean;
}

export const AimTrajectory = ({ startPosition, power, aimOffset, visible }: AimTrajectoryProps) => {
  const fluctuationRef = useRef(0);
  const lineRef = useRef<any>(null);
  
  useFrame((state) => {
    fluctuationRef.current = Math.sin(state.clock.elapsedTime * 3) * 0.15;
  });
  
  const points = useMemo(() => {
    if (!visible || power < 0.1) return [];
    
    // Match the throw physics exactly
    const gravity = -9.81;
    const velocityZ = -6 - power * 6;
    const velocityY = 3 + power * 3;
    const velocityX = aimOffset * 0.8;
    
    const trajectoryPoints: THREE.Vector3[] = [];
    const steps = 40;
    const timeStep = 0.06;
    
    for (let i = 0; i <= steps; i++) {
      const t = i * timeStep;
      const x = startPosition[0] + velocityX * t + fluctuationRef.current * Math.sin(i * 0.5);
      const y = startPosition[1] + velocityY * t + 0.5 * gravity * t * t;
      const z = startPosition[2] + velocityZ * t;
      
      // Stop if below ground
      if (y < -2) break;
      
      trajectoryPoints.push(new THREE.Vector3(x, y, z));
    }
    
    return trajectoryPoints;
  }, [startPosition, power, aimOffset, visible, fluctuationRef.current]);
  
  if (!visible || points.length < 2) return null;
  
  return (
    <Line
      ref={lineRef}
      points={points}
      color="#FFD700"
      lineWidth={3}
      opacity={0.6}
      transparent
      dashed
      dashSize={0.3}
      gapSize={0.15}
    />
  );
};

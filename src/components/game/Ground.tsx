import { usePlane, useBox } from '@react-three/cannon';
import { Mesh } from 'three';

export const Ground = () => {
  // Kubb field dimensions - 5:8 ratio (5m x 8m scaled)
  const fieldWidth = 8;
  const fieldLength = 12.8; // 8 * 1.6 to maintain 5:8 ratio visually in 3D
  
  const [ref] = usePlane<Mesh>(() => ({
    rotation: [-Math.PI / 2, 0, 0],
    position: [0, -2, -3],
    type: 'Static',
  }));

  return (
    <group>
      {/* Main grass field */}
      <mesh ref={ref} receiveShadow>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial color="#4a7c23" roughness={0.9} />
      </mesh>
      
      {/* Kubb field boundary */}
      <mesh position={[0, -1.99, -3]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[fieldWidth, fieldLength]} />
        <meshStandardMaterial color="#5d9a2d" roughness={0.8} />
      </mesh>
      
      {/* Field boundary lines */}
      {/* Left line */}
      <mesh position={[-fieldWidth / 2, -1.98, -3]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.08, fieldLength]} />
        <meshStandardMaterial color="#ffffff" roughness={0.5} />
      </mesh>
      
      {/* Right line */}
      <mesh position={[fieldWidth / 2, -1.98, -3]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.08, fieldLength]} />
        <meshStandardMaterial color="#ffffff" roughness={0.5} />
      </mesh>
      
      {/* Front baseline (player side) */}
      <mesh position={[0, -1.98, fieldLength / 2 - 3]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[fieldWidth, 0.08]} />
        <meshStandardMaterial color="#ffffff" roughness={0.5} />
      </mesh>
      
      {/* Back baseline (target side) */}
      <mesh position={[0, -1.98, -fieldLength / 2 - 3]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[fieldWidth, 0.08]} />
        <meshStandardMaterial color="#ffffff" roughness={0.5} />
      </mesh>
      
      {/* Center line */}
      <mesh position={[0, -1.98, -3]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[fieldWidth, 0.05]} />
        <meshStandardMaterial color="#ffffff" opacity={0.5} transparent roughness={0.5} />
      </mesh>
      
      {/* Corner markers */}
      {[
        [-fieldWidth / 2, fieldLength / 2 - 3],
        [fieldWidth / 2, fieldLength / 2 - 3],
        [-fieldWidth / 2, -fieldLength / 2 - 3],
        [fieldWidth / 2, -fieldLength / 2 - 3],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, -1.97, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.15, 16]} />
          <meshStandardMaterial color="#ffffff" roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
};

import { usePlane } from '@react-three/cannon';
import { Mesh } from 'three';

export const Ground = () => {
  const [ref] = usePlane<Mesh>(() => ({
    rotation: [-Math.PI / 2, 0, 0],
    position: [0, -2, 0],
    type: 'Static',
  }));

  return (
    <mesh ref={ref} receiveShadow>
      <planeGeometry args={[50, 50]} />
      <meshStandardMaterial 
        color="#90EE90" 
        roughness={0.8}
      />
    </mesh>
  );
};

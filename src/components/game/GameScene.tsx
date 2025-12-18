import { useRef, useState, useCallback, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Physics } from '@react-three/cannon';
import { OrbitControls, Sky } from '@react-three/drei';
import { Baton, BatonRef } from './Baton';
import { TargetCube } from './TargetCube';
import { Ground } from './Ground';

const CUBE_COLORS = ['#FF6B6B', '#4ECDC4', '#95E67A', '#FFE66D', '#A06CD5'];

const CUBE_POSITIONS: [number, number, number][] = [
  [-2, 0, -5],
  [-1, 0, -6],
  [0, 0, -5],
  [1, 0, -6],
  [2, 0, -5],
];

interface GameSceneContentProps {
  onScoreChange: (score: number) => void;
  onThrowsChange: (throws: number) => void;
  resetKey: number;
}

const GameSceneContent = ({ onScoreChange, onThrowsChange, resetKey }: GameSceneContentProps) => {
  const batonRef = useRef<BatonRef>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [hitCubes, setHitCubes] = useState<Set<number>>(new Set());
  const [throwCount, setThrowCount] = useState(0);

  const batonStartPos: [number, number, number] = [0, 0, 3];

  // Reset state when resetKey changes
  useEffect(() => {
    setHitCubes(new Set());
    setThrowCount(0);
    onScoreChange(0);
    onThrowsChange(0);
    batonRef.current?.reset(batonStartPos);
  }, [resetKey]);

  const handlePointerDown = useCallback((e: any) => {
    e.stopPropagation();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  }, []);

  const handlePointerUp = useCallback((e: any) => {
    if (isDragging && dragStart && batonRef.current) {
      const deltaX = (e.clientX - dragStart.x) * 0.05;
      const deltaY = (dragStart.y - e.clientY) * 0.08;
      
      // Calculate throw velocity based on drag
      const velocity: [number, number, number] = [
        deltaX * 2,
        Math.max(deltaY, 2) * 1.5,
        -15 - Math.abs(deltaY) * 2,
      ];
      const angularVelocity: [number, number, number] = [
        deltaY * 2,
        deltaX,
        Math.random() * 4 - 2,
      ];
      
      batonRef.current.throw(velocity, angularVelocity);
      
      const newThrowCount = throwCount + 1;
      setThrowCount(newThrowCount);
      onThrowsChange(newThrowCount);
      
      // Reset baton after delay
      setTimeout(() => {
        batonRef.current?.reset(batonStartPos);
      }, 2000);
    }
    
    setIsDragging(false);
    setDragStart(null);
  }, [isDragging, dragStart, throwCount, onThrowsChange]);

  const handleCubeHit = useCallback((id: number) => {
    setHitCubes(prev => {
      const newSet = new Set(prev);
      if (!newSet.has(id)) {
        newSet.add(id);
        onScoreChange(newSet.size);
      }
      return newSet;
    });
  }, [onScoreChange]);

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[10, 15, 10]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={50}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      
      <Sky sunPosition={[100, 50, 100]} />
      
      <Physics gravity={[0, -9.81, 0]}>
        <Ground />
        
        <Baton ref={batonRef} position={batonStartPos} />
        
        {CUBE_POSITIONS.map((pos, i) => (
          <TargetCube
            key={`${resetKey}-${i}`}
            id={i}
            position={pos}
            color={CUBE_COLORS[i]}
            onHit={handleCubeHit}
            isHit={hitCubes.has(i)}
          />
        ))}
      </Physics>
      
      {/* Invisible plane to capture throws */}
      <mesh
        position={[0, 0, 5]}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      >
        <planeGeometry args={[20, 15]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      
      <OrbitControls 
        enableZoom={false}
        enablePan={false}
        maxPolarAngle={Math.PI / 2.2}
        minPolarAngle={Math.PI / 4}
        enabled={!isDragging}
      />
    </>
  );
};

interface GameSceneProps {
  onScoreChange: (score: number) => void;
  onThrowsChange: (throws: number) => void;
  resetKey: number;
}

export const GameScene = ({ onScoreChange, onThrowsChange, resetKey }: GameSceneProps) => {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 3, 10], fov: 55 }}
      style={{ touchAction: 'none' }}
    >
      <GameSceneContent 
        onScoreChange={onScoreChange} 
        onThrowsChange={onThrowsChange}
        resetKey={resetKey}
      />
    </Canvas>
  );
};

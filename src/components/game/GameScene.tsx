import { useRef, useState, useCallback, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/cannon';
import { OrbitControls, Sky } from '@react-three/drei';
import { Baton, BatonRef } from './Baton';
import { TargetCube } from './TargetCube';
import { Ground } from './Ground';

const CUBE_COLORS = ['#FF6B6B', '#4ECDC4', '#95E67A', '#FFE66D', '#A06CD5'];

// Kubb-style positions - spread across the back line (adjusted Y for smaller kubbs)
const CUBE_POSITIONS: [number, number, number][] = [
  [-2.5, -1.5, -8],
  [-1.25, -1.5, -8],
  [0, -1.5, -8],
  [1.25, -1.5, -8],
  [2.5, -1.5, -8],
];

const BATONS_PER_TURN = 6;

interface GameSceneContentProps {
  onScoreChange: (score: number) => void;
  onThrowsChange: (throws: number) => void;
  onBatonsLeftChange: (batonsLeft: number) => void;
  resetKey: number;
}

const GameSceneContent = ({ onScoreChange, onThrowsChange, onBatonsLeftChange, resetKey }: GameSceneContentProps) => {
  const batonRef = useRef<BatonRef>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [hitCubes, setHitCubes] = useState<Set<number>>(new Set());
  const [throwCount, setThrowCount] = useState(0);
  const [batonsLeft, setBatonsLeft] = useState(BATONS_PER_TURN);

  const batonStartPos: [number, number, number] = [0, -1, 4];

  // Reset state when resetKey changes
  useEffect(() => {
    setHitCubes(new Set());
    setThrowCount(0);
    setBatonsLeft(BATONS_PER_TURN);
    onScoreChange(0);
    onThrowsChange(0);
    onBatonsLeftChange(BATONS_PER_TURN);
    batonRef.current?.reset(batonStartPos);
  }, [resetKey]);

  const handlePointerDown = useCallback((e: any) => {
    if (batonsLeft <= 0) return;
    e.stopPropagation();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  }, [batonsLeft]);

  const handlePointerUp = useCallback((e: any) => {
    if (isDragging && dragStart && batonRef.current && batonsLeft > 0) {
      const deltaX = (e.clientX - dragStart.x) * 0.04;
      const deltaY = (dragStart.y - e.clientY) * 0.06;
      
      // Calculate throw velocity - lighter baton, less powerful throw
      const velocity: [number, number, number] = [
        deltaX * 0.8,
        Math.max(deltaY, 1) * 1.2,
        -10 - Math.abs(deltaY) * 0.8,
      ];
      
      const angularVelocity: [number, number, number] = [
        deltaY * 2,
        deltaX * 0.3,
        Math.random() * 1.5 - 0.75,
      ];
      
      batonRef.current.throw(velocity, angularVelocity);
      
      const newThrowCount = throwCount + 1;
      const newBatonsLeft = batonsLeft - 1;
      
      setThrowCount(newThrowCount);
      setBatonsLeft(newBatonsLeft);
      onThrowsChange(newThrowCount);
      onBatonsLeftChange(newBatonsLeft);
      
      // Reset baton after delay if batons remaining
      setTimeout(() => {
        if (newBatonsLeft > 0) {
          batonRef.current?.reset(batonStartPos);
        }
      }, 2500);
    }
    
    setIsDragging(false);
    setDragStart(null);
  }, [isDragging, dragStart, throwCount, batonsLeft, onThrowsChange, onBatonsLeftChange]);

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
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={60}
        shadow-camera-left={-25}
        shadow-camera-right={25}
        shadow-camera-top={25}
        shadow-camera-bottom={-25}
      />
      
      <Sky sunPosition={[100, 40, 100]} />
      
      <Physics gravity={[0, -18, 0]}>
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
        <planeGeometry args={[25, 20]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      
      <OrbitControls 
        enableZoom={false}
        enablePan={false}
        maxPolarAngle={Math.PI / 2.3}
        minPolarAngle={Math.PI / 5}
        enabled={!isDragging}
      />
    </>
  );
};

interface GameSceneProps {
  onScoreChange: (score: number) => void;
  onThrowsChange: (throws: number) => void;
  onBatonsLeftChange: (batonsLeft: number) => void;
  resetKey: number;
}

export const GameScene = ({ onScoreChange, onThrowsChange, onBatonsLeftChange, resetKey }: GameSceneProps) => {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 4, 12], fov: 50 }}
      style={{ touchAction: 'none' }}
    >
      <GameSceneContent 
        onScoreChange={onScoreChange} 
        onThrowsChange={onThrowsChange}
        onBatonsLeftChange={onBatonsLeftChange}
        resetKey={resetKey}
      />
    </Canvas>
  );
};

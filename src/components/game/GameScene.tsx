import { useRef, useState, useCallback, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/cannon';
import { OrbitControls, Sky, Html } from '@react-three/drei';
import { Baton, BatonRef } from './Baton';
import { TargetCube } from './TargetCube';
import { KingKubb } from './KingKubb';
import { Ground } from './Ground';
import { AimTrajectory } from './AimTrajectory';

const CUBE_COLORS = ['#FF6B6B', '#4ECDC4', '#95E67A', '#FFE66D', '#A06CD5'];

// Kubb-style positions - spread across the back line
const CUBE_POSITIONS: [number, number, number][] = [
  [-2.5, -1.5, -8],
  [-1.25, -1.5, -8],
  [0, -1.5, -8],
  [1.25, -1.5, -8],
  [2.5, -1.5, -8],
];

const KING_POSITION: [number, number, number] = [0, -1.3, -5];

const BATONS_PER_TURN = 6;

interface GameSceneContentProps {
  onScoreChange: (score: number) => void;
  onThrowsChange: (throws: number) => void;
  onBatonsLeftChange: (batonsLeft: number) => void;
  onKingHit: (premature: boolean) => void;
  resetKey: number;
}

const GameSceneContent = ({ onScoreChange, onThrowsChange, onBatonsLeftChange, onKingHit, resetKey }: GameSceneContentProps) => {
  const batonRef = useRef<BatonRef>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [currentDrag, setCurrentDrag] = useState<{ x: number; y: number } | null>(null);
  const [hitCubes, setHitCubes] = useState<Set<number>>(new Set());
  const [kingHit, setKingHit] = useState(false);
  const [throwCount, setThrowCount] = useState(0);
  const [batonsLeft, setBatonsLeft] = useState(BATONS_PER_TURN);

  const batonStartPos: [number, number, number] = [0, -1, 4];

  // Calculate power and aim from drag
  const power = isDragging && dragStart && currentDrag 
    ? Math.min((dragStart.y - currentDrag.y) / 150, 1)
    : 0;
  const aimOffset = isDragging && dragStart && currentDrag
    ? (currentDrag.x - dragStart.x) * 0.02
    : 0;

  // Reset state when resetKey changes
  useEffect(() => {
    setHitCubes(new Set());
    setKingHit(false);
    setThrowCount(0);
    setBatonsLeft(BATONS_PER_TURN);
    onScoreChange(0);
    onThrowsChange(0);
    onBatonsLeftChange(BATONS_PER_TURN);
    batonRef.current?.reset(batonStartPos);
  }, [resetKey]);

  const handlePointerDown = useCallback((e: any) => {
    if (batonsLeft <= 0 || kingHit) return;
    e.stopPropagation();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setCurrentDrag({ x: e.clientX, y: e.clientY });
  }, [batonsLeft, kingHit]);

  const handlePointerMove = useCallback((e: any) => {
    if (isDragging) {
      setCurrentDrag({ x: e.clientX, y: e.clientY });
    }
  }, [isDragging]);

  const handlePointerUp = useCallback((e: any) => {
    if (isDragging && dragStart && batonRef.current && batonsLeft > 0 && !kingHit) {
      const deltaX = (e.clientX - dragStart.x) * 0.02;
      const deltaY = Math.max((dragStart.y - e.clientY) * 0.01, 0);
      
      // Vertical throw with end-over-end rotation
      const throwPower = Math.min(deltaY, 1);
      const velocity: [number, number, number] = [
        deltaX * 0.6,
        2 + throwPower * 6,
        -10 - throwPower * 8,
      ];
      
      // End-over-end rotation (around X axis for vertical baton)
      const angularVelocity: [number, number, number] = [
        8 + throwPower * 6, // Main end-over-end spin
        deltaX * 0.5,
        0,
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
    setCurrentDrag(null);
  }, [isDragging, dragStart, throwCount, batonsLeft, kingHit, onThrowsChange, onBatonsLeftChange]);

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

  const handleKingHit = useCallback(() => {
    if (!kingHit) {
      setKingHit(true);
      const allKubbsDown = hitCubes.size === 5;
      onKingHit(!allKubbsDown);
    }
  }, [kingHit, hitCubes.size, onKingHit]);

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
        
        <KingKubb
          key={`king-${resetKey}`}
          position={KING_POSITION}
          onHit={handleKingHit}
          isHit={kingHit}
        />
      </Physics>
      
      {/* Aim trajectory */}
      <AimTrajectory
        startPosition={batonStartPos}
        power={power}
        aimOffset={aimOffset}
        visible={isDragging && power > 0.05}
      />
      
      {/* Power Meter as HTML overlay */}
      {isDragging && power > 0.05 && (
        <Html center position={[0, -3, 8]}>
          <div className="flex flex-col items-center gap-1 pointer-events-none">
            <div className="text-sm font-bold text-white drop-shadow-lg">Power</div>
            <div className="w-32 h-4 bg-black/50 backdrop-blur-sm rounded-full overflow-hidden border border-white/30">
              <div 
                className={`h-full transition-all duration-75 ${
                  power * 100 < 30 ? 'bg-green-500' :
                  power * 100 < 60 ? 'bg-yellow-500' :
                  power * 100 < 85 ? 'bg-orange-500' : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(power * 100, 100)}%` }}
              />
            </div>
          </div>
        </Html>
      )}
      
      {/* Invisible plane to capture throws */}
      <mesh
        position={[0, 0, 5]}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
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
  onKingHit: (premature: boolean) => void;
  resetKey: number;
}

export const GameScene = ({ onScoreChange, onThrowsChange, onBatonsLeftChange, onKingHit, resetKey }: GameSceneProps) => {
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
        onKingHit={onKingHit}
        resetKey={resetKey}
      />
    </Canvas>
  );
};

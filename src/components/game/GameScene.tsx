import { useRef, useState, useCallback, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Physics } from '@react-three/cannon';
import { OrbitControls, Sky, Html } from '@react-three/drei';
import { Baton, BatonRef } from './Baton';
import { TargetCube } from './TargetCube';
import { KingKubb } from './KingKubb';
import { Ground } from './Ground';
import { AimTrajectory } from './AimTrajectory';

const CUBE_COLORS = ['#FF6B6B', '#4ECDC4', '#95E67A', '#FFE66D', '#A06CD5'];

// Kubb-style positions - evenly spaced along the back baseline
// Field width = 8, back line Z = -fieldLength/2 - 3 = -9.4
const fieldWidth = 8;
const backLineZ = -9.4;
const spacing = fieldWidth / 6; // 5 cubes need 6 segments for even spacing from edges
const CUBE_POSITIONS: [number, number, number][] = [
  [-fieldWidth / 2 + spacing, -1.7, backLineZ],
  [-fieldWidth / 2 + spacing * 2, -1.7, backLineZ],
  [0, -1.7, backLineZ],
  [fieldWidth / 2 - spacing * 2, -1.7, backLineZ],
  [fieldWidth / 2 - spacing, -1.7, backLineZ],
];

// King on center line, closer to thrower (Z=-3 is center line)
const KING_POSITION: [number, number, number] = [0, -1.5, -3];

const BATONS_PER_TURN = 6;

interface GameSceneContentProps {
  onScoreChange: (score: number) => void;
  onThrowsChange: (throws: number) => void;
  onBatonsLeftChange: (batonsLeft: number) => void;
  onKingHit: (premature: boolean) => void;
  onHitKubbsChange: (hitKubbs: Set<number>) => void;
  resetKey: number;
}

// Power meter that oscillates automatically
const PowerMeter = ({ isAiming, power }: { isAiming: boolean; power: number }) => {
  if (!isAiming) return null;
  
  const powerPercent = power * 100;
  
  return (
    <Html center position={[4, 0, 0]}>
      <div className="flex flex-col items-center gap-1 pointer-events-none">
        <div className="text-sm font-bold text-white drop-shadow-lg">Power</div>
        <div className="w-8 h-40 bg-black/50 backdrop-blur-sm rounded-full overflow-hidden border border-white/30 flex flex-col-reverse">
          <div 
            className={`w-full transition-colors duration-75 ${
              powerPercent < 30 ? 'bg-green-500' :
              powerPercent < 60 ? 'bg-yellow-500' :
              powerPercent < 85 ? 'bg-orange-500' : 'bg-red-500'
            }`}
            style={{ height: `${powerPercent}%` }}
          />
        </div>
        <div className="text-xs text-white drop-shadow-lg">{Math.round(powerPercent)}%</div>
      </div>
    </Html>
  );
};

const GameSceneContent = ({ onScoreChange, onThrowsChange, onBatonsLeftChange, onKingHit, onHitKubbsChange, resetKey }: GameSceneContentProps) => {
  const batonRef = useRef<BatonRef>(null);
  const [isAiming, setIsAiming] = useState(false);
  const [aimOffset, setAimOffset] = useState(0);
  const [oscillatingPower, setOscillatingPower] = useState(0);
  const [hitCubes, setHitCubes] = useState<Set<number>>(new Set());
  const [kingHit, setKingHit] = useState(false);
  const [throwCount, setThrowCount] = useState(0);
  const [batonsLeft, setBatonsLeft] = useState(BATONS_PER_TURN);
  const [throwerX, setThrowerX] = useState(0);
  const [batonInFlight, setBatonInFlight] = useState(false);
  const oscillationRef = useRef(0);

  // Baton starts at ground level, X position can be adjusted
  const batonStartPos: [number, number, number] = [throwerX, -1.4, 3];

  // Oscillate power while aiming
  useFrame((state) => {
    if (isAiming) {
      // Oscillate between 0.1 and 1.0, speed of 2
      oscillationRef.current = (Math.sin(state.clock.elapsedTime * 2.5) + 1) / 2;
      setOscillatingPower(0.1 + oscillationRef.current * 0.9);
    }
  });

  // Reset state when resetKey changes
  useEffect(() => {
    setHitCubes(new Set());
    setKingHit(false);
    setThrowCount(0);
    setBatonsLeft(BATONS_PER_TURN);
    setBatonInFlight(false);
    setIsAiming(false);
    setAimOffset(0);
    setThrowerX(0);
    onScoreChange(0);
    onThrowsChange(0);
    onBatonsLeftChange(BATONS_PER_TURN);
    batonRef.current?.reset([0, -1.4, 3]);
  }, [resetKey]);

  const handlePointerDown = useCallback((e: any) => {
    if (batonsLeft <= 0 || kingHit) return;
    e.stopPropagation();

    // Ensure we still receive pointer up even if cursor leaves the plane
    e.target?.setPointerCapture?.(e.pointerId);

    // Lock in a throw start position from the actual field hit-point (world X)
    const worldX = typeof e.point?.x === 'number' ? e.point.x : 0;
    const clampedX = Math.max(-3, Math.min(3, worldX));
    setThrowerX(clampedX);
    batonRef.current?.reset([clampedX, -1.4, 3]);

    setIsAiming(true);
  }, [batonsLeft, kingHit]);

  const handlePointerMove = useCallback((e: any) => {
    if (batonsLeft <= 0 || kingHit) return;

    // Use the raycast hit-point on the invisible field plane to drive throw position
    const worldX = typeof e.point?.x === 'number' ? e.point.x : 0;
    const nextThrowerX = Math.max(-3, Math.min(3, worldX));

    // Throw origin follows cursor along baseline (only while baton is not in flight)
    if (!batonInFlight && !isAiming) {
      setThrowerX(nextThrowerX);
      batonRef.current?.reset([nextThrowerX, -1.4, 3]);
    }

    // Control aim direction while aiming (screen-space)
    if (isAiming) {
      const centerX = window.innerWidth / 2;
      setAimOffset((e.clientX - centerX) * 0.01);
    }
  }, [isAiming, batonsLeft, kingHit, batonInFlight]);

  const handlePointerUp = useCallback((e?: any) => {
    if (isAiming && batonRef.current && batonsLeft > 0 && !kingHit) {
      // Use the oscillating power and aim - adjusted physics for proper arc
      const power = oscillatingPower;
      // Lower arc, faster forward velocity to actually reach the kubbs
      const velocityZ = -6 - power * 6;  // Forward velocity
      const velocityY = 3 + power * 3;   // Upward velocity for arc
      const velocityX = aimOffset * 0.8;

      const velocity: [number, number, number] = [velocityX, velocityY, velocityZ];

      // End-over-end rotation (around X axis for vertical baton)
      const angularVelocity: [number, number, number] = [
        8 + power * 6,
        aimOffset * 0.5,
        0,
      ];

      batonRef.current.throw(velocity, angularVelocity);
      setBatonInFlight(true);

      const newThrowCount = throwCount + 1;
      const newBatonsLeft = batonsLeft - 1;
      const currentThrowerX = throwerX;

      setThrowCount(newThrowCount);
      setBatonsLeft(newBatonsLeft);
      onThrowsChange(newThrowCount);
      onBatonsLeftChange(newBatonsLeft);

      // Reset baton after delay if batons remaining
      setTimeout(() => {
        if (newBatonsLeft > 0) {
          batonRef.current?.reset([currentThrowerX, -1.4, 3]);
          setBatonInFlight(false);
        }
      }, 2500);
    }

    // Release capture if present
    e?.target?.releasePointerCapture?.(e?.pointerId);

    setIsAiming(false);
    setAimOffset(0);
  }, [isAiming, oscillatingPower, aimOffset, throwCount, batonsLeft, kingHit, throwerX, onThrowsChange, onBatonsLeftChange]);

  const handleCubeHit = useCallback((id: number) => {
    setHitCubes(prev => {
      const newSet = new Set(prev);
      if (!newSet.has(id)) {
        newSet.add(id);
        onScoreChange(newSet.size);
        onHitKubbsChange(newSet);
      }
      return newSet;
    });
  }, [onScoreChange, onHitKubbsChange]);

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
        power={oscillatingPower}
        aimOffset={aimOffset}
        visible={isAiming}
      />
      
      {/* Power Meter */}
      <PowerMeter isAiming={isAiming} power={oscillatingPower} />
      
      {/* Position indicator on baseline */}
      <mesh position={[throwerX, -1.95, 3]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.15, 0.25, 32]} />
        <meshBasicMaterial color="hsl(0 0% 100%)" opacity={0.6} transparent />
      </mesh>
      
      {/* Invisible plane to capture throws */}
      <mesh
        position={[0, 0, 5]}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <planeGeometry args={[25, 20]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      
      <OrbitControls 
        enableZoom={false}
        enablePan={false}
        maxPolarAngle={Math.PI / 2.3}
        minPolarAngle={Math.PI / 5}
        enabled={!isAiming}
      />
    </>
  );
};

interface GameSceneProps {
  onScoreChange: (score: number) => void;
  onThrowsChange: (throws: number) => void;
  onBatonsLeftChange: (batonsLeft: number) => void;
  onKingHit: (premature: boolean) => void;
  onHitKubbsChange: (hitKubbs: Set<number>) => void;
  resetKey: number;
}

export const GameScene = ({ onScoreChange, onThrowsChange, onBatonsLeftChange, onKingHit, onHitKubbsChange, resetKey }: GameSceneProps) => {
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
        onHitKubbsChange={onHitKubbsChange}
        resetKey={resetKey}
      />
    </Canvas>
  );
};

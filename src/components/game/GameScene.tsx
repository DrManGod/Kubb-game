import { useRef, useState, useCallback, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Physics } from '@react-three/cannon';
import { OrbitControls, Sky, Html } from '@react-three/drei';
import { Baton, BatonRef } from './Baton';
import { TargetCube } from './TargetCube';
import { FieldKubb } from './FieldKubb';
import { KingKubb } from './KingKubb';
import { Ground } from './Ground';
import { AimTrajectory } from './AimTrajectory';
import { useBotController } from './BotController';
import { GamePhase, FieldKubb as FieldKubbType } from '@/hooks/useGameState';

const CUBE_COLORS = ['#FF6B6B', '#4ECDC4', '#95E67A', '#FFE66D', '#A06CD5'];

// Kubb-style positions - evenly spaced along the back baseline
const fieldWidth = 8;
const backLineZ = -9.4;
const spacing = fieldWidth / 6;
const CUBE_POSITIONS: [number, number, number][] = [
  [-fieldWidth / 2 + spacing, -1.7, backLineZ],
  [-fieldWidth / 2 + spacing * 2, -1.7, backLineZ],
  [0, -1.7, backLineZ],
  [fieldWidth / 2 - spacing * 2, -1.7, backLineZ],
  [fieldWidth / 2 - spacing, -1.7, backLineZ],
];

const KING_POSITION: [number, number, number] = [0, -1.5, -3];
const BATONS_PER_TURN = 6;

interface GameSceneContentProps {
  onPhaseChange: (phase: GamePhase) => void;
  onPlayerScoreChange: (score: number) => void;
  onBotScoreChange: (score: number) => void;
  onPlayerBatonsChange: (batons: number) => void;
  onBotBatonsChange: (batons: number) => void;
  onThrowsChange: (throws: number) => void;
  onFieldKubbsChange: (kubbs: FieldKubbType[]) => void;
  resetKey: number;
}

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

const GameSceneContent = ({
  onPhaseChange,
  onPlayerScoreChange,
  onBotScoreChange,
  onPlayerBatonsChange,
  onBotBatonsChange,
  onThrowsChange,
  onFieldKubbsChange,
  resetKey,
}: GameSceneContentProps) => {
  const batonRef = useRef<BatonRef>(null);
  
  // Game state
  const [phase, setPhase] = useState<GamePhase>('player_turn');
  const [playerBatonsLeft, setPlayerBatonsLeft] = useState(BATONS_PER_TURN);
  const [botBatonsLeft, setBotBatonsLeft] = useState(BATONS_PER_TURN);
  const [backlineKubbsDown, setBacklineKubbsDown] = useState<Set<number>>(new Set());
  const [fieldKubbs, setFieldKubbs] = useState<FieldKubbType[]>([]);
  const [kingHit, setKingHit] = useState(false);
  const [totalThrows, setTotalThrows] = useState(0);
  
  // Player aiming state
  const [isAiming, setIsAiming] = useState(false);
  const [aimOffset, setAimOffset] = useState(0);
  const [oscillatingPower, setOscillatingPower] = useState(0);
  const [throwerX, setThrowerX] = useState(0);
  const [batonInFlight, setBatonInFlight] = useState(false);
  const oscillationRef = useRef(0);

  const playerBaselineZ = 3;
  const batonStartPos: [number, number, number] = [throwerX, -1.4, playerBaselineZ];

  // Oscillate power while aiming
  useFrame((state) => {
    if (isAiming && phase === 'player_turn') {
      oscillationRef.current = (Math.sin(state.clock.elapsedTime * 2.5) + 1) / 2;
      setOscillatingPower(0.1 + oscillationRef.current * 0.9);
    }
  });

  // Generate random positions for field kubbs
  const generateFieldKubbPositions = useCallback((count: number): [number, number, number][] => {
    const positions: [number, number, number][] = [];
    const baseZ = 1.5;
    const spreadX = 2.5;
    const spreadZ = 1.5;
    const centerX = (Math.random() - 0.5) * 2;
    
    for (let i = 0; i < count; i++) {
      const x = centerX + (Math.random() - 0.5) * spreadX;
      const z = baseZ + (Math.random() - 0.5) * spreadZ;
      positions.push([
        Math.max(-3, Math.min(3, x)),
        -1.7,
        Math.max(-1, Math.min(2.5, z))
      ]);
    }
    return positions;
  }, []);

  // Reset state when resetKey changes
  useEffect(() => {
    setPhase('player_turn');
    setPlayerBatonsLeft(BATONS_PER_TURN);
    setBotBatonsLeft(BATONS_PER_TURN);
    setBacklineKubbsDown(new Set());
    setFieldKubbs([]);
    setKingHit(false);
    setTotalThrows(0);
    setBatonInFlight(false);
    setIsAiming(false);
    setAimOffset(0);
    setThrowerX(0);
    batonRef.current?.reset([0, -1.4, playerBaselineZ]);
    
    onPhaseChange('player_turn');
    onPlayerScoreChange(0);
    onBotScoreChange(0);
    onPlayerBatonsChange(BATONS_PER_TURN);
    onBotBatonsChange(BATONS_PER_TURN);
    onThrowsChange(0);
    onFieldKubbsChange([]);
  }, [resetKey]);

  // Transition to bot turn after kubbs fly
  useEffect(() => {
    if (phase === 'kubbs_flying') {
      const timer = setTimeout(() => {
        setPhase('bot_turn');
        setBotBatonsLeft(BATONS_PER_TURN);
        onPhaseChange('bot_turn');
        onBotBatonsChange(BATONS_PER_TURN);
        // Reset baton position for bot
        batonRef.current?.reset([0, -1.4, backLineZ]);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [phase, onPhaseChange, onBotBatonsChange]);

  // End player turn when out of batons
  useEffect(() => {
    if (phase === 'player_turn' && playerBatonsLeft === 0 && !batonInFlight) {
      const timer = setTimeout(() => {
        const hitCount = backlineKubbsDown.size;
        
        if (hitCount > 0) {
          // Generate field kubbs from hits
          const positions = generateFieldKubbPositions(hitCount);
          const newFieldKubbs: FieldKubbType[] = positions.map((pos, i) => ({
            id: `field-${Date.now()}-${i}`,
            position: pos,
            isDown: false,
          }));
          
          setFieldKubbs(newFieldKubbs);
          setPhase('kubbs_flying');
          onFieldKubbsChange(newFieldKubbs);
          onPhaseChange('kubbs_flying');
        } else {
          // No hits, bot gets empty turn then player goes again
          setPhase('bot_turn');
          setBotBatonsLeft(BATONS_PER_TURN);
          onPhaseChange('bot_turn');
          onBotBatonsChange(BATONS_PER_TURN);
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [phase, playerBatonsLeft, batonInFlight, backlineKubbsDown, generateFieldKubbPositions, onFieldKubbsChange, onPhaseChange, onBotBatonsChange]);

  // Bot controller
  const handleBotThrow = useCallback(() => {
    setBotBatonsLeft(prev => {
      const newVal = prev - 1;
      onBotBatonsChange(newVal);
      return newVal;
    });
  }, [onBotBatonsChange]);

  const handleBotTurnEnd = useCallback(() => {
    // Remove downed field kubbs
    const standingKubbs = fieldKubbs.filter(k => !k.isDown);
    setFieldKubbs(standingKubbs);
    onFieldKubbsChange(standingKubbs);
    
    // Reset for player turn
    setPhase('player_turn');
    setPlayerBatonsLeft(BATONS_PER_TURN);
    setBacklineKubbsDown(new Set());
    onPhaseChange('player_turn');
    onPlayerBatonsChange(BATONS_PER_TURN);
    
    // Reset baton for player
    batonRef.current?.reset([0, -1.4, playerBaselineZ]);
  }, [fieldKubbs, onFieldKubbsChange, onPhaseChange, onPlayerBatonsChange]);

  useBotController({
    batonRef,
    isActive: phase === 'bot_turn',
    batonsLeft: botBatonsLeft,
    fieldKubbs,
    onThrow: handleBotThrow,
    onTurnEnd: handleBotTurnEnd,
  });

  // Player controls
  const handlePointerDown = useCallback((e: any) => {
    if (phase !== 'player_turn' || playerBatonsLeft <= 0 || kingHit) return;
    e.stopPropagation();
    e.target?.setPointerCapture?.(e.pointerId);

    const worldX = typeof e.point?.x === 'number' ? e.point.x : 0;
    const clampedX = Math.max(-3, Math.min(3, worldX));
    setThrowerX(clampedX);
    batonRef.current?.reset([clampedX, -1.4, playerBaselineZ]);
    setIsAiming(true);
  }, [phase, playerBatonsLeft, kingHit]);

  const handlePointerMove = useCallback((e: any) => {
    if (phase !== 'player_turn' || playerBatonsLeft <= 0 || kingHit) return;

    const worldX = typeof e.point?.x === 'number' ? e.point.x : 0;
    const nextThrowerX = Math.max(-3, Math.min(3, worldX));

    if (!batonInFlight && !isAiming) {
      setThrowerX(nextThrowerX);
      batonRef.current?.reset([nextThrowerX, -1.4, playerBaselineZ]);
    }

    if (isAiming) {
      const centerX = window.innerWidth / 2;
      setAimOffset((e.clientX - centerX) * 0.01);
    }
  }, [isAiming, phase, playerBatonsLeft, kingHit, batonInFlight]);

  const handlePointerUp = useCallback((e?: any) => {
    if (isAiming && batonRef.current && playerBatonsLeft > 0 && !kingHit && phase === 'player_turn') {
      const power = oscillatingPower;
      const velocityZ = -6 - power * 6;
      const velocityY = 3 + power * 3;
      const velocityX = aimOffset * 0.8;

      batonRef.current.throw(
        [velocityX, velocityY, velocityZ],
        [8 + power * 6, aimOffset * 0.5, 0]
      );
      setBatonInFlight(true);

      const newBatonsLeft = playerBatonsLeft - 1;
      const newTotalThrows = totalThrows + 1;
      const currentThrowerX = throwerX;

      setPlayerBatonsLeft(newBatonsLeft);
      setTotalThrows(newTotalThrows);
      onPlayerBatonsChange(newBatonsLeft);
      onThrowsChange(newTotalThrows);

      setTimeout(() => {
        if (newBatonsLeft > 0) {
          batonRef.current?.reset([currentThrowerX, -1.4, playerBaselineZ]);
          setBatonInFlight(false);
        } else {
          setBatonInFlight(false);
        }
      }, 2500);
    }

    e?.target?.releasePointerCapture?.(e?.pointerId);
    setIsAiming(false);
    setAimOffset(0);
  }, [isAiming, oscillatingPower, aimOffset, playerBatonsLeft, kingHit, phase, throwerX, totalThrows, onPlayerBatonsChange, onThrowsChange]);

  const handleCubeHit = useCallback((id: number) => {
    setBacklineKubbsDown(prev => {
      const newSet = new Set(prev);
      if (!newSet.has(id)) {
        newSet.add(id);
        onPlayerScoreChange(newSet.size);
      }
      return newSet;
    });
  }, [onPlayerScoreChange]);

  const handleFieldKubbHit = useCallback((id: string) => {
    setFieldKubbs(prev => {
      const updated = prev.map(k => k.id === id ? { ...k, isDown: true } : k);
      onFieldKubbsChange(updated);
      onBotScoreChange(updated.filter(k => k.isDown).length);
      return updated;
    });
  }, [onFieldKubbsChange, onBotScoreChange]);

  const handleKingHit = useCallback(() => {
    if (!kingHit) {
      setKingHit(true);
      const allKubbsDown = backlineKubbsDown.size === 5 && fieldKubbs.every(k => k.isDown);
      const newPhase = allKubbsDown ? 'player_win' : 'player_lose';
      setPhase(newPhase);
      onPhaseChange(newPhase);
    }
  }, [kingHit, backlineKubbsDown.size, fieldKubbs, onPhaseChange]);

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
        
        {/* Back-line kubbs */}
        {CUBE_POSITIONS.map((pos, i) => (
          <TargetCube
            key={`${resetKey}-backline-${i}`}
            id={i}
            position={pos}
            color={CUBE_COLORS[i]}
            onHit={handleCubeHit}
            isHit={backlineKubbsDown.has(i)}
          />
        ))}
        
        {/* Field kubbs (thrown to player's side) */}
        {fieldKubbs.map((kubb) => (
          <FieldKubb
            key={kubb.id}
            id={kubb.id}
            position={kubb.position}
            onHit={handleFieldKubbHit}
            isHit={kubb.isDown}
          />
        ))}
        
        <KingKubb
          key={`king-${resetKey}`}
          position={KING_POSITION}
          onHit={handleKingHit}
          isHit={kingHit}
        />
      </Physics>
      
      {phase === 'player_turn' && (
        <>
          <AimTrajectory
            startPosition={batonStartPos}
            power={oscillatingPower}
            aimOffset={aimOffset}
            visible={isAiming}
          />
          <PowerMeter isAiming={isAiming} power={oscillatingPower} />
        </>
      )}
      
      {/* Position indicator */}
      {phase === 'player_turn' && (
        <mesh position={[throwerX, -1.95, playerBaselineZ]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.15, 0.25, 32]} />
          <meshBasicMaterial color="hsl(0 0% 100%)" opacity={0.6} transparent />
        </mesh>
      )}
      
      {/* Turn indicator */}
      {phase === 'bot_turn' && (
        <Html center position={[0, 2, 0]}>
          <div className="bg-destructive/90 text-destructive-foreground px-4 py-2 rounded-lg font-bold text-lg animate-pulse">
            🤖 Bot's Turn
          </div>
        </Html>
      )}
      
      {phase === 'kubbs_flying' && (
        <Html center position={[0, 2, 0]}>
          <div className="bg-secondary/90 text-secondary-foreground px-4 py-2 rounded-lg font-bold text-lg">
            Kubbs flying to your side...
          </div>
        </Html>
      )}
      
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
        enabled={!isAiming && phase !== 'bot_turn'}
      />
    </>
  );
};

interface GameSceneProps {
  onPhaseChange: (phase: GamePhase) => void;
  onPlayerScoreChange: (score: number) => void;
  onBotScoreChange: (score: number) => void;
  onPlayerBatonsChange: (batons: number) => void;
  onBotBatonsChange: (batons: number) => void;
  onThrowsChange: (throws: number) => void;
  onFieldKubbsChange: (kubbs: FieldKubbType[]) => void;
  resetKey: number;
}

export const GameScene = (props: GameSceneProps) => {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 4, 12], fov: 50 }}
      style={{ touchAction: 'none' }}
    >
      <GameSceneContent {...props} />
    </Canvas>
  );
};

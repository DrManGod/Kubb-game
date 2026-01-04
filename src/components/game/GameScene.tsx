import { useRef, useState, useCallback, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Physics } from '@react-three/cannon';
import { OrbitControls, Sky, Html } from '@react-three/drei';
import { Baton, BatonRef } from './Baton';
import { TargetCube } from './TargetCube';
import { FieldKubb } from './FieldKubb';
import { PlayerBaselineKubb } from './PlayerBaselineKubb';
import { KingKubb } from './KingKubb';
import { Ground } from './Ground';
import { AimTrajectory } from './AimTrajectory';
import { useBotController } from './BotController';
import { KubbThrowControls } from './KubbThrowControls';
import { ThrownKubb } from './ThrownKubb';
import { GamePhase, FieldKubb as FieldKubbType, KubbToThrow } from '@/hooks/useGameState';

const CUBE_COLORS = ['#FF6B6B', '#4ECDC4', '#95E67A', '#FFE66D', '#A06CD5'];

// Field layout
const fieldWidth = 8;
const botBackLineZ = -9.4; // Bot's baseline (far end)
const playerBackLineZ = 3; // Player's baseline (near end)
const spacing = fieldWidth / 6;

// Bot baseline kubbs (player throws at these)
const BOT_BASELINE_POSITIONS: [number, number, number][] = [
  [-fieldWidth / 2 + spacing, -1.7, botBackLineZ],
  [-fieldWidth / 2 + spacing * 2, -1.7, botBackLineZ],
  [0, -1.7, botBackLineZ],
  [fieldWidth / 2 - spacing * 2, -1.7, botBackLineZ],
  [fieldWidth / 2 - spacing, -1.7, botBackLineZ],
];

// Player baseline kubbs (bot throws at these)
const PLAYER_BASELINE_POSITIONS: [number, number, number][] = [
  [-fieldWidth / 2 + spacing, -1.7, playerBackLineZ],
  [-fieldWidth / 2 + spacing * 2, -1.7, playerBackLineZ],
  [0, -1.7, playerBackLineZ],
  [fieldWidth / 2 - spacing * 2, -1.7, playerBackLineZ],
  [fieldWidth / 2 - spacing, -1.7, playerBackLineZ],
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
  onPlayerBaselineChange: (count: number) => void;
  onBotBaselineChange: (count: number) => void;
  onRoundChange: (round: number) => void;
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
  onPlayerBaselineChange,
  onBotBaselineChange,
  onRoundChange,
  resetKey,
}: GameSceneContentProps) => {
  const batonRef = useRef<BatonRef>(null);
  
  // Game state
  const [phase, setPhase] = useState<GamePhase>('player_turn');
  const [playerBatonsLeft, setPlayerBatonsLeft] = useState(BATONS_PER_TURN);
  const [botBatonsLeft, setBotBatonsLeft] = useState(BATONS_PER_TURN);
  const [botBaselineKubbsDown, setBotBaselineKubbsDown] = useState<Set<number>>(new Set());
  const [playerBaselineKubbsDown, setPlayerBaselineKubbsDown] = useState<Set<number>>(new Set());
  const [fieldKubbs, setFieldKubbs] = useState<FieldKubbType[]>([]);
  const [kingHit, setKingHit] = useState(false);
  const [totalThrows, setTotalThrows] = useState(0);
  const [currentRound, setCurrentRound] = useState(1);
  
  // Kubb throwing state
  const [kubbsToThrow, setKubbsToThrow] = useState<KubbToThrow[]>([]);
  const [currentKubbThrowIndex, setCurrentKubbThrowIndex] = useState(0);
  const [thrownKubbData, setThrownKubbData] = useState<{
    power: number;
    angle: number;
    spin: number;
    startPos: [number, number, number];
    targetSide: 'player' | 'bot';
  } | null>(null);
  
  // Player aiming state
  const [isAiming, setIsAiming] = useState(false);
  const [aimOffset, setAimOffset] = useState(0);
  const [oscillatingPower, setOscillatingPower] = useState(0);
  const [throwerX, setThrowerX] = useState(0);
  const [batonInFlight, setBatonInFlight] = useState(false);
  const oscillationRef = useRef(0);

  const batonStartPos: [number, number, number] = [throwerX, -1.4, playerBackLineZ];

  // Check if player has field kubbs on their side (must clear before bot baseline)
  const playerSideFieldKubbs = fieldKubbs.filter(k => k.side === 'player' && !k.isDown);
  const botSideFieldKubbs = fieldKubbs.filter(k => k.side === 'bot' && !k.isDown);
  const mustClearFieldKubbsFirst = botSideFieldKubbs.length > 0;

  // Oscillate power while aiming
  useFrame((state) => {
    if (isAiming && phase === 'player_turn') {
      oscillationRef.current = (Math.sin(state.clock.elapsedTime * 2.5) + 1) / 2;
      setOscillatingPower(0.1 + oscillationRef.current * 0.9);
    }
  });

  // Generate random positions for field kubbs on a specific side
  const generateFieldKubbPositions = useCallback((count: number, side: 'player' | 'bot'): [number, number, number][] => {
    const positions: [number, number, number][] = [];
    // Player side field kubbs go in player's half, bot side field kubbs go in bot's half
    const baseZ = side === 'player' ? 1.0 : -6.5;
    const spreadX = 2.5;
    const spreadZ = 2.0;
    const centerX = (Math.random() - 0.5) * 2;
    
    for (let i = 0; i < count; i++) {
      const x = centerX + (Math.random() - 0.5) * spreadX;
      const z = baseZ + (Math.random() - 0.5) * spreadZ;
      positions.push([
        Math.max(-3.5, Math.min(3.5, x)),
        -1.7,
        side === 'player' 
          ? Math.max(-1.5, Math.min(2.5, z))
          : Math.max(-8, Math.min(-5, z))
      ]);
    }
    return positions;
  }, []);

  // Reset state when resetKey changes
  useEffect(() => {
    setPhase('player_turn');
    setPlayerBatonsLeft(BATONS_PER_TURN);
    setBotBatonsLeft(BATONS_PER_TURN);
    setBotBaselineKubbsDown(new Set());
    setPlayerBaselineKubbsDown(new Set());
    setFieldKubbs([]);
    setKingHit(false);
    setTotalThrows(0);
    setCurrentRound(1);
    setBatonInFlight(false);
    setIsAiming(false);
    setAimOffset(0);
    setThrowerX(0);
    setKubbsToThrow([]);
    setCurrentKubbThrowIndex(0);
    setThrownKubbData(null);
    batonRef.current?.reset([0, -1.4, playerBackLineZ]);
    
    onPhaseChange('player_turn');
    onPlayerScoreChange(0);
    onBotScoreChange(0);
    onPlayerBatonsChange(BATONS_PER_TURN);
    onBotBatonsChange(BATONS_PER_TURN);
    onThrowsChange(0);
    onFieldKubbsChange([]);
    onPlayerBaselineChange(5);
    onBotBaselineChange(5);
    onRoundChange(1);
  }, [resetKey]);

  // Debug: Log phase changes
  useEffect(() => {
    console.log('🎮 PHASE:', phase, '| Player batons:', playerBatonsLeft, '| Bot batons:', botBatonsLeft, '| Kubbs to throw:', kubbsToThrow.length);
  }, [phase, playerBatonsLeft, botBatonsLeft, kubbsToThrow.length]);

  // Track field kubbs to add after bot throws
  const pendingFieldKubbsRef = useRef<FieldKubbType[]>([]);

  // Handle bot throwing kubbs back (automatic)
  useEffect(() => {
    if (phase === 'bot_throw_kubbs' && kubbsToThrow.length > 0) {
      pendingFieldKubbsRef.current = [];
      
      const throwNextKubb = (index: number) => {
        if (index >= kubbsToThrow.length) {
          // All kubbs thrown, add all field kubbs and transition to bot turn
          const updatedFieldKubbs = [...fieldKubbs.filter(k => !k.isDown), ...pendingFieldKubbsRef.current];
          setFieldKubbs(updatedFieldKubbs);
          onFieldKubbsChange(updatedFieldKubbs);
          
          setKubbsToThrow([]);
          setCurrentKubbThrowIndex(0);
          setPhase('bot_turn');
          setBotBatonsLeft(BATONS_PER_TURN);
          onPhaseChange('bot_turn');
          onBotBatonsChange(BATONS_PER_TURN);
          batonRef.current?.setOwner(false);
          batonRef.current?.reset([0, -1.4, botBackLineZ]);
          return;
        }

        // Bot throws with random values
        const power = 50 + Math.random() * 30;
        const angle = 40 + Math.random() * 15;
        const spin = -50 + Math.random() * 100;
        
        // Random X position for throw
        const throwX = (Math.random() - 0.5) * 4;

        setThrownKubbData({
          power,
          angle,
          spin,
          startPos: [throwX, -1.4, botBackLineZ],
          targetSide: 'player',
        });

        setCurrentKubbThrowIndex(index);
      };

      const timer = setTimeout(() => throwNextKubb(0), 500);
      return () => clearTimeout(timer);
    }
  }, [phase, kubbsToThrow.length]);
  
  // Handle bot kubb landing
  const handleBotKubbLanded = useCallback((finalPosition: [number, number, number]) => {
    const newKubb: FieldKubbType = {
      id: `field-player-${Date.now()}-${currentKubbThrowIndex}`,
      position: finalPosition,
      isDown: false,
      side: 'player',
    };
    pendingFieldKubbsRef.current.push(newKubb);
    
    setThrownKubbData(null);
    
    // Schedule next throw
    const nextIndex = currentKubbThrowIndex + 1;
    if (nextIndex >= kubbsToThrow.length) {
      // All done - transition handled in the effect
      const updatedFieldKubbs = [...fieldKubbs.filter(k => !k.isDown), ...pendingFieldKubbsRef.current];
      setFieldKubbs(updatedFieldKubbs);
      onFieldKubbsChange(updatedFieldKubbs);
      
      setKubbsToThrow([]);
      setCurrentKubbThrowIndex(0);
      setPhase('bot_turn');
      setBotBatonsLeft(BATONS_PER_TURN);
      onPhaseChange('bot_turn');
      onBotBatonsChange(BATONS_PER_TURN);
      batonRef.current?.setOwner(false);
      batonRef.current?.reset([0, -1.4, botBackLineZ]);
    } else {
      // Throw next kubb after a short delay
      setTimeout(() => {
        const power = 50 + Math.random() * 30;
        const angle = 40 + Math.random() * 15;
        const spin = -50 + Math.random() * 100;
        const throwX = (Math.random() - 0.5) * 4;

        setThrownKubbData({
          power,
          angle,
          spin,
          startPos: [throwX, -1.4, botBackLineZ],
          targetSide: 'player',
        });
        setCurrentKubbThrowIndex(nextIndex);
      }, 500);
    }
  }, [currentKubbThrowIndex, kubbsToThrow.length, fieldKubbs, onFieldKubbsChange, onPhaseChange, onBotBatonsChange]);

  // Handle player kubb throw
  const handlePlayerKubbThrow = useCallback((power: number, angle: number, spin: number) => {
    if (phase !== 'player_throw_kubbs' || currentKubbThrowIndex >= kubbsToThrow.length) return;

    setThrownKubbData({
      power,
      angle,
      spin,
      startPos: [0, -1.4, playerBackLineZ],
      targetSide: 'bot',
    });
  }, [phase, currentKubbThrowIndex, kubbsToThrow.length]);

  // Handle kubb landing
  const handleKubbLanded = useCallback((finalPosition: [number, number, number]) => {
    setThrownKubbData(null);
    
    if (phase === 'player_throw_kubbs') {
      const newKubb: FieldKubbType = {
        id: `field-bot-${Date.now()}-${currentKubbThrowIndex}`,
        position: finalPosition,
        isDown: false,
        side: 'bot',
      };
      
      setFieldKubbs(prev => {
        const updated = [...prev.filter(k => !k.isDown), newKubb];
        onFieldKubbsChange(updated);
        return updated;
      });

      const nextIndex = currentKubbThrowIndex + 1;
      if (nextIndex >= kubbsToThrow.length) {
        // All kubbs thrown, player's turn to throw batons
        setKubbsToThrow([]);
        setCurrentKubbThrowIndex(0);
        setPhase('player_turn');
        setPlayerBatonsLeft(BATONS_PER_TURN);
        onPhaseChange('player_turn');
        onPlayerBatonsChange(BATONS_PER_TURN);
        batonRef.current?.reset([0, -1.4, playerBackLineZ]);
      } else {
        setCurrentKubbThrowIndex(nextIndex);
      }
    }
  }, [phase, currentKubbThrowIndex, kubbsToThrow.length, onFieldKubbsChange, onPhaseChange, onPlayerBatonsChange]);

  // End player turn when out of batons
  useEffect(() => {
    if (phase === 'player_turn' && playerBatonsLeft === 0 && !batonInFlight) {
      const timer = setTimeout(() => {
        // Count newly hit bot baseline kubbs this turn
        const newlyHitBotKubbs = Array.from(botBaselineKubbsDown);
        
        // Also check for downed field kubbs on bot side that need to be cleaned up
        const downedBotFieldKubbs = fieldKubbs.filter(k => k.side === 'bot' && k.isDown);
        
        // Clean up downed field kubbs
        if (downedBotFieldKubbs.length > 0) {
          const standingKubbs = fieldKubbs.filter(k => !k.isDown);
          setFieldKubbs(standingKubbs);
          onFieldKubbsChange(standingKubbs);
        }
        
        if (newlyHitBotKubbs.length > 0) {
          // Bot throws knocked baseline kubbs back to player's side
          const kubbs: KubbToThrow[] = newlyHitBotKubbs.map(id => ({
            id: `kubb-${id}`,
            originalPosition: BOT_BASELINE_POSITIONS[id],
          }));
          
          setKubbsToThrow(kubbs);
          setPhase('bot_throw_kubbs');
          onPhaseChange('bot_throw_kubbs');
        } else {
          // No hits, bot gets turn
          setPhase('bot_turn');
          setBotBatonsLeft(BATONS_PER_TURN);
          onPhaseChange('bot_turn');
          onBotBatonsChange(BATONS_PER_TURN);
          batonRef.current?.setOwner(false);
          batonRef.current?.reset([0, -1.4, botBackLineZ]);
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [phase, playerBatonsLeft, batonInFlight, botBaselineKubbsDown, fieldKubbs, onPhaseChange, onBotBatonsChange, onFieldKubbsChange]);

  // Bot controller
  const handleBotThrow = useCallback(() => {
    setBotBatonsLeft(prev => {
      const newVal = prev - 1;
      onBotBatonsChange(newVal);
      return newVal;
    });
  }, [onBotBatonsChange]);

  const handleBotTurnEnd = useCallback(() => {
    const hitPlayerBaselineCount = playerBaselineKubbsDown.size;
    
    if (hitPlayerBaselineCount > 0) {
      // Player throws knocked kubbs to bot's side
      const kubbs: KubbToThrow[] = Array.from(playerBaselineKubbsDown).map(id => ({
        id: `kubb-${id}`,
        originalPosition: PLAYER_BASELINE_POSITIONS[id],
      }));
      
      // Remove downed field kubbs
      const standingKubbs = fieldKubbs.filter(k => !k.isDown);
      setFieldKubbs(standingKubbs);
      onFieldKubbsChange(standingKubbs);
      
      setKubbsToThrow(kubbs);
      setPlayerBaselineKubbsDown(new Set());
      setPhase('player_throw_kubbs');
      onPhaseChange('player_throw_kubbs');
    } else {
      // No player baseline kubbs hit, just transition
      const standingKubbs = fieldKubbs.filter(k => !k.isDown);
      setFieldKubbs(standingKubbs);
      onFieldKubbsChange(standingKubbs);
      
      const newRound = currentRound + 1;
      setCurrentRound(newRound);
      onRoundChange(newRound);
      setPhase('player_turn');
      setPlayerBatonsLeft(BATONS_PER_TURN);
      setBotBaselineKubbsDown(new Set());
      onPhaseChange('player_turn');
      onPlayerBatonsChange(BATONS_PER_TURN);
      batonRef.current?.reset([0, -1.4, playerBackLineZ]);
    }
  }, [playerBaselineKubbsDown, fieldKubbs, currentRound, onFieldKubbsChange, onPhaseChange, onPlayerBatonsChange, onRoundChange]);

  // Bot also needs to hit player baseline kubbs
  const handlePlayerBaselineHit = useCallback((id: number) => {
    setPlayerBaselineKubbsDown(prev => {
      const newSet = new Set(prev);
      if (!newSet.has(id)) {
        newSet.add(id);
        onBotScoreChange(newSet.size);
        onPlayerBaselineChange(5 - newSet.size);
      }
      return newSet;
    });
  }, [onBotScoreChange, onPlayerBaselineChange]);

  useBotController({
    batonRef,
    isActive: phase === 'bot_turn',
    batonsLeft: botBatonsLeft,
    fieldKubbs: fieldKubbs.filter(k => k.side === 'player'), // Bot targets player-side field kubbs
    playerBaselineKubbsDown,
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
    batonRef.current?.reset([clampedX, -1.4, playerBackLineZ]);
    setIsAiming(true);
  }, [phase, playerBatonsLeft, kingHit]);

  const handlePointerMove = useCallback((e: any) => {
    if (phase !== 'player_turn' || playerBatonsLeft <= 0 || kingHit) return;

    const worldX = typeof e.point?.x === 'number' ? e.point.x : 0;
    const nextThrowerX = Math.max(-3, Math.min(3, worldX));

    if (!batonInFlight && !isAiming) {
      setThrowerX(nextThrowerX);
      batonRef.current?.reset([nextThrowerX, -1.4, playerBackLineZ]);
    }

    if (isAiming) {
      const centerX = window.innerWidth / 2;
      setAimOffset((e.clientX - centerX) * 0.01);
    }
  }, [isAiming, phase, playerBatonsLeft, kingHit, batonInFlight]);

  const handlePointerUp = useCallback((e?: any) => {
    if (isAiming && batonRef.current && playerBatonsLeft > 0 && !kingHit && phase === 'player_turn') {
      // Set baton to player owner for collision filtering
      batonRef.current.setOwner(true);
      
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
          batonRef.current?.reset([currentThrowerX, -1.4, playerBackLineZ]);
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

  // Player hits bot baseline kubb
  const handleBotBaselineHit = useCallback((id: number) => {
    // Must clear field kubbs on bot's side first!
    if (mustClearFieldKubbsFirst) return;
    
    setBotBaselineKubbsDown(prev => {
      const newSet = new Set(prev);
      if (!newSet.has(id)) {
        newSet.add(id);
        onPlayerScoreChange(newSet.size);
        onBotBaselineChange(5 - newSet.size);
      }
      return newSet;
    });
  }, [mustClearFieldKubbsFirst, onPlayerScoreChange, onBotBaselineChange]);

  // Player hits field kubb
  const handleFieldKubbHit = useCallback((id: string) => {
    setFieldKubbs(prev => {
      const updated = prev.map(k => k.id === id ? { ...k, isDown: true } : k);
      onFieldKubbsChange(updated);
      return updated;
    });
  }, [onFieldKubbsChange]);

  // Check remaining opponent kubbs
  const getOpponentKubbsRemaining = useCallback((currentPlayer: 'player' | 'bot') => {
    if (currentPlayer === 'player') {
      // Player needs to knock all bot kubbs
      const botBaselineRemaining = 5 - botBaselineKubbsDown.size;
      const botFieldKubbsRemaining = fieldKubbs.filter(k => k.side === 'bot' && !k.isDown).length;
      return botBaselineRemaining + botFieldKubbsRemaining;
    } else {
      // Bot needs to knock all player kubbs
      const playerBaselineRemaining = 5 - playerBaselineKubbsDown.size;
      const playerFieldKubbsRemaining = fieldKubbs.filter(k => k.side === 'player' && !k.isDown).length;
      return playerBaselineRemaining + playerFieldKubbsRemaining;
    }
  }, [botBaselineKubbsDown, playerBaselineKubbsDown, fieldKubbs]);

  const handleKingHit = useCallback(() => {
    if (!kingHit) {
      setKingHit(true);
      
      // Determine who knocked the king based on current phase
      const currentPlayer = phase === 'player_turn' || phase === 'player_throw_kubbs' ? 'player' : 'bot';
      const opponentKubbsRemaining = getOpponentKubbsRemaining(currentPlayer);
      
      if (opponentKubbsRemaining > 0) {
        // King knocked too early - current player LOSES
        const newPhase = currentPlayer === 'player' ? 'player_lose' : 'player_win';
        setPhase(newPhase);
        onPhaseChange(newPhase);
      } else {
        // All opponent kubbs were down - current player WINS
        const newPhase = currentPlayer === 'player' ? 'player_win' : 'player_lose';
        setPhase(newPhase);
        onPhaseChange(newPhase);
      }
    }
  }, [kingHit, phase, getOpponentKubbsRemaining, onPhaseChange]);

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
        
        {/* Bot baseline kubbs (player throws at these) */}
        {BOT_BASELINE_POSITIONS.map((pos, i) => (
          <TargetCube
            key={`${resetKey}-bot-baseline-${i}`}
            id={i}
            position={pos}
            color={CUBE_COLORS[i]}
            onHit={handleBotBaselineHit}
            isHit={botBaselineKubbsDown.has(i)}
            disabled={mustClearFieldKubbsFirst}
          />
        ))}
        
        {/* Player baseline kubbs (bot throws at these) */}
        {PLAYER_BASELINE_POSITIONS.map((pos, i) => (
          <PlayerBaselineKubb
            key={`${resetKey}-player-baseline-${i}`}
            id={i}
            position={pos}
            onHit={handlePlayerBaselineHit}
            isHit={playerBaselineKubbsDown.has(i)}
          />
        ))}
        
        {/* Field kubbs on both sides */}
        {fieldKubbs.map((kubb) => (
          <FieldKubb
            key={kubb.id}
            id={kubb.id}
            position={kubb.position}
            onHit={handleFieldKubbHit}
            isHit={kubb.isDown}
            side={kubb.side}
          />
        ))}
        
        <KingKubb
          key={`king-${resetKey}`}
          position={KING_POSITION}
          onHit={handleKingHit}
          isHit={kingHit}
        />

        {/* Thrown kubb animation */}
        {thrownKubbData && (
          <ThrownKubb
            startPosition={thrownKubbData.startPos}
            power={thrownKubbData.power}
            angle={thrownKubbData.angle}
            spin={thrownKubbData.spin}
            targetSide={thrownKubbData.targetSide}
            onLanded={phase === 'bot_throw_kubbs' ? handleBotKubbLanded : handleKubbLanded}
          />
        )}
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

      {/* Kubb throwing controls */}
      <KubbThrowControls
        kubbsRemaining={kubbsToThrow.length}
        currentKubbIndex={currentKubbThrowIndex}
        onThrow={handlePlayerKubbThrow}
        visible={phase === 'player_throw_kubbs' && !thrownKubbData}
      />
      
      {/* Position indicator */}
      {phase === 'player_turn' && (
        <mesh position={[throwerX, -1.95, playerBackLineZ]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.15, 0.25, 32]} />
          <meshBasicMaterial color="hsl(0 0% 100%)" opacity={0.6} transparent />
        </mesh>
      )}
      
      {/* Field kubbs warning */}
      {phase === 'player_turn' && mustClearFieldKubbsFirst && (
        <Html center position={[0, 3, 0]}>
          <div className="bg-orange-600/90 text-white px-4 py-2 rounded-lg font-bold text-sm animate-pulse">
            ⚠️ Fäll fältkubbarna först!
          </div>
        </Html>
      )}
      
      {/* Turn indicator */}
      {phase === 'bot_turn' && (
        <Html center position={[0, 2, 0]}>
          <div className="bg-destructive/90 text-destructive-foreground px-4 py-2 rounded-lg font-bold text-lg animate-pulse">
            🤖 Bot's Turn
          </div>
        </Html>
      )}
      
      {/* Bot throwing kubbs */}
      {phase === 'bot_throw_kubbs' && (
        <Html center position={[0, 2, 0]}>
          <div className="bg-red-600/90 text-white px-4 py-2 rounded-lg font-bold text-lg">
            🤖 Boten kastar tillbaka kubbar...
          </div>
        </Html>
      )}

      {/* Player throwing kubbs indicator */}
      {phase === 'player_throw_kubbs' && thrownKubbData && (
        <Html center position={[0, 2, 0]}>
          <div className="bg-amber-600/90 text-white px-4 py-2 rounded-lg font-bold text-lg">
            Kubb flyger...
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
        enabled={!isAiming && phase !== 'bot_turn' && phase !== 'player_throw_kubbs'}
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
  onPlayerBaselineChange: (count: number) => void;
  onBotBaselineChange: (count: number) => void;
  onRoundChange: (round: number) => void;
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

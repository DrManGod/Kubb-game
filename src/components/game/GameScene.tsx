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
import { KubbRaiseUI } from './KubbRaiseUI';
import { KubbAimTrajectory } from './KubbAimTrajectory';
import { ThrownKubb } from './ThrownKubb';
import { GamePhase, FieldKubb as FieldKubbType, KubbToThrow, LandedKubb } from '@/hooks/useGameState';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { Wind } from '@/hooks/useWind';

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
  sounds: ReturnType<typeof useSoundEffects>;
  wind: Wind;
  batonReadyY: number;
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
  sounds,
  wind,
  batonReadyY,
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

  // Track knocked kubbs PER TURN (used for return-throws)
  const [knockedBotKubbsThisTurn, setKnockedBotKubbsThisTurn] = useState<KubbToThrow[]>([]);
  const [knockedPlayerKubbsThisTurn, setKnockedPlayerKubbsThisTurn] = useState<KubbToThrow[]>([]);
  
  // Landed kubbs waiting to be raised by player
  const [landedKubbs, setLandedKubbs] = useState<LandedKubb[]>([]);
  
  // Kubb aim state for trajectory preview
  const [kubbAimPower, setKubbAimPower] = useState(70);
  const [kubbAimAngle, setKubbAimAngle] = useState(45);
  const [kubbAimSpin, setKubbAimSpin] = useState(0);
  
  // Kubb throw mouse aiming state
  const [isKubbAiming, setIsKubbAiming] = useState(false);
  const [kubbAimX, setKubbAimX] = useState(0);
  const [kubbOscillatingPower, setKubbOscillatingPower] = useState(0);
  const kubbOscillationRef = useRef(0);
  
  // Use ref to track current phase for collision callbacks (avoids stale closures)
  const phaseRef = useRef(phase);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  
  // Player aiming state
  const [isAiming, setIsAiming] = useState(false);
  const [aimOffset, setAimOffset] = useState(0);
  const [oscillatingPower, setOscillatingPower] = useState(0);
  const [throwerX, setThrowerX] = useState(0);
  const [batonInFlight, setBatonInFlight] = useState(false);
  const oscillationRef = useRef(0);

  const batonStartPos: [number, number, number] = [throwerX, batonReadyY, playerBackLineZ];

  // Check if player has field kubbs on their side (must clear before bot baseline)
  const playerSideFieldKubbs = fieldKubbs.filter(k => k.side === 'player' && !k.isDown);
  const botSideFieldKubbs = fieldKubbs.filter(k => k.side === 'bot' && !k.isDown);
  const mustClearFieldKubbsFirst = botSideFieldKubbs.length > 0;

  // Oscillate power while aiming (baton or kubb)
  useFrame((state) => {
    if (isAiming && phase === 'player_turn') {
      oscillationRef.current = (Math.sin(state.clock.elapsedTime * 2.5) + 1) / 2;
      setOscillatingPower(0.1 + oscillationRef.current * 0.9);
    }
    if (isKubbAiming && phase === 'player_throw_kubbs') {
      kubbOscillationRef.current = (Math.sin(state.clock.elapsedTime * 2.5) + 1) / 2;
      setKubbOscillatingPower(30 + kubbOscillationRef.current * 70);
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
    setLandedKubbs([]);
    batonRef.current?.reset([0, batonReadyY, playerBackLineZ]);
    
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

  // Reset per-turn knocked lists when turns change
  useEffect(() => {
    if (phase === 'player_turn') setKnockedBotKubbsThisTurn([]);
    if (phase === 'bot_turn') setKnockedPlayerKubbsThisTurn([]);
  }, [phase]);

  // Handle bot throwing kubbs back (automatic)
  useEffect(() => {
    if (phase !== 'bot_throw_kubbs') return;

    console.log('🤖 BOT_THROW_KUBBS PHASE ACTIVATED');
    console.log('📦 Kubbs to throw (state):', kubbsToThrow.length);
    console.log('📦 Knocked bot kubbs this turn:', knockedBotKubbsThisTurn.length);

    // Fix: phase can switch before kubbsToThrow state is committed (batched updates).
    // If that happens, seed kubbsToThrow from knockedBotKubbsThisTurn instead of skipping.
    if (kubbsToThrow.length === 0 && knockedBotKubbsThisTurn.length > 0) {
      console.log('🧩 Seeding kubbsToThrow from knockedBotKubbsThisTurn');
      setKubbsToThrow(knockedBotKubbsThisTurn);
      return;
    }

    if (kubbsToThrow.length === 0) {
      console.log('⚠️ No kubbs to throw, skipping to bot_turn');
      setPhase('bot_turn');
      onPhaseChange('bot_turn');
      batonRef.current?.setOwner(false);
      batonRef.current?.reset([0, batonReadyY, botBackLineZ]);
      return;
    }

    pendingFieldKubbsRef.current = [];

    const timer = setTimeout(() => {
      console.log('🎾 Starting first kubb throw');
      const power = 60 + Math.random() * 20;
      const angle = 42 + Math.random() * 8;
      const spin = -30 + Math.random() * 60;
      const throwX = (Math.random() - 0.5) * 4;

      setCurrentKubbThrowIndex(0);
      setThrownKubbData({
        power,
        angle,
        spin,
        startPos: [throwX, -1.4, botBackLineZ],
        targetSide: 'player',
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [phase, kubbsToThrow, knockedBotKubbsThisTurn, onPhaseChange]);

  // Handle bot kubb landing - collect for player to raise (uses same kubb ID)
  const handleBotKubbLanded = useCallback((finalPosition: [number, number, number]) => {
    // Get the kubb being thrown - preserve its ID
    const thrownKubbInfo = kubbsToThrow[currentKubbThrowIndex];
    const kubbId = thrownKubbInfo?.id || `field-player-${Date.now()}-${currentKubbThrowIndex}`;
    
    // Add to landed kubbs for raising
    setLandedKubbs(prev => [...prev, {
      id: kubbId,
      position: finalPosition,
      raised: false,
    }]);
    
    setThrownKubbData(null);

    const nextIndex = currentKubbThrowIndex + 1;
    if (nextIndex >= kubbsToThrow.length) {
      // All kubbs thrown - transition to raise phase
      setKubbsToThrow([]);
      setCurrentKubbThrowIndex(0);
      setPhase('player_raise_kubbs');
      onPhaseChange('player_raise_kubbs');
      return;
    }

    // Throw next kubb after delay
    setTimeout(() => {
      const power = 60 + Math.random() * 20;
      const angle = 42 + Math.random() * 8;
      const spin = -30 + Math.random() * 60;
      const throwX = (Math.random() - 0.5) * 4;

      setCurrentKubbThrowIndex(nextIndex);
      setThrownKubbData({
        power,
        angle,
        spin,
        startPos: [throwX, -1.4, botBackLineZ],
        targetSide: 'player',
      });
    }, 1500);
  }, [currentKubbThrowIndex, kubbsToThrow, onPhaseChange]);

  // Handle player raising a kubb (choosing top or bottom edge)
  const handleRaiseKubb = useCallback((kubbId: string, edge: 'top' | 'bottom') => {
    // Find the kubb that was raised
    const kubb = landedKubbs.find(k => k.id === kubbId);
    if (!kubb) return;
    
    // Mark as raised
    setLandedKubbs(prev => prev.map(k => 
      k.id === kubbId ? { ...k, raised: true } : k
    ));
    
    // Add/update as a field kubb - replace any existing with same ID
    const newFieldKubb: FieldKubbType = {
      id: kubb.id,
      position: kubb.position,
      isDown: false,
      side: 'player',
    };
    
    setFieldKubbs(current => {
      const filtered = current.filter(k => k.id !== kubb.id && !k.isDown);
      const updated = [...filtered, newFieldKubb];
      onFieldKubbsChange(updated);
      return updated;
    });
  }, [landedKubbs, onFieldKubbsChange]);

  // Handle completing the raise phase
  const handleRaiseComplete = useCallback(() => {
    console.log('🎯 Raise phase complete, transitioning to bot_turn');
    setLandedKubbs([]);
    setPhase('bot_turn');
    onPhaseChange('bot_turn');

    batonRef.current?.setOwner(false);
    batonRef.current?.reset([0, batonReadyY, botBackLineZ]);

    setPlayerBatonsLeft(BATONS_PER_TURN);
    setBotBatonsLeft(BATONS_PER_TURN);
    onPlayerBatonsChange(BATONS_PER_TURN);
    onBotBatonsChange(BATONS_PER_TURN);
  }, [onPhaseChange, onPlayerBatonsChange, onBotBatonsChange]);

  // Handle player kubb aim changes (for trajectory preview) - only angle and spin from sliders
  const handleKubbAimChange = useCallback((power: number, angle: number, spin: number) => {
    // Power comes from oscillating meter, but angle/spin from sliders
    setKubbAimAngle(angle);
    setKubbAimSpin(spin);
  }, []);
  
  // Keep trajectory preview updated with oscillating power
  useEffect(() => {
    if (phase === 'player_throw_kubbs' && isKubbAiming) {
      setKubbAimPower(kubbOscillatingPower);
    }
  }, [phase, isKubbAiming, kubbOscillatingPower]);

  // Handle player kubb throw - now triggered by mouse release
  const handlePlayerKubbThrow = useCallback((power: number, angle: number, spin: number) => {
    if (phase !== 'player_throw_kubbs' || currentKubbThrowIndex >= kubbsToThrow.length) return;

    setThrownKubbData({
      power,
      angle,
      spin,
      startPos: [kubbAimX, -1.4, playerBackLineZ],
      targetSide: 'bot',
    });
    setIsKubbAiming(false);
    setKubbAimX(0);
  }, [phase, currentKubbThrowIndex, kubbsToThrow.length, kubbAimX]);
  
  // Kubb throw mouse controls
  const handleKubbPointerDown = useCallback((e: any) => {
    if (phase !== 'player_throw_kubbs' || thrownKubbData) return;
    e.stopPropagation();
    
    const worldX = typeof e.point?.x === 'number' ? e.point.x : 0;
    const clampedX = Math.max(-3, Math.min(3, worldX));
    setKubbAimX(clampedX);
    setIsKubbAiming(true);
  }, [phase, thrownKubbData]);
  
  const handleKubbPointerMove = useCallback((e: any) => {
    if (phase !== 'player_throw_kubbs') return;
    
    const worldX = typeof e.point?.x === 'number' ? e.point.x : 0;
    const clampedX = Math.max(-3, Math.min(3, worldX));
    
    if (isKubbAiming) {
      setKubbAimX(clampedX);
    }
  }, [phase, isKubbAiming]);
  
  const handleKubbPointerUp = useCallback(() => {
    if (isKubbAiming && phase === 'player_throw_kubbs' && !thrownKubbData) {
      handlePlayerKubbThrow(kubbOscillatingPower, kubbAimAngle, kubbAimSpin);
    }
  }, [isKubbAiming, phase, thrownKubbData, kubbOscillatingPower, kubbAimAngle, kubbAimSpin, handlePlayerKubbThrow]);

  // Handle kubb landing - update position of existing kubb (not create new)
  const handleKubbLanded = useCallback((finalPosition: [number, number, number]) => {
    setThrownKubbData(null);

    if (phase !== 'player_throw_kubbs') return;

    // Get the kubb being thrown - it moves to new position, not duplicated
    const thrownKubbInfo = kubbsToThrow[currentKubbThrowIndex];
    if (!thrownKubbInfo) return;

    const newKubb: FieldKubbType = {
      id: thrownKubbInfo.id, // Keep same ID so we track the same kubb
      position: finalPosition,
      isDown: false,
      side: 'bot',
    };

    // Replace any existing kubb with same ID, or add if new
    setFieldKubbs(prev => {
      const filtered = prev.filter(k => k.id !== thrownKubbInfo.id && !k.isDown);
      const updated = [...filtered, newKubb];
      onFieldKubbsChange(updated);
      return updated;
    });

    const nextIndex = currentKubbThrowIndex + 1;
    if (nextIndex >= kubbsToThrow.length) {
      // All kubbs thrown -> next round, player throws batons
      setKubbsToThrow([]);
      setCurrentKubbThrowIndex(0);

      const newRound = currentRound + 1;
      setCurrentRound(newRound);
      onRoundChange(newRound);

      setPhase('player_turn');
      onPhaseChange('player_turn');

      setPlayerBatonsLeft(BATONS_PER_TURN);
      setBotBatonsLeft(BATONS_PER_TURN);
      onPlayerBatonsChange(BATONS_PER_TURN);
      onBotBatonsChange(BATONS_PER_TURN);

      batonRef.current?.setOwner(true);
       batonRef.current?.reset([0, batonReadyY, playerBackLineZ]);
    } else {
      setCurrentKubbThrowIndex(nextIndex);
    }
  }, [phase, currentKubbThrowIndex, kubbsToThrow, currentRound, onFieldKubbsChange, onPhaseChange, onPlayerBatonsChange, onBotBatonsChange, onRoundChange]);

  // End player turn when out of batons
  useEffect(() => {
    if (phase === 'player_turn' && playerBatonsLeft === 0 && !batonInFlight) {
      const timer = setTimeout(() => {
        // Clean up downed field kubbs on bot side
        const downedBotFieldKubbs = fieldKubbs.filter(k => k.side === 'bot' && k.isDown);
        if (downedBotFieldKubbs.length > 0) {
          const standingKubbs = fieldKubbs.filter(k => !k.isDown);
          setFieldKubbs(standingKubbs);
          onFieldKubbsChange(standingKubbs);
        }

        if (knockedBotKubbsThisTurn.length > 0) {
          console.log('➡️ Transitioning to bot_throw_kubbs, kubbs:', knockedBotKubbsThisTurn.length);
          setKubbsToThrow(knockedBotKubbsThisTurn);
          setCurrentKubbThrowIndex(0);
          setPhase('bot_throw_kubbs');
          onPhaseChange('bot_throw_kubbs');
        } else {
          console.log('➡️ No kubbs knocked, going to bot_turn');
          setPhase('bot_turn');
          onPhaseChange('bot_turn');

          batonRef.current?.setOwner(false);
          batonRef.current?.reset([0, batonReadyY, botBackLineZ]);

          setPlayerBatonsLeft(BATONS_PER_TURN);
          setBotBatonsLeft(BATONS_PER_TURN);
          onPlayerBatonsChange(BATONS_PER_TURN);
          onBotBatonsChange(BATONS_PER_TURN);
        }
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [phase, playerBatonsLeft, batonInFlight, fieldKubbs, knockedBotKubbsThisTurn, onFieldKubbsChange, onPhaseChange, onPlayerBatonsChange, onBotBatonsChange]);

  // Bot controller
  const handleBotThrow = useCallback(() => {
    setBotBatonsLeft(prev => {
      const newVal = prev - 1;
      onBotBatonsChange(newVal);
      return newVal;
    });
  }, [onBotBatonsChange]);

  const handleBotTurnEnd = useCallback(() => {
    console.log('🤖 handleBotTurnEnd called, knockedPlayerKubbsThisTurn:', knockedPlayerKubbsThisTurn.length);
    
    if (knockedPlayerKubbsThisTurn.length > 0) {
      // Player must throw knocked kubbs to bot's side
      const standingKubbs = fieldKubbs.filter(k => !k.isDown);
      setFieldKubbs(standingKubbs);
      onFieldKubbsChange(standingKubbs);

      console.log('➡️ Transitioning to player_throw_kubbs, kubbs:', knockedPlayerKubbsThisTurn.length);
      setKubbsToThrow(knockedPlayerKubbsThisTurn);
      setCurrentKubbThrowIndex(0);
      setPhase('player_throw_kubbs');
      onPhaseChange('player_throw_kubbs');
      return;
    }

    // No kubbs knocked -> next round, player turn
    const standingKubbs = fieldKubbs.filter(k => !k.isDown);
    setFieldKubbs(standingKubbs);
    onFieldKubbsChange(standingKubbs);

    const newRound = currentRound + 1;
    setCurrentRound(newRound);
    onRoundChange(newRound);

    setPhase('player_turn');
    onPhaseChange('player_turn');

    setPlayerBatonsLeft(BATONS_PER_TURN);
    setBotBatonsLeft(BATONS_PER_TURN);
    onPlayerBatonsChange(BATONS_PER_TURN);
    onBotBatonsChange(BATONS_PER_TURN);

    batonRef.current?.setOwner(true);
    batonRef.current?.reset([0, batonReadyY, playerBackLineZ]);
  }, [knockedPlayerKubbsThisTurn, fieldKubbs, currentRound, onFieldKubbsChange, onPhaseChange, onPlayerBatonsChange, onBotBatonsChange, onRoundChange]);

  // Bot also needs to hit player baseline kubbs
  const handlePlayerBaselineHit = useCallback((id: number) => {
    const currentPhase = phaseRef.current;
    console.log('🎯 Player baseline kubb hit! ID:', id, 'Phase:', currentPhase);
    
    setPlayerBaselineKubbsDown(prev => {
      const newSet = new Set(prev);
      if (!newSet.has(id)) {
        newSet.add(id);
        onBotScoreChange(newSet.size);
        onPlayerBaselineChange(5 - newSet.size);
        sounds.playHitSound();

        // Track for return-throw ONLY during bot turn
        if (currentPhase === 'bot_turn') {
          console.log('📦 Adding player kubb to knockedPlayerKubbsThisTurn');
          setKnockedPlayerKubbsThisTurn(list => {
            const entry: KubbToThrow = { id: `player-baseline-${id}`, originalPosition: PLAYER_BASELINE_POSITIONS[id] };
            if (list.some(k => k.id === entry.id)) return list;
            console.log('📦 Knocked player kubbs now:', list.length + 1);
            return [...list, entry];
          });
        }
      }
      return newSet;
    });
  }, [onBotScoreChange, onPlayerBaselineChange, sounds]);

  useBotController({
    batonRef,
    isActive: phase === 'bot_turn',
    batonsLeft: botBatonsLeft,
    fieldKubbs: fieldKubbs.filter(k => k.side === 'player'), // Bot targets player-side field kubbs
    playerBaselineKubbsDown,
    onThrow: handleBotThrow,
    onTurnEnd: handleBotTurnEnd,
    batonReadyY,
  });

  // Player controls
  const handlePointerDown = useCallback((e: any) => {
    if (phase !== 'player_turn' || playerBatonsLeft <= 0 || kingHit) return;
    e.stopPropagation();
    e.target?.setPointerCapture?.(e.pointerId);

    const worldX = typeof e.point?.x === 'number' ? e.point.x : 0;
    const clampedX = Math.max(-3, Math.min(3, worldX));
    setThrowerX(clampedX);
    batonRef.current?.reset([clampedX, batonReadyY, playerBackLineZ]);
    setIsAiming(true);
  }, [phase, playerBatonsLeft, kingHit]);

  const handlePointerMove = useCallback((e: any) => {
    if (phase !== 'player_turn' || playerBatonsLeft <= 0 || kingHit) return;

    const worldX = typeof e.point?.x === 'number' ? e.point.x : 0;
    const nextThrowerX = Math.max(-3, Math.min(3, worldX));

    if (!batonInFlight && !isAiming) {
      setThrowerX(nextThrowerX);
      batonRef.current?.reset([nextThrowerX, batonReadyY, playerBackLineZ]);
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

      // Apply wind to throw velocity
      const windAdjustedVelocityX = velocityX + wind.velocityX;
      const windAdjustedVelocityZ = velocityZ + wind.velocityZ;

      batonRef.current.throw(
        [windAdjustedVelocityX, velocityY, windAdjustedVelocityZ],
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
          batonRef.current?.reset([currentThrowerX, batonReadyY, playerBackLineZ]);
          setBatonInFlight(false);
        } else {
          setBatonInFlight(false);
        }
      }, 2500);
    }

    e?.target?.releasePointerCapture?.(e?.pointerId);
    setIsAiming(false);
    setAimOffset(0);
  }, [isAiming, oscillatingPower, aimOffset, playerBatonsLeft, kingHit, phase, throwerX, totalThrows, onPlayerBatonsChange, onThrowsChange, wind]);

  // Player hits bot baseline kubb
  const handleBotBaselineHit = useCallback((id: number) => {
    const currentPhase = phaseRef.current;
    console.log('🎯 Bot baseline kubb hit! ID:', id, 'Phase:', currentPhase);

    setBotBaselineKubbsDown(prev => {
      const newSet = new Set(prev);
      if (!newSet.has(id)) {
        newSet.add(id);
        
        // Only count score if field kubbs are cleared (rules)
        if (!mustClearFieldKubbsFirst) {
          onPlayerScoreChange(newSet.size);
          onBotBaselineChange(5 - newSet.size);
        }
        
        sounds.playHitSound();

        // Track for return-throw ONLY during player turn
        if (currentPhase === 'player_turn') {
          setKnockedBotKubbsThisTurn(list => {
            const entry: KubbToThrow = { id: `bot-baseline-${id}`, originalPosition: BOT_BASELINE_POSITIONS[id] };
            return list.some(k => k.id === entry.id) ? list : [...list, entry];
          });
        }
      }
      return newSet;
    });
  }, [mustClearFieldKubbsFirst, onPlayerScoreChange, onBotBaselineChange, sounds]);

  // Player hits field kubb
  const handleFieldKubbHit = useCallback((id: string) => {
    const currentPhase = phaseRef.current;
    console.log('🎯 Field kubb hit! ID:', id, 'Phase:', currentPhase);
    
    setFieldKubbs(prev => {
      const hit = prev.find(k => k.id === id);
      const updated = prev.map(k => k.id === id ? { ...k, isDown: true } : k);
      onFieldKubbsChange(updated);

      // Track knocked field kubb for return-throw based on who is currently throwing batons
      if (hit && !hit.isDown) {
        sounds.playHitSound();
        
        if (currentPhase === 'player_turn' && hit.side === 'bot') {
          console.log('📦 Adding bot field kubb to knockedBotKubbsThisTurn');
          setKnockedBotKubbsThisTurn(list => {
            const entry: KubbToThrow = { id: `bot-field-${id}`, originalPosition: hit.position };
            return list.some(k => k.id === entry.id) ? list : [...list, entry];
          });
        }
        if (currentPhase === 'bot_turn' && hit.side === 'player') {
          console.log('📦 Adding player field kubb to knockedPlayerKubbsThisTurn');
          setKnockedPlayerKubbsThisTurn(list => {
            const entry: KubbToThrow = { id: `player-field-${id}`, originalPosition: hit.position };
            return list.some(k => k.id === entry.id) ? list : [...list, entry];
          });
        }
      }

      return updated;
    });
  }, [onFieldKubbsChange, sounds]);

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
      sounds.playKingHitSound();
      
      // Determine who knocked the king based on current phase
      const currentPlayer = phase === 'player_turn' || phase === 'player_throw_kubbs' ? 'player' : 'bot';
      const opponentKubbsRemaining = getOpponentKubbsRemaining(currentPlayer);
      
      if (opponentKubbsRemaining > 0) {
        // King knocked too early - current player LOSES
        const newPhase = currentPlayer === 'player' ? 'player_lose' : 'player_win';
        setPhase(newPhase);
        onPhaseChange(newPhase);
        setTimeout(() => currentPlayer === 'player' ? sounds.playDefeatSound() : sounds.playVictorySound(), 500);
      } else {
        // All opponent kubbs were down - current player WINS
        const newPhase = currentPlayer === 'player' ? 'player_win' : 'player_lose';
        setPhase(newPhase);
        onPhaseChange(newPhase);
        setTimeout(() => currentPlayer === 'player' ? sounds.playVictorySound() : sounds.playDefeatSound(), 500);
      }
    }
  }, [kingHit, phase, getOpponentKubbsRemaining, onPhaseChange, sounds]);

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
        
        {/* Bot baseline kubbs (player throws at these) - hide only during/after throw-back */}
        {BOT_BASELINE_POSITIONS.map((pos, i) => {
          // Show kubb if: not hit, OR hit but not yet in throw-back phase
          const isDown = botBaselineKubbsDown.has(i);
          const hideForThrowBack = isDown && (phase === 'bot_throw_kubbs' || phase === 'player_raise_kubbs' || phase === 'bot_turn');
          if (hideForThrowBack) return null;
          
          return (
            <TargetCube
              key={`${resetKey}-bot-baseline-${i}`}
              id={i}
              position={pos}
              color={CUBE_COLORS[i]}
              onHit={handleBotBaselineHit}
              isHit={isDown}
              disabled={mustClearFieldKubbsFirst}
            />
          );
        })}
        
        {/* Player baseline kubbs (bot throws at these) - hide only during/after throw-back */}
        {PLAYER_BASELINE_POSITIONS.map((pos, i) => {
          const isDown = playerBaselineKubbsDown.has(i);
          const hideForThrowBack = isDown && (phase === 'player_throw_kubbs' || phase === 'player_turn');
          if (hideForThrowBack) return null;
          
          return (
            <PlayerBaselineKubb
              key={`${resetKey}-player-baseline-${i}`}
              id={i}
              position={pos}
              onHit={handlePlayerBaselineHit}
              isHit={isDown}
            />
          );
        })}
        
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

      {/* Kubb throwing controls with trajectory */}
      {phase === 'player_throw_kubbs' && !thrownKubbData && (
        <>
          <KubbAimTrajectory
            startPosition={[kubbAimX, -1.4, playerBackLineZ]}
            power={kubbAimPower}
            angle={kubbAimAngle}
            spin={kubbAimSpin}
            targetSide="bot"
            visible={isKubbAiming}
          />
          {/* Kubb position indicator */}
          <mesh position={[kubbAimX, -1.95, playerBackLineZ]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.15, 0.25, 32]} />
            <meshBasicMaterial color="#D97706" opacity={0.8} transparent />
          </mesh>
          {/* Power meter for kubb throw */}
          {isKubbAiming && (
            <Html center position={[4, 0, 0]}>
              <div className="flex flex-col items-center gap-1 pointer-events-none">
                <div className="text-sm font-bold text-white drop-shadow-lg">Kraft</div>
                <div className="w-8 h-40 bg-black/50 backdrop-blur-sm rounded-full overflow-hidden border border-white/30 flex flex-col-reverse">
                  <div 
                    className={`w-full transition-colors duration-75 ${
                      kubbOscillatingPower < 50 ? 'bg-green-500' :
                      kubbOscillatingPower < 70 ? 'bg-yellow-500' :
                      kubbOscillatingPower < 85 ? 'bg-orange-500' : 'bg-red-500'
                    }`}
                    style={{ height: `${kubbOscillatingPower}%` }}
                  />
                </div>
                <div className="text-xs text-white drop-shadow-lg">{Math.round(kubbOscillatingPower)}%</div>
              </div>
            </Html>
          )}
        </>
      )}
      <KubbThrowControls
        kubbsRemaining={kubbsToThrow.length}
        currentKubbIndex={currentKubbThrowIndex}
        onThrow={handlePlayerKubbThrow}
        onAimChange={handleKubbAimChange}
        visible={phase === 'player_throw_kubbs' && !thrownKubbData}
        isAiming={isKubbAiming}
        aimX={kubbAimX}
        power={kubbOscillatingPower}
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

      {/* Player raise kubbs UI */}
      <KubbRaiseUI
        landedKubbs={landedKubbs}
        currentKubbIndex={0}
        onRaise={handleRaiseKubb}
        onComplete={handleRaiseComplete}
        visible={phase === 'player_raise_kubbs'}
      />

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
        onPointerDown={phase === 'player_throw_kubbs' ? handleKubbPointerDown : handlePointerDown}
        onPointerMove={phase === 'player_throw_kubbs' ? handleKubbPointerMove : handlePointerMove}
        onPointerUp={phase === 'player_throw_kubbs' ? handleKubbPointerUp : handlePointerUp}
        onPointerLeave={phase === 'player_throw_kubbs' ? handleKubbPointerUp : handlePointerUp}
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
  wind: Wind;
  batonReadyY: number;
}

export const GameScene = (props: GameSceneProps) => {
  const sounds = useSoundEffects();
  
  return (
    <Canvas
      shadows
      camera={{ position: [0, 4, 12], fov: 50 }}
      style={{ touchAction: 'none' }}
    >
      <GameSceneContent {...props} sounds={sounds} />
    </Canvas>
  );
};

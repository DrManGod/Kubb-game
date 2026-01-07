import { Button } from '@/components/ui/button';
import { RotateCcw, Target, Trophy, Swords } from 'lucide-react';
import { GamePhase, FieldKubb } from '@/hooks/useGameState';

interface GameUIProps {
  phase: GamePhase;
  playerScore: number;
  botScore: number;
  playerBatonsLeft: number;
  botBatonsLeft: number;
  totalThrows: number;
  fieldKubbs: FieldKubb[];
  onReset: () => void;
  baselineKubbsPlayer: number;
  baselineKubbsBot: number;
  currentRound: number;
  kingStanding: boolean;
  advantageLine: number | null;
}

// Sub-component for Player/Bot panels
const PlayerPanel = ({
  title,
  icon,
  isActive,
  batonsLeft,
  baselineKubbs,
  fieldKubbsCount,
  score,
  isPlayer,
}: {
  title: string;
  icon: string;
  isActive: boolean;
  batonsLeft: number;
  baselineKubbs: number;
  fieldKubbsCount: number;
  score: number;
  isPlayer: boolean;
}) => {
  const bgColor = isPlayer ? 'from-blue-900/80 to-blue-800/60' : 'from-red-900/80 to-red-800/60';
  const borderColor = isActive ? 'border-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.5)]' : 'border-white/20';
  const kubbFillColor = isPlayer ? 'bg-amber-500' : 'bg-red-400';
  const fieldKubbColor = isPlayer ? 'bg-orange-500' : 'bg-red-500';

  return (
    <div
      className={`
        w-64 backdrop-blur-md rounded-2xl p-4 shadow-2xl 
        bg-gradient-to-b ${bgColor}
        border-2 ${borderColor}
        transition-all duration-300
        ${isActive ? 'scale-105' : 'scale-100'}
      `}
    >
      {/* Title */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">{icon}</span>
        <span className="text-xl font-bold text-white">{title}</span>
      </div>

      {/* Score */}
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="w-5 h-5 text-yellow-400" />
        <span className="text-lg font-semibold text-white">Poäng: {score}</span>
      </div>

      {/* Batons */}
      <div className="mb-3">
        <span className="text-sm text-white/70 mb-1 block">Kastpinnar</span>
        <div className="flex gap-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={`w-3 h-8 rounded-sm transition-all duration-300 ${
                i < batonsLeft ? 'bg-amber-400 shadow-md' : 'bg-white/20'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Baseline Kubbs */}
      <div className="mb-3">
        <span className="text-sm text-white/70 mb-1 block">Baslinje-kubbar</span>
        <div className="flex gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className={`w-5 h-6 rounded-sm transition-all duration-300 ${
                i < baselineKubbs ? kubbFillColor : 'bg-white/30'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Field Kubbs */}
      <div>
        <span className="text-sm text-white/70 mb-1 block">Fältkubbar</span>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-white">{fieldKubbsCount}</span>
          <div className="flex gap-1">
            {Array.from({ length: Math.min(fieldKubbsCount, 6) }).map((_, i) => (
              <div
                key={i}
                className={`w-4 h-5 rounded-sm ${fieldKubbColor}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Game Info Panel
const GameInfoPanel = ({
  currentRound,
  totalThrows,
  kingStanding,
  advantageLine,
  isGameOver,
  onReset,
}: {
  currentRound: number;
  totalThrows: number;
  kingStanding: boolean;
  advantageLine: number | null;
  isGameOver: boolean;
  onReset: () => void;
}) => {
  return (
    <div className="bg-black/60 backdrop-blur-md rounded-xl px-6 py-3 flex items-center gap-6 shadow-2xl">
      {/* Round */}
      <div className="text-center">
        <span className="text-xs text-white/60 block">Runda</span>
        <span className="text-xl font-bold text-white">{currentRound}</span>
      </div>

      {/* Throws */}
      <div className="text-center">
        <span className="text-xs text-white/60 block">Kast</span>
        <span className="text-xl font-bold text-white">{totalThrows}</span>
      </div>

      {/* King Status */}
      <div className="text-center">
        <span className="text-xs text-white/60 block">Kungen</span>
        <span className="text-2xl">{kingStanding ? '👑' : '💥'}</span>
      </div>

      {/* Advantage Line */}
      {advantageLine !== null && (
        <div className="flex items-center gap-1 text-yellow-400">
          <Target className="w-5 h-5 animate-pulse" />
          <span className="text-sm font-medium">Fördelslinje</span>
        </div>
      )}

      {/* Reset Button */}
      <Button
        onClick={onReset}
        variant="ghost"
        size="sm"
        className={`ml-2 ${
          isGameOver
            ? 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700'
            : 'bg-white/10 text-white hover:bg-white/20'
        }`}
      >
        <RotateCcw className="w-4 h-4 mr-1" />
        Omstart
      </Button>
    </div>
  );
};

// Field Overview Mini-map
const FieldOverview = ({
  baselineKubbsPlayer,
  baselineKubbsBot,
  fieldKubbs,
  kingStanding,
  advantageLine,
}: {
  baselineKubbsPlayer: number;
  baselineKubbsBot: number;
  fieldKubbs: FieldKubb[];
  kingStanding: boolean;
  advantageLine: number | null;
}) => {
  const playerFieldKubbs = fieldKubbs.filter(k => !k.isDown);
  
  return (
    <div className="w-48 backdrop-blur-md bg-black/40 rounded-xl p-3 shadow-2xl">
      {/* Title */}
      <div className="flex items-center gap-2 mb-2">
        <Swords className="w-4 h-4 text-white/80" />
        <span className="text-sm font-semibold text-white/80">Spelplan</span>
      </div>

      {/* Mini Field */}
      <div className="relative w-full h-32 bg-green-800/80 rounded-lg border border-green-600/50 overflow-hidden">
        {/* Bot baseline kubbs (top) */}
        <div className="absolute top-2 left-0 right-0 flex justify-center gap-1">
          {Array.from({ length: baselineKubbsBot }).map((_, i) => (
            <div key={i} className="w-2 h-3 bg-red-500 rounded-sm" />
          ))}
        </div>

        {/* Player baseline kubbs (bottom) */}
        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
          {Array.from({ length: baselineKubbsPlayer }).map((_, i) => (
            <div key={i} className="w-2 h-3 bg-blue-500 rounded-sm" />
          ))}
        </div>

        {/* King in center */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <span className={`text-lg ${kingStanding ? 'animate-pulse' : 'opacity-50'}`}>
            {kingStanding ? '👑' : '💥'}
          </span>
        </div>

        {/* Field kubbs (middle area) */}
        {playerFieldKubbs.map((kubb, i) => {
          // Map kubb position to mini-map coordinates
          const x = 50 + (kubb.position[0] / 4) * 40; // percentage
          const y = 60 + (kubb.position[2] / 3) * 15; // percentage
          return (
            <div
              key={kubb.id}
              className="absolute w-2 h-2 bg-blue-400 rounded-sm"
              style={{
                left: `${Math.max(10, Math.min(90, x))}%`,
                top: `${Math.max(25, Math.min(75, y))}%`,
              }}
            />
          );
        })}

        {/* Advantage line */}
        {advantageLine !== null && (
          <div 
            className="absolute left-0 right-0 h-0.5 bg-yellow-400 animate-pulse"
            style={{ top: `${50 + advantageLine * 10}%` }}
          />
        )}
      </div>
    </div>
  );
};

export const GameUI = ({
  phase,
  playerScore,
  botScore,
  playerBatonsLeft,
  botBatonsLeft,
  totalThrows,
  fieldKubbs,
  onReset,
  baselineKubbsPlayer,
  baselineKubbsBot,
  currentRound,
  kingStanding,
  advantageLine,
}: GameUIProps) => {
  const isPlayerTurn = phase === 'player_turn';
  const isBotTurn = phase === 'bot_turn';
  const isPlayerThrowingKubbs = phase === 'player_throw_kubbs';
  const isBotThrowingKubbs = phase === 'bot_throw_kubbs';
  const isWinner = phase === 'player_win';
  const isLoser = phase === 'player_lose';
  const isGameOver = isWinner || isLoser;

  const standingFieldKubbs = fieldKubbs.filter(k => !k.isDown).length;

  // Phase indicator config
  const getPhaseConfig = () => {
    if (isWinner) return { bg: 'bg-green-600', text: '🏆 Du vann!', glow: 'shadow-green-500/50' };
    if (isLoser) return { bg: 'bg-red-600', text: '💥 Du förlorade!', glow: 'shadow-red-500/50' };
    if (isPlayerThrowingKubbs) return { bg: 'bg-amber-600', text: '🎯 Kasta kubbar till motståndarens sida', glow: 'shadow-amber-500/50' };
    if (isBotThrowingKubbs) return { bg: 'bg-red-600', text: '🤖 Boten kastar tillbaka kubbar...', glow: 'shadow-red-500/50' };
    if (isBotTurn) return { bg: 'bg-red-600', text: '🤖 Motståndaren kastar...', glow: 'shadow-red-500/50' };
    return { bg: 'bg-blue-600', text: '🎯 Din tur!', glow: 'shadow-blue-500/50' };
  };

  const phaseConfig = getPhaseConfig();

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Phase Indicator - Top Center */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 pointer-events-auto animate-in">
        <div
          className={`
            ${phaseConfig.bg} ${phaseConfig.glow}
            px-6 py-3 rounded-xl shadow-2xl
            transition-all duration-300
            ${isBotThrowingKubbs ? 'animate-pulse' : ''}
          `}
        >
          <span className="text-xl font-bold text-white">{phaseConfig.text}</span>
        </div>
      </div>

      {/* Bot Throwing Kubbs Overlay */}
      {isBotThrowingKubbs && (
        <div className="absolute top-32 left-1/2 -translate-x-1/2 z-10">
          <div className="bg-red-900/80 backdrop-blur-md rounded-xl px-8 py-4 shadow-2xl border-2 border-red-500/50 animate-fade-in">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-8 h-10 bg-amber-600 rounded-sm animate-bounce" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-400 rounded-full animate-ping" />
              </div>
              <div className="text-center">
                <p className="text-white font-bold text-lg">🤖 Boten kastar tillbaka kubbar</p>
                <p className="text-white/70 text-sm">Nedfallna kubbar kastas till din sida av planen</p>
              </div>
              <div className="relative">
                <div className="w-8 h-10 bg-amber-600 rounded-sm animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Left Panel - Player */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-auto">
        <PlayerPanel
          title="Du"
          icon="🎯"
          isActive={isPlayerTurn}
          batonsLeft={playerBatonsLeft}
          baselineKubbs={baselineKubbsPlayer}
          fieldKubbsCount={standingFieldKubbs}
          score={playerScore}
          isPlayer={true}
        />
      </div>

      {/* Right Panel - Bot */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-auto">
        <PlayerPanel
          title="Motståndare"
          icon="🤖"
          isActive={isBotTurn}
          batonsLeft={botBatonsLeft}
          baselineKubbs={baselineKubbsBot}
          fieldKubbsCount={0}
          score={botScore}
          isPlayer={false}
        />
      </div>

      {/* Top Right - Field Overview */}
      <div className="absolute top-16 right-4 pointer-events-auto">
        <FieldOverview
          baselineKubbsPlayer={baselineKubbsPlayer}
          baselineKubbsBot={baselineKubbsBot}
          fieldKubbs={fieldKubbs}
          kingStanding={kingStanding}
          advantageLine={advantageLine}
        />
      </div>

      {/* Bottom Center - Game Info */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-auto">
        <GameInfoPanel
          currentRound={currentRound}
          totalThrows={totalThrows}
          kingStanding={kingStanding}
          advantageLine={advantageLine}
          isGameOver={isGameOver}
          onReset={onReset}
        />
      </div>

      {/* Instructions */}
      {!isGameOver && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-sm rounded-lg px-4 py-2">
          <p className="text-center text-white/80 text-sm font-medium">
            {isPlayerTurn
              ? '🎯 Klicka och håll för att sikta, släpp för att kasta!'
              : isPlayerThrowingKubbs
              ? '🎯 Använd reglagen för att kasta kubbarna till motståndaren!'
              : '🤖 Vänta medan motståndaren kastar...'}
          </p>
        </div>
      )}

      {/* Winner overlay */}
      {isWinner && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm pointer-events-auto">
          <div className="bg-gradient-to-b from-green-800/90 to-green-900/90 rounded-2xl p-8 shadow-2xl border border-green-500/50 text-center animate-in">
            <h2 className="text-4xl font-bold text-white mb-2">🎉 Du vann!</h2>
            <p className="text-white/80 mb-4">Alla kubbar och kungen nedslagna på {totalThrows} kast!</p>
            <Button
              onClick={onReset}
              size="lg"
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Spela igen
            </Button>
          </div>
        </div>
      )}

      {/* Loser overlay */}
      {isLoser && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm pointer-events-auto">
          <div className="bg-gradient-to-b from-red-800/90 to-red-900/90 rounded-2xl p-8 shadow-2xl border border-red-500/50 text-center animate-in">
            <h2 className="text-4xl font-bold text-white mb-2">👑 Kungen föll för tidigt!</h2>
            <p className="text-white/80 mb-4">Du måste slå ner alla kubbar innan kungen!</p>
            <Button
              onClick={onReset}
              size="lg"
              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Försök igen
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

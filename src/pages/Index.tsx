import { useState, useCallback } from 'react';
import { GameScene } from '@/components/game/GameScene';
import { GameUI } from '@/components/game/GameUI';
import { GamePhase, FieldKubb } from '@/hooks/useGameState';

const Index = () => {
  const [phase, setPhase] = useState<GamePhase>('player_turn');
  const [playerScore, setPlayerScore] = useState(0);
  const [botScore, setBotScore] = useState(0);
  const [playerBatonsLeft, setPlayerBatonsLeft] = useState(6);
  const [botBatonsLeft, setBotBatonsLeft] = useState(6);
  const [totalThrows, setTotalThrows] = useState(0);
  const [fieldKubbs, setFieldKubbs] = useState<FieldKubb[]>([]);
  const [resetKey, setResetKey] = useState(0);
  const [baselineKubbsPlayer, setBaselineKubbsPlayer] = useState(5);
  const [baselineKubbsBot, setBaselineKubbsBot] = useState(5);
  const [currentRound, setCurrentRound] = useState(1);
  const [kingStanding, setKingStanding] = useState(true);
  const [advantageLine, setAdvantageLine] = useState<number | null>(null);

  const handleReset = useCallback(() => {
    setPhase('player_turn');
    setPlayerScore(0);
    setBotScore(0);
    setPlayerBatonsLeft(6);
    setBotBatonsLeft(6);
    setTotalThrows(0);
    setFieldKubbs([]);
    setResetKey(prev => prev + 1);
    setBaselineKubbsPlayer(5);
    setBaselineKubbsBot(5);
    setCurrentRound(1);
    setKingStanding(true);
    setAdvantageLine(null);
  }, []);

  return (
    <div className="relative w-full h-screen game-gradient overflow-hidden">
      {/* Title */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground text-center drop-shadow-lg">
          🏏 Kubb Toss
        </h1>
      </div>
      
      {/* 3D Game Canvas */}
      <GameScene 
        onPhaseChange={(newPhase) => {
          setPhase(newPhase);
          // Update king standing based on phase
          if (newPhase === 'player_win' || newPhase === 'player_lose') {
            setKingStanding(false);
          }
        }}
        onPlayerScoreChange={setPlayerScore}
        onBotScoreChange={setBotScore}
        onPlayerBatonsChange={setPlayerBatonsLeft}
        onBotBatonsChange={setBotBatonsLeft}
        onThrowsChange={setTotalThrows}
        onFieldKubbsChange={setFieldKubbs}
        onPlayerBaselineChange={setBaselineKubbsPlayer}
        onBotBaselineChange={setBaselineKubbsBot}
        onRoundChange={setCurrentRound}
        resetKey={resetKey}
      />
      
      {/* UI Overlay */}
      <GameUI 
        phase={phase}
        playerScore={playerScore}
        botScore={botScore}
        playerBatonsLeft={playerBatonsLeft}
        botBatonsLeft={botBatonsLeft}
        totalThrows={totalThrows}
        fieldKubbs={fieldKubbs}
        onReset={handleReset}
        baselineKubbsPlayer={baselineKubbsPlayer}
        baselineKubbsBot={baselineKubbsBot}
        currentRound={currentRound}
        kingStanding={kingStanding}
        advantageLine={advantageLine}
      />
    </div>
  );
};

export default Index;

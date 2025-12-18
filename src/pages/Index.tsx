import { useState, useCallback } from 'react';
import { GameScene } from '@/components/game/GameScene';
import { GameUI } from '@/components/game/GameUI';

const Index = () => {
  const [score, setScore] = useState(0);
  const [throws, setThrows] = useState(0);
  const [resetKey, setResetKey] = useState(0);

  const handleReset = useCallback(() => {
    setScore(0);
    setThrows(0);
    setResetKey(prev => prev + 1);
  }, []);

  return (
    <div className="relative w-full h-screen game-gradient overflow-hidden">
      {/* Title */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground text-center drop-shadow-lg">
          🏏 Baton Toss
        </h1>
      </div>
      
      {/* 3D Game Canvas */}
      <GameScene 
        onScoreChange={setScore}
        onThrowsChange={setThrows}
        resetKey={resetKey}
      />
      
      {/* UI Overlay */}
      <GameUI 
        score={score}
        throws={throws}
        onReset={handleReset}
      />
    </div>
  );
};

export default Index;

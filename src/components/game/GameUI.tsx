import { Button } from '@/components/ui/button';
import { RotateCcw, Target, Zap, Crown, Bot, User } from 'lucide-react';
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
}

export const GameUI = ({
  phase,
  playerScore,
  botScore,
  playerBatonsLeft,
  botBatonsLeft,
  totalThrows,
  fieldKubbs,
  onReset,
}: GameUIProps) => {
  const isPlayerTurn = phase === 'player_turn';
  const isBotTurn = phase === 'bot_turn';
  const isWinner = phase === 'player_win';
  const isLoser = phase === 'player_lose';
  
  const kubbColors = ['#FF6B6B', '#4ECDC4', '#95E67A', '#FFE66D', '#A06CD5'];
  const standingFieldKubbs = fieldKubbs.filter(k => !k.isDown).length;
  
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Header */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-auto">
        <div className="flex flex-col gap-2">
          {/* Turn Indicator */}
          <div className={`rounded-lg px-4 py-2 shadow-lg ${
            isPlayerTurn ? 'bg-primary/90 text-primary-foreground' : 
            isBotTurn ? 'bg-destructive/90 text-destructive-foreground' :
            'bg-card/90'
          }`}>
            <div className="flex items-center gap-2">
              {isPlayerTurn ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
              <span className="font-bold">
                {isPlayerTurn ? 'Your Turn' : isBotTurn ? "Bot's Turn" : 'Game Over'}
              </span>
            </div>
          </div>
          
          {/* Player Stats */}
          <div className="bg-card/90 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">Your Hits</span>
            </div>
            <p className={`text-3xl font-bold text-primary ${playerScore > 0 ? 'score-glow' : ''}`}>
              {playerScore}/5
            </p>
            {/* Individual kubb indicators */}
            <div className="flex gap-1.5 mt-2">
              {kubbColors.map((color, i) => (
                <div
                  key={i}
                  className={`w-4 h-6 rounded-sm transition-all duration-300 ${
                    i < playerScore 
                      ? 'opacity-30 rotate-45 scale-75' 
                      : 'shadow-md'
                  }`}
                  style={{ 
                    backgroundColor: i < playerScore ? '#888' : color,
                    transformOrigin: 'bottom center'
                  }}
                />
              ))}
            </div>
          </div>
          
          {/* Batons */}
          <div className="bg-card/90 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-secondary" />
              <span className="text-sm font-medium text-muted-foreground">
                {isPlayerTurn ? 'Your Batons' : 'Bot Batons'}
              </span>
            </div>
            <div className="flex gap-1 mt-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <div 
                  key={i}
                  className={`w-3 h-8 rounded-sm transition-all duration-300 ${
                    i < (isPlayerTurn ? playerBatonsLeft : botBatonsLeft)
                      ? 'bg-secondary shadow-md' 
                      : 'bg-muted'
                  }`}
                />
              ))}
            </div>
          </div>
          
          {/* Field Kubbs (if any) */}
          {fieldKubbs.length > 0 && (
            <div className="bg-card/90 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-amber-600" />
                <span className="text-sm font-medium text-muted-foreground">Field Kubbs</span>
              </div>
              <p className="text-xl font-bold text-amber-600">
                {standingFieldKubbs} standing
              </p>
              <p className="text-xs text-muted-foreground">
                {isBotTurn ? 'Bot is targeting these!' : 'These are on your side'}
              </p>
            </div>
          )}
          
          <div className="bg-card/90 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg">
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-yellow-500" />
              <span className="text-sm font-medium text-muted-foreground">King</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Knock down after all kubbs!
            </p>
          </div>
        </div>
        
        <Button 
          onClick={onReset}
          variant="secondary"
          size="lg"
          className="shadow-lg"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset
        </Button>
      </div>
      
      {/* Instructions */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-card/90 backdrop-blur-sm rounded-lg px-6 py-3 shadow-lg">
        <p className="text-center text-muted-foreground font-medium">
          {isPlayerTurn 
            ? '🎯 Click and hold to aim, release to throw!'
            : isBotTurn 
            ? '🤖 Bot is throwing at your field kubbs...'
            : ''}
        </p>
      </div>
      
      {/* Winner overlay */}
      {isWinner && (
        <div className="absolute inset-0 flex items-center justify-center bg-foreground/20 backdrop-blur-sm pointer-events-auto">
          <div className="bg-card rounded-2xl p-8 shadow-2xl bounce-in text-center">
            <h2 className="text-4xl font-bold text-primary mb-2">🎉 You Win!</h2>
            <p className="text-muted-foreground mb-4">All kubbs and the King knocked down in {totalThrows} throws!</p>
            <Button onClick={onReset} size="lg" className="shadow-lg">
              <RotateCcw className="w-4 h-4 mr-2" />
              Play Again
            </Button>
          </div>
        </div>
      )}
      
      {/* Loser overlay */}
      {isLoser && (
        <div className="absolute inset-0 flex items-center justify-center bg-foreground/20 backdrop-blur-sm pointer-events-auto">
          <div className="bg-card rounded-2xl p-8 shadow-2xl bounce-in text-center">
            <h2 className="text-4xl font-bold text-destructive mb-2">👑 King Down Early!</h2>
            <p className="text-muted-foreground mb-4">You must knock down all kubbs before the King!</p>
            <Button onClick={onReset} size="lg" className="shadow-lg">
              <RotateCcw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

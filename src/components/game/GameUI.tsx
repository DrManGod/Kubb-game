import { Button } from '@/components/ui/button';
import { RotateCcw, Target, Zap } from 'lucide-react';

interface GameUIProps {
  score: number;
  throws: number;
  batonsLeft: number;
  onReset: () => void;
}

export const GameUI = ({ score, throws, batonsLeft, onReset }: GameUIProps) => {
  const isWinner = score === 5;
  const outOfBatons = batonsLeft === 0 && !isWinner;
  
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Header */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-auto">
        <div className="flex flex-col gap-2">
          <div className="bg-card/90 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">Score</span>
            </div>
            <p className={`text-3xl font-bold text-primary ${score > 0 ? 'score-glow' : ''}`}>
              {score}/5
            </p>
          </div>
          
          <div className="bg-card/90 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-secondary" />
              <span className="text-sm font-medium text-muted-foreground">Batons Left</span>
            </div>
            <div className="flex gap-1 mt-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <div 
                  key={i}
                  className={`w-3 h-8 rounded-sm transition-all duration-300 ${
                    i < batonsLeft 
                      ? 'bg-secondary shadow-md' 
                      : 'bg-muted'
                  }`}
                />
              ))}
            </div>
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
          🎯 Drag up and release to throw the baton!
        </p>
      </div>
      
      {/* Winner overlay */}
      {isWinner && (
        <div className="absolute inset-0 flex items-center justify-center bg-foreground/20 backdrop-blur-sm pointer-events-auto">
          <div className="bg-card rounded-2xl p-8 shadow-2xl bounce-in text-center">
            <h2 className="text-4xl font-bold text-primary mb-2">🎉 You Win!</h2>
            <p className="text-muted-foreground mb-4">All kubbs knocked down in {throws} throws!</p>
            <Button onClick={onReset} size="lg" className="shadow-lg">
              <RotateCcw className="w-4 h-4 mr-2" />
              Play Again
            </Button>
          </div>
        </div>
      )}
      
      {/* Out of batons overlay */}
      {outOfBatons && (
        <div className="absolute inset-0 flex items-center justify-center bg-foreground/20 backdrop-blur-sm pointer-events-auto">
          <div className="bg-card rounded-2xl p-8 shadow-2xl bounce-in text-center">
            <h2 className="text-4xl font-bold text-destructive mb-2">Out of Batons!</h2>
            <p className="text-muted-foreground mb-4">You hit {score}/5 kubbs. Try again!</p>
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

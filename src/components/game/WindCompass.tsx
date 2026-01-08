import { Wind, getWindDirectionLabel } from '@/hooks/useWind';
import { Wind as WindIcon } from 'lucide-react';

interface WindCompassProps {
  wind: Wind;
}

export const WindCompass = ({ wind }: WindCompassProps) => {
  const directionDegrees = (wind.direction * 180 / Math.PI);
  const strengthPercent = (wind.strength / 10) * 100;
  const directionLabel = getWindDirectionLabel(wind.direction);
  
  // Color based on strength
  const getStrengthColor = () => {
    if (wind.strength < 3) return 'text-green-400';
    if (wind.strength < 6) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getStrengthBgColor = () => {
    if (wind.strength < 3) return 'bg-green-500';
    if (wind.strength < 6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="backdrop-blur-md bg-black/40 rounded-xl p-3 shadow-2xl w-32">
      {/* Title */}
      <div className="flex items-center gap-2 mb-2">
        <WindIcon className="w-4 h-4 text-white/80" />
        <span className="text-sm font-semibold text-white/80">Vind</span>
      </div>

      {/* Compass */}
      <div className="relative w-20 h-20 mx-auto mb-2">
        {/* Outer ring */}
        <div className="absolute inset-0 rounded-full border-2 border-white/30 bg-slate-900/60" />
        
        {/* Cardinal directions */}
        <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-0.5 text-xs font-bold text-white/70">N</span>
        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-0.5 text-xs font-bold text-white/70">S</span>
        <span className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-0.5 text-xs font-bold text-white/70">W</span>
        <span className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-0.5 text-xs font-bold text-white/70">E</span>

        {/* Center dot */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white/50" />

        {/* Wind arrow */}
        <div 
          className="absolute top-1/2 left-1/2 origin-center"
          style={{ 
            transform: `translate(-50%, -50%) rotate(${directionDegrees}deg)`,
          }}
        >
          {/* Arrow shaft */}
          <div 
            className={`w-1 rounded-full ${getStrengthBgColor()}`}
            style={{ 
              height: `${8 + (strengthPercent / 100) * 22}px`,
              marginLeft: '-2px',
              marginTop: `-${4 + (strengthPercent / 100) * 11}px`,
            }}
          />
          {/* Arrow head */}
          <div 
            className={`absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 
              border-l-[4px] border-l-transparent 
              border-r-[4px] border-r-transparent 
              border-b-[8px] ${wind.strength < 3 ? 'border-b-green-500' : wind.strength < 6 ? 'border-b-yellow-500' : 'border-b-red-500'}`}
            style={{
              marginTop: `-${4 + (strengthPercent / 100) * 11 + 6}px`,
              marginLeft: '-2px',
            }}
          />
        </div>
      </div>

      {/* Info */}
      <div className="text-center">
        <div className={`text-lg font-bold ${getStrengthColor()}`}>
          {wind.strength.toFixed(1)}
        </div>
        <div className="text-xs text-white/60">
          {directionLabel} • Styrka {Math.round(strengthPercent)}%
        </div>
      </div>
    </div>
  );
};

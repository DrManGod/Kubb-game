import { useState } from 'react';
import { Slider } from '@/components/ui/slider';
import { Settings, ChevronDown, ChevronUp } from 'lucide-react';

interface DebugSettingsProps {
  batonReadyY: number;
  onBatonReadyYChange: (value: number) => void;
}

export const DebugSettings = ({ batonReadyY, onBatonReadyYChange }: DebugSettingsProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="absolute top-16 left-4 z-20 pointer-events-auto">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-black/60 backdrop-blur-md rounded-lg px-3 py-2 text-white/80 hover:text-white hover:bg-black/70 transition-colors"
      >
        <Settings className="w-4 h-4" />
        <span className="text-sm font-medium">Debug</span>
        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {isOpen && (
        <div className="mt-2 bg-black/70 backdrop-blur-md rounded-xl p-4 w-64 shadow-2xl border border-white/10">
          <h3 className="text-white font-semibold text-sm mb-4">⚙️ Baton Settings</h3>
          
          <div className="space-y-3">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-white/70 text-xs">Baton Height (Y)</label>
                <span className="text-white font-mono text-xs bg-white/10 px-2 py-0.5 rounded">
                  {batonReadyY.toFixed(2)}
                </span>
              </div>
              <Slider
                value={[batonReadyY]}
                onValueChange={([value]) => onBatonReadyYChange(value)}
                min={0}
                max={2}
                step={0.05}
                className="w-full"
              />
              <div className="flex justify-between text-white/40 text-[10px] mt-1">
                <span>0.0 (ground)</span>
                <span>2.0 (high)</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import { useState, useCallback, useEffect, useRef } from 'react';
import { Html } from '@react-three/drei';
import { Slider } from '@/components/ui/slider';
import { RotateCw, ArrowUp } from 'lucide-react';

interface KubbThrowControlsProps {
  kubbsRemaining: number;
  currentKubbIndex: number;
  onThrow: (power: number, angle: number, spin: number) => void;
  onAimChange?: (power: number, angle: number, spin: number) => void;
  visible: boolean;
  isAiming: boolean;
  aimX: number;
  power: number;
}

export const KubbThrowControls = ({
  kubbsRemaining,
  currentKubbIndex,
  onThrow,
  onAimChange,
  visible,
  isAiming,
  aimX,
  power,
}: KubbThrowControlsProps) => {
  const [angle, setAngle] = useState(45);
  const [spin, setSpin] = useState(0);

  // Notify parent of aim changes for trajectory preview
  useEffect(() => {
    if (visible && onAimChange) {
      onAimChange(power, angle, spin);
    }
  }, [power, angle, spin, visible, onAimChange]);

  if (!visible) return null;

  return (
    <Html center position={[0, 3.5, 0]}>
      <div className="flex flex-col items-center gap-3">
        {/* Compact header */}
        <div className="bg-amber-900/90 backdrop-blur-md px-4 py-2 rounded-xl border border-amber-500/50 shadow-lg">
          <div className="flex items-center gap-3">
            <span className="text-amber-400 font-bold">
              🎯 Kasta Kubb
            </span>
            <span className="bg-amber-600/80 px-2 py-0.5 rounded-full text-sm text-white font-semibold">
              {kubbsRemaining - currentKubbIndex} kvar
            </span>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-black/60 backdrop-blur-sm px-4 py-2 rounded-lg text-center">
          <p className="text-white text-sm">
            {isAiming 
              ? `🎯 Kraft: ${Math.round(power)}% | Släpp för att kasta!` 
              : '🖱️ Klicka och håll för att sikta, släpp för att kasta!'
            }
          </p>
        </div>

        {/* Compact sliders for angle and spin */}
        <div className="flex gap-4 bg-amber-950/90 backdrop-blur-md px-4 py-3 rounded-xl border border-amber-500/30">
          {/* Angle slider */}
          <div className="flex flex-col items-center gap-1 w-24">
            <div className="flex items-center gap-1 text-amber-400">
              <ArrowUp className="w-3 h-3" />
              <span className="text-xs font-medium">Vinkel</span>
            </div>
            <Slider
              value={[angle]}
              onValueChange={(vals) => setAngle(vals[0])}
              min={30}
              max={60}
              step={1}
              className="w-full"
            />
            <span className="text-xs text-amber-200">{angle}°</span>
          </div>

          {/* Spin slider */}
          <div className="flex flex-col items-center gap-1 w-24">
            <div className="flex items-center gap-1 text-amber-400">
              <RotateCw className="w-3 h-3" />
              <span className="text-xs font-medium">Spin</span>
            </div>
            <Slider
              value={[spin]}
              onValueChange={(vals) => setSpin(vals[0])}
              min={-100}
              max={100}
              step={5}
              className="w-full"
            />
            <span className="text-xs text-amber-200">
              {spin > 0 ? `+${spin}` : spin}
            </span>
          </div>
        </div>
      </div>
    </Html>
  );
};

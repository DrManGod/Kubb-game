import { useState, useCallback } from 'react';
import { Html } from '@react-three/drei';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Target, RotateCw } from 'lucide-react';

interface KubbThrowControlsProps {
  kubbsRemaining: number;
  currentKubbIndex: number;
  onThrow: (power: number, angle: number, spin: number) => void;
  visible: boolean;
}

export const KubbThrowControls = ({
  kubbsRemaining,
  currentKubbIndex,
  onThrow,
  visible,
}: KubbThrowControlsProps) => {
  const [power, setPower] = useState(70);
  const [angle, setAngle] = useState(45);
  const [spin, setSpin] = useState(0);

  const handleThrow = useCallback(() => {
    onThrow(power, angle, spin);
  }, [power, angle, spin, onThrow]);

  if (!visible) return null;

  return (
    <Html center position={[0, 2, 5]}>
      <div className="w-80 bg-gradient-to-b from-amber-900/95 to-amber-950/95 backdrop-blur-md rounded-2xl p-5 shadow-2xl border-2 border-amber-500/50">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-bold text-white">Kasta Kubbar</h3>
          </div>
          <div className="bg-amber-600/80 px-3 py-1 rounded-full">
            <span className="text-sm font-semibold text-white">
              {kubbsRemaining - currentKubbIndex} kvar
            </span>
          </div>
        </div>

        {/* Instructions */}
        <p className="text-amber-200/80 text-sm mb-4">
          Kasta till motståndarens fält. Högre kraft = längre kast.
        </p>

        {/* Power Meter */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium text-white">Kraft</label>
            <span className="text-sm font-bold text-amber-400">{power}%</span>
          </div>
          <Slider
            value={[power]}
            onValueChange={(vals) => setPower(vals[0])}
            min={30}
            max={100}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-amber-200/60 mt-1">
            <span>Svag</span>
            <span>Stark</span>
          </div>
        </div>

        {/* Angle Meter */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium text-white">Vinkel</label>
            <span className="text-sm font-bold text-amber-400">{angle}°</span>
          </div>
          <Slider
            value={[angle]}
            onValueChange={(vals) => setAngle(vals[0])}
            min={30}
            max={60}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-amber-200/60 mt-1">
            <span>Låg båge</span>
            <span>Hög båge</span>
          </div>
        </div>

        {/* Spin Meter */}
        <div className="mb-5">
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium text-white flex items-center gap-1">
              <RotateCw className="w-3 h-3" /> Spin
            </label>
            <span className="text-sm font-bold text-amber-400">
              {spin > 0 ? `+${spin}` : spin}
            </span>
          </div>
          <Slider
            value={[spin]}
            onValueChange={(vals) => setSpin(vals[0])}
            min={-100}
            max={100}
            step={5}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-amber-200/60 mt-1">
            <span>⟲ Vänster</span>
            <span>Höger ⟳</span>
          </div>
        </div>

        {/* Throw Button */}
        <Button
          onClick={handleThrow}
          className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold py-3 text-lg shadow-lg transition-transform hover:scale-105"
        >
          🎯 Kasta Kubb
        </Button>
      </div>
    </Html>
  );
};

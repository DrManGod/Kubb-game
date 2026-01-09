import { Html } from '@react-three/drei';
import { Button } from '@/components/ui/button';
import { ArrowUp, Check } from 'lucide-react';
import { LandedKubb } from '@/hooks/useGameState';

interface KubbRaiseUIProps {
  landedKubbs: LandedKubb[];
  currentKubbIndex: number;
  onRaise: (kubbId: string, edge: 'top' | 'bottom') => void;
  onComplete: () => void;
  visible: boolean;
}

export const KubbRaiseUI = ({
  landedKubbs,
  currentKubbIndex,
  onRaise,
  onComplete,
  visible,
}: KubbRaiseUIProps) => {
  if (!visible || landedKubbs.length === 0) return null;

  const unreasedKubbs = landedKubbs.filter(k => !k.raised);
  const allRaised = unreasedKubbs.length === 0;
  const currentKubb = unreasedKubbs[0];

  return (
    <Html center position={[0, 2.5, 5]}>
      <div className="w-80 bg-gradient-to-b from-green-900/95 to-green-950/95 backdrop-blur-md rounded-2xl p-5 shadow-2xl border-2 border-green-500/50">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ArrowUp className="w-5 h-5 text-green-400" />
            <h3 className="text-lg font-bold text-white">Res Upp Kubbar</h3>
          </div>
          <div className="bg-green-600/80 px-3 py-1 rounded-full">
            <span className="text-sm font-semibold text-white">
              {unreasedKubbs.length} kvar
            </span>
          </div>
        </div>

        {/* Instructions */}
        <p className="text-green-200/80 text-sm mb-4">
          Välj vilken sida av kubben du vill resa upp. Botten ger en större målyta, toppen ger en mindre.
        </p>

        {!allRaised && currentKubb && (
          <div className="space-y-3 mb-4">
            {/* Visual representation */}
            <div className="flex justify-center items-center gap-8 py-4 bg-green-800/30 rounded-lg">
              {/* Bottom edge - taller kubb */}
              <button
                onClick={() => onRaise(currentKubb.id, 'bottom')}
                className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-green-600/40 transition-colors border border-transparent hover:border-green-400/50"
              >
                <div className="w-8 h-16 bg-amber-700 rounded shadow-lg border-2 border-amber-500/50" />
                <span className="text-xs text-green-200 font-medium">Botten (Hög)</span>
              </button>
              
              {/* Top edge - shorter kubb */}
              <button
                onClick={() => onRaise(currentKubb.id, 'top')}
                className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-green-600/40 transition-colors border border-transparent hover:border-green-400/50"
              >
                <div className="w-12 h-10 bg-amber-700 rounded shadow-lg border-2 border-amber-500/50" />
                <span className="text-xs text-green-200 font-medium">Topp (Låg)</span>
              </button>
            </div>
            
            <p className="text-center text-green-300/70 text-xs">
              Kubb {landedKubbs.length - unreasedKubbs.length + 1} av {landedKubbs.length}
            </p>
          </div>
        )}

        {allRaised && (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2 py-4 bg-green-600/30 rounded-lg">
              <Check className="w-6 h-6 text-green-400" />
              <span className="text-green-200 font-medium">Alla kubbar resta!</span>
            </div>
            <Button
              onClick={onComplete}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-3 text-lg shadow-lg transition-transform hover:scale-105"
            >
              ✓ Fortsätt till Botens Tur
            </Button>
          </div>
        )}
      </div>
    </Html>
  );
};

import { useRef, useEffect, useCallback } from 'react';
import { BatonRef } from './Baton';
import { FieldKubb as FieldKubbType } from '@/hooks/useGameState';

interface BotControllerProps {
  batonRef: React.RefObject<BatonRef>;
  isActive: boolean;
  batonsLeft: number;
  fieldKubbs: FieldKubbType[];
  onThrow: () => void;
  onTurnEnd: () => void;
}

export const useBotController = ({
  batonRef,
  isActive,
  batonsLeft,
  fieldKubbs,
  onThrow,
  onTurnEnd,
}: BotControllerProps) => {
  const throwTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isThrowingRef = useRef(false);

  const getTargetKubb = useCallback(() => {
    // Target standing field kubbs
    const standingKubbs = fieldKubbs.filter(k => !k.isDown);
    if (standingKubbs.length === 0) return null;
    
    // Pick a random standing kubb
    return standingKubbs[Math.floor(Math.random() * standingKubbs.length)];
  }, [fieldKubbs]);

  const performThrow = useCallback(() => {
    if (!batonRef.current || batonsLeft <= 0 || isThrowingRef.current) return;

    const target = getTargetKubb();
    
    // Bot throws from back line (Z = -9.4) toward player's side
    const botBaselineZ = -9.4;
    const throwX = target ? target.position[0] + (Math.random() - 0.5) * 0.8 : (Math.random() - 0.5) * 2;
    
    // Reset baton to bot's position
    batonRef.current.reset([throwX, -1.4, botBaselineZ]);
    isThrowingRef.current = true;

    // Calculate throw velocity toward target
    const targetZ = target ? target.position[2] : 1;
    const distance = Math.abs(targetZ - botBaselineZ);
    
    // Bot has ~70% accuracy
    const accuracy = 0.7 + Math.random() * 0.2;
    const power = 0.5 + Math.random() * 0.3;
    
    const velocityZ = 6 + power * 4; // Forward (positive Z toward player)
    const velocityY = 2.5 + power * 2;
    const velocityX = target 
      ? (target.position[0] - throwX) * 0.3 * accuracy + (Math.random() - 0.5) * 0.5
      : (Math.random() - 0.5) * 1;

    setTimeout(() => {
      if (!batonRef.current) return;
      
      batonRef.current.throw(
        [velocityX, velocityY, velocityZ],
        [-8 - power * 4, velocityX * 0.3, 0] // Opposite rotation since throwing other way
      );
      onThrow();
      isThrowingRef.current = false;
    }, 500);
  }, [batonRef, batonsLeft, getTargetKubb, onThrow]);

  useEffect(() => {
    if (!isActive) {
      if (throwTimeoutRef.current) {
        clearTimeout(throwTimeoutRef.current);
        throwTimeoutRef.current = null;
      }
      return;
    }

    // Bot throws with delay between each
    if (batonsLeft > 0) {
      const standingKubbs = fieldKubbs.filter(k => !k.isDown);
      
      // If no kubbs to throw at, end turn immediately
      if (standingKubbs.length === 0) {
        throwTimeoutRef.current = setTimeout(() => {
          onTurnEnd();
        }, 1000);
        return;
      }

      throwTimeoutRef.current = setTimeout(() => {
        performThrow();
        
        // Schedule next throw or end turn
        if (batonsLeft > 1) {
          // Next throw will be triggered by this effect re-running
        }
      }, 1500);
    } else {
      // Out of batons, end turn after delay
      throwTimeoutRef.current = setTimeout(() => {
        onTurnEnd();
      }, 2000);
    }

    return () => {
      if (throwTimeoutRef.current) {
        clearTimeout(throwTimeoutRef.current);
      }
    };
  }, [isActive, batonsLeft, fieldKubbs, performThrow, onTurnEnd]);

  return { performThrow };
};

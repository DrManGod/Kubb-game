import { useRef, useEffect, useCallback } from 'react';
import { BatonRef } from './Baton';
import { FieldKubb as FieldKubbType } from '@/hooks/useGameState';

interface BotControllerProps {
  batonRef: React.RefObject<BatonRef>;
  isActive: boolean;
  batonsLeft: number;
  fieldKubbs: FieldKubbType[]; // Field kubbs on player's side that bot targets
  playerBaselineKubbsDown: Set<number>;
  onThrow: () => void;
  onTurnEnd: () => void;
}

export const useBotController = ({
  batonRef,
  isActive,
  batonsLeft,
  fieldKubbs,
  playerBaselineKubbsDown,
  onThrow,
  onTurnEnd,
}: BotControllerProps) => {
  const throwTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isThrowingRef = useRef(false);

  // Bot throws from its baseline (Z = -9.4) toward player's side
  const botBaselineZ = -9.4;
  const playerBaselineZ = 3;

  // Standing field kubbs on player's side
  const standingFieldKubbs = fieldKubbs.filter(k => !k.isDown);
  
  // Must clear field kubbs before targeting player baseline
  const mustClearFieldKubbsFirst = standingFieldKubbs.length > 0;

  const getTargetPosition = useCallback((): [number, number, number] | null => {
    if (mustClearFieldKubbsFirst && standingFieldKubbs.length > 0) {
      // Target a random standing field kubb
      const target = standingFieldKubbs[Math.floor(Math.random() * standingFieldKubbs.length)];
      return target.position;
    }
    
    // Target player baseline kubbs that haven't been hit
    const standingPlayerBaseline: number[] = [];
    for (let i = 0; i < 5; i++) {
      if (!playerBaselineKubbsDown.has(i)) {
        standingPlayerBaseline.push(i);
      }
    }
    
    if (standingPlayerBaseline.length === 0) return null;
    
    // Pick a random standing baseline kubb
    const targetId = standingPlayerBaseline[Math.floor(Math.random() * standingPlayerBaseline.length)];
    
    // Calculate position based on ID (same spacing as player baseline)
    const fieldWidth = 8;
    const spacing = fieldWidth / 6;
    const positions: [number, number, number][] = [
      [-fieldWidth / 2 + spacing, -1.7, playerBaselineZ],
      [-fieldWidth / 2 + spacing * 2, -1.7, playerBaselineZ],
      [0, -1.7, playerBaselineZ],
      [fieldWidth / 2 - spacing * 2, -1.7, playerBaselineZ],
      [fieldWidth / 2 - spacing, -1.7, playerBaselineZ],
    ];
    
    return positions[targetId];
  }, [mustClearFieldKubbsFirst, standingFieldKubbs, playerBaselineKubbsDown]);

  const performThrow = useCallback(() => {
    if (!batonRef.current || batonsLeft <= 0 || isThrowingRef.current) return;

    const targetPos = getTargetPosition();
    if (!targetPos) {
      // No targets, end turn
      onTurnEnd();
      return;
    }
    
    // Bot has ~90% accuracy (improved from 85%)
    const accuracy = 0.90 + Math.random() * 0.08;
    const throwX = targetPos[0] * accuracy + (Math.random() - 0.5) * 0.5;
    
    // Set baton to bot owner for collision filtering
    batonRef.current.setOwner(false);
    
    // Reset baton to bot's position
    batonRef.current.reset([throwX, -1.4, botBaselineZ]);
    isThrowingRef.current = true;

    // Calculate throw velocity toward target
    const distance = Math.abs(targetPos[2] - botBaselineZ);
    
    const power = 0.65 + Math.random() * 0.2;
    
    const velocityZ = 7.5 + power * 4; // Slightly more forward velocity
    const velocityY = 2.6 + power * 2;
    const velocityX = (targetPos[0] - throwX) * 0.5 * accuracy + (Math.random() - 0.5) * 0.2;

    setTimeout(() => {
      if (!batonRef.current) return;
      
      batonRef.current.throw(
        [velocityX, velocityY, velocityZ],
        [-8 - power * 4, velocityX * 0.3, 0] // Opposite rotation since throwing other way
      );
      onThrow();
      isThrowingRef.current = false;
    }, 500);
  }, [batonRef, batonsLeft, getTargetPosition, onThrow, onTurnEnd]);

  useEffect(() => {
    if (!isActive) {
      if (throwTimeoutRef.current) {
        clearTimeout(throwTimeoutRef.current);
        throwTimeoutRef.current = null;
      }
      return;
    }

    // Check if there are any targets
    const hasTargets = standingFieldKubbs.length > 0 || 
      Array.from({ length: 5 }, (_, i) => i).some(i => !playerBaselineKubbsDown.has(i));

    if (batonsLeft > 0 && hasTargets) {
      throwTimeoutRef.current = setTimeout(() => {
        performThrow();
      }, 1500);
    } else {
      // Out of batons or no targets, end turn after delay
      throwTimeoutRef.current = setTimeout(() => {
        onTurnEnd();
      }, 2000);
    }

    return () => {
      if (throwTimeoutRef.current) {
        clearTimeout(throwTimeoutRef.current);
      }
    };
  }, [isActive, batonsLeft, standingFieldKubbs, playerBaselineKubbsDown, performThrow, onTurnEnd]);

  return { performThrow };
};

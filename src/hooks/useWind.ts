import { useState, useCallback } from 'react';

export interface Wind {
  // Direction in radians (0 = North, π/2 = East, π = South, 3π/2 = West)
  direction: number;
  // Strength from 0-10
  strength: number;
  // Computed velocity components for physics
  velocityX: number;
  velocityZ: number;
}

export const useWind = () => {
  const [wind, setWind] = useState<Wind>(() => generateWind());

  // Generate new random wind
  const randomizeWind = useCallback(() => {
    setWind(generateWind());
  }, []);

  // Slight shift between throws (+/- 0.1 strength, +/- 1 degree direction)
  const shiftWind = useCallback(() => {
    setWind(prev => {
      const strengthShift = (Math.random() - 0.5) * 0.2; // +/- 0.1
      const directionShift = (Math.random() - 0.5) * (2 * Math.PI / 180); // +/- 1 degree in radians
      
      const newStrength = Math.max(0, Math.min(10, prev.strength + strengthShift));
      const newDirection = (prev.direction + directionShift + Math.PI * 2) % (Math.PI * 2);
      
      const windFactor = newStrength / 10 * 2;
      const velocityX = Math.sin(newDirection) * windFactor;
      const velocityZ = -Math.cos(newDirection) * windFactor;

      return {
        direction: newDirection,
        strength: newStrength,
        velocityX,
        velocityZ,
      };
    });
  }, []);

  return { wind, randomizeWind, shiftWind };
};

function generateWind(): Wind {
  const direction = Math.random() * Math.PI * 2; // 0 to 2π
  const strength = Math.random() * 10; // 0 to 10
  
  // Convert to velocity components (scaled for physics impact)
  // At max strength (10), wind adds ~2 units/sec velocity
  const windFactor = strength / 10 * 2;
  const velocityX = Math.sin(direction) * windFactor;
  const velocityZ = -Math.cos(direction) * windFactor; // Negative because Z points towards player

  return {
    direction,
    strength,
    velocityX,
    velocityZ,
  };
}

// Helper to get cardinal direction string
export function getWindDirectionLabel(direction: number): string {
  const degrees = (direction * 180 / Math.PI) % 360;
  const normalized = degrees < 0 ? degrees + 360 : degrees;
  
  if (normalized >= 337.5 || normalized < 22.5) return 'N';
  if (normalized >= 22.5 && normalized < 67.5) return 'NE';
  if (normalized >= 67.5 && normalized < 112.5) return 'E';
  if (normalized >= 112.5 && normalized < 157.5) return 'SE';
  if (normalized >= 157.5 && normalized < 202.5) return 'S';
  if (normalized >= 202.5 && normalized < 247.5) return 'SW';
  if (normalized >= 247.5 && normalized < 292.5) return 'W';
  return 'NW';
}

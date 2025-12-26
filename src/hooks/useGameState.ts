import { useState, useCallback } from 'react';

export type GamePhase = 
  | 'player_turn'      // Player throwing at back-line kubbs
  | 'kubbs_flying'     // Animation: hit kubbs flying to player's side
  | 'bot_turn'         // Bot throwing at field kubbs
  | 'player_win'       // Player knocked all kubbs + king
  | 'player_lose';     // King hit early

export interface FieldKubb {
  id: string;
  position: [number, number, number];
  isDown: boolean;
}

export interface GameState {
  phase: GamePhase;
  playerBatonsLeft: number;
  botBatonsLeft: number;
  backlineKubbsDown: Set<number>; // IDs 0-4
  fieldKubbs: FieldKubb[];        // Kubbs on player's side
  playerScore: number;            // Total back-line kubbs knocked
  botScore: number;               // Field kubbs knocked by bot
  kingDown: boolean;
  totalPlayerThrows: number;
}

const BATONS_PER_TURN = 6;

export const useGameState = () => {
  const [state, setState] = useState<GameState>({
    phase: 'player_turn',
    playerBatonsLeft: BATONS_PER_TURN,
    botBatonsLeft: BATONS_PER_TURN,
    backlineKubbsDown: new Set(),
    fieldKubbs: [],
    playerScore: 0,
    botScore: 0,
    kingDown: false,
    totalPlayerThrows: 0,
  });

  const resetGame = useCallback(() => {
    setState({
      phase: 'player_turn',
      playerBatonsLeft: BATONS_PER_TURN,
      botBatonsLeft: BATONS_PER_TURN,
      backlineKubbsDown: new Set(),
      fieldKubbs: [],
      playerScore: 0,
      botScore: 0,
      kingDown: false,
      totalPlayerThrows: 0,
    });
  }, []);

  const playerThrow = useCallback(() => {
    setState(prev => ({
      ...prev,
      playerBatonsLeft: prev.playerBatonsLeft - 1,
      totalPlayerThrows: prev.totalPlayerThrows + 1,
    }));
  }, []);

  const hitBacklineKubb = useCallback((id: number) => {
    setState(prev => {
      const newDown = new Set(prev.backlineKubbsDown);
      newDown.add(id);
      return {
        ...prev,
        backlineKubbsDown: newDown,
        playerScore: newDown.size,
      };
    });
  }, []);

  const hitKing = useCallback(() => {
    setState(prev => {
      const allKubbsDown = prev.backlineKubbsDown.size === 5 && prev.fieldKubbs.every(k => k.isDown);
      return {
        ...prev,
        kingDown: true,
        phase: allKubbsDown ? 'player_win' : 'player_lose',
      };
    });
  }, []);

  // Generate random positions for field kubbs on player's side
  const generateFieldKubbPositions = useCallback((count: number): [number, number, number][] => {
    const positions: [number, number, number][] = [];
    const baseZ = 1.5; // Player's half, between baseline (3) and center (-3)
    const spreadX = 2.5;
    const spreadZ = 1.5;
    
    // Cluster them somewhat together
    const centerX = (Math.random() - 0.5) * 2;
    
    for (let i = 0; i < count; i++) {
      const x = centerX + (Math.random() - 0.5) * spreadX;
      const z = baseZ + (Math.random() - 0.5) * spreadZ;
      positions.push([
        Math.max(-3, Math.min(3, x)),
        -1.7,
        Math.max(-1, Math.min(2.5, z))
      ]);
    }
    return positions;
  }, []);

  const endPlayerTurn = useCallback(() => {
    setState(prev => {
      const hitCount = prev.backlineKubbsDown.size;
      
      if (hitCount === 0) {
        // No kubbs hit, just reset for bot turn (bot has nothing to throw at)
        return {
          ...prev,
          phase: 'bot_turn',
          botBatonsLeft: BATONS_PER_TURN,
        };
      }

      // Generate field kubbs from the ones that were hit
      const positions = generateFieldKubbPositions(hitCount);
      const newFieldKubbs: FieldKubb[] = positions.map((pos, i) => ({
        id: `field-${Date.now()}-${i}`,
        position: pos,
        isDown: false,
      }));

      return {
        ...prev,
        phase: 'kubbs_flying',
        fieldKubbs: newFieldKubbs,
      };
    });
  }, [generateFieldKubbPositions]);

  const startBotTurn = useCallback(() => {
    setState(prev => ({
      ...prev,
      phase: 'bot_turn',
      botBatonsLeft: BATONS_PER_TURN,
    }));
  }, []);

  const botThrow = useCallback(() => {
    setState(prev => ({
      ...prev,
      botBatonsLeft: prev.botBatonsLeft - 1,
    }));
  }, []);

  const hitFieldKubb = useCallback((kubbId: string) => {
    setState(prev => {
      const updatedKubbs = prev.fieldKubbs.map(k =>
        k.id === kubbId ? { ...k, isDown: true } : k
      );
      return {
        ...prev,
        fieldKubbs: updatedKubbs,
        botScore: updatedKubbs.filter(k => k.isDown).length,
      };
    });
  }, []);

  const endBotTurn = useCallback(() => {
    setState(prev => {
      // Remove downed field kubbs, keep standing ones
      const standingFieldKubbs = prev.fieldKubbs.filter(k => !k.isDown);
      
      return {
        ...prev,
        phase: 'player_turn',
        playerBatonsLeft: BATONS_PER_TURN,
        fieldKubbs: standingFieldKubbs,
        // Reset backline kubbs for next round (in real Kubb they stay down, but for simplicity)
        backlineKubbsDown: new Set(),
      };
    });
  }, []);

  return {
    state,
    resetGame,
    playerThrow,
    hitBacklineKubb,
    hitKing,
    endPlayerTurn,
    startBotTurn,
    botThrow,
    hitFieldKubb,
    endBotTurn,
  };
};

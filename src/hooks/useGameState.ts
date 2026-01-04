import { useState, useCallback } from 'react';

export type GamePhase = 
  | 'player_turn'           // Player throwing batons at field kubbs first, then bot baseline kubbs
  | 'player_throw_kubbs'    // Player throws knocked kubbs to bot's side
  | 'bot_turn'              // Bot throwing batons at field kubbs first, then player baseline kubbs
  | 'bot_throw_kubbs'       // Bot throws knocked kubbs to player's side
  | 'player_win'            // Player knocked all kubbs + king
  | 'player_lose';          // King hit early or bot wins

export interface FieldKubb {
  id: string;
  position: [number, number, number];
  isDown: boolean;
  side: 'player' | 'bot'; // Which side of the field the kubb is on
}

export interface KubbToThrow {
  id: string;
  originalPosition: [number, number, number];
}

export interface GameState {
  phase: GamePhase;
  playerBatonsLeft: number;
  botBatonsLeft: number;
  botBaselineKubbsDown: Set<number>; // IDs 0-4 - bot's baseline kubbs hit by player
  playerBaselineKubbsDown: Set<number>; // IDs 0-4 - player's baseline kubbs hit by bot
  fieldKubbs: FieldKubb[];        // All field kubbs on both sides
  kubbsToThrow: KubbToThrow[];    // Kubbs that need to be thrown back
  playerScore: number;            // Total bot baseline kubbs knocked by player
  botScore: number;               // Total player baseline kubbs knocked by bot
  kingDown: boolean;
  totalPlayerThrows: number;
  currentRound: number;
}

const BATONS_PER_TURN = 6;

export const useGameState = () => {
  const [state, setState] = useState<GameState>({
    phase: 'player_turn',
    playerBatonsLeft: BATONS_PER_TURN,
    botBatonsLeft: BATONS_PER_TURN,
    botBaselineKubbsDown: new Set(),
    playerBaselineKubbsDown: new Set(),
    fieldKubbs: [],
    kubbsToThrow: [],
    playerScore: 0,
    botScore: 0,
    kingDown: false,
    totalPlayerThrows: 0,
    currentRound: 1,
  });

  const resetGame = useCallback(() => {
    setState({
      phase: 'player_turn',
      playerBatonsLeft: BATONS_PER_TURN,
      botBatonsLeft: BATONS_PER_TURN,
      botBaselineKubbsDown: new Set(),
      playerBaselineKubbsDown: new Set(),
      fieldKubbs: [],
      kubbsToThrow: [],
      playerScore: 0,
      botScore: 0,
      kingDown: false,
      totalPlayerThrows: 0,
      currentRound: 1,
    });
  }, []);

  const setPhase = useCallback((phase: GamePhase) => {
    setState(prev => ({ ...prev, phase }));
  }, []);

  const decrementPlayerBatons = useCallback(() => {
    setState(prev => ({
      ...prev,
      playerBatonsLeft: prev.playerBatonsLeft - 1,
      totalPlayerThrows: prev.totalPlayerThrows + 1,
    }));
  }, []);

  const decrementBotBatons = useCallback(() => {
    setState(prev => ({
      ...prev,
      botBatonsLeft: prev.botBatonsLeft - 1,
    }));
  }, []);

  const resetBatons = useCallback(() => {
    setState(prev => ({
      ...prev,
      playerBatonsLeft: BATONS_PER_TURN,
      botBatonsLeft: BATONS_PER_TURN,
    }));
  }, []);

  const knockDownBotBaseline = useCallback((id: number) => {
    setState(prev => {
      const newDown = new Set(prev.botBaselineKubbsDown);
      newDown.add(id);
      return {
        ...prev,
        botBaselineKubbsDown: newDown,
        playerScore: newDown.size,
      };
    });
  }, []);

  const knockDownPlayerBaseline = useCallback((id: number) => {
    setState(prev => {
      const newDown = new Set(prev.playerBaselineKubbsDown);
      newDown.add(id);
      return {
        ...prev,
        playerBaselineKubbsDown: newDown,
        botScore: newDown.size,
      };
    });
  }, []);

  const addFieldKubb = useCallback((kubb: FieldKubb) => {
    setState(prev => ({
      ...prev,
      fieldKubbs: [...prev.fieldKubbs, kubb],
    }));
  }, []);

  const knockDownFieldKubb = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      fieldKubbs: prev.fieldKubbs.map(k => 
        k.id === id ? { ...k, isDown: true } : k
      ),
    }));
  }, []);

  const setKubbsToThrow = useCallback((kubbs: KubbToThrow[]) => {
    setState(prev => ({
      ...prev,
      kubbsToThrow: kubbs,
    }));
  }, []);

  const removeKubbToThrow = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      kubbsToThrow: prev.kubbsToThrow.filter(k => k.id !== id),
    }));
  }, []);

  const setKingDown = useCallback((down: boolean) => {
    setState(prev => ({ ...prev, kingDown: down }));
  }, []);

  const incrementRound = useCallback(() => {
    setState(prev => ({ ...prev, currentRound: prev.currentRound + 1 }));
  }, []);

  const clearDownFieldKubbs = useCallback((side: 'player' | 'bot') => {
    setState(prev => ({
      ...prev,
      fieldKubbs: prev.fieldKubbs.filter(k => !(k.side === side && k.isDown)),
    }));
  }, []);

  return {
    state,
    resetGame,
    setPhase,
    decrementPlayerBatons,
    decrementBotBatons,
    resetBatons,
    knockDownBotBaseline,
    knockDownPlayerBaseline,
    addFieldKubb,
    knockDownFieldKubb,
    setKubbsToThrow,
    removeKubbToThrow,
    setKingDown,
    incrementRound,
    clearDownFieldKubbs,
  };
};

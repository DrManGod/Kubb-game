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

  return {
    state,
    resetGame,
  };
};

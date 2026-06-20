import { create } from 'zustand';
import type { GameState, PlayerState } from '../types/game';
import type { LinkLevel } from '../types/card';
import { buildDeckCards, windrunnerBundle } from '../data/cards/loader';

const STARTING_HAND_SIZE = 4;
const STARTING_HEALTH = 30;
const MAX_STORMLIGHT = 10;

function shuffle<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function createPlayer(id: string, name: string): PlayerState {
  const deck = shuffle(buildDeckCards(windrunnerBundle.deck));
  const hand = deck.splice(0, STARTING_HAND_SIZE);
  return {
    id,
    name,
    heroCard: windrunnerBundle.hero,
    heroHealth: STARTING_HEALTH,
    heroShield: 0,
    linkLevel: 0,
    stormlight: 1,
    maxStormlight: 1,
    deck,
    hand,
    board: [],
    graveyard: [],
  };
}

interface GameStore {
  game: GameState;
  drawCard: (playerId: string) => void;
  playCard: (playerId: string, cardIndexInHand: number) => void;
  setLinkLevel: (playerId: string, level: LinkLevel) => void;
  endTurn: () => void;
}

function buildInitialState(): GameState {
  const player1 = createPlayer('player1', 'Joueur 1');
  const player2 = createPlayer('player2', 'Joueur 2');
  return {
    turn: 1,
    activePlayerId: player1.id,
    phase: 'main',
    players: {
      [player1.id]: player1,
      [player2.id]: player2,
    },
  };
}

export const useGameStore = create<GameStore>((set) => ({
  game: buildInitialState(),

  drawCard: (playerId) =>
    set((state) => {
      const player = state.game.players[playerId];
      if (!player || player.deck.length === 0) return state;
      const [drawn, ...rest] = player.deck;
      const updatedPlayer: PlayerState = { ...player, deck: rest, hand: [...player.hand, drawn] };
      return {
        game: {
          ...state.game,
          players: { ...state.game.players, [playerId]: updatedPlayer },
        },
      };
    }),

  playCard: (playerId, cardIndexInHand) =>
    set((state) => {
      const player = state.game.players[playerId];
      if (!player) return state;
      const card = player.hand[cardIndexInHand];
      if (!card || player.stormlight < card.cost) return state;

      const remainingHand = player.hand.filter((_, idx) => idx !== cardIndexInHand);
      const updatedPlayer: PlayerState = {
        ...player,
        hand: remainingHand,
        stormlight: player.stormlight - card.cost,
        board:
          card.type === 'radiant' || card.type === 'heraut'
            ? [
                ...player.board,
                {
                  instanceId: `${card.id}-${Date.now()}`,
                  card,
                  currentHealth: card.health,
                  currentAttack: card.attack,
                  canAttack: false,
                },
              ]
            : player.board,
      };

      return {
        game: {
          ...state.game,
          players: { ...state.game.players, [playerId]: updatedPlayer },
        },
      };
    }),

  setLinkLevel: (playerId, level) =>
    set((state) => {
      const player = state.game.players[playerId];
      if (!player) return state;
      return {
        game: {
          ...state.game,
          players: { ...state.game.players, [playerId]: { ...player, linkLevel: level } },
        },
      };
    }),

  endTurn: () =>
    set((state) => {
      const playerIds = Object.keys(state.game.players);
      const nextPlayerId =
        playerIds.find((id) => id !== state.game.activePlayerId) ?? state.game.activePlayerId;
      const nextPlayer = state.game.players[nextPlayerId];
      const updatedMaxStormlight = Math.min(MAX_STORMLIGHT, nextPlayer.maxStormlight + 1);

      const updatedNextPlayer: PlayerState = {
        ...nextPlayer,
        maxStormlight: updatedMaxStormlight,
        stormlight: updatedMaxStormlight,
        board: nextPlayer.board.map((unit) => ({ ...unit, canAttack: true })),
      };

      return {
        game: {
          ...state.game,
          turn: state.game.turn + 1,
          activePlayerId: nextPlayerId,
          phase: 'main',
          players: { ...state.game.players, [nextPlayerId]: updatedNextPlayer },
        },
      };
    }),
}));

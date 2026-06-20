import { create } from 'zustand';
import type { GameState, PlayerState, UnitInPlay } from '../types/game';
import type { LinkLevel } from '../types/card';
import { buildDeckCards, windrunnerBundle } from '../data/cards/loader';

const STARTING_HAND_SIZE = 4;
const STARTING_HEALTH = 30;
const MAX_STORMLIGHT = 10;
const MAX_LINK_LEVEL: LinkLevel = 4;
const ARMOR_SHIELD_BONUS = 15;

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
    heroAbilityUsedThisTurn: false,
  };
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
    winnerId: null,
  };
}

/** Calcule l'ATK effective d'une unité (Tandem de Drehy & Skar). */
function getEffectiveAttack(player: PlayerState, unit: UnitInPlay): number {
  let attack = unit.currentAttack;
  if (unit.card.id === 'drehy-skar') {
    const tandemCount = player.board.filter((u) => u.card.id === 'drehy-skar').length;
    if (tandemCount >= 2) attack += 1;
  }
  return attack;
}

/** Calcule l'ATK effective du héros (Syl niveau 2 : +2 ATK). */
function getEffectiveHeroAttack(player: PlayerState): number {
  const baseAttack = player.heroCard.type === 'radiant' ? player.heroCard.attack : 0;
  return baseAttack + (player.linkLevel >= 2 ? 2 : 0);
}

function findOtherPlayerId(game: GameState, playerId: string): string {
  return Object.keys(game.players).find((id) => id !== playerId) ?? playerId;
}

function gainLink(player: PlayerState): PlayerState {
  if (player.linkLevel >= MAX_LINK_LEVEL) return player;
  const newLevel = (player.linkLevel + 1) as LinkLevel;
  const reachedArmor = newLevel === 4;
  return {
    ...player,
    linkLevel: newLevel,
    heroShield: reachedArmor ? player.heroShield + ARMOR_SHIELD_BONUS : player.heroShield,
  };
}

/** Applique des dégâts à une unité ; gère l'Obstination de Lopen. Retourne l'unité mise à jour ou null si morte. */
function damageUnit(unit: UnitInPlay, amount: number): UnitInPlay | null {
  const remainingHealth = unit.currentHealth - amount;
  if (remainingHealth > 0) return { ...unit, currentHealth: remainingHealth };
  if (unit.card.id === 'lopen' && !unit.hasSurvivedLethal) {
    return { ...unit, currentHealth: 1, hasSurvivedLethal: true };
  }
  return null;
}

/** Applique des dégâts au héros, le bouclier absorbe en premier. */
function damageHero(player: PlayerState, amount: number): PlayerState {
  if (player.heroShield > 0) {
    const absorbed = Math.min(player.heroShield, amount);
    const remainder = amount - absorbed;
    return {
      ...player,
      heroShield: player.heroShield - absorbed,
      heroHealth: Math.max(0, player.heroHealth - remainder),
    };
  }
  return { ...player, heroHealth: Math.max(0, player.heroHealth - amount) };
}

function checkWinner(game: GameState): string | null {
  const ids = Object.keys(game.players);
  const alive = ids.filter((id) => game.players[id].heroHealth > 0);
  if (alive.length === 1) return alive[0];
  return null;
}

interface GameStore {
  game: GameState;
  drawCard: (playerId: string) => void;
  playCard: (playerId: string, cardIndexInHand: number) => void;
  setLinkLevel: (playerId: string, level: LinkLevel) => void;
  endTurn: () => void;
  attackUnit: (playerId: string, attackerInstanceId: string, defenderInstanceId: string) => void;
  attackHero: (playerId: string, attackerInstanceId: string) => void;
  declareGuard: (playerId: string, protectorInstanceId: string, protectedTarget: 'hero' | string) => void;
  useLashing: (playerId: string, targetInstanceId: string) => void;
  loadGame: (game: GameState) => void;
}

export const useGameStore = create<GameStore>((set) => ({
  game: buildInitialState(),

  loadGame: (game) => set({ game }),

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
                  instanceId: `${card.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                  card,
                  currentHealth: card.health,
                  currentAttack: card.attack,
                  canAttack: false,
                  isLashed: false,
                  hasSurvivedLethal: false,
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
      const reachedArmor = level === 4 && player.linkLevel < 4;
      return {
        game: {
          ...state.game,
          players: {
            ...state.game.players,
            [playerId]: {
              ...player,
              linkLevel: level,
              heroShield: reachedArmor ? player.heroShield + ARMOR_SHIELD_BONUS : player.heroShield,
            },
          },
        },
      };
    }),

  declareGuard: (playerId, protectorInstanceId, protectedTarget) =>
    set((state) => {
      const player = state.game.players[playerId];
      if (!player) return state;
      const protector = player.board.find((u) => u.instanceId === protectorInstanceId);
      if (!protector || protector.card.id !== 'bridge-four-soldier') return state;

      const updatedBoard = player.board.map((unit) =>
        unit.instanceId === protectorInstanceId ? { ...unit, guarding: protectedTarget } : unit,
      );

      return {
        game: {
          ...state.game,
          players: { ...state.game.players, [playerId]: { ...player, board: updatedBoard } },
        },
      };
    }),

  useLashing: (playerId, targetInstanceId) =>
    set((state) => {
      const player = state.game.players[playerId];
      if (!player || player.linkLevel < 3 || player.heroAbilityUsedThisTurn) return state;
      const opponentId = findOtherPlayerId(state.game, playerId);
      const opponent = state.game.players[opponentId];
      const target = opponent.board.find((u) => u.instanceId === targetInstanceId);
      if (!target) return state;

      const updatedOpponentBoard = opponent.board.map((unit) =>
        unit.instanceId === targetInstanceId ? { ...unit, isLashed: true } : unit,
      );

      return {
        game: {
          ...state.game,
          players: {
            ...state.game.players,
            [playerId]: { ...player, heroAbilityUsedThisTurn: true },
            [opponentId]: { ...opponent, board: updatedOpponentBoard },
          },
        },
      };
    }),

  attackUnit: (playerId, attackerInstanceId, defenderInstanceId) =>
    set((state) => {
      if (state.game.winnerId) return state;
      const attackerPlayer = state.game.players[playerId];
      const opponentId = findOtherPlayerId(state.game, playerId);
      const defenderPlayer = state.game.players[opponentId];
      if (!attackerPlayer || !defenderPlayer) return state;

      const attacker = attackerPlayer.board.find((u) => u.instanceId === attackerInstanceId);
      if (!attacker || !attacker.canAttack || attacker.isLashed) return state;

      const declaredDefender = defenderPlayer.board.find((u) => u.instanceId === defenderInstanceId);
      if (!declaredDefender) return state;

      const guard = defenderPlayer.board.find((u) => u.guarding === declaredDefender.instanceId);
      const actualDefender = guard ?? declaredDefender;
      const linkGained = Boolean(guard);

      const attackerDamage = getEffectiveAttack(attackerPlayer, attacker);
      const defenderDamage = getEffectiveAttack(defenderPlayer, actualDefender);

      const updatedDefenderUnit = damageUnit(actualDefender, attackerDamage);
      const updatedAttackerUnit = damageUnit(attacker, defenderDamage);

      let updatedDefenderPlayer: PlayerState = linkGained ? gainLink(defenderPlayer) : defenderPlayer;
      let updatedAttackerPlayer: PlayerState = attackerPlayer;

      updatedDefenderPlayer = {
        ...updatedDefenderPlayer,
        board: updatedDefenderPlayer.board
          .map((u) => (u.instanceId === actualDefender.instanceId ? updatedDefenderUnit : u))
          .filter((u): u is UnitInPlay => u !== null),
        graveyard: updatedDefenderUnit
          ? updatedDefenderPlayer.graveyard
          : [...updatedDefenderPlayer.graveyard, actualDefender.card],
      };

      updatedAttackerPlayer = {
        ...updatedAttackerPlayer,
        board: updatedAttackerPlayer.board
          .map((u) =>
            u.instanceId === attackerInstanceId
              ? updatedAttackerUnit
                ? { ...updatedAttackerUnit, canAttack: false }
                : null
              : u,
          )
          .filter((u): u is UnitInPlay => u !== null),
        graveyard: updatedAttackerUnit
          ? updatedAttackerPlayer.graveyard
          : [...updatedAttackerPlayer.graveyard, attacker.card],
      };

      const nextGame: GameState = {
        ...state.game,
        players: {
          ...state.game.players,
          [playerId]: updatedAttackerPlayer,
          [opponentId]: updatedDefenderPlayer,
        },
      };

      return { game: { ...nextGame, winnerId: checkWinner(nextGame) } };
    }),

  attackHero: (playerId, attackerInstanceId) =>
    set((state) => {
      if (state.game.winnerId) return state;
      const attackerPlayer = state.game.players[playerId];
      const opponentId = findOtherPlayerId(state.game, playerId);
      const defenderPlayer = state.game.players[opponentId];
      if (!attackerPlayer || !defenderPlayer) return state;

      const attacker = attackerPlayer.board.find((u) => u.instanceId === attackerInstanceId);
      if (!attacker || !attacker.canAttack || attacker.isLashed) return state;

      const guard = defenderPlayer.board.find((u) => u.guarding === 'hero');
      const attackerDamage = getEffectiveAttack(attackerPlayer, attacker);

      let updatedDefenderPlayer: PlayerState;
      let updatedAttackerPlayer: PlayerState = {
        ...attackerPlayer,
        board: attackerPlayer.board.map((u) =>
          u.instanceId === attackerInstanceId ? { ...u, canAttack: false } : u,
        ),
      };

      if (guard) {
        const defenderDamage = getEffectiveAttack(defenderPlayer, guard);
        const updatedGuard = damageUnit(guard, attackerDamage);
        const updatedAttackerUnit = damageUnit(attacker, defenderDamage);

        updatedDefenderPlayer = gainLink({
          ...defenderPlayer,
          board: defenderPlayer.board
            .map((u) => (u.instanceId === guard.instanceId ? updatedGuard : u))
            .filter((u): u is UnitInPlay => u !== null),
          graveyard: updatedGuard ? defenderPlayer.graveyard : [...defenderPlayer.graveyard, guard.card],
        });

        updatedAttackerPlayer = {
          ...updatedAttackerPlayer,
          board: updatedAttackerPlayer.board
            .map((u) =>
              u.instanceId === attackerInstanceId
                ? updatedAttackerUnit
                  ? { ...updatedAttackerUnit, canAttack: false }
                  : null
                : u,
            )
            .filter((u): u is UnitInPlay => u !== null),
          graveyard: updatedAttackerUnit
            ? updatedAttackerPlayer.graveyard
            : [...updatedAttackerPlayer.graveyard, attacker.card],
        };
      } else {
        updatedDefenderPlayer = damageHero(defenderPlayer, attackerDamage);
      }

      const nextGame: GameState = {
        ...state.game,
        players: {
          ...state.game.players,
          [playerId]: updatedAttackerPlayer,
          [opponentId]: updatedDefenderPlayer,
        },
      };

      return { game: { ...nextGame, winnerId: checkWinner(nextGame) } };
    }),

  endTurn: () =>
    set((state) => {
      const nextPlayerId = findOtherPlayerId(state.game, state.game.activePlayerId);
      const nextPlayer = state.game.players[nextPlayerId];
      const updatedMaxStormlight = Math.min(MAX_STORMLIGHT, nextPlayer.maxStormlight + 1);

      const updatedNextPlayer: PlayerState = {
        ...nextPlayer,
        maxStormlight: updatedMaxStormlight,
        stormlight: updatedMaxStormlight,
        heroAbilityUsedThisTurn: false,
        board: nextPlayer.board.map((unit) =>
          unit.isLashed ? { ...unit, isLashed: false, canAttack: false } : { ...unit, canAttack: true },
        ),
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

export { getEffectiveAttack, getEffectiveHeroAttack };

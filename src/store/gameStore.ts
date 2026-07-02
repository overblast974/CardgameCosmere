import { create } from 'zustand';
import type { GameState, PlayerState, UnitInPlay } from '../types/game';
import type { Card, LinkLevel } from '../types/card';
import { buildDeckCards, getDeckBundle, DEFAULT_DECK_IDS } from '../data/cards/loader';

const STARTING_HAND_SIZE = 4;
const MAX_STORMLIGHT = 10;
const MAX_LINK_LEVEL: LinkLevel = 4;
const ARMOR_SHIELD_BONUS = 15;
const NIGHTBLOOD_SELF_DAMAGE = 5;

function shuffle<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function createPlayer(id: string, name: string, deckId: string): PlayerState {
  const bundle = getDeckBundle(deckId);
  const deck = shuffle(buildDeckCards(bundle.deck));
  const hand = deck.splice(0, STARTING_HAND_SIZE);
  return {
    id,
    name,
    deckId: bundle.deck.id,
    heroCard: bundle.hero,
    heroHealth: bundle.heroDefinition.baseHealth,
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

function buildInitialState(deck1Id: string, deck2Id: string): GameState {
  const player1 = createPlayer('player1', 'Joueur 1', deck1Id);
  const player2 = createPlayer('player2', 'Joueur 2', deck2Id);
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

function hasKeyword(card: Card, keyword: string): boolean {
  return card.keywords?.includes(keyword as never) ?? false;
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

/** Calcule l'ATK effective du héros (Spren niveau 2 : +2 ATK). */
function getEffectiveHeroAttack(player: PlayerState): number {
  const baseAttack = player.heroCard.type === 'radiant' ? player.heroCard.attack : 0;
  return baseAttack + (player.linkLevel >= 2 ? 2 : 0);
}

function findOtherPlayerId(game: GameState, playerId: string): string {
  return Object.keys(game.players).find((id) => id !== playerId) ?? playerId;
}

function gainLink(player: PlayerState, levels = 1): PlayerState {
  const newLevel = Math.min(MAX_LINK_LEVEL, player.linkLevel + levels) as LinkLevel;
  if (newLevel === player.linkLevel) return player;
  const reachedArmor = newLevel === 4 && player.linkLevel < 4;
  return {
    ...player,
    linkLevel: newLevel,
    heroShield: reachedArmor ? player.heroShield + ARMOR_SHIELD_BONUS : player.heroShield,
  };
}

/** Gain de Lien conditionné au déclencheur de l'ordre du héros. */
function gainLinkIfTrigger(player: PlayerState, trigger: 'protection' | 'destruction'): PlayerState {
  const definition = getDeckBundle(player.deckId).heroDefinition;
  return definition.linkGainTrigger === trigger ? gainLink(player) : player;
}

/** Applique des dégâts à une unité ; gère l'Obstination. Retourne l'unité mise à jour ou null si morte. */
function damageUnit(unit: UnitInPlay, amount: number): UnitInPlay | null {
  const remainingHealth = unit.currentHealth - amount;
  if (remainingHealth > 0) return { ...unit, currentHealth: remainingHealth };
  if (hasKeyword(unit.card, 'obstination') && !unit.hasSurvivedLethal) {
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

/** Remplace une unité sur un plateau (ou la retire si morte, en l'envoyant au cimetière). */
function applyUnitDamageToBoard(
  player: PlayerState,
  target: UnitInPlay,
  updated: UnitInPlay | null,
): PlayerState {
  return {
    ...player,
    board: player.board
      .map((u) => (u.instanceId === target.instanceId ? updated : u))
      .filter((u): u is UnitInPlay => u !== null),
    graveyard: updated ? player.graveyard : [...player.graveyard, target.card],
  };
}

/** Pioche jusqu'à `count` cartes (s'arrête si le deck est vide). */
function drawCards(player: PlayerState, count: number): PlayerState {
  const drawn = player.deck.slice(0, count);
  return {
    ...player,
    deck: player.deck.slice(drawn.length),
    hand: [...player.hand, ...drawn],
  };
}

function createUnitInstance(card: Card & { attack: number; health: number }): UnitInPlay {
  return {
    instanceId: `${card.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    card,
    currentHealth: card.health,
    currentAttack: card.attack,
    canAttack: hasKeyword(card, 'zele'),
    isLashed: false,
    hasSurvivedLethal: false,
  };
}

interface GameStore {
  game: GameState;
  startGame: (deck1Id: string, deck2Id: string) => void;
  drawCard: (playerId: string) => void;
  playCard: (playerId: string, cardIndexInHand: number) => void;
  playTargetedCard: (playerId: string, cardIndexInHand: number, targetInstanceId: string) => void;
  setLinkLevel: (playerId: string, level: LinkLevel) => void;
  endTurn: () => void;
  attackUnit: (playerId: string, attackerInstanceId: string, defenderInstanceId: string) => void;
  attackHero: (playerId: string, attackerInstanceId: string) => void;
  declareGuard: (playerId: string, protectorInstanceId: string, protectedTarget: 'hero' | string) => void;
  useHeroPower: (playerId: string, targetInstanceId: string) => void;
  loadGame: (game: GameState) => void;
}

export const useGameStore = create<GameStore>((set) => ({
  game: buildInitialState(DEFAULT_DECK_IDS[0], DEFAULT_DECK_IDS[1]),

  loadGame: (game) => set({ game }),

  startGame: (deck1Id, deck2Id) => set({ game: buildInitialState(deck1Id, deck2Id) }),

  drawCard: (playerId) =>
    set((state) => {
      const player = state.game.players[playerId];
      if (!player || player.deck.length === 0) return state;
      return {
        game: {
          ...state.game,
          players: { ...state.game.players, [playerId]: drawCards(player, 1) },
        },
      };
    }),

  playCard: (playerId, cardIndexInHand) =>
    set((state) => {
      const player = state.game.players[playerId];
      if (!player || state.game.winnerId) return state;
      const card = player.hand[cardIndexInHand];
      if (!card || player.stormlight < card.cost) return state;

      const opponentId = findOtherPlayerId(state.game, playerId);
      const opponent = state.game.players[opponentId];

      const remainingHand = player.hand.filter((_, idx) => idx !== cardIndexInHand);
      let updatedPlayer: PlayerState = {
        ...player,
        hand: remainingHand,
        stormlight: player.stormlight - card.cost,
      };
      let updatedOpponent: PlayerState = opponent;

      if (card.type === 'radiant' || card.type === 'heraut') {
        updatedPlayer = { ...updatedPlayer, board: [...updatedPlayer.board, createUnitInstance(card)] };
        // Cris d'arrivée des Hérauts.
        if (card.id === 'jezrien') {
          updatedPlayer = gainLink(updatedPlayer);
        }
        if (card.id === 'nale') {
          const survivors = updatedOpponent.board.map((u) => damageUnit(u, 2));
          updatedOpponent = {
            ...updatedOpponent,
            board: survivors.filter((u): u is UnitInPlay => u !== null),
            graveyard: [
              ...updatedOpponent.graveyard,
              ...updatedOpponent.board.filter((_, i) => survivors[i] === null).map((u) => u.card),
            ],
          };
        }
      } else if (card.type === 'eclat') {
        // Éclats légendaires, résolus par id.
        if (card.id === 'honor') {
          updatedPlayer = gainLink(updatedPlayer, 2);
          updatedPlayer = { ...updatedPlayer, heroShield: updatedPlayer.heroShield + 10 };
        }
        if (card.id === 'nightblood') {
          updatedOpponent = {
            ...updatedOpponent,
            board: [],
            graveyard: [...updatedOpponent.graveyard, ...updatedOpponent.board.map((u) => u.card)],
          };
          updatedPlayer = damageHero(updatedPlayer, NIGHTBLOOD_SELF_DAMAGE);
        }
        updatedPlayer = { ...updatedPlayer, graveyard: [...updatedPlayer.graveyard, card] };
      } else if (card.type === 'surge' || card.type === 'fabrial') {
        // Effets immédiats sans cible ; les effets ciblés passent par playTargetedCard.
        switch (card.effectType) {
          case 'draw':
            updatedPlayer = drawCards(updatedPlayer, card.effectValue ?? 1);
            break;
          case 'stormlight':
            updatedPlayer = {
              ...updatedPlayer,
              stormlight: Math.min(MAX_STORMLIGHT, updatedPlayer.stormlight + (card.effectValue ?? 1)),
            };
            break;
          case 'aoe-damage': {
            const dmg = card.effectValue ?? 1;
            const survivors = updatedOpponent.board.map((u) => damageUnit(u, dmg));
            updatedOpponent = {
              ...updatedOpponent,
              board: survivors.filter((u): u is UnitInPlay => u !== null),
              graveyard: [
                ...updatedOpponent.graveyard,
                ...updatedOpponent.board.filter((_, i) => survivors[i] === null).map((u) => u.card),
              ],
            };
            break;
          }
          default:
            // Carte ciblée jouée sans cible : on annule (rien ne se passe).
            return state;
        }
        updatedPlayer = { ...updatedPlayer, graveyard: [...updatedPlayer.graveyard, card] };
      } else {
        // Spren ou type inconnu : injouable directement pour l'instant.
        return state;
      }

      const nextGame: GameState = {
        ...state.game,
        players: {
          ...state.game.players,
          [playerId]: updatedPlayer,
          [opponentId]: updatedOpponent,
        },
      };

      return { game: { ...nextGame, winnerId: checkWinner(nextGame) } };
    }),

  playTargetedCard: (playerId, cardIndexInHand, targetInstanceId) =>
    set((state) => {
      const player = state.game.players[playerId];
      if (!player || state.game.winnerId) return state;
      const card = player.hand[cardIndexInHand];
      if (!card || player.stormlight < card.cost) return state;
      if (card.type !== 'surge' && card.type !== 'fabrial') return state;

      const opponentId = findOtherPlayerId(state.game, playerId);
      const opponent = state.game.players[opponentId];

      let updatedPlayer: PlayerState = {
        ...player,
        hand: player.hand.filter((_, idx) => idx !== cardIndexInHand),
        stormlight: player.stormlight - card.cost,
        graveyard: [...player.graveyard, card],
      };
      let updatedOpponent: PlayerState = opponent;

      switch (card.effectType) {
        case 'damage': {
          const target = opponent.board.find((u) => u.instanceId === targetInstanceId);
          if (!target) return state;
          const updated = damageUnit(target, card.effectValue ?? 1);
          updatedOpponent = applyUnitDamageToBoard(opponent, target, updated);
          if (!updated) updatedPlayer = gainLinkIfTrigger(updatedPlayer, 'destruction');
          break;
        }
        case 'disable': {
          const target = opponent.board.find((u) => u.instanceId === targetInstanceId);
          if (!target) return state;
          updatedOpponent = {
            ...opponent,
            board: opponent.board.map((u) =>
              u.instanceId === targetInstanceId ? { ...u, isLashed: true } : u,
            ),
          };
          break;
        }
        case 'bounce': {
          const target = opponent.board.find((u) => u.instanceId === targetInstanceId);
          if (!target) return state;
          updatedOpponent = {
            ...opponent,
            board: opponent.board.filter((u) => u.instanceId !== targetInstanceId),
            hand: [...opponent.hand, target.card],
          };
          break;
        }
        case 'buff': {
          const target = player.board.find((u) => u.instanceId === targetInstanceId);
          if (!target) return state;
          const bonus = card.effectValue ?? 1;
          updatedPlayer = {
            ...updatedPlayer,
            board: player.board.map((u) =>
              u.instanceId === targetInstanceId
                ? { ...u, currentAttack: u.currentAttack + bonus, currentHealth: u.currentHealth + bonus }
                : u,
            ),
          };
          break;
        }
        default:
          return state;
      }

      const nextGame: GameState = {
        ...state.game,
        players: {
          ...state.game.players,
          [playerId]: updatedPlayer,
          [opponentId]: updatedOpponent,
        },
      };

      return { game: { ...nextGame, winnerId: checkWinner(nextGame) } };
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
      if (!protector || !hasKeyword(protector.card, 'couverture')) return state;

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

  useHeroPower: (playerId, targetInstanceId) =>
    set((state) => {
      const player = state.game.players[playerId];
      if (!player || player.linkLevel < 3 || player.heroAbilityUsedThisTurn) return state;
      const opponentId = findOtherPlayerId(state.game, playerId);
      const opponent = state.game.players[opponentId];
      const target = opponent.board.find((u) => u.instanceId === targetInstanceId);
      if (!target) return state;

      const definition = getDeckBundle(player.deckId).heroDefinition;
      let updatedPlayer: PlayerState = { ...player, heroAbilityUsedThisTurn: true };
      let updatedOpponent: PlayerState;

      if (definition.heroPowerType === 'lashing') {
        updatedOpponent = {
          ...opponent,
          board: opponent.board.map((unit) =>
            unit.instanceId === targetInstanceId ? { ...unit, isLashed: true } : unit,
          ),
        };
      } else {
        const updated = damageUnit(target, definition.heroPowerValue ?? 3);
        updatedOpponent = applyUnitDamageToBoard(opponent, target, updated);
        if (!updated) updatedPlayer = gainLinkIfTrigger(updatedPlayer, 'destruction');
      }

      return {
        game: {
          ...state.game,
          players: {
            ...state.game.players,
            [playerId]: updatedPlayer,
            [opponentId]: updatedOpponent,
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

      const attackerDamage = getEffectiveAttack(attackerPlayer, attacker);
      const defenderDamage = getEffectiveAttack(defenderPlayer, actualDefender);

      const updatedDefenderUnit = damageUnit(actualDefender, attackerDamage);
      const updatedAttackerUnit = damageUnit(attacker, defenderDamage);

      // Couverture absorbée : Lien pour le défenseur (Windrunner).
      let updatedDefenderPlayer: PlayerState = guard
        ? gainLinkIfTrigger(defenderPlayer, 'protection')
        : defenderPlayer;
      let updatedAttackerPlayer: PlayerState = attackerPlayer;

      updatedDefenderPlayer = applyUnitDamageToBoard(updatedDefenderPlayer, actualDefender, updatedDefenderUnit);

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

      // Unité ennemie détruite : Lien pour l'attaquant (Skybreaker).
      if (!updatedDefenderUnit) {
        updatedAttackerPlayer = gainLinkIfTrigger(updatedAttackerPlayer, 'destruction');
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

        updatedDefenderPlayer = gainLinkIfTrigger(
          applyUnitDamageToBoard(defenderPlayer, guard, updatedGuard),
          'protection',
        );

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

        if (!updatedGuard) {
          updatedAttackerPlayer = gainLinkIfTrigger(updatedAttackerPlayer, 'destruction');
        }
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
      if (state.game.winnerId) return state;
      const nextPlayerId = findOtherPlayerId(state.game, state.game.activePlayerId);
      const nextPlayer = state.game.players[nextPlayerId];
      const updatedMaxStormlight = Math.min(MAX_STORMLIGHT, nextPlayer.maxStormlight + 1);

      // Pioche automatique en début de tour (si le deck n'est pas vide).
      const drawn = drawCards(nextPlayer, 1);

      const updatedNextPlayer: PlayerState = {
        ...drawn,
        maxStormlight: updatedMaxStormlight,
        stormlight: updatedMaxStormlight,
        heroAbilityUsedThisTurn: false,
        board: drawn.board.map((unit) =>
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

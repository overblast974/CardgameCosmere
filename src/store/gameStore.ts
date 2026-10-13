import { create } from 'zustand';
import type { GameState, PlayerState, UnitInPlay } from '../types/game';
import type { ArrivalEffect, Card, LinkLevel, SprenCard } from '../types/card';
import { buildDeckCards, getDeckBundle, DEFAULT_DECK_IDS } from '../data/cards/loader';

// Les règles sont décrites dans docs/regles.md ; chaque constante ci-dessous
// y correspond à une ligne.
const STARTING_HAND_SIZE = 4;
/** Le second joueur compense l'initiative par une carte de plus en main. */
const SECOND_PLAYER_EXTRA_CARDS = 1;
const MAX_STORMLIGHT = 10;
/** Emplacements d'unités par camp sur le plateau. */
export const MAX_BOARD_UNITS = 5;
/** Taille maximale de la main : les cartes piochées au-delà sont brûlées. */
export const HAND_LIMIT = 10;
const MAX_LINK_LEVEL: LinkLevel = 4;
/** Niveau 1 (Esquisse) : la Stormlight régénère le héros à chaque début de tour, jusqu'à ses PV de base. */
const OATH_REGEN_PER_TURN = 1;
/** Niveau 2 (Souffle de Stormlight) : soin immédiat du héros. */
const OATH_HEAL = 5;
/** Niveau 2 : aura permanente, +1 ATK à toutes les unités alliées. */
const OATH_ALLY_ATTACK_BONUS = 1;
/** Niveau 3 (Lame d'Éclat) : ATK du héros. */
const BLADE_HERO_ATTACK_BONUS = 2;
/** Niveau 4 (Plaque d'Éclat) : bouclier gagné en prononçant le serment. */
const ARMOR_SHIELD_BONUS = 15;
/** Avatar du héros détruit : le héros encaisse ces dégâts. */
const AVATAR_DEATH_DAMAGE = 5;
const NIGHTBLOOD_SELF_DAMAGE = 5;

function shuffle<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function createPlayer(id: string, name: string, deckId: string, cardIds?: string[], handSize = STARTING_HAND_SIZE): PlayerState {
  const bundle = getDeckBundle(deckId);
  const deck = shuffle(buildDeckCards(cardIds ? { ...bundle.deck, cardIds } : bundle.deck));
  const hand = deck.splice(0, handSize);
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
    heroCanAttack: false,
    mulliganDone: false,
    avatarReturnPending: false,
  };
}

/** Le héros peut frapper avec sa Lame d'Éclat (Lien 3, une fois par tour). */
function canHeroAttack(player: PlayerState): boolean {
  return player.linkLevel >= 3 && Boolean(player.heroCanAttack);
}

/** Listes de cartes personnalisées (constructeur de deck), par joueur. */
export type DeckOverrides = Partial<Record<'player1' | 'player2', string[]>>;

function buildInitialState(
  deck1Id: string,
  deck2Id: string,
  names: [string, string] = ['Joueur 1', 'Joueur 2'],
  overrides: DeckOverrides = {},
): GameState {
  const player1 = createPlayer('player1', names[0], deck1Id, overrides.player1);
  const player2 = createPlayer('player2', names[1], deck2Id, overrides.player2, STARTING_HAND_SIZE + SECOND_PLAYER_EXTRA_CARDS);
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

function hasCardKeyword(card: Card, keyword: string): boolean {
  return card.keywords?.includes(keyword as never) ?? false;
}

/** Mots-clés effectifs d'une unité (le Spren porte ceux de son niveau). */
function unitHasKeyword(unit: UnitInPlay, keyword: string): boolean {
  if (unit.keywords) return unit.keywords.includes(keyword);
  return hasCardKeyword(unit.card, keyword);
}

/** Calcule l'ATK effective d'une unité (Tandem de Drehy & Skar, Souffle de Stormlight niveau 2). */
function getEffectiveAttack(player: PlayerState, unit: UnitInPlay): number {
  let attack = unit.currentAttack;
  if (unit.card.id === 'drehy-skar') {
    const tandemCount = player.board.filter((u) => u.card.id === 'drehy-skar').length;
    if (tandemCount >= 2) attack += 1;
  }
  if (player.linkLevel >= 2) attack += OATH_ALLY_ATTACK_BONUS;
  return attack;
}

/** Calcule l'ATK effective du héros (Lame d'Éclat au niveau 3 : +2 ATK). */
function getEffectiveHeroAttack(player: PlayerState): number {
  const baseAttack = player.heroCard.type === 'radiant' ? player.heroCard.attack : 0;
  return baseAttack + (player.linkLevel >= 3 ? BLADE_HERO_ATTACK_BONUS : 0);
}

/** Le héros riposte aux unités qui l'attaquent dès qu'il tient sa Lame (Lien 3). */
function heroRetaliation(player: PlayerState): number {
  return player.linkLevel >= 3 ? getEffectiveHeroAttack(player) : 0;
}

function findOtherPlayerId(game: GameState, playerId: string): string {
  return Object.keys(game.players).find((id) => id !== playerId) ?? playerId;
}

function avatarIdOf(player: PlayerState): string | undefined {
  return getDeckBundle(player.deckId).heroDefinition.avatar?.id;
}

// ---------- Spren : l'unité évolutive liée au héros ----------

function sprenCardOf(player: PlayerState): SprenCard {
  return getDeckBundle(player.deckId).starterSpren;
}

function createSprenInstance(player: PlayerState, level: 1 | 2 | 4): UnitInPlay {
  const spren = sprenCardOf(player);
  const stats = spren.levels[level];
  return {
    instanceId: `spren-${player.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    card: spren,
    currentHealth: stats.health,
    currentAttack: stats.attack,
    canAttack: false,
    isLashed: false,
    hasSurvivedLethal: false,
    keywords: stats.keywords ?? [],
    isSpren: true,
    indestructible: level === 4,
  };
}

/**
 * Aligne le Spren sur le niveau de Lien : présent aux niveaux 1, 2 et 4 (avec
 * les stats du niveau), absent aux niveaux 0 et 3 (au 3, il EST la Lame).
 * S'il manque alors qu'il devrait être là (plateau plein, ou dissipé en
 * combat), il est invoqué dès qu'une case se libère.
 */
function syncSpren(player: PlayerState): PlayerState {
  const level = player.linkLevel;
  const existing = player.board.find((u) => u.isSpren);
  if (level === 0 || level === 3) {
    return existing ? { ...player, board: player.board.filter((u) => !u.isSpren) } : player;
  }
  const stats = sprenCardOf(player).levels[level];
  if (existing) {
    if (existing.currentAttack === stats.attack && existing.currentHealth === stats.health && existing.indestructible === (level === 4)) {
      return player;
    }
    return {
      ...player,
      board: player.board.map((u) =>
        u.isSpren
          ? { ...u, currentAttack: stats.attack, currentHealth: stats.health, keywords: stats.keywords ?? [], indestructible: level === 4 }
          : u,
      ),
    };
  }
  if (player.board.length >= MAX_BOARD_UNITS) return player;
  return { ...player, board: [...player.board, createSprenInstance(player, level)] };
}

/**
 * Applique les récompenses immédiates des serments franchis entre deux niveaux.
 * L'aura d'ATK du niveau 2, la Lame du niveau 3 et la régénération du niveau 1
 * sont, elles, calculées à la volée ou au début du tour.
 */
function applyOathRewards(player: PlayerState, fromLevel: LinkLevel, toLevel: LinkLevel): PlayerState {
  let updated: PlayerState = { ...player, linkLevel: toLevel };
  if (fromLevel < 2 && toLevel >= 2) updated = { ...updated, heroHealth: updated.heroHealth + OATH_HEAL };
  // La Lame se manifeste : le héros peut frapper dès ce tour.
  if (fromLevel < 3 && toLevel >= 3) updated = { ...updated, heroCanAttack: true };
  if (fromLevel < 4 && toLevel >= 4) {
    updated = { ...updated, heroShield: updated.heroShield + ARMOR_SHIELD_BONUS };
    // L'Avatar du héros rejoint la main (même au-delà de la limite : c'est une récompense).
    const avatar = getDeckBundle(player.deckId).heroDefinition.avatar;
    if (avatar) updated = { ...updated, hand: [...updated.hand, avatar] };
  }
  return syncSpren(updated);
}

function gainLink(player: PlayerState, levels = 1): PlayerState {
  const newLevel = Math.min(MAX_LINK_LEVEL, player.linkLevel + levels) as LinkLevel;
  if (newLevel === player.linkLevel) return player;
  return applyOathRewards(player, player.linkLevel, newLevel);
}

/** Gain de Lien conditionné au déclencheur de l'ordre du héros. */
function gainLinkIfTrigger(player: PlayerState, trigger: 'protection' | 'destruction'): PlayerState {
  const definition = getDeckBundle(player.deckId).heroDefinition;
  return definition.linkGainTrigger === trigger ? gainLink(player) : player;
}

/** Applique des dégâts à une unité ; gère l'Obstination et l'indestructibilité. Retourne l'unité mise à jour ou null si morte. */
function damageUnit(unit: UnitInPlay, amount: number): UnitInPlay | null {
  const remainingHealth = unit.currentHealth - amount;
  if (remainingHealth > 0) return { ...unit, currentHealth: remainingHealth };
  if (unit.indestructible) return { ...unit, currentHealth: 1 };
  if (unitHasKeyword(unit, 'obstination') && !unit.hasSurvivedLethal) {
    return { ...unit, currentHealth: 1, hasSurvivedLethal: true };
  }
  return null;
}

/** Applique des dégâts au héros, le bouclier absorbe en premier. */
function damageHero(player: PlayerState, amount: number): PlayerState {
  if (amount <= 0) return player;
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

/**
 * Remplace une unité sur un plateau, ou la retire si morte. Une unité morte
 * va au cimetière, sauf le Spren (il se dissipe et revient) et l'Avatar du
 * héros (le héros encaisse 5 dégâts, la carte revient en main au tour suivant).
 */
function applyUnitDamageToBoard(player: PlayerState, target: UnitInPlay, updated: UnitInPlay | null): PlayerState {
  let next: PlayerState = {
    ...player,
    board: player.board
      .map((u) => (u.instanceId === target.instanceId ? updated : u))
      .filter((u): u is UnitInPlay => u !== null),
  };
  if (updated) return next;
  if (target.isSpren) return next;
  if (target.card.id === avatarIdOf(player)) {
    next = damageHero({ ...next, avatarReturnPending: true }, AVATAR_DEATH_DAMAGE);
    return next;
  }
  return { ...next, graveyard: [...next.graveyard, target.card] };
}

/** Inflige `amount` dégâts à toutes les unités d'un plateau. */
function damageAllUnits(player: PlayerState, amount: number): PlayerState {
  let next = player;
  for (const unit of player.board) {
    next = applyUnitDamageToBoard(next, unit, damageUnit(unit, amount));
  }
  return next;
}

/** Détruit toutes les unités d'un plateau (sans passer par les dégâts : l'Obstination ne protège pas). Seul un Spren indestructible reste. */
function destroyAllUnits(player: PlayerState): PlayerState {
  let next = player;
  for (const unit of player.board) {
    if (unit.indestructible) continue;
    next = applyUnitDamageToBoard(next, unit, null);
  }
  return next;
}

/** Pioche jusqu'à `count` cartes ; au-delà de la limite de main, les cartes sont brûlées (cimetière). */
function drawCards(player: PlayerState, count: number): PlayerState {
  const drawn = player.deck.slice(0, count);
  const room = Math.max(0, HAND_LIMIT - player.hand.length);
  const kept = drawn.slice(0, room);
  const burned = drawn.slice(room);
  return {
    ...player,
    deck: player.deck.slice(drawn.length),
    hand: [...player.hand, ...kept],
    graveyard: burned.length ? [...player.graveyard, ...burned] : player.graveyard,
  };
}

function createUnitInstance(card: Card & { attack: number; health: number }): UnitInPlay {
  return {
    instanceId: `${card.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    card,
    currentHealth: card.health,
    currentAttack: card.attack,
    canAttack: hasCardKeyword(card, 'zele'),
    isLashed: false,
    hasSurvivedLethal: false,
  };
}

/** Résout un Cri d'arrivée pour le joueur et son adversaire. */
function resolveArrival(
  player: PlayerState,
  opponent: PlayerState,
  arrival: ArrivalEffect,
): { player: PlayerState; opponent: PlayerState } {
  switch (arrival.effectType) {
    case 'link':
      return { player: gainLink(player, arrival.effectValue), opponent };
    case 'draw':
      return { player: drawCards(player, arrival.effectValue), opponent };
    case 'stormlight':
      return { player: { ...player, stormlight: Math.min(MAX_STORMLIGHT, player.stormlight + arrival.effectValue) }, opponent };
    case 'heal':
      return { player: { ...player, heroHealth: player.heroHealth + arrival.effectValue }, opponent };
    case 'aoe-damage':
      return { player, opponent: damageAllUnits(opponent, arrival.effectValue) };
  }
}

/** Celui qui encaisse réellement une attaque : la Couverture, sauf face à une unité qui vole. */
function resolveDefender(defenderPlayer: PlayerState, attacker: UnitInPlay | null, protectedKey: string): UnitInPlay | undefined {
  if (attacker && unitHasKeyword(attacker, 'vol')) return undefined;
  return defenderPlayer.board.find((u) => u.guarding === protectedKey);
}

interface GameStore {
  game: GameState;
  startGame: (deck1Id: string, deck2Id: string, names?: [string, string], overrides?: DeckOverrides) => void;
  /** Mulligan de départ : remet les cartes choisies dans la pioche et en repioche autant. Une seule fois. */
  mulligan: (playerId: string, handIndices: number[]) => void;
  drawCard: (playerId: string) => void;
  playCard: (playerId: string, cardIndexInHand: number) => void;
  playTargetedCard: (playerId: string, cardIndexInHand: number, targetInstanceId: string) => void;
  setLinkLevel: (playerId: string, level: LinkLevel) => void;
  endTurn: () => void;
  attackUnit: (playerId: string, attackerInstanceId: string, defenderInstanceId: string) => void;
  attackHero: (playerId: string, attackerInstanceId: string) => void;
  /** Frappe de la Lame d'Éclat (Lien 3) sur une unité ennemie ; le héros subit la riposte. */
  heroAttackUnit: (playerId: string, defenderInstanceId: string) => void;
  /** Frappe de la Lame d'Éclat sur le héros ennemi (interceptée par une Couverture du héros). */
  heroAttackHero: (playerId: string) => void;
  /** Place (ou déplace) une Couverture. Le Lien n'est accordé qu'à la première fois par unité. */
  declareGuard: (playerId: string, protectorInstanceId: string, protectedTarget: 'hero' | string) => void;
  useHeroPower: (playerId: string, targetInstanceId: string) => void;
  loadGame: (game: GameState) => void;
}

export const useGameStore = create<GameStore>((set) => ({
  game: buildInitialState(DEFAULT_DECK_IDS[0], DEFAULT_DECK_IDS[1]),

  loadGame: (game) => set({ game }),

  startGame: (deck1Id, deck2Id, names, overrides) => set({ game: buildInitialState(deck1Id, deck2Id, names, overrides) }),

  mulligan: (playerId, handIndices) =>
    set((state) => {
      const player = state.game.players[playerId];
      if (!player || player.mulliganDone) return state;
      const toReplace = player.hand.filter((_, i) => handIndices.includes(i));
      const kept = player.hand.filter((_, i) => !handIndices.includes(i));
      const deck = shuffle([...player.deck, ...toReplace]);
      const redrawn = deck.slice(0, toReplace.length);
      return {
        game: {
          ...state.game,
          players: {
            ...state.game.players,
            [playerId]: { ...player, hand: [...kept, ...redrawn], deck: deck.slice(redrawn.length), mulliganDone: true },
          },
        },
      };
    }),

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
        // Plateau plein : la carte reste en main.
        if (player.board.length >= MAX_BOARD_UNITS) return state;
        updatedPlayer = { ...updatedPlayer, board: [...updatedPlayer.board, createUnitInstance(card)] };
        if (card.arrival) {
          const resolved = resolveArrival(updatedPlayer, updatedOpponent, card.arrival);
          updatedPlayer = resolved.player;
          updatedOpponent = resolved.opponent;
        }
      } else if (card.type === 'eclat') {
        // Éclats légendaires, résolus par id.
        if (card.id === 'honor') {
          updatedPlayer = gainLink(updatedPlayer, 2);
          updatedPlayer = { ...updatedPlayer, heroShield: updatedPlayer.heroShield + 10 };
        }
        if (card.id === 'nightblood') {
          updatedOpponent = destroyAllUnits(updatedOpponent);
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
          case 'heal':
            updatedPlayer = { ...updatedPlayer, heroHealth: updatedPlayer.heroHealth + (card.effectValue ?? 1) };
            break;
          case 'aoe-buff': {
            const bonus = card.effectValue ?? 1;
            updatedPlayer = {
              ...updatedPlayer,
              board: updatedPlayer.board.map((u) => ({
                ...u,
                currentAttack: u.currentAttack + bonus,
                currentHealth: u.currentHealth + bonus,
              })),
            };
            break;
          }
          case 'aoe-damage':
            updatedOpponent = damageAllUnits(updatedOpponent, card.effectValue ?? 1);
            break;
          default:
            // Carte ciblée jouée sans cible : on annule (rien ne se passe).
            return state;
        }
        updatedPlayer = { ...updatedPlayer, graveyard: [...updatedPlayer.graveyard, card] };
      } else {
        // Spren, manifestation ou type inconnu : injouable depuis la main.
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
            board: opponent.board.map((u) => (u.instanceId === targetInstanceId ? { ...u, isLashed: true } : u)),
          };
          break;
        }
        case 'lash': {
          const target = opponent.board.find((u) => u.instanceId === targetInstanceId);
          if (!target) return state;
          const damaged = damageUnit(target, card.effectValue ?? 2);
          const updated = damaged ? { ...damaged, isLashed: true } : null;
          updatedOpponent = applyUnitDamageToBoard(opponent, target, updated);
          if (!updated) updatedPlayer = gainLinkIfTrigger(updatedPlayer, 'destruction');
          break;
        }
        case 'bounce': {
          const target = opponent.board.find((u) => u.instanceId === targetInstanceId);
          if (!target) return state;
          // Le Spren ne se renvoie pas : il se dissipe et reviendra. L'Avatar revient en main.
          updatedOpponent = {
            ...opponent,
            board: opponent.board.filter((u) => u.instanceId !== targetInstanceId),
            hand: target.isSpren ? opponent.hand : [...opponent.hand, target.card],
          };
          break;
        }
        case 'buff':
        case 'equip': {
          const target = player.board.find((u) => u.instanceId === targetInstanceId);
          if (!target) return state;
          const attackBonus = card.effectType === 'equip' ? (card.effectAttack ?? 0) : (card.effectValue ?? 1);
          const healthBonus = card.effectType === 'equip' ? (card.effectHealth ?? 0) : (card.effectValue ?? 1);
          updatedPlayer = {
            ...updatedPlayer,
            board: player.board.map((u) =>
              u.instanceId === targetInstanceId
                ? { ...u, currentAttack: u.currentAttack + attackBonus, currentHealth: u.currentHealth + healthBonus }
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
      return {
        game: {
          ...state.game,
          players: {
            ...state.game.players,
            [playerId]: applyOathRewards(player, player.linkLevel, level),
          },
        },
      };
    }),

  declareGuard: (playerId, protectorInstanceId, protectedTarget) =>
    set((state) => {
      const player = state.game.players[playerId];
      if (!player) return state;
      const protector = player.board.find((u) => u.instanceId === protectorInstanceId);
      if (!protector || !unitHasKeyword(protector, 'couverture')) return state;
      if (protector.guarding === protectedTarget) return state;

      const updatedBoard = player.board.map((unit) =>
        unit.instanceId === protectorInstanceId ? { ...unit, guarding: protectedTarget, guardLinkGranted: true } : unit,
      );

      // Se placer en Couverture nourrit le Lien des Windrunners (une fois par unité).
      let updatedPlayer: PlayerState = { ...player, board: updatedBoard };
      if (!protector.guardLinkGranted) updatedPlayer = gainLinkIfTrigger(updatedPlayer, 'protection');

      return {
        game: {
          ...state.game,
          players: { ...state.game.players, [playerId]: updatedPlayer },
        },
      };
    }),

  heroAttackUnit: (playerId, defenderInstanceId) =>
    set((state) => {
      if (state.game.winnerId) return state;
      const attackerPlayer = state.game.players[playerId];
      const opponentId = findOtherPlayerId(state.game, playerId);
      const defenderPlayer = state.game.players[opponentId];
      if (!attackerPlayer || !defenderPlayer || !canHeroAttack(attackerPlayer)) return state;

      const declaredDefender = defenderPlayer.board.find((u) => u.instanceId === defenderInstanceId);
      if (!declaredDefender) return state;
      const guard = resolveDefender(defenderPlayer, null, declaredDefender.instanceId);
      const actualDefender = guard ?? declaredDefender;

      const heroDamage = getEffectiveHeroAttack(attackerPlayer);
      const retaliation = getEffectiveAttack(defenderPlayer, actualDefender);
      const updatedDefenderUnit = damageUnit(actualDefender, heroDamage);

      let updatedDefenderPlayer: PlayerState = guard ? gainLinkIfTrigger(defenderPlayer, 'protection') : defenderPlayer;
      updatedDefenderPlayer = applyUnitDamageToBoard(updatedDefenderPlayer, actualDefender, updatedDefenderUnit);

      // Le héros encaisse la riposte de l'unité frappée (le bouclier absorbe d'abord).
      let updatedAttackerPlayer = damageHero({ ...attackerPlayer, heroCanAttack: false }, retaliation);
      if (!updatedDefenderUnit) updatedAttackerPlayer = gainLinkIfTrigger(updatedAttackerPlayer, 'destruction');

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

  heroAttackHero: (playerId) =>
    set((state) => {
      if (state.game.winnerId) return state;
      const attackerPlayer = state.game.players[playerId];
      const opponentId = findOtherPlayerId(state.game, playerId);
      const defenderPlayer = state.game.players[opponentId];
      if (!attackerPlayer || !defenderPlayer || !canHeroAttack(attackerPlayer)) return state;

      const heroDamage = getEffectiveHeroAttack(attackerPlayer);
      const guard = resolveDefender(defenderPlayer, null, 'hero');
      let updatedAttackerPlayer: PlayerState = { ...attackerPlayer, heroCanAttack: false };
      let updatedDefenderPlayer: PlayerState;

      if (guard) {
        const updatedGuard = damageUnit(guard, heroDamage);
        updatedDefenderPlayer = applyUnitDamageToBoard(gainLinkIfTrigger(defenderPlayer, 'protection'), guard, updatedGuard);
        updatedAttackerPlayer = damageHero(updatedAttackerPlayer, getEffectiveAttack(defenderPlayer, guard));
        if (!updatedGuard) updatedAttackerPlayer = gainLinkIfTrigger(updatedAttackerPlayer, 'destruction');
      } else {
        updatedDefenderPlayer = damageHero(defenderPlayer, heroDamage);
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
          board: opponent.board.map((unit) => (unit.instanceId === targetInstanceId ? { ...unit, isLashed: true } : unit)),
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

      const guard = resolveDefender(defenderPlayer, attacker, declaredDefender.instanceId);
      const actualDefender = guard ?? declaredDefender;

      const attackerDamage = getEffectiveAttack(attackerPlayer, attacker);
      const defenderDamage = getEffectiveAttack(defenderPlayer, actualDefender);

      const updatedDefenderUnit = damageUnit(actualDefender, attackerDamage);
      const updatedAttackerUnit = damageUnit(attacker, defenderDamage);

      // Couverture absorbée : Lien pour le défenseur (Windrunner).
      let updatedDefenderPlayer: PlayerState = guard ? gainLinkIfTrigger(defenderPlayer, 'protection') : defenderPlayer;
      updatedDefenderPlayer = applyUnitDamageToBoard(updatedDefenderPlayer, actualDefender, updatedDefenderUnit);

      let updatedAttackerPlayer = applyUnitDamageToBoard(
        attackerPlayer,
        attacker,
        updatedAttackerUnit ? { ...updatedAttackerUnit, canAttack: false } : null,
      );

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

      const guard = resolveDefender(defenderPlayer, attacker, 'hero');
      const attackerDamage = getEffectiveAttack(attackerPlayer, attacker);

      let updatedDefenderPlayer: PlayerState;
      let updatedAttackerPlayer: PlayerState;

      if (guard) {
        const defenderDamage = getEffectiveAttack(defenderPlayer, guard);
        const updatedGuard = damageUnit(guard, attackerDamage);
        const updatedAttackerUnit = damageUnit(attacker, defenderDamage);

        updatedDefenderPlayer = gainLinkIfTrigger(applyUnitDamageToBoard(defenderPlayer, guard, updatedGuard), 'protection');
        updatedAttackerPlayer = applyUnitDamageToBoard(
          attackerPlayer,
          attacker,
          updatedAttackerUnit ? { ...updatedAttackerUnit, canAttack: false } : null,
        );
        if (!updatedGuard) updatedAttackerPlayer = gainLinkIfTrigger(updatedAttackerPlayer, 'destruction');
      } else {
        updatedDefenderPlayer = damageHero(defenderPlayer, attackerDamage);
        // Dès qu'il tient sa Lame (Lien 3), le héros riposte à l'unité qui l'attaque.
        const updatedAttackerUnit = damageUnit(attacker, heroRetaliation(defenderPlayer));
        updatedAttackerPlayer = applyUnitDamageToBoard(
          attackerPlayer,
          attacker,
          updatedAttackerUnit ? { ...updatedAttackerUnit, canAttack: false } : null,
        );
        if (!updatedAttackerUnit) updatedDefenderPlayer = gainLinkIfTrigger(updatedDefenderPlayer, 'destruction');
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
      const baseHealth = getDeckBundle(nextPlayer.deckId).heroDefinition.baseHealth;
      const avatar = getDeckBundle(nextPlayer.deckId).heroDefinition.avatar;

      // Pioche automatique en début de tour (si le deck n'est pas vide).
      let updatedNextPlayer: PlayerState = drawCards(nextPlayer, 1);

      // L'Avatar détruit au tour précédent revient en main.
      if (updatedNextPlayer.avatarReturnPending && avatar) {
        updatedNextPlayer = { ...updatedNextPlayer, hand: [...updatedNextPlayer.hand, avatar], avatarReturnPending: false };
      }

      updatedNextPlayer = {
        ...updatedNextPlayer,
        maxStormlight: updatedMaxStormlight,
        stormlight: updatedMaxStormlight,
        heroAbilityUsedThisTurn: false,
        heroCanAttack: nextPlayer.linkLevel >= 3,
        // Esquisse (Lien 1) : la Stormlight referme les blessures, jusqu'aux PV de base.
        heroHealth:
          nextPlayer.linkLevel >= 1 && nextPlayer.heroHealth < baseHealth
            ? Math.min(baseHealth, nextPlayer.heroHealth + OATH_REGEN_PER_TURN)
            : nextPlayer.heroHealth,
        board: updatedNextPlayer.board.map((unit) =>
          unit.isLashed ? { ...unit, isLashed: false, canAttack: false } : { ...unit, canAttack: true },
        ),
      };

      // Le Spren dissipé revient dès qu'une case est libre.
      updatedNextPlayer = syncSpren(updatedNextPlayer);

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

export { getEffectiveAttack, getEffectiveHeroAttack, canHeroAttack, unitHasKeyword };

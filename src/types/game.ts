import type { Card, LinkLevel } from './card';

export interface UnitInPlay {
  instanceId: string;
  card: Card;
  currentHealth: number;
  currentAttack: number;
  canAttack: boolean;
  /** Lashing de Kaladin (niveau 3) : ne peut pas attaquer pendant 1 tour. */
  isLashed: boolean;
  /** Cible protégée par cette unité via Couverture : 'hero' ou instanceId d'une unité alliée. */
  guarding?: string;
  /** Obstination de Lopen : a déjà survécu une fois à un coup fatal. */
  hasSurvivedLethal: boolean;
  /** Mots-clés effectifs quand ils diffèrent de la carte (Spren selon son niveau). */
  keywords?: string[];
  /** Le Spren du héros, invoqué par le Lien : ne va jamais au cimetière, revient au tour suivant. */
  isSpren?: boolean;
  /** Ne peut pas descendre sous 1 PV (Spren au Lien 4 tant que le héros vit). */
  indestructible?: boolean;
  /** Couverture : le Lien a déjà été accordé pour cette unité (une fois par unité). */
  guardLinkGranted?: boolean;
}

export interface PlayerState {
  id: string;
  name: string;
  /** Id du deck choisi, pour retrouver le héros et ses règles (loader). */
  deckId: string;
  heroCard: Card;
  heroHealth: number;
  heroShield: number;
  linkLevel: LinkLevel;
  stormlight: number;
  maxStormlight: number;
  deck: Card[];
  hand: Card[];
  board: UnitInPlay[];
  graveyard: Card[];
  heroAbilityUsedThisTurn: boolean;
  /** Lame d'Éclat (Lien 3) : le héros peut attaquer une fois par tour. */
  heroCanAttack?: boolean;
  /** Mulligan de départ déjà fait (ou refusé). */
  mulliganDone?: boolean;
  /** L'Avatar du héros a été détruit : il revient en main au début du prochain tour. */
  avatarReturnPending?: boolean;
}

export type Phase = 'main' | 'attack' | 'end';

export interface GameState {
  turn: number;
  activePlayerId: string;
  phase: Phase;
  players: Record<string, PlayerState>;
  winnerId: string | null;
}

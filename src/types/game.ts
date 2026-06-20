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
}

export interface PlayerState {
  id: string;
  name: string;
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
}

export type Phase = 'main' | 'attack' | 'end';

export interface GameState {
  turn: number;
  activePlayerId: string;
  phase: Phase;
  players: Record<string, PlayerState>;
  winnerId: string | null;
}

import type { Card, LinkLevel } from './card';

export interface UnitInPlay {
  instanceId: string;
  card: Card;
  currentHealth: number;
  currentAttack: number;
  canAttack: boolean;
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
}

export type Phase = 'main' | 'attack' | 'end';

export interface GameState {
  turn: number;
  activePlayerId: string;
  phase: Phase;
  players: Record<string, PlayerState>;
}

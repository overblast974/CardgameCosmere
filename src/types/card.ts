// Modèle de données central pour les cartes des Archives de Roshar

export type CardType = 'radiant' | 'spren' | 'surge' | 'fabrial' | 'heraut' | 'eclat';

export type Order =
  | 'Windrunner'
  | 'Skybreaker'
  | 'Dustbringer'
  | 'Edgedancer'
  | 'Truthwatcher'
  | 'Lightweaver'
  | 'Elsecaller'
  | 'Willshaper'
  | 'Stoneward'
  | 'Bondsmith'
  | 'Neutre';

export type LinkLevel = 0 | 1 | 2 | 3 | 4;

export const LINK_LEVEL_NAMES: Record<LinkLevel, string> = {
  0: 'Sans Lien',
  1: 'Esquisse',
  2: 'Lien',
  3: 'Jureur',
  4: 'Armure Radiante',
};

/** Bloc de base partagé par toutes les cartes. */
export interface BaseCard {
  id: string;
  name: string;
  type: CardType;
  cost: number;
  order: Order;
  text?: string;
}

/** Unité Radiant classique (héros ou non). */
export interface RadiantCard extends BaseCard {
  type: 'radiant';
  attack: number;
  health: number;
  isHero?: boolean;
  /** Référence à la carte Spren liée si cette carte est un héros. */
  bondedSprenId?: string;
}

/** Carte Spren, dont les stats varient selon le niveau de Lien du héros porteur. */
export interface SprenStatsByLevel {
  attack: number;
  health: number;
  keywords?: string[];
  description?: string;
}

export interface SprenCard extends BaseCard {
  type: 'spren';
  /** Stats par niveau de Lien (1 à 4). Niveau 0 = pas encore débloqué. */
  levels: Record<1 | 2 | 3 | 4, SprenStatsByLevel>;
  /** id du héros Radiant auquel ce Spren est lié. */
  bondedHeroId: string;
}

/** Sort à effet immédiat, consommé après usage. */
export interface SurgeCard extends BaseCard {
  type: 'surge';
  effect: string;
}

/** Équipement attaché à une unité ou à un héros. */
export interface FabrialCard extends BaseCard {
  type: 'fabrial';
  effect: string;
  durationTurns?: number;
}

/** Carte neutre à coût élevé jouable par n'importe quel ordre. */
export interface HerautCard extends BaseCard {
  type: 'heraut';
  attack: number;
  health: number;
  effect: string;
}

/** Carte légendaire unique par deck, coût 10. */
export interface EclatCard extends BaseCard {
  type: 'eclat';
  cost: 10;
  effect: string;
  terrainEffect?: string;
  terrainDurationTurns?: number;
}

export type Card =
  | RadiantCard
  | SprenCard
  | SurgeCard
  | FabrialCard
  | HerautCard
  | EclatCard;

/** Capacité spéciale d'un héros débloquée à un niveau de Lien donné. */
export interface HeroAbility {
  linkLevelRequired: LinkLevel;
  name: string;
  description: string;
}

/** Condition de gain de Lien, spécifique à chaque Ordre. */
export interface LinkCondition {
  description: string;
}

/** Définition complète d'un héros, au-delà de sa simple carte Radiant. */
export interface HeroDefinition {
  cardId: string;
  order: Order;
  baseHealth: number;
  linkCondition: LinkCondition;
  abilities: HeroAbility[];
}

export interface Deck {
  id: string;
  name: string;
  heroId: string;
  startingSprenId: string;
  cardIds: string[];
}

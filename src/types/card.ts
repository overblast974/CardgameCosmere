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

/**
 * Mots-clés de gameplay portés par les unités :
 * - couverture : peut s'interposer pour protéger un allié ou le héros.
 * - obstination : survit une fois à un coup fatal (reste à 1 PV).
 * - zele : peut attaquer dès son arrivée en jeu.
 */
export type Keyword = 'couverture' | 'obstination' | 'zele';

/**
 * Effets résolus par le moteur pour les Surges et Fabrials :
 * - damage : inflige effectValue dégâts à une unité ennemie ciblée.
 * - disable : une unité ennemie ciblée ne peut pas attaquer à son prochain tour.
 * - bounce : renvoie une unité ennemie ciblée dans la main de son propriétaire.
 * - buff : une unité alliée ciblée gagne +effectValue/+effectValue.
 * - draw : pioche effectValue cartes.
 * - stormlight : gagne effectValue Stormlight ce tour.
 * - aoe-damage : inflige effectValue dégâts à toutes les unités ennemies.
 */
export type CardEffectType =
  | 'damage'
  | 'disable'
  | 'bounce'
  | 'buff'
  | 'draw'
  | 'stormlight'
  | 'aoe-damage';

/** Bloc de base partagé par toutes les cartes. */
export interface BaseCard {
  id: string;
  name: string;
  type: CardType;
  cost: number;
  order: Order;
  text?: string;
  keywords?: Keyword[];
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
  effectType?: CardEffectType;
  effectValue?: number;
}

/** Équipement ou consommable technologique. */
export interface FabrialCard extends BaseCard {
  type: 'fabrial';
  effect: string;
  effectType?: CardEffectType;
  effectValue?: number;
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

/**
 * Déclencheur de gain de Lien :
 * - protection : quand une unité alliée absorbe une attaque via Couverture.
 * - destruction : quand une unité ennemie est détruite par une attaque ou un pouvoir.
 */
export type LinkGainTrigger = 'protection' | 'destruction';

/**
 * Pouvoir actif du héros (débloqué au niveau de Lien 3, une fois par tour) :
 * - lashing : une unité ennemie ciblée ne peut pas attaquer à son prochain tour.
 * - smite : inflige heroPowerValue dégâts à une unité ennemie ciblée.
 */
export type HeroPowerType = 'lashing' | 'smite';

/** Définition complète d'un héros, au-delà de sa simple carte Radiant. */
export interface HeroDefinition {
  cardId: string;
  order: Order;
  baseHealth: number;
  linkCondition: LinkCondition;
  linkGainTrigger: LinkGainTrigger;
  heroPowerType: HeroPowerType;
  heroPowerName: string;
  heroPowerValue?: number;
  abilities: HeroAbility[];
}

export interface Deck {
  id: string;
  name: string;
  heroId: string;
  startingSprenId: string;
  cardIds: string[];
}

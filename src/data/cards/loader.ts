import windrunnersRaw from './windrunners.json';
import type {
  Card,
  Deck,
  HeroDefinition,
  RadiantCard,
  SprenCard,
} from '../../types/card';

interface DeckBundle {
  hero: RadiantCard;
  heroDefinition: HeroDefinition;
  starterSpren: SprenCard;
  units: Card[];
  surges: Card[];
  fabrials: Card[];
  herauts: Card[];
  eclats: Card[];
  deck: Deck;
}

const windrunners = windrunnersRaw as unknown as DeckBundle;

/** Toutes les cartes (hors héros et Spren de départ) du bundle Windrunner. */
export const windrunnerCards: Card[] = [
  windrunners.hero,
  windrunners.starterSpren,
  ...windrunners.units,
  ...windrunners.surges,
  ...windrunners.fabrials,
  ...windrunners.herauts,
  ...windrunners.eclats,
];

export const windrunnerBundle = windrunners;

const cardsById = new Map(windrunnerCards.map((card) => [card.id, card]));

export function getCardById(id: string): Card | undefined {
  return cardsById.get(id);
}

/** Construit la liste de cartes d'un deck (avec doublons) à partir de ses ids. */
export function buildDeckCards(deck: Deck): Card[] {
  return deck.cardIds
    .map((id) => getCardById(id))
    .filter((card): card is Card => card !== undefined);
}

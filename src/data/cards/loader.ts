import windrunnersRaw from './windrunners.json';
import skybreakersRaw from './skybreakers.json';
import type {
  Card,
  Deck,
  HeroDefinition,
  RadiantCard,
  SprenCard,
} from '../../types/card';

export interface DeckBundle {
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
const skybreakers = skybreakersRaw as unknown as DeckBundle;

/** Tous les decks jouables, indexés par l'id de leur deck. */
export const deckBundles: Record<string, DeckBundle> = {
  [windrunners.deck.id]: windrunners,
  [skybreakers.deck.id]: skybreakers,
};

export const DEFAULT_DECK_IDS = [windrunners.deck.id, skybreakers.deck.id] as const;

export const windrunnerBundle = windrunners;
export const skybreakerBundle = skybreakers;

function bundleCards(bundle: DeckBundle): Card[] {
  return [
    bundle.hero,
    bundle.starterSpren,
    ...bundle.units,
    ...bundle.surges,
    ...bundle.fabrials,
    ...bundle.herauts,
    ...bundle.eclats,
  ];
}

/** Toutes les cartes connues, tous decks confondus. */
export const allCards: Card[] = Object.values(deckBundles).flatMap(bundleCards);

const cardsById = new Map(allCards.map((card) => [card.id, card]));

export function getCardById(id: string): Card | undefined {
  return cardsById.get(id);
}

export function getDeckBundle(deckId: string): DeckBundle {
  return deckBundles[deckId] ?? windrunners;
}

/** Construit la liste de cartes d'un deck (avec doublons) à partir de ses ids. */
export function buildDeckCards(deck: Deck): Card[] {
  return deck.cardIds
    .map((id) => getCardById(id))
    .filter((card): card is Card => card !== undefined);
}

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
    ...(bundle.heroDefinition.avatar ? [bundle.heroDefinition.avatar] : []),
  ];
}

/** Cartes que le constructeur de deck propose pour un deck : son Ordre + les neutres (pas l'Avatar). */
export function deckPool(deckId: string): Card[] {
  const bundle = getDeckBundle(deckId);
  return [...bundle.units, ...bundle.surges, ...bundle.fabrials, ...bundle.herauts, ...bundle.eclats];
}

export const DECK_SIZE = 30;
export const MAX_COPIES = 3;

/** Valide une liste de 30 ids pour un deck : 3 copies max, 1 Éclat, uniquement des cartes du pool. */
export function validateDeckList(deckId: string, cardIds: string[]): string[] {
  const errors: string[] = [];
  const pool = new Set(deckPool(deckId).map((c) => c.id));
  if (cardIds.length !== DECK_SIZE) errors.push(`Le deck doit contenir ${DECK_SIZE} cartes (${cardIds.length}).`);
  const counts = new Map<string, number>();
  for (const id of cardIds) counts.set(id, (counts.get(id) ?? 0) + 1);
  for (const [id, n] of counts) {
    const card = getCardById(id);
    if (!card || !pool.has(id)) errors.push(`Carte inconnue pour ce deck : ${id}.`);
    else if (card.type === 'eclat' && n > 1) errors.push(`Un seul Éclat par deck (${card.name}).`);
    else if (n > MAX_COPIES) errors.push(`${MAX_COPIES} copies max (${card.name}).`);
  }
  return errors;
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

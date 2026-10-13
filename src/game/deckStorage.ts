import { DECK_SIZE, getDeckBundle, validateDeckList } from '../data/cards/loader';

const STORAGE_PREFIX = 'roshar.deck.';

/** Liste de cartes personnalisée d'un deck, si le joueur en a enregistré une valide. */
export function loadCustomDeck(deckId: string): string[] | undefined {
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + deckId);
    if (!raw) return undefined;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length !== DECK_SIZE || !parsed.every((id) => typeof id === 'string')) return undefined;
    if (validateDeckList(deckId, parsed).length > 0) return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

export function saveCustomDeck(deckId: string, cardIds: string[]): void {
  try {
    window.localStorage.setItem(STORAGE_PREFIX + deckId, JSON.stringify(cardIds));
  } catch {
    // Stockage indisponible (navigation privée…) : le deck vaut pour la session.
  }
}

export function clearCustomDeck(deckId: string): void {
  try {
    window.localStorage.removeItem(STORAGE_PREFIX + deckId);
  } catch {
    // ignore
  }
}

/** Liste de départ (starter) d'un deck. */
export function starterDeck(deckId: string): string[] {
  return [...getDeckBundle(deckId).deck.cardIds];
}

/** Liste effective d'un deck : la personnalisée si elle existe, sinon le starter. */
export function effectiveDeck(deckId: string): string[] {
  return loadCustomDeck(deckId) ?? starterDeck(deckId);
}

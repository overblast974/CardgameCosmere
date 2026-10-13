import { useMemo, useState } from 'react';
import { DECK_SIZE, MAX_COPIES, deckPool, getDeckBundle, validateDeckList } from '../data/cards/loader';
import { clearCustomDeck, effectiveDeck, saveCustomDeck, starterDeck } from '../game/deckStorage';
import { cardArt } from '../assets/artwork';
import { CardComponent } from './CardComponent';
import type { Card } from '../types/card';
import './DeckBuilder.css';

interface DeckBuilderProps {
  deckId: string;
  onClose: () => void;
}

const TYPE_ORDER: Card['type'][] = ['radiant', 'surge', 'fabrial', 'heraut', 'eclat', 'spren', 'manifestation'];
const TYPE_TITLES: Partial<Record<Card['type'], string>> = {
  radiant: 'Unités',
  surge: 'Surges',
  fabrial: 'Fabrials & équipements',
  heraut: 'Hérauts',
  eclat: 'Éclat',
};

function countBy(ids: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
  return counts;
}

/**
 * Constructeur de deck : 30 cartes tirées du pool de l'Ordre (+ neutres),
 * 3 copies max par carte, 1 seul Éclat. La liste est enregistrée dans le
 * navigateur et utilisée pour toutes les parties suivantes avec ce deck.
 */
export function DeckBuilder({ deckId, onClose }: DeckBuilderProps) {
  const bundle = getDeckBundle(deckId);
  const pool = useMemo(() => deckPool(deckId), [deckId]);
  const [ids, setIds] = useState<string[]>(() => effectiveDeck(deckId));
  const [preview, setPreview] = useState<Card | null>(null);

  const counts = countBy(ids);
  const errors = validateDeckList(deckId, ids);
  const total = ids.length;
  const curve = useMemo(() => {
    const buckets = new Map<number, number>();
    for (const id of ids) {
      const card = pool.find((c) => c.id === id);
      if (!card) continue;
      const cost = Math.min(card.cost, 7);
      buckets.set(cost, (buckets.get(cost) ?? 0) + 1);
    }
    return buckets;
  }, [ids, pool]);
  const curveMax = Math.max(1, ...curve.values());

  const maxFor = (card: Card) => (card.type === 'eclat' ? 1 : MAX_COPIES);
  const add = (card: Card) => {
    if ((counts.get(card.id) ?? 0) >= maxFor(card) || total >= DECK_SIZE) return;
    setIds((current) => [...current, card.id]);
  };
  const remove = (card: Card) => {
    const index = ids.lastIndexOf(card.id);
    if (index < 0) return;
    setIds((current) => current.filter((_, i) => i !== index));
  };

  const save = () => {
    if (errors.length > 0) return;
    saveCustomDeck(deckId, ids);
    onClose();
  };
  const reset = () => {
    clearCustomDeck(deckId);
    setIds(starterDeck(deckId));
  };

  const groups = TYPE_ORDER.map((type) => ({
    type,
    cards: pool.filter((c) => c.type === type).sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name)),
  })).filter((g) => g.cards.length > 0);

  return (
    <div className="deck-builder" role="dialog" aria-modal="true" aria-label={`Deck ${bundle.deck.name}`}>
      <div className="deck-builder__panel">
        <header className="deck-builder__header">
          <div>
            <h2>{bundle.deck.name}</h2>
            <span className="deck-builder__hero">{bundle.hero.name}</span>
          </div>
          <span className={`deck-builder__count${total === DECK_SIZE ? ' deck-builder__count--ok' : ''}`}>
            {total}/{DECK_SIZE}
          </span>
          <button type="button" className="deck-builder__close" onClick={onClose} title="Fermer sans enregistrer">
            ✕
          </button>
        </header>

        <div className="deck-builder__curve" title="Courbe de coût">
          {[1, 2, 3, 4, 5, 6, 7].map((cost) => (
            <div key={cost} className="deck-builder__bar">
              <span className="deck-builder__bar-fill" style={{ height: `${((curve.get(cost) ?? 0) / curveMax) * 100}%` }} />
              <span className="deck-builder__bar-label">{cost === 7 ? '7+' : cost}</span>
            </div>
          ))}
        </div>

        <div className="deck-builder__list">
          {groups.map((group) => (
            <section key={group.type} className="deck-builder__group">
              <h3>{TYPE_TITLES[group.type] ?? group.type}</h3>
              {group.cards.map((card) => {
                const n = counts.get(card.id) ?? 0;
                const max = maxFor(card);
                const stats = 'attack' in card && 'health' in card ? `${card.attack}/${card.health}` : '';
                return (
                  <div key={card.id} className={`deck-builder__row${n > 0 ? ' deck-builder__row--in' : ''}`}>
                    <button type="button" className="deck-builder__thumb" onClick={() => setPreview(card)} title="Voir la carte">
                      {cardArt[card.id] ? <img src={cardArt[card.id]} alt="" draggable={false} /> : <span>?</span>}
                    </button>
                    <span className="deck-builder__cost">{card.cost}</span>
                    <span className="deck-builder__name">
                      {card.name}
                      {stats && <small> {stats}</small>}
                    </span>
                    <div className="deck-builder__stepper">
                      <button type="button" onClick={() => remove(card)} disabled={n === 0} aria-label={`Retirer ${card.name}`}>
                        −
                      </button>
                      <span>
                        {n}/{max}
                      </span>
                      <button
                        type="button"
                        onClick={() => add(card)}
                        disabled={n >= max || total >= DECK_SIZE}
                        aria-label={`Ajouter ${card.name}`}
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </section>
          ))}
        </div>

        {errors.length > 0 && (
          <ul className="deck-builder__errors">
            {errors.slice(0, 3).map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        )}

        <footer className="deck-builder__footer">
          <button type="button" className="deck-builder__reset" onClick={reset}>
            Deck de départ
          </button>
          <button type="button" className="deck-builder__save" onClick={save} disabled={errors.length > 0}>
            Enregistrer
          </button>
        </footer>
      </div>

      {preview && (
        <div className="deck-builder__preview" onClick={() => setPreview(null)}>
          <CardComponent card={preview} disabled />
        </div>
      )}
    </div>
  );
}

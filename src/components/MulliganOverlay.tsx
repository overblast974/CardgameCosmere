import { useState } from 'react';
import type { Card } from '../types/card';
import { CardComponent } from './CardComponent';
import './MulliganOverlay.css';

interface MulliganOverlayProps {
  playerName: string;
  hand: Card[];
  /** Indices des cartes à remplacer (vide = on garde tout). */
  onConfirm: (indices: number[]) => void;
}

/**
 * Mulligan de départ : le joueur marque les cartes qu'il renvoie dans la
 * pioche, et en repioche autant. Une seule fois par partie.
 */
export function MulliganOverlay({ playerName, hand, onConfirm }: MulliganOverlayProps) {
  const [marked, setMarked] = useState<Set<number>>(() => new Set());

  const toggle = (index: number) =>
    setMarked((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });

  return (
    <div className="mulligan" role="dialog" aria-modal="true" aria-label="Mulligan">
      <div className="mulligan__panel">
        <h2>Main de départ</h2>
        <p>
          <strong>{playerName}</strong>, touchez les cartes à renvoyer dans la pioche. Vous en repiocherez autant.
        </p>
        <div className="mulligan__cards">
          {hand.map((card, index) => (
            <div key={`${card.id}-${index}`} className={`mulligan__slot${marked.has(index) ? ' mulligan__slot--marked' : ''}`}>
              <CardComponent card={card} compact selected={marked.has(index)} onClick={() => toggle(index)} />
              {marked.has(index) && <span className="mulligan__mark">↺</span>}
            </div>
          ))}
        </div>
        <div className="mulligan__actions">
          <button type="button" className="mulligan__keep" onClick={() => onConfirm([])}>
            Tout garder
          </button>
          <button
            type="button"
            className="mulligan__confirm"
            disabled={marked.size === 0}
            onClick={() => onConfirm([...marked].sort((a, b) => a - b))}
          >
            Remplacer {marked.size > 0 ? marked.size : ''} carte{marked.size > 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  );
}

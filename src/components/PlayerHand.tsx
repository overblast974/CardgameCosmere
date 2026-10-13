import type { ButtonHTMLAttributes, CSSProperties } from 'react';
import type { Card } from '../types/card';
import { CardComponent } from './CardComponent';
import './PlayerHand.css';

interface PlayerHandProps {
  cards: Card[];
  stormlight: number;
  onPlayCard?: (index: number) => void;
  selectedIndex?: number | null;
  /** Carte en cours de saisie (estompée dans la main). */
  draggingIndex?: number | null;
  disabled?: boolean;
  /** Filtre supplémentaire : une carte sans cible valide est injouable. */
  canPlay?: (card: Card) => boolean;
  /** Gestionnaires de saisie / appui long pour chaque carte. */
  cardHandlers?: (index: number) => ButtonHTMLAttributes<HTMLButtonElement>;
}

/** Éventail de cartes : chevauchement et légère rotation autour du centre, défilable si trop large. */
export function PlayerHand({
  cards,
  stormlight,
  onPlayCard,
  selectedIndex,
  draggingIndex,
  disabled,
  canPlay,
  cardHandlers,
}: PlayerHandProps) {
  if (cards.length === 0) {
    return <div className="player-hand player-hand--empty">Main vide</div>;
  }

  const middle = (cards.length - 1) / 2;

  return (
    <div className="player-hand" role="list" aria-label="Votre main">
      {cards.map((card, index) => {
        const offset = index - middle;
        const style = {
          '--rot': `${offset * 3.5}deg`,
          '--lift': `${Math.abs(offset) * 3}px`,
        } as CSSProperties;
        const playable = !(disabled || card.cost > stormlight || (canPlay ? !canPlay(card) : false));
        return (
          <div key={`${card.id}-${index}`} className="player-hand__slot" style={style} role="listitem">
            <CardComponent
              card={card}
              hand
              disabled={!playable}
              selected={selectedIndex === index}
              dragging={draggingIndex === index}
              handlers={cardHandlers?.(index)}
              onClick={() => onPlayCard?.(index)}
            />
          </div>
        );
      })}
    </div>
  );
}

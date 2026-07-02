import type { Card } from '../types/card';
import { CardComponent } from './CardComponent';
import './PlayerHand.css';

interface PlayerHandProps {
  cards: Card[];
  stormlight: number;
  onPlayCard?: (index: number) => void;
  selectedIndex?: number | null;
  disabled?: boolean;
  /** Filtre supplémentaire : une carte sans cible valide est injouable. */
  canPlay?: (card: Card) => boolean;
}

export function PlayerHand({ cards, stormlight, onPlayCard, selectedIndex, disabled, canPlay }: PlayerHandProps) {
  if (cards.length === 0) {
    return <div className="player-hand player-hand--empty">Main vide</div>;
  }

  return (
    <div className="player-hand">
      {cards.map((card, index) => (
        <CardComponent
          key={`${card.id}-${index}`}
          card={card}
          disabled={disabled || card.cost > stormlight || (canPlay ? !canPlay(card) : false)}
          selected={selectedIndex === index}
          onClick={() => onPlayCard?.(index)}
        />
      ))}
    </div>
  );
}

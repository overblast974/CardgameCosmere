import type { Card } from '../types/card';
import { CardComponent } from './CardComponent';
import './PlayerHand.css';

interface PlayerHandProps {
  cards: Card[];
  stormlight: number;
  onPlayCard?: (index: number) => void;
  selectedIndex?: number | null;
}

export function PlayerHand({ cards, stormlight, onPlayCard, selectedIndex }: PlayerHandProps) {
  return (
    <div className="player-hand">
      {cards.map((card, index) => (
        <CardComponent
          key={`${card.id}-${index}`}
          card={card}
          disabled={card.cost > stormlight}
          selected={selectedIndex === index}
          onClick={() => onPlayCard?.(index)}
        />
      ))}
    </div>
  );
}

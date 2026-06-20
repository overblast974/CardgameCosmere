import type { Card, LinkLevel } from '../types/card';
import './CardComponent.css';

const TYPE_LABELS: Record<Card['type'], string> = {
  radiant: 'Radiant',
  spren: 'Spren',
  surge: 'Surge',
  fabrial: 'Fabrial',
  heraut: 'Héraut',
  eclat: 'Éclat',
};

interface CardComponentProps {
  card: Card;
  /** Niveau de Lien du héros porteur, utilisé pour afficher les stats d'un Spren. */
  sprenLevel?: LinkLevel;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

function getAttackHealth(card: Card, sprenLevel: LinkLevel = 0): { attack?: number; health?: number } {
  switch (card.type) {
    case 'radiant':
    case 'heraut':
      return { attack: card.attack, health: card.health };
    case 'spren': {
      if (sprenLevel === 0) return {};
      const stats = card.levels[sprenLevel as 1 | 2 | 3 | 4];
      return { attack: stats.attack, health: stats.health };
    }
    default:
      return {};
  }
}

export function CardComponent({ card, sprenLevel = 0, selected, disabled, onClick }: CardComponentProps) {
  const { attack, health } = getAttackHealth(card, sprenLevel);
  const description =
    card.type === 'surge' || card.type === 'fabrial' || card.type === 'heraut' || card.type === 'eclat'
      ? card.effect
      : card.type === 'spren' && sprenLevel > 0
        ? card.levels[sprenLevel as 1 | 2 | 3 | 4].description
        : card.text;

  return (
    <button
      type="button"
      className={`card card--${card.type}${selected ? ' card--selected' : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      <div className="card__header">
        <span className="card__cost">{card.cost}</span>
        <span className="card__name">{card.name}</span>
      </div>
      <div className="card__meta">
        <span className="card__type">{TYPE_LABELS[card.type]}</span>
        <span className="card__order">{card.order}</span>
      </div>
      {description && <p className="card__text">{description}</p>}
      {(attack !== undefined || health !== undefined) && (
        <div className="card__stats">
          <span className="card__attack">{attack ?? '-'} ATK</span>
          <span className="card__health">{health ?? '-'} PV</span>
        </div>
      )}
    </button>
  );
}

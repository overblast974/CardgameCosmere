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

const ORDER_LABELS: Record<string, string> = {
  Windrunner: 'Coureur du Vent',
  Skybreaker: 'Chasseur du Ciel',
  Neutre: 'Neutre',
};

/** Glyphe « illustration » de chaque carte (fallback par type). */
const CARD_GLYPHS: Record<string, string> = {
  'kaladin-stormblessed': '⚡',
  sylphrena: '💨',
  'bridge-four-soldier': '🛡️',
  lopen: '💪',
  'drehy-skar': '⚔️',
  'lashing-basique': '🌬️',
  'lashing-complet': '🌪️',
  'contre-gravite': '🪶',
  'sphere-infusion': '💎',
  jezrien: '👑',
  honor: '✨',
  'szeth-vallano': '🗡️',
  hautjuge: '⚖️',
  'acolyte-chasse-ciel': '☄️',
  'garde-shin': '🛡️',
  'executeur-skybreaker': '⚔️',
  division: '🔥',
  gravitation: '🌑',
  'loi-du-ciel': '📜',
  'sphere-de-jugement': '💎',
  nale: '👑',
  nightblood: '🖤',
};

const TYPE_GLYPHS: Record<Card['type'], string> = {
  radiant: '⚔️',
  spren: '✨',
  surge: '🌀',
  fabrial: '💎',
  heraut: '👑',
  eclat: '🌟',
};

interface CardComponentProps {
  card: Card;
  /** Niveau de Lien du héros porteur, utilisé pour afficher les stats d'un Spren. */
  sprenLevel?: LinkLevel;
  /** Stats en jeu (peuvent différer de la carte via buffs/dégâts). */
  currentAttack?: number;
  currentHealth?: number;
  selected?: boolean;
  disabled?: boolean;
  targetable?: boolean;
  exhausted?: boolean;
  lashed?: boolean;
  guarding?: boolean;
  compact?: boolean;
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

export function CardComponent({
  card,
  sprenLevel = 0,
  currentAttack,
  currentHealth,
  selected,
  disabled,
  targetable,
  exhausted,
  lashed,
  guarding,
  compact,
  onClick,
}: CardComponentProps) {
  const base = getAttackHealth(card, sprenLevel);
  const attack = currentAttack ?? base.attack;
  const health = currentHealth ?? base.health;
  const buffedAttack = base.attack !== undefined && attack !== undefined && attack > base.attack;
  const damagedHealth = base.health !== undefined && health !== undefined && health < base.health;
  const buffedHealth = base.health !== undefined && health !== undefined && health > base.health;

  const description =
    card.type === 'surge' || card.type === 'fabrial' || card.type === 'heraut' || card.type === 'eclat'
      ? card.effect
      : card.type === 'spren' && sprenLevel > 0
        ? card.levels[sprenLevel as 1 | 2 | 3 | 4].description
        : card.text;

  const classes = [
    'card',
    `card--${card.type}`,
    selected ? 'card--selected' : '',
    targetable ? 'card--targetable' : '',
    exhausted ? 'card--exhausted' : '',
    lashed ? 'card--lashed' : '',
    compact ? 'card--compact' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type="button" className={classes} onClick={onClick} disabled={disabled}>
      <div className="card__header">
        <span className="card__cost">{card.cost}</span>
        <span className="card__name">{card.name}</span>
      </div>
      <div className="card__art">
        <span>{CARD_GLYPHS[card.id] ?? TYPE_GLYPHS[card.type]}</span>
        {lashed && <span className="card__status-badge">⛓️ Lashé</span>}
        {guarding && !lashed && <span className="card__status-badge card__status-badge--guard">🛡️ Protège</span>}
      </div>
      <div className="card__meta">
        <span>{TYPE_LABELS[card.type]}</span>
        <span>{ORDER_LABELS[card.order] ?? card.order}</span>
      </div>
      {description && <p className="card__text">{description}</p>}
      {(attack !== undefined || health !== undefined) && (
        <div className="card__stats">
          <span className={`card__attack${buffedAttack ? ' card__stat--buffed' : ''}`} title="Attaque">
            {attack ?? '-'}
          </span>
          <span
            className={`card__health${damagedHealth ? ' card__stat--damaged' : ''}${
              buffedHealth ? ' card__stat--buffed' : ''
            }`}
            title="Points de vie"
          >
            {health ?? '-'}
          </span>
        </div>
      )}
    </button>
  );
}

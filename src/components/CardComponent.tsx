import type { Card, LinkLevel } from '../types/card';
import { cardArt, cardIcons } from '../assets/artwork';
import './CardComponent.css';

const TYPE_LABELS: Record<Card['type'], string> = {
  radiant: 'Radiant',
  spren: 'Spren',
  surge: 'Surge',
  fabrial: 'Fabrial',
  heraut: 'Héraut',
  eclat: 'Éclat',
  manifestation: 'Manifestation',
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
  'sylphrena-lance': '🔱',
  'kaladin-plaque': '🛡️',
  'hautjuge-lame': '🗡️',
  'szeth-plaque': '🛡️',
};

const TYPE_GLYPHS: Record<Card['type'], string> = {
  radiant: '⚔️',
  spren: '✨',
  surge: '🌀',
  fabrial: '💎',
  heraut: '👑',
  eclat: '🌟',
  manifestation: '🗡️',
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
  /** Manifestation pas encore débloquée : grisée avec le niveau de Lien requis. */
  locked?: boolean;
  compact?: boolean;
  /** Illustration à afficher à la place de celle de la carte (ex. stade d'évolution d'un héros). */
  artUrl?: string;
  /** Identifiant pour la couche d'effets (positionnement des VFX). */
  fxId?: string;
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

function getDescription(card: Card, sprenLevel: LinkLevel): string | undefined {
  switch (card.type) {
    case 'surge':
    case 'fabrial':
    case 'heraut':
    case 'eclat':
    case 'manifestation':
      return card.effect;
    case 'spren':
      return sprenLevel > 0 ? card.levels[sprenLevel as 1 | 2 | 3 | 4].description : card.text;
    default:
      return card.text;
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
  locked,
  compact,
  artUrl,
  fxId,
  onClick,
}: CardComponentProps) {
  const base = getAttackHealth(card, sprenLevel);
  const attack = currentAttack ?? base.attack;
  const health = currentHealth ?? base.health;
  const buffedAttack = base.attack !== undefined && attack !== undefined && attack > base.attack;
  const damagedHealth = base.health !== undefined && health !== undefined && health < base.health;
  const buffedHealth = base.health !== undefined && health !== undefined && health > base.health;

  const description = getDescription(card, sprenLevel);
  const art = artUrl ?? cardArt[card.id];

  const classes = [
    'card',
    `card--${card.type}`,
    selected ? 'card--selected' : '',
    targetable ? 'card--targetable' : '',
    exhausted ? 'card--exhausted' : '',
    lashed ? 'card--lashed' : '',
    locked ? 'card--locked' : '',
    compact ? 'card--compact' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const hasStats = attack !== undefined || health !== undefined;

  return (
    <button type="button" className={classes} onClick={onClick} disabled={disabled} data-fx={fxId}>
      {card.type === 'manifestation' ? (
        <span className="card__cost card__cost--link" title="Niveau de Lien requis">
          ✦{card.linkLevel}
        </span>
      ) : (
        <span className="card__cost" title="Coût en Stormlight">
          {card.cost}
        </span>
      )}

      <div className="card__title">
        <span className="card__name">{card.name}</span>
      </div>

      <div className={`card__art${art ? ' card__art--illustrated' : ''}`}>
        {art ? (
          <img className="card__art-img" src={art} alt="" loading="lazy" />
        ) : cardIcons[card.id] ? (
          <span className="card__art-icon" dangerouslySetInnerHTML={{ __html: cardIcons[card.id] }} />
        ) : (
          <span className="card__art-glyph">{CARD_GLYPHS[card.id] ?? TYPE_GLYPHS[card.type]}</span>
        )}
        {lashed && <span className="card__status-badge">⛓️ Lashé</span>}
        {guarding && !lashed && <span className="card__status-badge card__status-badge--guard">🛡️ Protège</span>}
        {locked && card.type === 'manifestation' && (
          <span className="card__status-badge card__status-badge--locked">🔒 Lien {card.linkLevel}</span>
        )}
      </div>

      <div className="card__typeline">
        <span>
          {TYPE_LABELS[card.type]}
          {card.type === 'manifestation' && (card.kind === 'weapon' ? ' · Arme' : ' · Armure')}
        </span>
        <span className="card__typeline-order">{ORDER_LABELS[card.order] ?? card.order}</span>
      </div>

      {description && (
        <div className="card__textbox">
          <p className="card__text">{description}</p>
        </div>
      )}

      {hasStats && (
        <>
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
        </>
      )}
    </button>
  );
}

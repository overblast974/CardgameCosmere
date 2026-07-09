import type { PlayerState } from '../types/game';
import { LinkGauge } from './LinkGauge';
import { cardArt } from '../assets/artwork';
import './HeroPanel.css';

const HERO_GLYPHS: Record<string, string> = {
  'kaladin-stormblessed': '⚡',
  'szeth-vallano': '🗡️',
};

interface HeroPanelProps {
  player: PlayerState;
  isActive: boolean;
  compact?: boolean;
  onClick?: () => void;
  targetable?: boolean;
}

export function HeroPanel({ player, isActive, compact, onClick, targetable }: HeroPanelProps) {
  const stormlightGems = Array.from({ length: player.maxStormlight }, (_, i) => i < player.stormlight);

  return (
    <button
      type="button"
      className={`hero-panel${isActive ? ' hero-panel--active' : ''}${targetable ? ' hero-panel--targetable' : ''}${
        compact ? ' hero-panel--compact' : ''
      }`}
      onClick={onClick}
      disabled={!onClick}
    >
      <div className="hero-panel__top">
        <span className="hero-panel__portrait">
          {cardArt[player.heroCard.id] ? (
            <img className="hero-panel__portrait-img" src={cardArt[player.heroCard.id]} alt="" loading="lazy" />
          ) : (
            HERO_GLYPHS[player.heroCard.id] ?? '🃏'
          )}
        </span>
        <div className="hero-panel__identity">
          <span className="hero-panel__name">{player.heroCard.name}</span>
          <span className="hero-panel__player">{player.name}</span>
        </div>
        <div className="hero-panel__orbs">
          <span className="hero-panel__health" title="Points de vie">
            ♥ {player.heroHealth}
          </span>
          {player.heroShield > 0 && (
            <span className="hero-panel__shield" title="Bouclier">
              🛡 {player.heroShield}
            </span>
          )}
        </div>
      </div>
      <div className="hero-panel__stormlight" title={`Stormlight : ${player.stormlight}/${player.maxStormlight}`}>
        {stormlightGems.map((filled, i) => (
          <span key={i} className={`hero-panel__gem${filled ? ' hero-panel__gem--filled' : ''}`} />
        ))}
        <span className="hero-panel__gem-count">
          {player.stormlight}/{player.maxStormlight}
        </span>
      </div>
      <div className="hero-panel__bottom">
        <LinkGauge level={player.linkLevel} />
        <span className="hero-panel__counts">
          Pioche {player.deck.length} · Main {player.hand.length} · 💀 {player.graveyard.length}
        </span>
      </div>
    </button>
  );
}

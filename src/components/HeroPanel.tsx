import type { PlayerState } from '../types/game';
import { LinkGauge } from './LinkGauge';
import './HeroPanel.css';

interface HeroPanelProps {
  player: PlayerState;
  isActive: boolean;
  onClick?: () => void;
  targetable?: boolean;
}

export function HeroPanel({ player, isActive, onClick, targetable }: HeroPanelProps) {
  return (
    <button
      type="button"
      className={`hero-panel${isActive ? ' hero-panel--active' : ''}${targetable ? ' hero-panel--targetable' : ''}`}
      onClick={onClick}
      disabled={!onClick}
    >
      <div className="hero-panel__identity">
        <span className="hero-panel__name">{player.heroCard.name}</span>
        <span className="hero-panel__player">{player.name}</span>
      </div>
      <div className="hero-panel__vitals">
        <span className="hero-panel__health">{player.heroHealth} PV</span>
        {player.heroShield > 0 && <span className="hero-panel__shield">+{player.heroShield} bouclier</span>}
        <span className="hero-panel__stormlight">
          {player.stormlight}/{player.maxStormlight} Stormlight
        </span>
      </div>
      <LinkGauge level={player.linkLevel} />
    </button>
  );
}

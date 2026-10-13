import { useState } from 'react';
import type { KeyboardEvent, MouseEvent } from 'react';
import type { PlayerState } from '../types/game';
import { LinkGauge } from './LinkGauge';
import { HeroSheet } from './HeroSheet';
import { LoopVideo } from './LoopVideo';
import { cardArt, cardIcons, heroLoopFor, heroStageArtFor, prefersStillMedia } from '../assets/artwork';
import { getDeckBundle } from '../data/cards/loader';
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

/**
 * Panneau du héros : portrait évolutif (stade = niveau de Lien, animé si une
 * boucle existe), vie, bouclier, Stormlight, jauge de Lien, et les cartes
 * arme / armure qui apparaissent au fil des serments. Un tap sur le portrait
 * ouvre la fiche complète du héros.
 */
export function HeroPanel({ player, isActive, compact, onClick, targetable }: HeroPanelProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const definition = getDeckBundle(player.deckId).heroDefinition;
  const heroId = player.heroCard.id;
  const portrait = heroStageArtFor(heroId, player.linkLevel);
  const loop = compact || prefersStillMedia ? undefined : heroLoopFor(heroId, player.linkLevel);
  const interactive = Boolean(onClick);
  const stormlightGems = Array.from({ length: player.maxStormlight }, (_, i) => i < player.stormlight);

  const handlePortraitClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (interactive) onClick?.();
    else setSheetOpen(true);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!interactive) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick?.();
    }
  };

  return (
    <>
      <div
        className={`hero-panel${isActive ? ' hero-panel--active' : ''}${targetable ? ' hero-panel--targetable' : ''}${
          compact ? ' hero-panel--compact' : ''
        } hero-panel--level-${player.linkLevel}`}
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        onClick={onClick}
        onKeyDown={handleKeyDown}
        data-fx={`hero:${player.id}`}
      >
        <div className="hero-panel__top">
          {/* key = niveau : le portrait se remonte et rejoue son éclat à chaque serment. */}
          <button
            key={player.linkLevel}
            type="button"
            className="hero-panel__portrait"
            onClick={handlePortraitClick}
            title="Voir la fiche du héros"
          >
            {portrait ? (
              <img className="hero-panel__portrait-img" src={portrait} alt="" loading="lazy" />
            ) : cardIcons[heroId] ? (
              <span className="hero-panel__portrait-icon" dangerouslySetInnerHTML={{ __html: cardIcons[heroId] }} />
            ) : (
              HERO_GLYPHS[heroId] ?? '🃏'
            )}
            {loop && <LoopVideo className="hero-panel__portrait-video" sources={loop} autoPlay loop />}
            {player.linkLevel > 0 && <span className="hero-panel__portrait-level">{player.linkLevel}</span>}
          </button>
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
          <div className="hero-panel__manifest">
            {definition.manifestations.map((card) => {
              const unlocked = player.linkLevel >= card.linkLevel;
              return (
                <span
                  key={card.id}
                  className={`hero-panel__chip${unlocked ? ' hero-panel__chip--on' : ''}`}
                  title={unlocked ? card.effect : `Se manifeste au niveau de Lien ${card.linkLevel}`}
                >
                  {cardArt[card.id] ? (
                    <img className="hero-panel__chip-art" src={cardArt[card.id]} alt="" loading="lazy" />
                  ) : (
                    <span className="hero-panel__chip-glyph">{card.kind === 'weapon' ? '🗡️' : '🛡️'}</span>
                  )}
                  <span className="hero-panel__chip-label">
                    {unlocked ? card.name : `${card.kind === 'weapon' ? 'Arme' : 'Armure'} · Lien ${card.linkLevel}`}
                  </span>
                </span>
              );
            })}
          </div>
        </div>

        {!compact && (
          <span className="hero-panel__counts">
            Pioche {player.deck.length} · Main {player.hand.length} · 💀 {player.graveyard.length}
          </span>
        )}
      </div>

      {sheetOpen && <HeroSheet player={player} onClose={() => setSheetOpen(false)} />}
    </>
  );
}

import { useState } from 'react';
import type { ButtonHTMLAttributes, KeyboardEvent, MouseEvent } from 'react';
import type { PlayerState } from '../types/game';
import { LinkGauge } from './LinkGauge';
import { HeroSheet } from './HeroSheet';
import { LoopVideo } from './LoopVideo';
import { cardArt, cardIcons, heroLoopFor, heroStageArtFor, prefersStillMedia } from '../assets/artwork';
import { getDeckBundle } from '../data/cards/loader';
import { getEffectiveHeroAttack } from '../store/gameStore';
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
  /** Valeur de `data-drop` : le panneau est une cible de saisie (`enemy-hero`, `ally-hero`). */
  dropId?: string;
  /** Gestionnaires de saisie du portrait (tirer le héros vers sa cible). */
  portraitHandlers?: ButtonHTMLAttributes<HTMLButtonElement>;
  /** Le héros peut frapper avec sa Lame ce tour : bouton « Attaquer ». */
  attackReady?: boolean;
  onAttack?: () => void;
}

/**
 * Panneau du héros : portrait évolutif (stade = niveau de Lien, animé si une
 * boucle existe), vie, bouclier, Stormlight, jauge de Lien, et les cartes
 * arme / armure qui apparaissent au fil des serments. Un tap sur le portrait
 * ouvre la fiche complète du héros.
 */
export function HeroPanel({
  player,
  isActive,
  compact,
  onClick,
  targetable,
  dropId,
  portraitHandlers,
  attackReady,
  onAttack,
}: HeroPanelProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const definition = getDeckBundle(player.deckId).heroDefinition;
  const heroId = player.heroCard.id;
  const portrait = heroStageArtFor(heroId, player.linkLevel);
  const loop = compact || prefersStillMedia ? undefined : heroLoopFor(heroId, player.linkLevel);
  const interactive = Boolean(onClick);

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
        data-drop={dropId}
      >
        {/* key = niveau : le portrait se remonte et rejoue son éclat à chaque serment. */}
        <button
          key={player.linkLevel}
          type="button"
          className={`hero-panel__portrait${attackReady ? ' hero-panel__portrait--armed' : ''}`}
          {...portraitHandlers}
          onClick={handlePortraitClick}
          title={attackReady ? 'Tirez le héros vers une cible, ou tapez pour la fiche' : 'Voir la fiche du héros'}
        >
          {portrait ? (
            <img className="hero-panel__portrait-img" src={portrait} alt="" loading="lazy" draggable={false} />
          ) : cardIcons[heroId] ? (
            <span className="hero-panel__portrait-icon" dangerouslySetInnerHTML={{ __html: cardIcons[heroId] }} />
          ) : (
            HERO_GLYPHS[heroId] ?? '🃏'
          )}
          {loop && <LoopVideo className="hero-panel__portrait-video" sources={loop} autoPlay loop />}
          {player.linkLevel > 0 && <span className="hero-panel__portrait-level">{player.linkLevel}</span>}
          {player.linkLevel >= 3 && (
            <span className="hero-panel__portrait-attack" title="Attaque de la Lame d'Éclat">
              ⚔{getEffectiveHeroAttack(player)}
            </span>
          )}
        </button>

        <div className="hero-panel__body">
          <div className="hero-panel__top">
            <div className="hero-panel__identity">
              <span className="hero-panel__name">{player.heroCard.name}</span>
              <span className="hero-panel__player">
                {player.name}
                {compact && <> · Main {player.hand.length} · Pioche {player.deck.length}</>}
              </span>
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

          <div className="hero-panel__bottom">
            <div className="hero-panel__stormlight" title={`Stormlight : ${player.stormlight}/${player.maxStormlight}`}>
              {!compact &&
                Array.from({ length: player.maxStormlight }, (_, i) => (
                  <span key={i} className={`hero-panel__gem${i < player.stormlight ? ' hero-panel__gem--filled' : ''}`} />
                ))}
              <span className="hero-panel__gem-count">
                {compact && '◆ '}
                {player.stormlight}/{player.maxStormlight}
              </span>
            </div>
            <LinkGauge level={player.linkLevel} />
          </div>

          <div className="hero-panel__footer">
            <div className="hero-panel__manifest">
              {definition.manifestations.map((card) => {
                const unlocked = player.linkLevel >= card.linkLevel;
                if (compact && !unlocked) return null;
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
            {!compact && (
              <span className="hero-panel__counts">
                Pioche {player.deck.length} · 💀 {player.graveyard.length}
              </span>
            )}
            {attackReady && onAttack && (
              <button
                type="button"
                className="hero-panel__attack"
                onClick={(event) => {
                  event.stopPropagation();
                  onAttack();
                }}
              >
                ⚔ Frapper
              </button>
            )}
          </div>
        </div>
      </div>

      {sheetOpen && <HeroSheet player={player} onClose={() => setSheetOpen(false)} />}
    </>
  );
}

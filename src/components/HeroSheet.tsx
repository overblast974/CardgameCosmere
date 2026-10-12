import type { PlayerState } from '../types/game';
import { LINK_LEVEL_NAMES } from '../types/card';
import { getDeckBundle } from '../data/cards/loader';
import { getEffectiveHeroAttack } from '../store/gameStore';
import { heroLoopFor, heroStageArtFor, prefersStillMedia } from '../assets/artwork';
import { CardComponent } from './CardComponent';
import { LinkGauge } from './LinkGauge';
import { LoopVideo } from './LoopVideo';
import './HeroSheet.css';

interface HeroSheetProps {
  player: PlayerState;
  onClose: () => void;
}

/**
 * Fiche plein écran du héros : portrait animé au stade actuel, serments
 * prononcés ou à venir, et cartes arme / armure (verrouillées tant que le
 * niveau de Lien n'est pas atteint).
 */
export function HeroSheet({ player, onClose }: HeroSheetProps) {
  const definition = getDeckBundle(player.deckId).heroDefinition;
  const heroId = player.heroCard.id;
  const art = heroStageArtFor(heroId, player.linkLevel);
  const loop = prefersStillMedia ? undefined : heroLoopFor(heroId, player.linkLevel);

  return (
    <div className="hero-sheet" role="dialog" aria-modal="true" aria-label={player.heroCard.name} onClick={onClose}>
      <div className="hero-sheet__panel" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="hero-sheet__close" onClick={onClose} title="Fermer">
          ✕
        </button>

        <div className={`hero-sheet__portrait hero-sheet__portrait--level-${player.linkLevel}`}>
          {art && <img className="hero-sheet__portrait-img" src={art} alt="" />}
          {loop && <LoopVideo className="hero-sheet__portrait-video" sources={loop} autoPlay loop />}
        </div>

        <h2 className="hero-sheet__name">{player.heroCard.name}</h2>
        <p className="hero-sheet__sub">
          {player.name} · {LINK_LEVEL_NAMES[player.linkLevel]}
        </p>

        <div className="hero-sheet__stats">
          <span className="hero-sheet__stat hero-sheet__stat--attack" title="Attaque effective">
            ⚔ {getEffectiveHeroAttack(player)}
          </span>
          <span className="hero-sheet__stat hero-sheet__stat--health" title="Points de vie">
            ♥ {player.heroHealth}
          </span>
          {player.heroShield > 0 && (
            <span className="hero-sheet__stat hero-sheet__stat--shield" title="Bouclier">
              🛡 {player.heroShield}
            </span>
          )}
        </div>

        <LinkGauge level={player.linkLevel} />
        <p className="hero-sheet__condition">{definition.linkCondition.description}</p>

        <ol className="hero-sheet__oaths">
          {([1, 2, 3, 4] as const).map((level) => {
            const sworn = player.linkLevel >= level;
            const ability = definition.abilities.find((a) => a.linkLevelRequired === level);
            return (
              <li key={level} className={`hero-sheet__oath${sworn ? ' hero-sheet__oath--sworn' : ''}`}>
                <span className="hero-sheet__oath-pip">{sworn ? '✦' : level}</span>
                <div className="hero-sheet__oath-body">
                  <em>« {definition.oaths[level]} »</em>
                  {ability && (
                    <span className="hero-sheet__oath-ability">
                      <strong>{ability.name}</strong> — {ability.description}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        <div className="hero-sheet__manifestations">
          {definition.manifestations.map((card) => (
            <CardComponent key={card.id} card={card} locked={player.linkLevel < card.linkLevel} disabled />
          ))}
        </div>
      </div>
    </div>
  );
}

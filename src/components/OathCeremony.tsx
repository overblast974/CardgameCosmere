import { useEffect } from 'react';
import { useFxStore } from '../store/fxStore';
import { hasVideo, heroStageArtFor, prefersStillMedia, vfxClips } from '../assets/artwork';
import { LINK_LEVEL_NAMES } from '../types/card';
import type { LinkLevel } from '../types/card';
import { CardComponent } from './CardComponent';
import { LoopVideo } from './LoopVideo';
import './OathCeremony.css';

const AUTO_DISMISS_MS = 7500;

/**
 * Cérémonie de serment : plein écran quand un héros gagne un niveau de Lien.
 * Le portrait passe de l'ancien stade au nouveau, le serment s'affiche, et aux
 * niveaux 2 et 4 la carte arme / armure se matérialise. Un tap ferme la
 * cérémonie ; sinon elle se ferme d'elle-même.
 */
export function OathCeremony() {
  const ceremony = useFxStore((state) => state.ceremony);
  const dismiss = useFxStore((state) => state.dismissCeremony);

  useEffect(() => {
    if (!ceremony) return;
    const timer = setTimeout(dismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [ceremony, dismiss]);

  if (!ceremony) return null;

  const previousLevel = Math.max(0, ceremony.level - 1) as LinkLevel;
  const before = heroStageArtFor(ceremony.heroId, previousLevel);
  const after = heroStageArtFor(ceremony.heroId, ceremony.level);
  const oathClip = !prefersStillMedia && hasVideo(vfxClips.oath) ? vfxClips.oath : undefined;
  const manifestation = ceremony.manifestation;

  return (
    <div className="oath" role="dialog" aria-modal="true" aria-label="Serment prononcé" onClick={dismiss}>
      <div className="oath__panel" key={ceremony.id}>
        {oathClip && <LoopVideo className="oath__vfx" sources={oathClip} autoPlay />}

        <div className="oath__portrait">
          {before && <img className="oath__stage oath__stage--before" src={before} alt="" />}
          {after && <img className="oath__stage oath__stage--after" src={after} alt="" />}
        </div>

        <p className="oath__kicker">
          {ceremony.playerName} · Serment {ceremony.level} · {LINK_LEVEL_NAMES[ceremony.level]}
        </p>
        <h2 className="oath__hero">{ceremony.heroName}</h2>
        <blockquote className="oath__text">« {ceremony.oath} »</blockquote>
        <p className="oath__ability">
          <strong>{ceremony.abilityName}</strong>
          {ceremony.abilityDescription && <span> — {ceremony.abilityDescription}</span>}
        </p>

        {manifestation && (
          <div className="oath__manifestation">
            <span className="oath__manifestation-label">
              {manifestation.kind === 'weapon' ? "L'arme se manifeste" : "L'armure se manifeste"}
            </span>
            <CardComponent card={manifestation} disabled />
          </div>
        )}

        <button
          type="button"
          className="oath__continue"
          onClick={(event) => {
            // Sans stopPropagation, le clic remonterait à l'overlay et fermerait
            // aussi la cérémonie suivante de la file (ex. Honneur : +2 niveaux).
            event.stopPropagation();
            dismiss();
          }}
        >
          Continuer
        </button>
      </div>
    </div>
  );
}

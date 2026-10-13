import type { CSSProperties } from 'react';
import { useFxStore } from '../store/fxStore';
import { hasVideo, vfxClips } from '../assets/artwork';
import { LoopVideo } from './LoopVideo';
import './CombatFX.css';

const PARTICLES = [0, 1, 2, 3, 4, 5, 6, 7];

/**
 * Couche d'effets de combat, superposée à tout l'écran (sans interception des
 * clics). Chaque « burst » du fxStore est rendu à la position viewport de sa
 * cible : anneau + particules + texte flottant, colorés selon son type.
 * Les « clips » sont des vidéos d'effet sur fond noir, fondues en mode
 * « screen » pour que seul le lumineux ressorte par-dessus le plateau.
 */
export function CombatFX() {
  const bursts = useFxStore((state) => state.bursts);
  const clips = useFxStore((state) => state.clips);
  const removeClip = useFxStore((state) => state.removeClip);

  return (
    <div className="combat-fx" aria-hidden="true">
      {clips.map((clip) => {
        const sources = vfxClips[clip.clip];
        if (!hasVideo(sources)) return null;
        return (
          <LoopVideo
            key={clip.id}
            className={`fx-clip fx-clip--${clip.clip}`}
            sources={sources}
            style={{ left: `${clip.x}px`, top: `${clip.y}px`, width: clip.size, height: clip.size }}
            autoPlay
            onEnded={() => removeClip(clip.id)}
            onError={(event) => {
              // React propage aussi l'erreur d'une <source> ignorée (ex. MP4
              // sur un Chromium sans H.264) : on ne retire le clip que si c'est
              // la vidéo elle-même qui échoue, sinon la source WebM prend le relais.
              if (event.target === event.currentTarget) removeClip(clip.id);
            }}
          />
        );
      })}
      {bursts.map((burst) => (
        <div
          key={burst.id}
          className={`fx-burst fx-burst--${burst.kind}`}
          style={{ left: `${burst.x}px`, top: `${burst.y}px` }}
        >
          <span className="fx-ring" />
          {PARTICLES.map((i) => {
            const angle = (i / PARTICLES.length) * Math.PI * 2;
            const style = {
              '--tx': `${Math.cos(angle) * 34}px`,
              '--ty': `${Math.sin(angle) * 34}px`,
            } as CSSProperties;
            return <span key={i} className="fx-particle" style={style} />;
          })}
          {burst.text && <span className="fx-text">{burst.text}</span>}
        </div>
      ))}
    </div>
  );
}

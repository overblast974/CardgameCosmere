import type { CSSProperties } from 'react';
import { useFxStore } from '../store/fxStore';
import './CombatFX.css';

const PARTICLES = [0, 1, 2, 3, 4, 5, 6, 7];

/**
 * Couche d'effets de combat, superposée à tout l'écran (sans interception des
 * clics). Chaque « burst » du fxStore est rendu à la position viewport de sa
 * cible : anneau + particules + texte flottant, colorés selon son type.
 */
export function CombatFX() {
  const bursts = useFxStore((state) => state.bursts);

  return (
    <div className="combat-fx" aria-hidden="true">
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

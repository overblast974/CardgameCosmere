import { mainBackground } from '../assets/artwork';
import './RosharBackground.css';

/**
 * Fond ambiance « Roshar » monté une seule fois derrière toute l'app.
 * Si l'utilisateur dépose une image dans src/assets/bg/main.webp, elle sert de
 * toile de fond ; sinon on affiche un fond de haute-tempête entièrement en CSS.
 * Une couche de particules de Stormlight anime le tout dans les deux cas.
 */
export function RosharBackground() {
  return (
    <div className="roshar-bg" aria-hidden="true">
      {mainBackground ? (
        <div className="roshar-bg__image" style={{ backgroundImage: `url(${mainBackground})` }} />
      ) : (
        <div className="roshar-bg__storm" />
      )}
      <div className="roshar-bg__particles" />
      <div className="roshar-bg__vignette" />
    </div>
  );
}

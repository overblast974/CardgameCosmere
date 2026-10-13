import { boardLoop, hasVideo, mainBackground, prefersStillMedia } from '../assets/artwork';
import { LoopVideo } from './LoopVideo';
import './RosharBackground.css';

/**
 * Fond ambiance « Roshar » monté une seule fois derrière toute l'app.
 * Si l'utilisateur dépose une image dans src/assets/bg/main.webp, elle sert de
 * toile de fond ; sinon on affiche un fond de haute-tempête entièrement en CSS.
 * Si une boucle vidéo src/assets/loops/bg-storm.mp4 existe, elle anime la
 * tempête par-dessus l'image (qui reste visible le temps du chargement et
 * sert de repli). Une couche de particules de Stormlight anime le tout.
 */
export function RosharBackground() {
  const loop = !prefersStillMedia && hasVideo(boardLoop) ? boardLoop : undefined;

  return (
    <div className="roshar-bg" aria-hidden="true">
      {mainBackground ? (
        <div className="roshar-bg__image" style={{ backgroundImage: `url(${mainBackground})` }} />
      ) : (
        <div className="roshar-bg__storm" />
      )}
      {loop && <LoopVideo className="roshar-bg__video" sources={loop} autoPlay loop />}
      <div className="roshar-bg__particles" />
      <div className="roshar-bg__vignette" />
    </div>
  );
}

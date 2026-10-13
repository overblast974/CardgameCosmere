import { hasVideo, loops, mapArt, prefersStillMedia } from '../assets/artwork';
import { LoopVideo } from './LoopVideo';
import './BattlefieldMap.css';

interface BattlefieldMapProps {
  /** Nom de la carte (fichiers `maps/<nom>-portrait.webp`, `maps/<nom>-landscape.webp`, `loops/map-<nom>`). */
  map?: string;
}

/**
 * Carte de bataille affichée sous le plateau : vue aérienne des Plaines
 * Brisées par défaut. Le format portrait sert aux téléphones (avec sa boucle
 * vidéo si elle existe), le format paysage aux tablettes et ordinateurs.
 */
export function BattlefieldMap({ map = 'gouffres' }: BattlefieldMapProps) {
  const portrait = mapArt[`${map}-portrait`];
  const landscape = mapArt[`${map}-landscape`] ?? portrait;
  const loopSources = loops[`map-${map}`];
  const loop = !prefersStillMedia && hasVideo(loopSources) ? loopSources : undefined;

  if (!portrait && !landscape) return null;

  return (
    <div className="battlefield-map" aria-hidden="true">
      {portrait && <img className="battlefield-map__img battlefield-map__img--portrait" src={portrait} alt="" />}
      {landscape && <img className="battlefield-map__img battlefield-map__img--landscape" src={landscape} alt="" />}
      {loop && <LoopVideo className="battlefield-map__video" sources={loop} autoPlay loop />}
      <div className="battlefield-map__shade" />
    </div>
  );
}

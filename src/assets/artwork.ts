// Collecte automatique des illustrations et des boucles vidéo.
//
// Comment ajouter un média : dépose un fichier dans le bon dossier, nommé
// d'après l'identifiant de la carte (ou « main » pour le fond principal).
//   - Illustrations de cartes / portraits de héros : src/assets/cards/<id>.webp
//   - Stades d'évolution d'un héros (un par niveau de Lien, 0 à 4) :
//       src/assets/heroes/<heroId>-<niveau>.webp
//     Les niveaux manquants retombent sur le stade inférieur le plus proche.
//   - Boucles vidéo (silencieuses, h264) : src/assets/loops/<nom>.mp4
//       bg-storm            fond animé du plateau
//       <heroId>-<niveau>   portrait animé du héros à ce niveau de Lien
//       vfx-lashing / vfx-division / vfx-stormlight / vfx-oath
//                           effets sur fond noir, superposés en mode « screen »
//   - Fond statique : src/assets/bg/main.webp
//
// Aucune modification de code n'est nécessaire : Vite récupère les fichiers au
// build, et si un média n'existe pas, l'app retombe sur l'image puis l'icône.

import type { LinkLevel } from '../types/card';

const cardModules = import.meta.glob('./cards/*.{webp,png,jpg,jpeg,avif}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

const heroModules = import.meta.glob('./heroes/*.{webp,png,jpg,jpeg,avif}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

const loopModules = import.meta.glob('./loops/*.{mp4,webm}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

const bgModules = import.meta.glob('./bg/*.{webp,png,jpg,jpeg,avif}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

// Cartes de bataille (fond du plateau) : <nom>-portrait et <nom>-landscape,
// plus une boucle optionnelle loops/map-<nom>.mp4 pour le format portrait.
const mapModules = import.meta.glob('./maps/*.{webp,png,jpg,jpeg,avif}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

// Icônes fantasy (game-icons.net, CC-BY 3.0) servant de repli élégant avant
// que de vraies illustrations soient déposées. Importées en texte brut pour
// pouvoir les colorier en CSS (fill: currentColor).
const iconModules = import.meta.glob('./icons/*.svg', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

function keyByFilename(modules: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [path, url] of Object.entries(modules)) {
    const filename = path.split('/').pop() ?? '';
    const id = filename.replace(/\.[^.]+$/, '');
    out[id] = url;
  }
  return out;
}

/** URL de l'illustration d'une carte, indexée par l'id de la carte. */
export const cardArt = keyByFilename(cardModules);

/** Markup SVG de l'icône fantasy d'une carte, indexé par l'id de la carte. */
export const cardIcons = keyByFilename(iconModules);

/** Stades d'évolution des héros, indexés par `<heroId>-<niveau>`. */
export const heroStageArt = keyByFilename(heroModules);

/** Variantes de format d'une même vidéo (le navigateur choisit celle qu'il lit). */
export interface VideoSources {
  mp4?: string;
  webm?: string;
}

function groupVideosByStem(modules: Record<string, string>): Record<string, VideoSources> {
  const out: Record<string, VideoSources> = {};
  for (const [path, url] of Object.entries(modules)) {
    const filename = path.split('/').pop() ?? '';
    const dot = filename.lastIndexOf('.');
    const stem = filename.slice(0, dot);
    const ext = filename.slice(dot + 1) as keyof VideoSources;
    out[stem] = { ...out[stem], [ext]: url };
  }
  return out;
}

/** Boucles vidéo, indexées par nom de fichier (sans extension). */
export const loops = groupVideosByStem(loopModules);

export function hasVideo(sources: VideoSources | undefined): sources is VideoSources {
  return Boolean(sources?.mp4 || sources?.webm);
}

/** URL des fonds déposés, indexés par nom de fichier (« main » recommandé). */
export const backgroundArt = keyByFilename(bgModules);

/** Cartes de bataille, indexées par nom de fichier (`gouffres-portrait`, `gouffres-landscape`…). */
export const mapArt = keyByFilename(mapModules);

/** Fond principal si l'utilisateur en a déposé un, sinon undefined (fond CSS animé). */
export const mainBackground: string | undefined =
  backgroundArt.main ?? Object.values(backgroundArt)[0];

/** Boucle vidéo du plateau (par-dessus le fond statique), si déposée. */
export const boardLoop: VideoSources | undefined = loops['bg-storm'];

export type VfxClip = 'lashing' | 'division' | 'stormlight' | 'oath';

/** Clips d'effets sur fond noir (undefined si non déposés : repli sur les particules CSS). */
export const vfxClips: Record<VfxClip, VideoSources | undefined> = {
  lashing: loops['vfx-lashing'],
  division: loops['vfx-division'],
  stormlight: loops['vfx-stormlight'],
  oath: loops['vfx-oath'],
};

function pickStage(table: Record<string, string>, heroId: string, level: LinkLevel): string | undefined {
  for (let stage = level; stage >= 0; stage -= 1) {
    const url = table[`${heroId}-${stage}`];
    if (url) return url;
  }
  return undefined;
}

/** Portrait du héros au niveau de Lien donné (stade inférieur le plus proche, sinon illustration de carte). */
export function heroStageArtFor(heroId: string, level: LinkLevel): string | undefined {
  return pickStage(heroStageArt, heroId, level) ?? cardArt[heroId];
}

/**
 * Boucle vidéo du héros au niveau donné. Seuls certains niveaux sont animés
 * (ex. 0, 2 et 4) : on prend le stade animé inférieur le plus proche, mais
 * uniquement si son image correspond au même stade, pour ne jamais montrer une
 * vidéo d'un niveau inférieur par-dessus l'image d'un niveau supérieur.
 */
export function heroLoopFor(heroId: string, level: LinkLevel): VideoSources | undefined {
  for (let stage = level; stage >= 0; stage -= 1) {
    const art = heroStageArt[`${heroId}-${stage}`];
    const loop = loops[`${heroId}-${stage}`];
    if (art) return loop;
  }
  return loops[`${heroId}-0`];
}

/** Préférence système : l'utilisateur veut moins d'animations, ou économise ses données. */
export const prefersStillMedia: boolean =
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ||
    Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData));

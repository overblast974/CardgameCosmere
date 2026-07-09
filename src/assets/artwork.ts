// Collecte automatique des illustrations déposées par l'utilisateur.
//
// Comment ajouter une image : dépose un fichier dans le bon dossier, nommé
// d'après l'identifiant de la carte (ou « main » pour le fond principal).
//   - Illustrations de cartes / portraits de héros : src/assets/cards/<id>.webp
//     ex. src/assets/cards/kaladin-stormblessed.webp, src/assets/cards/szeth-vallano.webp
//   - Fond du jeu : src/assets/bg/main.webp
//
// Formats acceptés : webp (recommandé), png, jpg, jpeg, avif.
// Aucune modification de code n'est nécessaire : Vite récupère les fichiers au
// build, et si l'image n'existe pas encore, l'app retombe sur le glyphe emoji.

const cardModules = import.meta.glob('./cards/*.{webp,png,jpg,jpeg,avif}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

const bgModules = import.meta.glob('./bg/*.{webp,png,jpg,jpeg,avif}', {
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

/** URL des fonds déposés, indexés par nom de fichier (« main » recommandé). */
export const backgroundArt = keyByFilename(bgModules);

/** Fond principal si l'utilisateur en a déposé un, sinon undefined (fond CSS animé). */
export const mainBackground: string | undefined =
  backgroundArt.main ?? Object.values(backgroundArt)[0];

# Illustrations des cartes

Dépose ici une image par carte, **nommée exactement d'après l'id de la carte**,
au format `.webp` de préférence (ou `.png` / `.jpg`).

L'app la récupère automatiquement au prochain build — aucune modification de code.
Si l'image n'existe pas, la carte affiche son glyphe emoji par défaut.

## Format conseillé

- **Format** : WebP, ~40–100 Ko par image (garde le PWA léger).
- **Ratio** : carré ou légèrement vertical (ex. 512×512 ou 512×640).
- **Style cohérent** : ajoute toujours le même suffixe de style à tes prompts
  (voir `docs/illustrations.md` à la racine du dépôt pour la liste complète).

## Noms de fichiers attendus

### Coureurs du Vent (Kaladin)
- `kaladin-stormblessed.webp` (héros)
- `sylphrena.webp`
- `bridge-four-soldier.webp`
- `lopen.webp`
- `drehy-skar.webp`
- `lashing-basique.webp`
- `lashing-complet.webp`
- `contre-gravite.webp`
- `sphere-infusion.webp`
- `jezrien.webp`
- `honor.webp`

### Chasseurs du Ciel (Szeth)
- `szeth-vallano.webp` (héros)
- `hautjuge.webp`
- `acolyte-chasse-ciel.webp`
- `garde-shin.webp`
- `executeur-skybreaker.webp`
- `division.webp`
- `gravitation.webp`
- `loi-du-ciel.webp`
- `sphere-de-jugement.webp`
- `nale.webp`
- `nightblood.webp`

Pour le fond du jeu : dépose `main.webp` dans `../bg/`.

## Manifestations (arme / armure du Spren)

Ces cartes ne sont pas dans le deck : elles apparaissent à côté du héros
quand il prononce le serment correspondant (voir `manifestations` dans le
JSON du deck).

- `sylphrena-lance.webp` (Lien 3) · `kaladin-plaque.webp` (Lien 4)
- `hautjuge-lame.webp` (Lien 3) · `szeth-plaque.webp` (Lien 4)

## Stades d'évolution et boucles vidéo

- `../heroes/<heroId>-<niveau>.webp` : portrait du héros à chaque niveau de
  Lien (0 à 4). Un niveau manquant retombe sur le stade inférieur.
- `../loops/<nom>.mp4` + `.webm` : boucles silencieuses (fond `bg-storm`,
  portraits `<heroId>-<niveau>`, effets `vfx-lashing`, `vfx-division`,
  `vfx-stormlight`, `vfx-oath` sur fond noir). Le MP4 (H.264) couvre Safari,
  Chrome et Firefox ; le WebM (VP9) sert de secours aux Chromium sans codecs.

Toutes les images et boucles actuelles ont été générées avec Higgsfield
(GPT Image 2.5 pour les images, Kling 3.0 pour les vidéos), voir
`docs/illustrations.md`.

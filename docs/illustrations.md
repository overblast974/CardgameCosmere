# Générer les illustrations des cartes

Ce jeu affiche automatiquement une illustration dès qu'un fichier image portant
l'id de la carte est déposé dans `src/assets/cards/` (et `src/assets/bg/main.webp`
pour le fond). Ce document te donne un prompt prêt à copier pour chaque carte.

## Mode d'emploi

1. Choisis un outil de génération : **Leonardo.ai** (gratuit, orienté jeu),
   **Midjourney** (meilleure qualité, payant) ou **Stable Diffusion / SDXL**.
2. Copie le prompt de la carte ci-dessous. Le **suffixe de style commun** garantit
   que toutes les cartes se ressemblent — ne le change pas d'une carte à l'autre.
3. Exporte en **WebP** (~40–100 Ko), ratio carré ou légèrement vertical.
4. Renomme le fichier avec l'id exact (ex. `kaladin-stormblessed.webp`) et dépose-le
   dans `src/assets/cards/`.
5. Reconstruis (`npm run build`) ou pousse : l'image apparaît sur la carte.

## Suffixe de style commun (à coller à la fin de chaque prompt)

```
digital painting, epic high fantasy, dramatic cinematic lighting, painterly,
cohesive trading card game illustration, muted stormy palette with teal and
amber accents, vertical composition, no text, no border
```

## Fond du jeu — `src/assets/bg/main.webp`

```
The vast stormlands of Roshar under an approaching highstorm, jagged rock
formations, glowing spheres of stormlight floating in the wind, dark teal and
amber sky, wide epic landscape, atmospheric — <suffixe de style commun>
```

## Coureurs du Vent (Kaladin)

- **kaladin-stormblessed** — `A dark-haired young man with a slave brand on his forehead, wearing glowing blue Shardplate, holding a silver spear, wind swirling around him, heroic — <style>`
- **sylphrena** — `A small luminous wind spren shaped like a ribbon of light and a young woman made of mist, ethereal blue glow — <style>`
- **bridge-four-soldier** — `A rugged bridgeman soldier in leather and a tattered uniform carrying a large wooden bridge, determined face — <style>`
- **lopen** — `A cheerful one-armed Herdazian man grinning, casual pose, warm-hearted — <style>`
- **drehy-skar** — `Two bonded warrior comrades standing back to back, one tall and one stocky, ready for battle — <style>`
- **lashing-basique** — `A gust of magical wind lifting a warrior slightly off the ground, streaks of light, motion — <style>`
- **lashing-complet** — `A powerful vortex of gravity magic pinning an enemy against the sky, dramatic — <style>`
- **contre-gravite** — `A figure floating upward as gravity reverses, debris rising, surreal — <style>`
- **sphere-infusion** — `A glowing glass sphere full of captured stormlight radiating soft blue light — <style>`
- **jezrien** — `A regal ancient king herald with a crown and a glowing scepter, divine aura, golden light — <style>`
- **honor** — `An abstract shattered shard of a divine golden spirit, radiant fragments, sacred — <style>`

## Chasseurs du Ciel (Szeth)

- **szeth-vallano** — `A pale bald man with white clothing and haunted eyes, holding a glowing Shardblade, floating with gravity magic, ominous — <style>`
- **hautjuge** — `A stern high-spren shaped like a crack of white light in the sky, judgmental presence — <style>`
- **acolyte-chasse-ciel** — `A young skybreaker acolyte in dark robes diving through the air, zealous, wind-swept — <style>`
- **garde-shin** — `A stoic Shin guard in white lacquered armor holding a tall shield, calm and immovable — <style>`
- **executeur-skybreaker** — `An armored skybreaker executioner with a glowing blade descending from the sky to deliver justice — <style>`
- **division** — `A blast of destructive orange energy disintegrating stone, surge of Division magic — <style>`
- **gravitation** — `A soldier slammed to the ground by crushing gravity, dust and cracks, heavy — <style>`
- **loi-du-ciel** — `An ancient glowing scroll of law hovering in the air, radiant script, solemn — <style>`
- **sphere-de-jugement** — `A glowing sphere of stormlight with a faint scales-of-justice glyph inside — <style>`
- **nale** — `A tall stern herald of justice in white and silver with a cold expression and glowing blade — <style>`
- **nightblood** — `An ominous black sword leaking dark smoke, whispering evil, wrapped in shadow, the word DESTROY — <style>`

> Rappel : ces personnages appartiennent à Brandon Sanderson. Réserve ces
> illustrations à un usage personnel/privé et ne les monétise pas.

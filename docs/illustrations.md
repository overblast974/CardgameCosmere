# Illustrations des cartes — guide + prompts prêts à l'emploi

Ce document contient **tout le nécessaire** pour générer les 22 illustrations de
cartes (via Canva, Leonardo, Midjourney…) et les intégrer au jeu.

Le pipeline est déjà en place : dès qu'une image portant le **nom de fichier
exact** est déposée dans `src/assets/cards/`, elle s'affiche automatiquement
dans la fenêtre d'illustration de la carte (sinon, l'icône fantasy reste
affichée par défaut). **Aucune modification de code n'est nécessaire.**

---

## 1. Spécifications techniques

- **Format** : carré (1:1) ou paysage léger (4:3) — l'image est recadrée pour
  remplir la fenêtre d'illustration, sujet centré.
- **Fichier** : JPG (ou WebP/PNG), idéalement < 150 Ko.
- **Nom** : exactement l'`id` de la carte + extension, ex. `kaladin-stormblessed.jpg`.
- **Destination** : `src/assets/cards/` (à la racine du dépôt).

Une fois les images déposées, préviens-moi : je reconstruis et je déploie.

---

## 2. Suffixe de style commun

**À ajouter à la fin de CHAQUE prompt** pour que toutes les cartes soient
visuellement cohérentes (ne le change pas d'une carte à l'autre) :

```
— epic high fantasy digital painting, dramatic cinematic lighting, painterly,
teal and amber storm palette, centered subject, highly detailed, no text,
no words, no border, no frame
```

---

## 3. Prompt maître à coller dans une NOUVELLE conversation (avec Canva activé)

> Copie-colle le bloc ci-dessous dans une nouvelle conversation Claude où le
> connecteur **Canva est activé**. Récupère ensuite les JPG et dépose-les dans
> `src/assets/cards/`.

```
Tu as accès au connecteur Canva. Génère 22 illustrations pour un jeu de cartes
de fantasy épique (ambiance tempête, palette sarcelle et ambre). Pour CHAQUE
entrée ci-dessous : crée un design carré via Canva à partir du prompt, exporte-le
en JPG qualité 90, et donne-moi le lien de téléchargement nommé EXACTEMENT par le
nom de fichier indiqué. Ajoute ce suffixe de style à la fin de chaque prompt pour
garder un rendu cohérent :
« — epic high fantasy digital painting, dramatic cinematic lighting, painterly,
teal and amber storm palette, centered subject, highly detailed, no text, no
words, no border, no frame ».
Commence par les 2 héros (kaladin-stormblessed, szeth-vallano) et montre-les-moi
avant de continuer.

CARTES :
1. kaladin-stormblessed.jpg — Un jeune guerrier aux cheveux noirs en armure
   rayonnante bleu lumineux, tenant une lance de lumière, le vent tourbillonnant
   autour de lui, héroïque.
2. sylphrena.jpg — Un petit esprit du vent fait de lumière bleue, mi-ruban
   éthéré mi-jeune femme de brume, lueur douce.
3. bridge-four-soldier.jpg — Un soldat porteur de pont robuste en cuir et
   uniforme en lambeaux, portant un grand pont de bois, visage déterminé.
4. lopen.jpg — Un soldat manchot souriant et jovial, pose décontractée, chaleureux.
5. drehy-skar.jpg — Deux compagnons d'armes dos à dos, l'un grand l'autre
   trapu, prêts au combat.
6. lashing-basique.jpg — Une bourrasque de vent magique soulevant un guerrier
   du sol, traînées de lumière, mouvement.
7. lashing-complet.jpg — Un puissant vortex de magie gravitationnelle plaquant
   un ennemi contre le ciel, dramatique.
8. contre-gravite.jpg — Une silhouette flottant vers le haut tandis que la
   gravité s'inverse, débris qui s'élèvent, surréaliste.
9. sphere-infusion.jpg — Une sphère de verre remplie de lumière de tempête
   captive rayonnant d'une lueur bleue.
10. jezrien.jpg — Un ancien roi héraut majestueux avec une couronne et un
    sceptre lumineux, aura divine, lumière dorée.
11. honor.jpg — Un éclat brisé d'esprit divin doré, fragments rayonnants, sacré.
12. szeth-vallano.jpg — Un homme pâle au crâne rasé, vêtu de blanc, les yeux
    hantés, tenant une lame-éclat lumineuse, flottant grâce à la magie
    gravitationnelle, inquiétant.
13. hautjuge.jpg — Un haut-esprit en forme de fissure de lumière blanche dans
    le ciel, présence de juge implacable.
14. acolyte-chasse-ciel.jpg — Un jeune acolyte chasseur du ciel en robe sombre
    plongeant dans les airs, zélé, cheveux au vent.
15. garde-shin.jpg — Un garde Shin stoïque en armure laquée blanche tenant un
    grand bouclier, calme et inébranlable.
16. executeur-skybreaker.jpg — Un exécuteur chasseur du ciel en armure, lame
    lumineuse, descendant du ciel pour rendre la justice.
17. division.jpg — Une déflagration d'énergie orange destructrice désintégrant
    la pierre, éclat de magie de Division.
18. gravitation.jpg — Un soldat plaqué au sol par une gravité écrasante,
    poussière et fissures, pesant.
19. loi-du-ciel.jpg — Un ancien parchemin de loi lumineux flottant dans les
    airs, écriture rayonnante, solennel.
20. sphere-de-jugement.jpg — Une sphère de lumière de tempête avec un faible
    glyphe de balance de la justice à l'intérieur.
21. nale.jpg — Un grand héraut de la justice sévère en blanc et argent, au
    regard froid, lame lumineuse.
22. nightblood.jpg — Une épée noire menaçante exhalant une fumée sombre,
    murmurant le mal, enveloppée d'ombre.
```

---

## 4. Prompt unique réutilisable (pour Canva Magic Media directement)

Pour générer **une** carte à la fois directement dans Canva (Éléments → IA /
Magic Media), colle ceci et remplace la partie en MAJUSCULES :

```
DESCRIPTION DU SUJET DE LA CARTE — epic high fantasy digital painting, dramatic
cinematic lighting, painterly, teal and amber storm palette, centered subject,
highly detailed, no text, no words, no border, no frame
```

Exemple pour Kaladin :

```
A young dark-haired warrior in glowing radiant blue armor holding a spear of
light, wind swirling around him, heroic — epic high fantasy digital painting,
dramatic cinematic lighting, painterly, teal and amber storm palette, centered
subject, highly detailed, no text, no words, no border, no frame
```

---

## 5. Note importante (droits)

Les personnages et l'univers (Roshar, Kaladin, Szeth, les Chevaliers Radieux…)
appartiennent à **Brandon Sanderson**. Les prompts ci-dessus décrivent des
**archétypes génériques** (un porteur de pont, un assassin en blanc…) et non des
portraits officiels. Réserve ces illustrations à un usage **personnel et non
commercial** (projet de fan).

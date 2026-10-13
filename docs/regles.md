# Règles du jeu — Archives de Roshar

Version du 13 octobre 2026. Ce document décrit ce que le moteur fait aujourd'hui
(`src/store/gameStore.ts`, vérifié par `src/store/gameStore.test.ts`), sauf
dans les sections « Pistes » et « Points à trancher ». Toute règle changée ici
doit changer dans le code **et** dans ses tests.

La version annotable de ce document (commentaires, cases à cocher) est le
Claude Doc « Règles du jeu — Archives de Roshar » ; ce fichier en est le miroir
dans le dépôt.

## 1. Principe et victoire

Deux Chevaliers Radieux s'affrontent ; le premier qui amène les points de vie
du héros adverse à 0 gagne. Chaque joueur incarne un **héros** (Kaladin ou
Szeth) qui ne se trouve pas sur le plateau : il a des points de vie, un
bouclier, de la Stormlight pour payer les cartes, et un **Lien** avec son
Spren qui monte de 0 à 4 au fil des serments.

| Terme | Sens dans le jeu |
| --- | --- |
| Héros | Le joueur lui-même : 30 PV, pas sur le plateau, peut frapper avec sa Lame à partir du Lien 3 |
| Unité | Carte Radiant ou Héraut posée sur le plateau (ATK / PV), 5 emplacements par camp |
| Stormlight | Ressource du tour pour jouer les cartes (1 au tour 1, +1 par tour, maximum 10) |
| Lien | Niveau 0 à 4 du lien héros–Spren ; chaque niveau est un serment prononcé |
| Serment | Passage à un niveau de Lien : déclenche une cérémonie et des récompenses |
| Manifestation | Carte arme (Lien 3) ou armure (Lien 4) qui apparaît à côté du héros, jamais dans le deck |
| Couverture | Mot-clé : l'unité peut s'interposer devant un allié ou le héros |
| Lashé | Unité entravée : ne peut pas attaquer à son prochain tour |
| Cimetière | Cartes jouées (sorts) ou unités détruites |

## 2. Mise en place

Chaque joueur prend un deck de **20 cartes** lié à un héros, le mélange et
pioche **4 cartes**. Le joueur 1 commence.

- Deck Coureurs du Vent = Kaladin Béni-des-Tempêtes (30 PV, 3 ATK de base).
- Deck Chasseurs du Ciel = Szeth, l'Assassin en Blanc (30 PV, 4 ATK de base).
- Doublons : jusqu'à 3 exemplaires d'une carte, 1 seul Éclat par deck.
- Le héros démarre avec 0 bouclier, Lien 0, 1 Stormlight, et 5 emplacements vides.
- Pas de mulligan, pas de limite de taille de main, pas de dégâts de fatigue
  quand la pioche est vide (on ne pioche plus, c'est tout).
- Le joueur 2 pioche sa 5e carte à son premier tour : c'est sa seule
  compensation pour jouer second.

## 3. Tour de jeu et Stormlight

Un tour se joue dans l'ordre libre : on peut poser, lancer, attaquer et
frapper dans n'importe quel ordre, puis on passe.

1. **Début du tour** : le joueur pioche 1 carte, sa Stormlight maximale monte
   de 1 (plafond 10) et se recharge entièrement, ses unités se réveillent, son
   pouvoir et sa frappe de Lame redeviennent disponibles. Une unité lashée
   perd son entrave mais reste au repos ce tour-là.
2. **Actions** : poser des unités (5 emplacements maximum), lancer des Surges
   et Fabrials, placer des Couvertures, attaquer avec ses unités, utiliser le
   pouvoir du héros (Lien 3, une fois par tour), frapper avec la Lame (Lien 3,
   une fois par tour).
3. **Fin du tour** : rien ne se passe, la main est au joueur suivant.

**Stormlight** : seule ressource. Tour 1 = 1, tour 2 = 2, et ainsi de suite
jusqu'à 10. Les Sphères (Infusion, Jugement) ajoutent 2 Stormlight pour le
tour en cours, dans la limite de 10. La Stormlight non dépensée est perdue.

**Repos** : une unité posée ce tour ne peut pas attaquer (sauf Zèle). Une
unité qui a attaqué ne peut plus attaquer ce tour.

## 4. Types de cartes et mots-clés

| Type | Dans le deck | Ce que c'est | Règle |
| --- | --- | --- | --- |
| Radiant | Oui | Unité (ATK / PV) d'un Ordre | Posée sur un emplacement libre, attaque à partir du tour suivant |
| Héraut | Oui | Unité légendaire neutre (coût 8) | Comme un Radiant, avec un **Cri d'arrivée** |
| Surge | Oui | Sort à effet immédiat | Va au cimetière après usage ; un sort ciblé sans cible valide est injouable |
| Fabrial | Oui | Objet à effet immédiat (Sphères, Loi du Ciel) | Comme une Surge |
| Éclat | Oui, 1 par deck | Carte ultime (coût 10) | Honneur, Nightblood |
| Spren | Non | Le Spren lié au héros | Pour l'instant purement descriptif (ses stats par niveau ne servent pas) |
| Manifestation | Non | Lame d'Éclat (Lien 3), Plaque d'Éclat (Lien 4) | Apparaît à côté du héros au serment correspondant |

**Mots-clés d'unité**

| Mot-clé | Effet |
| --- | --- |
| Couverture | Peut se placer devant un allié ou le héros ; encaisse les attaques qui leur étaient destinées. Une fois placée, l'unité reste en Couverture jusqu'à sa mort |
| Obstination | La première fois qu'elle devrait mourir, l'unité reste à 1 PV |
| Zèle | Peut attaquer dès le tour où elle est posée |
| Tandem | Drehy & Skar : +1 ATK si un autre Drehy & Skar est en jeu |

**Effets de sorts**

| Effet | Cible | Exemple |
| --- | --- | --- |
| Dégâts | Une unité ennemie | Division (3) |
| Lash | Une unité ennemie : dégâts, puis entrave si elle survit | Lashing Complet (2) |
| Entrave | Une unité ennemie ne peut pas attaquer à son prochain tour | Gravitation |
| Renvoi | Une unité ennemie retourne dans la main de son propriétaire | Contre-Gravité |
| Buff | Une unité alliée gagne +X/+X | Lashing Basique (+1/+1) |
| Pioche | Pioche X cartes | Loi du Ciel, Cri du Pont Quatre (2) |
| Stormlight | +X Stormlight ce tour | Sphères (2) |
| Dégâts de zone | X dégâts à toutes les unités ennemies | Cri d'arrivée de Nale (2) |

## 5. Combat

Une attaque est toujours un échange : l'attaquant et le défenseur se blessent
mutuellement de leur ATK, en même temps.

1. **Déclarer** : une unité réveillée (ni au repos, ni lashée) attaque une
   unité ennemie ou le héros ennemi.
2. **Couverture** : si une unité ennemie en Couverture protège la cible (ou le
   héros), c'est elle qui encaisse et qui riposte.
3. **Résoudre** : chaque unité subit l'ATK de l'autre. Une unité à 0 PV est
   détruite (Obstination : reste à 1 PV une fois). Le héros ne riposte pas
   quand il est attaqué.
4. **Bouclier** : les dégâts sur le héros sont d'abord absorbés par son
   bouclier, puis par ses PV.
5. **Lien** : un Coureur du Vent dont la Couverture a encaissé gagne 1 Lien ;
   un Chasseur du Ciel dont l'attaque a détruit une unité gagne 1 Lien.

**Frappe de la Lame (Lien 3)** : le héros attaque une fois par tour avec son
ATK (3 + 2 pour Kaladin = 5, 4 + 2 pour Szeth = 6). Sur une unité, il encaisse
sa riposte (bouclier d'abord). Sur le héros ennemi, pas de riposte. Les
Couvertures s'appliquent comme pour une unité.

**Pouvoir du héros (Lien 3, une fois par tour)** : Kaladin lance un Lashing
(entrave une unité ennemie), Szeth un Jugement Céleste (3 dégâts à une unité
ennemie, et 1 Lien si elle meurt).

**Lashé** : l'unité ne peut pas attaquer à son prochain tour. L'entrave se
lève au début du tour suivant de son propriétaire, mais l'unité reste au repos
ce tour-là.

## 6. Héros, Lien et serments

| Ordre | Déclencheur (+1 Lien) | Autres sources |
| --- | --- | --- |
| Coureurs du Vent (Kaladin) | Une unité alliée se place en Couverture ; une unité alliée en Couverture encaisse une attaque | Jezrien (+1), Honneur (+2) |
| Chasseurs du Ciel (Szeth) | Une unité ennemie est détruite par une attaque, un sort ou le pouvoir de Szeth | Nale ne donne pas de Lien ; Nightblood non plus |

| Lien | Nom | Récompense | Serment (Coureurs du Vent) | Serment (Chasseurs du Ciel) |
| --- | --- | --- | --- | --- |
| 1 | Esquisse | Le Spren se manifeste (aucun effet de jeu) | Vie avant mort. Force avant faiblesse. Voyage avant destination. | Idem |
| 2 | Souffle de Stormlight | +5 PV immédiats, et +1 ATK permanent à toutes les unités alliées | Je protégerai ceux qui ne peuvent se protéger eux-mêmes. | Je placerai la loi au-dessus de tout. |
| 3 | Jureur | La Lame d'Éclat se manifeste : +2 ATK au héros, frappe une fois par tour, pouvoir du héros débloqué | Je protégerai même ceux que je hais, tant que c'est juste. | Je jure de rechercher la justice et de la laisser me guider, jusqu'à trouver un idéal plus parfait. |
| 4 | Armure Radiante | La Plaque d'Éclat se manifeste : +15 bouclier | J'accepte qu'il y ait ceux que je ne peux pas protéger. | Je deviendrai moi-même la loi que je sers. |

Les récompenses ne se cumulent pas : passer directement de 0 à 2 (Honneur)
donne une fois +5 PV. Le Lien ne redescend jamais. Les serments 3 et 4 de
Szeth sont des paraphrases, pas des citations.

## 7. Manifestations : Lame et Plaque d'Éclat

| Manifestation | Lien | Coureurs du Vent | Chasseurs du Ciel | Effet de jeu |
| --- | --- | --- | --- | --- |
| Arme | 3 | Sylphrena, Lance d'Éclat | Lame du Hautjuge | +2 ATK au héros ; le héros frappe une fois par tour ; débloque le pouvoir du héros |
| Armure | 4 | Plaque d'Éclat | Plaque d'Éclat | +15 bouclier, une fois |

Ce sont des cartes à part entière visuellement (type « Manifestation », cadre
argenté), mais elles n'ont ni coût ni emplacement : impossible de les perdre,
de les voler ou de les détruire.

## 8. Decks actuels

**Coureurs du Vent (Kaladin)**

| Carte | Type | Coût | ATK/PV | Effet | Ex. |
| --- | --- | --- | --- | --- | --- |
| Frère du Pont Quatre | Radiant | 2 | 2/3 | Couverture | 3 |
| Lopen | Radiant | 3 | 2/4 | Obstination | 2 |
| Drehy & Skar | Radiant | 4 | 3/3 | Tandem | 2 |
| Lashing Basique | Surge | 1 | — | Une unité alliée gagne +1/+1 | 2 |
| Lashing Complet | Surge | 3 | — | 2 dégâts à une unité ennemie, entravée si elle survit | 3 |
| Contre-Gravité | Surge | 3 | — | Renvoie une unité ennemie en main | 2 |
| Cri du Pont Quatre | Surge | 2 | — | Pioche 2 cartes | 2 |
| Sphère d'Infusion | Fabrial | 1 | — | +2 Stormlight ce tour | 2 |
| Jezrien, Roi des Hérauts | Héraut | 8 | 5/5 | Cri d'arrivée : +1 Lien | 1 |
| Honneur | Éclat | 10 | — | +2 Lien et +10 bouclier | 1 |

**Chasseurs du Ciel (Szeth)**

| Carte | Type | Coût | ATK/PV | Effet | Ex. |
| --- | --- | --- | --- | --- | --- |
| Acolyte Chasse-Ciel | Radiant | 2 | 3/1 | Zèle | 3 |
| Garde Shin | Radiant | 2 | 1/4 | Couverture | 3 |
| Exécuteur Chasse-Ciel | Radiant | 4 | 4/3 | — | 2 |
| Division | Surge | 3 | — | 3 dégâts à une unité ennemie | 3 |
| Gravitation | Surge | 3 | — | Entrave une unité ennemie | 2 |
| Loi du Ciel | Fabrial | 2 | — | Pioche 2 cartes | 3 |
| Sphère de Jugement | Fabrial | 1 | — | +2 Stormlight ce tour | 2 |
| Nale, Héraut de la Justice | Héraut | 8 | 5/5 | Cri d'arrivée : 2 dégâts à toutes les unités ennemies | 1 |
| Nightblood | Éclat | 10 | — | Détruit toutes les unités ennemies ; 5 dégâts à son porteur | 1 |

## 9. Pistes : deck de 30, carte évolutive, Avatar du héros

Recommandation : passer à 30 cartes, rendre le **Spren** jouable comme carte
évolutive (les données `levels` existent déjà dans les JSON), et garder le
héros hors du plateau. L'Avatar du héros est une bonne idée de niveau 4, pas
une base.

**Deck de 30** : avec 4 cartes de départ et 1 pioche par tour, une partie de
12 tours montre 16 cartes, soit la moitié du deck. Il faut 4 à 6 cartes
nouvelles par deck, surtout aux coûts 5 et 6. Courbe cible : 1 × 3, 2 × 8,
3 × 7, 4 × 5, 5–6 × 4, 8 × 2, 10 × 1.

**Pouvoirs et lore** : chaque Ordre maîtrise deux Surges et la montée des
Idéaux débloque la Lame (3e) puis la Plaque (4e). Le jeu suit déjà cette
échelle. Ce qui manque : un vrai effet au Lien 1 et une signature par Ordre
aux Liens 1 et 2 (Coureurs du Vent = Adhésion et Gravitation ; Chasseurs du
Ciel = Gravitation et Division).

| Option | Ce qui entre sur le plateau | Différence avec le héros | Pour | Contre |
| --- | --- | --- | --- | --- |
| A. Spren évolutif (recommandé) | Sylphrena / Hautjuge au Lien 1 en unité 1/1 ; stats selon le Lien ; au Lien 3 il devient la Lame ; au Lien 4 il revient en 3/3 indestructible tant que le héros vit | Le héros reste la vie du joueur et le commandant ; le Spren est son partenaire visible | Fidèle au lore, données existantes, donne un effet au Lien 1 | Occupe-t-il un des 5 emplacements ? |
| B. Avatar du héros | Carte « Kaladin, Jureur » en main au Lien 3 : unité coût 5, Zèle, 5/6 au Lien 3, 7/8 au Lien 4 | Le héros = le joueur ; l'Avatar = le héros qui descend au combat. Détruit : 5 dégâts au héros, revient en main au tour suivant | Moment fort, très lisible | Doublon avec la frappe de la Lame ; boule de neige au Lien 4 |
| C. Héros sur le plateau dès le tour 1 | Le héros est une unité 30 PV attaquable | Plus de distinction | Simple | Change tout le ciblage et la Couverture |

Si A et B : A dès maintenant, B comme récompense du Lien 4 à la place du
simple +15 bouclier.

## 10. Points à trancher

- [ ] Deck de 30 cartes et courbe cible
- [ ] Spren comme unité évolutive (option A) ; occupe-t-il un emplacement ?
- [ ] Avatar du héros (option B) : oui / non / seulement au Lien 4
- [ ] Le héros riposte-t-il quand une unité l'attaque ? (aujourd'hui non)
- [ ] Lien 1 : lui donner un effet de jeu
- [ ] Couverture permanente ou à redéclarer chaque tour
- [ ] Limite de main, défaussage, fatigue
- [ ] Mulligan
- [ ] Compensation du joueur 2 : carte ou Stormlight
- [ ] Honneur et Nightblood : trop forts ?
- [ ] Nale et Nightblood sans Lien pour Szeth : voulu ?
- [ ] Jezrien et Honneur donnent du Lien gratuit à Kaladin : voulu ?
- [ ] Frappe de la Lame : garder, ou remplacer par l'Avatar
- [ ] Durée cible d'une partie (aujourd'hui 10 à 14 tours contre l'IA)
- [ ] Nouvelles cartes à coût 5 et 6 par Ordre
- [ ] Serments 3 et 4 de Szeth : garder ou réécrire

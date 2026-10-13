# Règles du jeu — Archives de Roshar

Version du 13 octobre 2026, révision 2 (décisions cochées intégrées). Ce
document décrit ce que le moteur fait aujourd'hui (`src/store/gameStore.ts`,
vérifié par `src/store/gameStore.test.ts`). Toute règle changée ici doit
changer dans le code **et** dans ses tests. La section 10 liste ce qui reste
ouvert.

La version annotable de ce document (commentaires, cases à cocher) est le
Claude Doc « Règles du jeu — Archives de Roshar » ; ce fichier en est le miroir
dans le dépôt.

## 1. Principe et victoire

Deux Chevaliers Radieux s'affrontent ; le premier qui amène les points de vie
du héros adverse à 0 gagne. Chaque joueur incarne un **héros** (Kaladin ou
Szeth) qui ne se trouve pas sur le plateau : il a des points de vie, un
bouclier, de la Stormlight pour payer les cartes, et un **Lien** avec son
Spren qui monte de 0 à 4 au fil des serments. Le Spren, lui, descend sur le
plateau dès le premier serment et évolue avec le Lien.

| Terme | Sens dans le jeu |
| --- | --- |
| Héros | Le joueur lui-même : 30 PV, pas sur le plateau, frappe et riposte avec sa Lame à partir du Lien 3 |
| Unité | Carte Radiant, Héraut, Spren ou Avatar posée sur le plateau (ATK / PV), 5 emplacements par camp |
| Spren | Partenaire du héros : entre en jeu au Lien 1, évolue, ne meurt jamais vraiment |
| Avatar | Le héros qui descend au combat : carte reçue en main au Lien 4 |
| Stormlight | Ressource du tour pour jouer les cartes (1 au tour 1, +1 par tour, maximum 10) |
| Lien | Niveau 0 à 4 du lien héros–Spren ; chaque niveau est un serment prononcé |
| Serment | Passage à un niveau de Lien : déclenche une cérémonie et des récompenses |
| Manifestation | Carte arme (Lien 3) ou armure (Lien 4) qui apparaît à côté du héros, jamais dans le deck |
| Couverture | Mot-clé : l'unité s'interpose devant un allié ou le héros ; la cible protégée peut changer |
| Vol | Mot-clé : l'unité ignore les Couvertures quand elle attaque |
| Lashé | Unité entravée : ne peut pas attaquer à son prochain tour |
| Cimetière | Cartes jouées (sorts), unités détruites, cartes brûlées (main pleine) |

## 2. Mise en place

Chaque joueur prend un deck de **30 cartes** lié à un héros, le mélange et
pioche **4 cartes** (le joueur 2 en pioche **5**). Le joueur 1 commence.

- Deck Coureurs du Vent = Kaladin Béni-des-Tempêtes (30 PV, 3 ATK de base).
- Deck Chasseurs du Ciel = Szeth, l'Assassin en Blanc (30 PV, 4 ATK de base).
- **Construction** : 30 cartes exactement, tirées du pool de l'Ordre et des
  cartes neutres (Hérauts, Lame et Plaque prêtées), jusqu'à 3 exemplaires
  d'une carte, 1 seul Éclat. Le constructeur de deck du salon enregistre la
  liste dans le navigateur ; sans liste enregistrée, le deck de départ sert.
- **Mulligan** : avant son premier tour, chaque joueur renvoie dans la pioche
  les cartes de son choix et en repioche autant. Une seule fois. L'IA renvoie
  ses cartes à 5 de coût et plus.
- Le héros démarre avec 0 bouclier, Lien 0, 1 Stormlight, et 5 emplacements vides.
- **Main** : 10 cartes maximum. Une carte piochée main pleine est brûlée
  (cimetière). L'Avatar du Lien 4 s'ajoute même à une main pleine.
- Pas de dégâts de fatigue quand la pioche est vide (on ne pioche plus, c'est tout).

## 3. Tour de jeu et Stormlight

Un tour se joue dans l'ordre libre : on peut poser, lancer, attaquer et
frapper dans n'importe quel ordre, puis on passe.

1. **Début du tour** : le joueur pioche 1 carte, sa Stormlight maximale monte
   de 1 (plafond 10) et se recharge entièrement, ses unités se réveillent, son
   pouvoir et sa frappe de Lame redeviennent disponibles. Une unité lashée
   perd son entrave mais reste au repos ce tour-là. Au Lien 1 et plus, le
   héros regagne 1 PV s'il est sous ses 30 PV de base (« la flamme guérit »).
   Le Spren dissipé revient si une case est libre ; l'Avatar détruit au tour
   précédent revient en main.
2. **Actions** : poser des unités (5 emplacements maximum), lancer des Surges
   et Fabrials, placer ou déplacer des Couvertures, attaquer avec ses unités,
   utiliser le pouvoir du héros (Lien 3, une fois par tour), frapper avec la
   Lame (Lien 3, une fois par tour).
3. **Fin du tour** : rien ne se passe, la main est au joueur suivant.

**Stormlight** : seule ressource. Tour 1 = 1, tour 2 = 2, et ainsi de suite
jusqu'à 10. Les Sphères (Infusion, Jugement) ajoutent 2 Stormlight pour le
tour en cours, dans la limite de 10. La Stormlight non dépensée est perdue.

**Repos** : une unité posée ce tour ne peut pas attaquer (sauf Zèle). Une
unité qui a attaqué ne peut plus attaquer ce tour. Le Spren qui entre ou
évolue en cours de tour est au repos lui aussi.

## 4. Types de cartes et mots-clés

| Type | Dans le deck | Ce que c'est | Règle |
| --- | --- | --- | --- |
| Radiant | Oui | Unité (ATK / PV) d'un Ordre | Posée sur un emplacement libre, attaque à partir du tour suivant ; certaines ont un **Cri d'arrivée** |
| Héraut | Oui | Unité légendaire neutre (coût 8) | Comme un Radiant, avec un Cri d'arrivée |
| Surge | Oui | Sort à effet immédiat | Va au cimetière après usage ; un sort ciblé sans cible valide est injouable |
| Fabrial | Oui | Objet à effet immédiat (Sphères, Loi du Ciel, équipements) | Comme une Surge |
| Éclat | Oui, 1 par deck | Carte ultime (coût 10) | Honneur, Nightblood |
| Spren | Non | Le Spren lié au héros | Entre en jeu au Lien 1 et évolue (section 6) |
| Avatar | Non | Le héros en unité | Reçu en main au Lien 4 (section 6) |
| Manifestation | Non | Lame d'Éclat (Lien 3), Plaque d'Éclat (Lien 4) | Apparaît à côté du héros au serment correspondant |

**Mots-clés d'unité**

| Mot-clé | Effet |
| --- | --- |
| Couverture | Se place devant un allié ou le héros et encaisse les attaques qui leur étaient destinées. Permanente, mais le joueur peut changer la cible protégée à tout moment de son tour. Les Coureurs du Vent gagnent 1 Lien la première fois qu'une unité se place en Couverture (pas en la déplaçant) |
| Obstination | La première fois qu'elle devrait mourir, l'unité reste à 1 PV |
| Zèle | Peut attaquer dès le tour où elle est posée |
| Vol | Ignore les Couvertures quand elle attaque (Spren, Avatars) |
| Tandem | Drehy & Skar : +1 ATK si un autre Drehy & Skar est en jeu |
| Cri d'arrivée | Effet résolu quand l'unité entre en jeu (pioche, dégâts de zone, Lien) |

**Effets de sorts**

| Effet | Cible | Exemple |
| --- | --- | --- |
| Dégâts | Une unité ennemie | Division (3), Sentence (4) |
| Lash | Une unité ennemie : dégâts, puis entrave si elle survit | Lashing Complet (2) |
| Entrave | Une unité ennemie ne peut pas attaquer à son prochain tour | Gravitation |
| Renvoi | Une unité ennemie retourne dans la main de son propriétaire (le Spren se dissipe) | Contre-Gravité |
| Buff | Une unité alliée gagne +X/+X | Lashing Basique (+1/+1) |
| Équipement | Une unité alliée gagne +ATK ou +PV | Lame prêtée (+3 ATK), Plaque prêtée (+4 PV) |
| Buff de zone | Toutes les unités alliées gagnent +X/+X | Vol au-dessus des Gouffres (+1/+1) |
| Pioche | Pioche X cartes | Loi du Ciel, Cri du Pont Quatre (2) |
| Stormlight | +X Stormlight ce tour | Sphères (2) |
| Dégâts de zone | X dégâts à toutes les unités ennemies | Cri d'arrivée de Nale (2), de la Haute Juge (1) |

## 5. Combat

Une attaque est toujours un échange : l'attaquant et le défenseur se blessent
mutuellement de leur ATK, en même temps.

1. **Déclarer** : une unité réveillée (ni au repos, ni lashée) attaque une
   unité ennemie ou le héros ennemi.
2. **Couverture** : si une unité ennemie en Couverture protège la cible (ou le
   héros), c'est elle qui encaisse et qui riposte. Une unité qui **Vole**
   passe au-dessus.
3. **Résoudre** : chaque unité subit l'ATK de l'autre. Une unité à 0 PV est
   détruite (Obstination : reste à 1 PV une fois ; Spren indestructible :
   reste à 1 PV toujours).
4. **Riposte du héros** : à partir du Lien 3, le héros riposte à l'unité qui
   l'attaque avec son ATK de Lame (5 pour Kaladin, 6 pour Szeth). Avant le
   Lien 3, il ne riposte pas. Risque d'équilibrage assumé : attaquer un héros
   armé avec de petites unités les condamne.
5. **Bouclier** : les dégâts sur le héros sont d'abord absorbés par son
   bouclier, puis par ses PV.
6. **Lien** : un Coureur du Vent dont la Couverture a encaissé gagne 1 Lien ;
   un Chasseur du Ciel dont l'attaque, le sort, le pouvoir ou la riposte a
   détruit une unité gagne 1 Lien.

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

**Destruction** (Nightblood) : ce ne sont pas des dégâts. L'Obstination ne
protège pas, l'Avatar coûte ses 5 PV, le Spren se dissipe ; seul un Spren
indestructible (Lien 4) reste.

## 6. Héros, Lien, Spren et Avatar

| Ordre | Déclencheur (+1 Lien) | Autres sources |
| --- | --- | --- |
| Coureurs du Vent (Kaladin) | Une unité alliée se place en Couverture (première fois par unité) ; une unité alliée en Couverture encaisse une attaque | Jezrien (+1), Honneur (+2) |
| Chasseurs du Ciel (Szeth) | Une unité ennemie est détruite par une attaque, un sort, le pouvoir ou la riposte de Szeth | Nale ne donne pas de Lien ; Nightblood non plus |

| Lien | Nom | Récompense | Spren sur le plateau | Serment (Coureurs du Vent) | Serment (Chasseurs du Ciel) |
| --- | --- | --- | --- | --- | --- |
| 1 | Esquisse | Le héros regagne 1 PV au début de chacun de ses tours (jusqu'à 30) | Entre en jeu : 1/1, Vol | Vie avant mort. Force avant faiblesse. Voyage avant destination. | Idem |
| 2 | Souffle de Stormlight | +5 PV immédiats, et +1 ATK permanent à toutes les unités alliées | 1/2, Vol | Je protégerai ceux qui ne peuvent se protéger eux-mêmes. | Je placerai la loi au-dessus de tout. |
| 3 | Jureur | La Lame d'Éclat se manifeste : +2 ATK au héros, frappe et riposte, pouvoir du héros débloqué | Quitte le plateau : il **est** la Lame | Je protégerai même ceux que je hais, tant que c'est juste. | Je jure de rechercher la justice et de la laisser me guider, jusqu'à trouver un idéal plus parfait. |
| 4 | Armure Radiante | La Plaque d'Éclat se manifeste : +15 bouclier ; l'**Avatar** du héros rejoint la main | Revient : 3/3, Vol, indestructible tant que le héros vit | J'accepte qu'il y ait ceux que je ne peux pas protéger. | Je deviendrai moi-même la loi que je sers. |

Les récompenses ne se cumulent pas : passer directement de 0 à 2 (Honneur)
donne une fois +5 PV. Le Lien ne redescend jamais. Les serments 3 et 4 de
Szeth sont des paraphrases, pas des citations.

**Le Spren (Sylphrena, Hautjuge)**

- Occupe un des 5 emplacements. Si le plateau est plein quand il devrait
  entrer, il attend une case libre et arrive au début d'un tour du joueur.
- Ne va jamais au cimetière : détruit ou renvoyé, il se dissipe et revient au
  début du prochain tour de son propriétaire (avec les stats de son niveau).
- Au Lien 3 il quitte le plateau (c'est la Lame) ; au Lien 4 il revient en 3/3
  et ne peut pas descendre sous 1 PV.
- Vol : il ignore les Couvertures. Il profite de l'aura +1 ATK du Lien 2.

**L'Avatar (Kaladin, Chevalier Radiant 6/8 ; Szeth, Lame de la Loi 7/7)**

- Carte Radiant à coût 5, Zèle, Vol, ajoutée à la main au Lien 4 (même si la
  main est pleine).
- S'il est détruit, le héros subit 5 dégâts (bouclier d'abord) et la carte
  revient en main au début du prochain tour du joueur. Il ne va jamais au
  cimetière.
- Il n'est pas le héros : le détruire ne gagne pas la partie.

## 7. Manifestations : Lame et Plaque d'Éclat

| Manifestation | Lien | Coureurs du Vent | Chasseurs du Ciel | Effet de jeu |
| --- | --- | --- | --- | --- |
| Arme | 3 | Sylphrena, Lance d'Éclat | Lame du Hautjuge | +2 ATK au héros ; frappe une fois par tour ; riposte aux unités ; débloque le pouvoir du héros |
| Armure | 4 | Plaque d'Éclat | Plaque d'Éclat | +15 bouclier, une fois ; l'Avatar rejoint la main |

Ce sont des cartes à part entière visuellement (type « Manifestation », cadre
argenté), mais elles n'ont ni coût ni emplacement : impossible de les perdre,
de les voler ou de les détruire. À ne pas confondre avec la **Lame d'Éclat
prêtée** et la **Plaque d'Éclat prêtée** (Fabrials neutres à coût 4) qui
équipent une unité.

## 8. Decks de départ (30 cartes)

Courbe cible : 1 × 3, 2 × 8, 3 × 7, 4 × 5, 5–6 × 4, 8 × 2, 10 × 1. Les decks
ci-dessous sont les listes de départ ; le constructeur de deck permet de les
modifier dans les limites de la section 2.

**Coureurs du Vent (Kaladin)**

| Carte | Type | Coût | ATK/PV | Effet | Ex. |
| --- | --- | --- | --- | --- | --- |
| Frère du Pont Quatre | Radiant | 2 | 2/3 | Couverture | 3 |
| Lopen | Radiant | 3 | 2/4 | Obstination | 3 |
| Drehy & Skar | Radiant | 4 | 3/3 | Tandem | 2 |
| Teft | Radiant | 5 | 4/5 | Couverture | 2 |
| Rock | Radiant | 5 | 1/8 | Couverture, Obstination | 2 |
| Sigzil | Radiant | 6 | 4/4 | Cri d'arrivée : pioche 2 | 1 |
| Lashing Basique | Surge | 1 | — | Une unité alliée gagne +1/+1 | 2 |
| Lashing Complet | Surge | 3 | — | 2 dégâts à une unité ennemie, entravée si elle survit | 3 |
| Contre-Gravité | Surge | 3 | — | Renvoie une unité ennemie en main | 2 |
| Cri du Pont Quatre | Surge | 2 | — | Pioche 2 cartes | 2 |
| Vol au-dessus des Gouffres | Surge | 5 | — | Toutes tes unités gagnent +1/+1 | 2 |
| Sphère d'Infusion | Fabrial | 1 | — | +2 Stormlight ce tour | 2 |
| Lame d'Éclat prêtée | Fabrial | 4 | — | Une unité alliée gagne +3 ATK | 1 |
| Plaque d'Éclat prêtée | Fabrial | 4 | — | Une unité alliée gagne +4 PV | 1 |
| Jezrien, Roi des Hérauts | Héraut | 8 | 5/5 | Cri d'arrivée : +1 Lien | 1 |
| Honneur | Éclat | 10 | — | +2 Lien et +10 bouclier | 1 |

**Chasseurs du Ciel (Szeth)**

| Carte | Type | Coût | ATK/PV | Effet | Ex. |
| --- | --- | --- | --- | --- | --- |
| Acolyte Chasse-Ciel | Radiant | 2 | 3/1 | Zèle | 3 |
| Garde Shin | Radiant | 2 | 1/4 | Couverture | 3 |
| Exécuteur Chasse-Ciel | Radiant | 4 | 4/3 | — | 2 |
| Maîtresse Ki | Radiant | 5 | 4/5 | Couverture | 2 |
| Juge Shin | Radiant | 5 | 3/4 | Cri d'arrivée : pioche 1 | 3 |
| Haute Juge | Radiant | 6 | 5/5 | Cri d'arrivée : 1 dégât à toutes les unités ennemies | 1 |
| Division | Surge | 3 | — | 3 dégâts à une unité ennemie | 3 |
| Gravitation | Surge | 3 | — | Entrave une unité ennemie | 2 |
| Sentence | Surge | 5 | — | 4 dégâts à une unité ennemie | 2 |
| Loi du Ciel | Fabrial | 2 | — | Pioche 2 cartes | 3 |
| Sphère de Jugement | Fabrial | 1 | — | +2 Stormlight ce tour | 2 |
| Lame d'Éclat prêtée | Fabrial | 4 | — | Une unité alliée gagne +3 ATK | 1 |
| Plaque d'Éclat prêtée | Fabrial | 4 | — | Une unité alliée gagne +4 PV | 1 |
| Nale, Héraut de la Justice | Héraut | 8 | 5/5 | Cri d'arrivée : 2 dégâts à toutes les unités ennemies | 1 |
| Nightblood | Éclat | 10 | — | Détruit toutes les unités ennemies ; 5 dégâts à son porteur | 1 |

## 9. Décisions prises (13 octobre 2026)

- [x] Deck de 30 cartes et courbe cible ; nouvelles cartes à coût 5 et 6 par Ordre ; constructeur de deck (3 copies max, 1 Éclat, enregistré dans le navigateur)
- [x] Lame d'Éclat prêtée et Plaque d'Éclat prêtée : équipements neutres
- [x] Spren comme unité évolutive (option A), il occupe un emplacement
- [x] Avatar du héros (option B) seulement au Lien 4
- [x] Le héros riposte aux unités à partir du Lien 3 (risque d'équilibrage à surveiller)
- [x] Lien 1 : régénération passive, +1 PV par tour (« la flamme guérit »)
- [x] Couverture permanente, cible déplaçable ; Lien uniquement à la première déclaration
- [x] Main limitée à 10, cartes en trop brûlées ; pas de fatigue
- [x] Mulligan unique avant le premier tour
- [x] Compensation du joueur 2 : une carte de plus en main
- [x] Honneur et Nightblood gardés tels quels
- [x] Nale et Nightblood sans Lien pour Szeth ; Jezrien et Honneur donnent du Lien à Kaladin
- [x] Frappe de la Lame gardée en plus de l'Avatar
- [x] Serments 3 et 4 de Szeth : paraphrases gardées
- [x] Cris d'arrivée en données (Jezrien, Nale, Sigzil, Juge Shin, Haute Juge)

## 10. Points encore ouverts

- [ ] Équilibrage de la riposte du héros : si les petites unités deviennent injouables contre un héros au Lien 3, limiter la riposte à la moitié de l'ATK ou la réserver aux unités de coût 3 et plus
- [ ] Le Spren qui occupe un emplacement : s'il gêne trop les decks à beaucoup d'unités, le mettre hors emplacements
- [ ] Avatar : Kaladin 6/8 et Szeth 7/7 sont des premières valeurs, à tester en partie
- [ ] Durée cible d'une partie (aujourd'hui 10 à 14 tours contre l'IA avec 20 cartes ; à remesurer avec 30)
- [ ] Un effet de signature par Ordre aux Liens 1 et 2 (Adhésion pour les Coureurs du Vent, Division pour les Chasseurs du Ciel) au-delà de la régénération commune
- [ ] Partager les decks personnalisés en ligne (aujourd'hui, seul le créateur du salon impose ses listes)

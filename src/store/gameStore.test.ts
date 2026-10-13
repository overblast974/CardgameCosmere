import { beforeEach, describe, expect, it } from 'vitest';
import { HAND_LIMIT, MAX_BOARD_UNITS, canHeroAttack, getEffectiveAttack, getEffectiveHeroAttack, useGameStore } from './gameStore';
import { getCardById, validateDeckList } from '../data/cards/loader';
import type { GameState, PlayerState, UnitInPlay } from '../types/game';
import type { Card, LinkLevel } from '../types/card';

const WINDRUNNERS = 'windrunners-starter';
const SKYBREAKERS = 'skybreakers-starter';

function card(id: string): Card {
  const found = getCardById(id);
  if (!found) throw new Error(`Carte inconnue : ${id}`);
  return found;
}

function unit(cardId: string, instanceId: string, overrides: Partial<UnitInPlay> = {}): UnitInPlay {
  const c = card(cardId) as Card & { attack: number; health: number };
  return {
    instanceId,
    card: c,
    currentHealth: c.health,
    currentAttack: c.attack,
    canAttack: true,
    isLashed: false,
    hasSurvivedLethal: false,
    ...overrides,
  };
}

const store = () => useGameStore.getState();
const game = () => store().game;
const p1 = () => game().players.player1;
const p2 = () => game().players.player2;

/** Partie fraîche (Kaladin contre Szeth), puis ajustements déterministes de l'état. */
function setup(mutate: (g: GameState) => void = () => {}): void {
  store().startGame(WINDRUNNERS, SKYBREAKERS);
  const g: GameState = structuredClone(game());
  mutate(g);
  store().loadGame(g);
}

function patchPlayer(g: GameState, id: 'player1' | 'player2', patch: Partial<PlayerState>): void {
  g.players[id] = { ...g.players[id], ...patch };
}

/** Modifie l'état courant sans repartir d'une partie neuve. */
function patchStore(mutate: (g: GameState) => void): void {
  const g: GameState = structuredClone(game());
  mutate(g);
  store().loadGame(g);
}

beforeEach(() => setup());

describe('mise en place', () => {
  it('distribue 4 cartes, laisse 26 cartes en pioche (deck de 30) et 1 Stormlight au tour 1', () => {
    expect(p1().hand).toHaveLength(4);
    expect(p1().deck).toHaveLength(26);
    expect(p2().hand).toHaveLength(5); // le second joueur compense l'initiative
    expect(p2().deck).toHaveLength(25);
    expect(p1().stormlight).toBe(1);
    expect(p1().maxStormlight).toBe(1);
    expect(p1().heroHealth).toBe(30);
    expect(p1().linkLevel).toBe(0);
    expect(game().activePlayerId).toBe('player1');
    expect(game().turn).toBe(1);
  });
});

describe('poser des unités', () => {
  it('déduit la Stormlight et pose la carte, qui ne peut pas attaquer le tour même', () => {
    setup((g) => patchPlayer(g, 'player1', { hand: [card('bridge-four-soldier')], stormlight: 5, maxStormlight: 5 }));
    store().playCard('player1', 0);
    expect(p1().board).toHaveLength(1);
    expect(p1().hand).toHaveLength(0);
    expect(p1().stormlight).toBe(3);
    expect(p1().board[0].canAttack).toBe(false);
  });

  it("une unité avec Zèle peut attaquer dès son arrivée", () => {
    setup((g) => patchPlayer(g, 'player2', { hand: [card('acolyte-chasse-ciel')], stormlight: 5 }));
    store().playCard('player2', 0);
    expect(p2().board[0].canAttack).toBe(true);
  });

  it('refuse une carte trop chère', () => {
    setup((g) => patchPlayer(g, 'player1', { hand: [card('jezrien')], stormlight: 3 }));
    const before = game();
    store().playCard('player1', 0);
    expect(game()).toBe(before);
  });

  it(`refuse une ${MAX_BOARD_UNITS + 1}e unité quand le plateau est plein`, () => {
    setup((g) =>
      patchPlayer(g, 'player1', {
        hand: [card('lopen')],
        stormlight: 10,
        board: Array.from({ length: MAX_BOARD_UNITS }, (_, i) => unit('bridge-four-soldier', `u${i}`)),
      }),
    );
    const before = game();
    store().playCard('player1', 0);
    expect(game()).toBe(before);
    expect(p1().hand).toHaveLength(1);
  });
});

describe('tour de jeu', () => {
  it("passe la main, pioche 1 carte et monte la Stormlight max (plafond 10)", () => {
    store().endTurn();
    expect(game().activePlayerId).toBe('player2');
    expect(game().turn).toBe(2);
    expect(p2().hand).toHaveLength(6); // 5 de départ + 1 piochée
    expect(p2().maxStormlight).toBe(2);
    expect(p2().stormlight).toBe(2);
  });

  it('plafonne la Stormlight max à 10', () => {
    setup((g) => patchPlayer(g, 'player2', { maxStormlight: 10, stormlight: 0 }));
    store().endTurn();
    expect(p2().maxStormlight).toBe(10);
    expect(p2().stormlight).toBe(10);
  });

  it('réveille les unités et lève les entraves (une unité lashée reste au repos un tour)', () => {
    setup((g) =>
      patchPlayer(g, 'player2', {
        board: [unit('garde-shin', 'g', { canAttack: false }), unit('acolyte-chasse-ciel', 'a', { isLashed: true })],
        heroAbilityUsedThisTurn: true,
      }),
    );
    store().endTurn();
    const [guard, acolyte] = p2().board;
    expect(guard.canAttack).toBe(true);
    expect(acolyte.isLashed).toBe(false);
    expect(acolyte.canAttack).toBe(false);
    expect(p2().heroAbilityUsedThisTurn).toBe(false);
  });

  it("n'autorise la frappe du héros au début du tour qu'à partir du Lien 3", () => {
    setup((g) => patchPlayer(g, 'player2', { linkLevel: 3 }));
    store().endTurn();
    expect(canHeroAttack(p2())).toBe(true);
    setup((g) => patchPlayer(g, 'player2', { linkLevel: 2 }));
    store().endTurn();
    expect(canHeroAttack(p2())).toBe(false);
  });
});

describe('combat entre unités', () => {
  it('les deux unités se blessent ; une unité détruite part au cimetière', () => {
    setup((g) => {
      patchPlayer(g, 'player1', { board: [unit('drehy-skar', 'd')] }); // 3/3
      patchPlayer(g, 'player2', { board: [unit('acolyte-chasse-ciel', 'a')] }); // 3/1
    });
    store().attackUnit('player1', 'd', 'a');
    expect(p2().board).toHaveLength(0);
    expect(p2().graveyard.map((c) => c.id)).toEqual(['acolyte-chasse-ciel']);
    expect(p1().board).toHaveLength(0); // 3 dégâts reçus sur 3 PV : Drehy & Skar tombe aussi
    expect(p1().board.find((u) => u.instanceId === 'd')).toBeUndefined();
  });

  it("une unité qui a attaqué ne peut plus attaquer ce tour", () => {
    setup((g) => {
      patchPlayer(g, 'player1', { board: [unit('lopen', 'l')] }); // 2/4
      patchPlayer(g, 'player2', { board: [unit('garde-shin', 'g')] }); // 1/4
    });
    store().attackUnit('player1', 'l', 'g');
    expect(p1().board[0].canAttack).toBe(false);
    expect(p2().board[0].currentHealth).toBe(2);
  });

  it("Obstination : Lopen survit une fois à un coup fatal en restant à 1 PV", () => {
    setup((g) => {
      patchPlayer(g, 'player1', { board: [unit('lopen', 'l', { currentHealth: 2 })] });
      patchPlayer(g, 'player2', { board: [unit('executeur-skybreaker', 'e')] }); // 4/3
    });
    store().attackUnit('player1', 'l', 'e');
    const lopen = p1().board.find((u) => u.instanceId === 'l');
    expect(lopen?.currentHealth).toBe(1);
    expect(lopen?.hasSurvivedLethal).toBe(true);
  });

  it('une unité lashée ou au repos ne peut pas attaquer', () => {
    setup((g) => {
      patchPlayer(g, 'player1', { board: [unit('lopen', 'l', { isLashed: true })] });
      patchPlayer(g, 'player2', { board: [unit('garde-shin', 'g')] });
    });
    const before = game();
    store().attackUnit('player1', 'l', 'g');
    expect(game()).toBe(before);
  });

  it("Tandem : deux Drehy & Skar en jeu gagnent +1 ATK", () => {
    setup((g) => patchPlayer(g, 'player1', { board: [unit('drehy-skar', 'd1'), unit('drehy-skar', 'd2')] }));
    expect(getEffectiveAttack(p1(), p1().board[0])).toBe(4);
  });
});

describe('Couverture', () => {
  it('seule une unité avec Couverture peut protéger', () => {
    setup((g) => patchPlayer(g, 'player1', { board: [unit('lopen', 'l'), unit('drehy-skar', 'd')] }));
    const before = game();
    store().declareGuard('player1', 'l', 'd');
    expect(game()).toBe(before);
  });

  it("le protecteur encaisse l'attaque destinée à l'allié, et Kaladin gagne 1 Lien", () => {
    setup((g) => {
      patchPlayer(g, 'player1', {
        board: [unit('bridge-four-soldier', 'b', { guarding: 'd' }), unit('drehy-skar', 'd')],
      });
      patchPlayer(g, 'player2', { board: [unit('acolyte-chasse-ciel', 'a')] });
    });
    store().attackUnit('player2', 'a', 'd');
    expect(p1().board.find((u) => u.instanceId === 'd')?.currentHealth).toBe(3);
    expect(p1().board.find((u) => u.instanceId === 'b')).toBeUndefined(); // 3 dégâts sur 3 PV
    expect(p1().linkLevel).toBe(1);
  });

  it("une Couverture sur le héros intercepte l'attaque sur le héros", () => {
    setup((g) => {
      patchPlayer(g, 'player1', { board: [unit('bridge-four-soldier', 'b', { guarding: 'hero' })] });
      patchPlayer(g, 'player2', { board: [unit('garde-shin', 'g')] });
    });
    store().attackHero('player2', 'g');
    expect(p1().heroHealth).toBe(30);
    expect(p1().board[0].currentHealth).toBe(2);
  });

  it('se placer en Couverture donne 1 Lien à Kaladin, une seule fois par unité', () => {
    setup((g) => patchPlayer(g, 'player1', { board: [unit('bridge-four-soldier', 'b')] }));
    store().declareGuard('player1', 'b', 'hero');
    expect(p1().linkLevel).toBe(1);
    store().declareGuard('player1', 'b', 'hero');
    expect(p1().linkLevel).toBe(1);
  });

  it('ne donne pas de Lien à Szeth (déclencheur différent)', () => {
    setup((g) => patchPlayer(g, 'player2', { board: [unit('garde-shin', 'g')] }));
    store().declareGuard('player2', 'g', 'hero');
    expect(p2().linkLevel).toBe(0);
  });
});

describe('attaque du héros adverse', () => {
  it('le bouclier absorbe avant les points de vie', () => {
    setup((g) => {
      patchPlayer(g, 'player1', { board: [unit('drehy-skar', 'd')] });
      patchPlayer(g, 'player2', { heroShield: 2 });
    });
    store().attackUnit('player1', 'd', 'nope'); // cible inexistante : rien
    store().attackHero('player1', 'd');
    expect(p2().heroShield).toBe(0);
    expect(p2().heroHealth).toBe(29);
  });

  it('un héros à 0 PV perd la partie', () => {
    setup((g) => {
      patchPlayer(g, 'player1', { board: [unit('jezrien', 'j')] }); // 5 ATK
      patchPlayer(g, 'player2', { heroHealth: 5 });
    });
    store().attackHero('player1', 'j');
    expect(p2().heroHealth).toBe(0);
    expect(game().winnerId).toBe('player1');
  });
});

describe('Lien de Szeth : destruction', () => {
  it("gagne 1 Lien quand une attaque détruit une unité ennemie", () => {
    setup((g) => {
      patchPlayer(g, 'player2', { board: [unit('executeur-skybreaker', 'e')] });
      patchPlayer(g, 'player1', { board: [unit('bridge-four-soldier', 'b')] });
    });
    store().attackUnit('player2', 'e', 'b');
    expect(p2().linkLevel).toBe(1);
  });

  it('gagne 1 Lien quand Division détruit une unité', () => {
    setup((g) => {
      patchPlayer(g, 'player2', { hand: [card('division')], stormlight: 5 });
      patchPlayer(g, 'player1', { board: [unit('bridge-four-soldier', 'b')] });
    });
    store().playTargetedCard('player2', 0, 'b');
    expect(p1().board).toHaveLength(0);
    expect(p2().linkLevel).toBe(1);
  });
});

describe('sorts', () => {
  it('Lashing Complet : 2 dégâts et entrave si la cible survit', () => {
    setup((g) => {
      patchPlayer(g, 'player1', { hand: [card('lashing-complet')], stormlight: 5 });
      patchPlayer(g, 'player2', { board: [unit('garde-shin', 'g')] });
    });
    store().playTargetedCard('player1', 0, 'g');
    expect(p2().board[0].currentHealth).toBe(2);
    expect(p2().board[0].isLashed).toBe(true);
    expect(p1().graveyard.map((c) => c.id)).toEqual(['lashing-complet']);
  });

  it('Lashing Basique : +1/+1 sur une unité alliée', () => {
    setup((g) => patchPlayer(g, 'player1', { hand: [card('lashing-basique')], stormlight: 5, board: [unit('lopen', 'l')] }));
    store().playTargetedCard('player1', 0, 'l');
    expect(p1().board[0].currentAttack).toBe(3);
    expect(p1().board[0].currentHealth).toBe(5);
  });

  it("Contre-Gravité renvoie l'unité ennemie dans la main de son propriétaire", () => {
    setup((g) => {
      patchPlayer(g, 'player1', { hand: [card('contre-gravite')], stormlight: 5 });
      patchPlayer(g, 'player2', { board: [unit('nale', 'n')], hand: [] });
    });
    store().playTargetedCard('player1', 0, 'n');
    expect(p2().board).toHaveLength(0);
    expect(p2().hand.map((c) => c.id)).toEqual(['nale']);
  });

  it('Gravitation entrave sans blesser', () => {
    setup((g) => {
      patchPlayer(g, 'player2', { hand: [card('gravitation')], stormlight: 5 });
      patchPlayer(g, 'player1', { board: [unit('lopen', 'l')] });
    });
    store().playTargetedCard('player2', 0, 'l');
    expect(p1().board[0].isLashed).toBe(true);
    expect(p1().board[0].currentHealth).toBe(4);
  });

  it('Loi du Ciel pioche 2 ; Sphère de Jugement donne 2 Stormlight (plafond 10)', () => {
    setup((g) => patchPlayer(g, 'player2', { hand: [card('loi-du-ciel'), card('sphere-de-jugement')], stormlight: 9 }));
    store().playCard('player2', 0);
    expect(p2().hand).toHaveLength(3); // 2 piochées, 1 restante
    store().playCard('player2', 0);
    expect(p2().stormlight).toBe(Math.min(10, 9 - 2 - 1 + 2));
  });

  it('un sort ciblé joué sans cible ne fait rien', () => {
    setup((g) => patchPlayer(g, 'player2', { hand: [card('division')], stormlight: 5 }));
    const before = game();
    store().playCard('player2', 0);
    expect(game()).toBe(before);
  });
});

describe('Hérauts et Éclats', () => {
  it("Nale inflige 2 dégâts à toutes les unités ennemies à son arrivée", () => {
    setup((g) => {
      patchPlayer(g, 'player2', { hand: [card('nale')], stormlight: 10 });
      patchPlayer(g, 'player1', { board: [unit('bridge-four-soldier', 'b'), unit('lopen', 'l')] });
    });
    store().playCard('player2', 0);
    expect(p1().board.map((u) => u.currentHealth)).toEqual([1, 2]);
  });

  it('Jezrien donne 1 niveau de Lien à son arrivée', () => {
    setup((g) => patchPlayer(g, 'player1', { hand: [card('jezrien')], stormlight: 10 }));
    store().playCard('player1', 0);
    expect(p1().linkLevel).toBe(1);
  });

  it('Honneur : +2 niveaux de Lien et +10 bouclier', () => {
    setup((g) => patchPlayer(g, 'player1', { hand: [card('honor')], stormlight: 10 }));
    store().playCard('player1', 0);
    expect(p1().linkLevel).toBe(2);
    expect(p1().heroShield).toBe(10);
    expect(p1().heroHealth).toBe(35); // Souffle de Stormlight (niveau 2) : +5 PV
  });

  it('Nightblood balaie le plateau adverse et coûte 5 PV à son porteur', () => {
    setup((g) => {
      patchPlayer(g, 'player2', { hand: [card('nightblood')], stormlight: 10 });
      patchPlayer(g, 'player1', { board: [unit('lopen', 'l'), unit('jezrien', 'j')] });
    });
    store().playCard('player2', 0);
    expect(p1().board).toHaveLength(0);
    expect(p1().graveyard).toHaveLength(2);
    expect(p2().heroHealth).toBe(25);
  });
});

describe('serments et récompenses de Lien', () => {
  it('niveau 2 : +5 PV et +1 ATK permanent aux unités alliées', () => {
    setup((g) => patchPlayer(g, 'player1', { board: [unit('lopen', 'l')] }));
    store().setLinkLevel('player1', 2);
    expect(p1().heroHealth).toBe(35);
    expect(getEffectiveAttack(p1(), p1().board[0])).toBe(3);
  });

  it("niveau 3 : la Lame se manifeste, +2 ATK au héros et frappe disponible aussitôt", () => {
    store().setLinkLevel('player1', 3);
    expect(getEffectiveHeroAttack(p1())).toBe(5);
    expect(canHeroAttack(p1())).toBe(true);
  });

  it('niveau 4 : +15 bouclier', () => {
    store().setLinkLevel('player1', 4);
    expect(p1().heroShield).toBe(15);
  });

  it('ne cumule pas les récompenses déjà reçues', () => {
    store().setLinkLevel('player1', 2);
    store().setLinkLevel('player1', 4);
    expect(p1().heroHealth).toBe(35);
    expect(p1().heroShield).toBe(15);
  });

  it('le Lien plafonne à 4', () => {
    setup((g) => patchPlayer(g, 'player1', { linkLevel: 4 as LinkLevel, hand: [card('jezrien')], stormlight: 10 }));
    store().playCard('player1', 0);
    expect(p1().linkLevel).toBe(4);
  });
});

describe("frappe de la Lame d'Éclat", () => {
  it('nécessite le Lien 3 et une frappe disponible', () => {
    setup((g) => {
      patchPlayer(g, 'player1', { linkLevel: 2, heroCanAttack: true });
      patchPlayer(g, 'player2', { board: [unit('garde-shin', 'g')] });
    });
    const before = game();
    store().heroAttackUnit('player1', 'g');
    expect(game()).toBe(before);
  });

  it("frappe une unité, encaisse la riposte, une seule fois par tour", () => {
    setup((g) => {
      patchPlayer(g, 'player1', { linkLevel: 3, heroCanAttack: true });
      patchPlayer(g, 'player2', { board: [unit('executeur-skybreaker', 'e')] }); // 4/3
    });
    store().heroAttackUnit('player1', 'e');
    expect(p2().board).toHaveLength(0); // 5 dégâts sur 3 PV
    expect(p1().heroHealth).toBe(26); // riposte de 4
    expect(canHeroAttack(p1())).toBe(false);
    const before = game();
    store().heroAttackHero('player1');
    expect(game()).toBe(before);
  });

  it("frappe le héros adverse ; une Couverture sur le héros l'intercepte", () => {
    setup((g) => {
      patchPlayer(g, 'player2', { linkLevel: 3, heroCanAttack: true });
      patchPlayer(g, 'player1', { board: [unit('bridge-four-soldier', 'b', { guarding: 'hero' })] });
    });
    store().heroAttackHero('player2');
    expect(p1().heroHealth).toBe(30);
    expect(p1().board.filter((u) => !u.isSpren)).toHaveLength(0); // 6 dégâts sur 3 PV
    expect(p1().linkLevel).toBe(1); // Couverture absorbée : Lien pour Kaladin (Sylphrena arrive)
    expect(p2().linkLevel).toBe(4); // unité détruite : Lien pour Szeth (3 → 4)
  });

  it('sans Couverture, la Lame touche directement le héros', () => {
    setup((g) => patchPlayer(g, 'player2', { linkLevel: 3, heroCanAttack: true }));
    store().heroAttackHero('player2');
    expect(p1().heroHealth).toBe(24);
  });
});

describe('pouvoirs de héros (Lien 3, une fois par tour)', () => {
  it('Lashing de Kaladin entrave une unité ennemie', () => {
    setup((g) => {
      patchPlayer(g, 'player1', { linkLevel: 3 });
      patchPlayer(g, 'player2', { board: [unit('garde-shin', 'g')] });
    });
    store().useHeroPower('player1', 'g');
    expect(p2().board[0].isLashed).toBe(true);
    expect(p1().heroAbilityUsedThisTurn).toBe(true);
    const before = game();
    store().useHeroPower('player1', 'g');
    expect(game()).toBe(before);
  });

  it('Jugement Céleste de Szeth inflige 3 dégâts et nourrit son Lien en cas de destruction', () => {
    setup((g) => {
      patchPlayer(g, 'player2', { linkLevel: 3 });
      patchPlayer(g, 'player1', { board: [unit('bridge-four-soldier', 'b')] });
    });
    store().useHeroPower('player2', 'b');
    expect(p1().board).toHaveLength(0);
    expect(p2().linkLevel).toBe(4);
  });

  it('indisponible sous le Lien 3', () => {
    setup((g) => {
      patchPlayer(g, 'player1', { linkLevel: 2 });
      patchPlayer(g, 'player2', { board: [unit('garde-shin', 'g')] });
    });
    const before = game();
    store().useHeroPower('player1', 'g');
    expect(game()).toBe(before);
  });
});

describe('nouvelles règles : main, mulligan, régénération, riposte', () => {
  it(`brûle les cartes piochées au-delà de ${HAND_LIMIT} en main`, () => {
    setup((g) => {
      const filler = Array.from({ length: 9 }, () => card('lopen'));
      patchPlayer(g, 'player2', { hand: filler, deck: [card('division'), card('division'), card('division')] });
    });
    store().endTurn(); // p2 pioche 1 : main 10
    expect(p2().hand).toHaveLength(10);
    const graveBefore = p2().graveyard.length;
    patchStore((g) => patchPlayer(g, 'player2', { hand: [...p2().hand, card('loi-du-ciel')].slice(0, 10), stormlight: 10 }));
    // Loi du Ciel (pioche 2) avec 9 cartes restantes après l'avoir jouée : 1 gardée, 1 brûlée
    patchStore((g) => patchPlayer(g, 'player2', { hand: [card('loi-du-ciel'), ...Array.from({ length: 9 }, () => card('lopen'))] }));
    store().playCard('player2', 0);
    expect(p2().hand).toHaveLength(HAND_LIMIT);
    expect(p2().graveyard.length).toBe(graveBefore + 2); // la carte jouée + 1 brûlée
  });

  it('mulligan : remplace les cartes choisies, une seule fois', () => {
    const hand = p1().hand;
    store().mulligan('player1', [0, 2]);
    expect(p1().hand).toHaveLength(4);
    expect(p1().hand[0]).toBe(hand[1]);
    expect(p1().hand[1]).toBe(hand[3]);
    expect(p1().deck).toHaveLength(26);
    expect(p1().mulliganDone).toBe(true);
    const before = game();
    store().mulligan('player1', [0]);
    expect(game()).toBe(before);
  });

  it('Esquisse (Lien 1) : +1 PV au début du tour, sans dépasser les PV de base', () => {
    setup((g) => patchPlayer(g, 'player2', { linkLevel: 1, heroHealth: 20 }));
    store().endTurn();
    expect(p2().heroHealth).toBe(21);
    patchStore((g) => patchPlayer(g, 'player1', { linkLevel: 1, heroHealth: 30 }));
    store().endTurn();
    expect(p1().heroHealth).toBe(30);
  });

  it('sans Lien, pas de régénération', () => {
    setup((g) => patchPlayer(g, 'player2', { linkLevel: 0, heroHealth: 20 }));
    store().endTurn();
    expect(p2().heroHealth).toBe(20);
  });

  it("le héros riposte à l'unité qui l'attaque dès le Lien 3 (pas avant)", () => {
    setup((g) => {
      patchPlayer(g, 'player1', { board: [unit('lopen', 'l', { hasSurvivedLethal: true })] }); // 2/4
      patchPlayer(g, 'player2', { linkLevel: 2 });
    });
    store().attackHero('player1', 'l');
    expect(p1().board[0].currentHealth).toBe(4); // pas de riposte au Lien 2
    patchStore((g) => {
      patchPlayer(g, 'player2', { linkLevel: 3 });
      g.players.player1.board[0].canAttack = true;
    });
    store().attackHero('player1', 'l');
    expect(p1().board.filter((u) => !u.isSpren)).toHaveLength(0); // riposte 4+2 = 6 ≥ 4 PV
    expect(p2().linkLevel).toBe(4); // unité détruite par la riposte : Lien pour Szeth
  });
});

describe('Spren évolutif', () => {
  it('entre au Lien 1 avec les stats du niveau, monte au 2, devient la Lame au 3, revient au 4', () => {
    store().setLinkLevel('player1', 1);
    const spren = p1().board.find((u) => u.isSpren);
    expect(spren).toBeDefined();
    expect([spren!.currentAttack, spren!.currentHealth]).toEqual([1, 1]);
    expect(spren!.keywords).toContain('vol');
    store().setLinkLevel('player1', 2);
    expect(p1().board.find((u) => u.isSpren)!.currentHealth).toBe(2);
    store().setLinkLevel('player1', 3);
    expect(p1().board.find((u) => u.isSpren)).toBeUndefined();
    store().setLinkLevel('player1', 4);
    const final = p1().board.find((u) => u.isSpren)!;
    expect([final.currentAttack, final.currentHealth, final.indestructible]).toEqual([3, 3, true]);
  });

  it('occupe un emplacement : sur plateau plein, il attend une case libre puis revient au début du tour', () => {
    setup((g) => {
      const full = Array.from({ length: MAX_BOARD_UNITS }, (_, i) => unit('lopen', `l${i}`));
      patchPlayer(g, 'player2', { board: full });
    });
    store().setLinkLevel('player2', 1);
    expect(p2().board.find((u) => u.isSpren)).toBeUndefined();
    patchStore((g) => patchPlayer(g, 'player2', { board: p2().board.slice(0, 4) }));
    store().endTurn();
    expect(p2().board.find((u) => u.isSpren)).toBeDefined();
  });

  it('se dissipe au lieu de mourir (pas de cimetière) et revient au tour suivant', () => {
    store().setLinkLevel('player1', 1);
    patchStore((g) => patchPlayer(g, 'player2', { hand: [card('division')], stormlight: 10, maxStormlight: 10 }));
    store().endTurn();
    const sprenId = p1().board.find((u) => u.isSpren)!.instanceId;
    store().playTargetedCard('player2', 0, sprenId);
    expect(p1().board.find((u) => u.isSpren)).toBeUndefined();
    expect(p1().graveyard.some((c) => c.type === 'spren')).toBe(false);
    store().endTurn();
    expect(p1().board.find((u) => u.isSpren)).toBeDefined();
  });

  it('au Lien 4 il est indestructible : reste à 1 PV', () => {
    store().setLinkLevel('player1', 4);
    patchStore((g) => patchPlayer(g, 'player2', { hand: [card('division')], stormlight: 10, maxStormlight: 10 }));
    store().endTurn();
    const sprenId = p1().board.find((u) => u.isSpren)!.instanceId;
    store().playTargetedCard('player2', 0, sprenId);
    expect(p1().board.find((u) => u.isSpren)!.currentHealth).toBe(1);
  });

  it('Vol : ignore la Couverture quand il attaque', () => {
    store().setLinkLevel('player1', 2);
    patchStore((g) => {
      patchPlayer(g, 'player2', { board: [unit('garde-shin', 'g', { guarding: 'hero' })] });
      g.players.player1.board.forEach((u) => (u.canAttack = true));
    });
    const sprenId = p1().board.find((u) => u.isSpren)!.instanceId;
    store().attackHero('player1', sprenId);
    expect(p2().heroHealth).toBe(28); // 1 ATK + 1 aura, la garde n'intercepte pas
    expect(p2().board[0].currentHealth).toBe(4);
  });
});

describe('Avatar du héros (Lien 4)', () => {
  it('rejoint la main au Lien 4, est jouable, et sa mort coûte 5 PV puis revient en main', () => {
    store().setLinkLevel('player1', 4);
    const idx = p1().hand.findIndex((c) => c.id === 'kaladin-avatar');
    expect(idx).toBeGreaterThanOrEqual(0);
    patchStore((g) => patchPlayer(g, 'player1', { stormlight: 10, board: [] }));
    store().playCard('player1', p1().hand.findIndex((c) => c.id === 'kaladin-avatar'));
    const avatar = p1().board.find((u) => u.card.id === 'kaladin-avatar')!;
    expect(avatar.canAttack).toBe(true); // Zèle
    patchStore((g) => patchPlayer(g, 'player2', { hand: [card('nightblood')], stormlight: 10, maxStormlight: 10 }));
    store().endTurn();
    const healthBefore = p1().heroHealth;
    const shieldBefore = p1().heroShield;
    store().playCard('player2', 0);
    expect(p1().board.find((u) => u.card.id === 'kaladin-avatar')).toBeUndefined();
    expect(p1().heroShield + p1().heroHealth).toBe(shieldBefore + healthBefore - 5);
    expect(p1().graveyard.some((c) => c.id === 'kaladin-avatar')).toBe(false);
    expect(p1().avatarReturnPending).toBe(true);
    store().endTurn();
    expect(p1().hand.some((c) => c.id === 'kaladin-avatar')).toBe(true);
    expect(p1().avatarReturnPending).toBe(false);
  });
});

describe('nouvelles cartes', () => {
  it("Cri d'arrivée : Sigzil pioche 2, Haute Juge inflige 1 à toutes les unités ennemies", () => {
    setup((g) => {
      patchPlayer(g, 'player1', { hand: [card('sigzil')], stormlight: 10 });
      patchPlayer(g, 'player2', { hand: [card('haute-juge')], stormlight: 10, maxStormlight: 10 });
    });
    const deckBefore = p1().deck.length;
    store().playCard('player1', 0);
    expect(p1().hand).toHaveLength(2);
    expect(p1().deck).toHaveLength(deckBefore - 2);
    store().endTurn();
    store().playCard('player2', 0);
    expect(p1().board[0].currentHealth).toBe(3); // Sigzil 4/4 → 4/3
  });

  it('Lame prêtée : +3 ATK ; Plaque prêtée : +4 PV', () => {
    setup((g) => {
      patchPlayer(g, 'player1', { hand: [card('lame-pretee'), card('plaque-pretee')], stormlight: 10, board: [unit('lopen', 'l')] });
    });
    store().playTargetedCard('player1', 0, 'l');
    expect(p1().board[0].currentAttack).toBe(5);
    store().playTargetedCard('player1', 0, 'l');
    expect(p1().board[0].currentHealth).toBe(8);
  });

  it('Vol au-dessus des Gouffres : +1/+1 à toutes les unités alliées', () => {
    setup((g) => {
      patchPlayer(g, 'player1', { hand: [card('vol-au-dessus-des-gouffres')], stormlight: 10, board: [unit('lopen', 'l'), unit('teft', 't')] });
    });
    store().playCard('player1', 0);
    expect(p1().board.map((u) => [u.currentAttack, u.currentHealth])).toEqual([[3, 5], [5, 6]]);
  });

  it('Couverture : on peut déplacer la protection, le Lien ne vient que la première fois', () => {
    setup((g) => patchPlayer(g, 'player1', { board: [unit('bridge-four-soldier', 'b'), unit('lopen', 'l')] }));
    store().declareGuard('player1', 'b', 'hero');
    expect(p1().linkLevel).toBe(1);
    store().declareGuard('player1', 'b', 'l');
    expect(p1().board.find((u) => u.instanceId === 'b')!.guarding).toBe('l');
    expect(p1().linkLevel).toBe(1);
  });

  it('les decks de départ sont valides (30 cartes, 3 copies max, 1 Éclat)', () => {
    expect(validateDeckList('windrunners-starter', p1().deck.concat(p1().hand).map((c) => c.id))).toEqual([]);
    expect(validateDeckList('skybreakers-starter', p2().deck.concat(p2().hand).map((c) => c.id))).toEqual([]);
    expect(validateDeckList('windrunners-starter', Array(30).fill('honor'))).not.toEqual([]);
    expect(validateDeckList('windrunners-starter', Array(29).fill('lopen'))).not.toEqual([]);
  });
});

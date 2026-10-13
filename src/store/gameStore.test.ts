import { beforeEach, describe, expect, it } from 'vitest';
import { MAX_BOARD_UNITS, canHeroAttack, getEffectiveAttack, getEffectiveHeroAttack, useGameStore } from './gameStore';
import { getCardById } from '../data/cards/loader';
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

beforeEach(() => setup());

describe('mise en place', () => {
  it('distribue 4 cartes, laisse 16 cartes en pioche et 1 Stormlight au tour 1', () => {
    expect(p1().hand).toHaveLength(4);
    expect(p1().deck).toHaveLength(16);
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
    expect(p2().hand).toHaveLength(5);
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
    expect(p1().board).toHaveLength(0); // 6 dégâts sur 3 PV
    expect(p1().linkLevel).toBe(1); // Couverture absorbée : Lien pour Kaladin
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

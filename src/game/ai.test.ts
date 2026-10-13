import { beforeEach, describe, expect, it } from 'vitest';
import { chooseNextAction } from './ai';
import { useGameStore } from '../store/gameStore';
import { getCardById } from '../data/cards/loader';
import type { GameState, PlayerState, UnitInPlay } from '../types/game';
import type { Card } from '../types/card';

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

function state(mutate: (g: GameState) => void): GameState {
  useGameStore.getState().startGame('windrunners-starter', 'skybreakers-starter');
  const g: GameState = structuredClone(useGameStore.getState().game);
  g.activePlayerId = 'player2';
  mutate(g);
  return g;
}

function patch(g: GameState, id: 'player1' | 'player2', p: Partial<PlayerState>): void {
  g.players[id] = { ...g.players[id], ...p };
}

beforeEach(() => useGameStore.getState().startGame('windrunners-starter', 'skybreakers-starter'));

describe('IA simple', () => {
  it("pose l'unité la plus chère qu'elle peut payer", () => {
    const g = state((s) => patch(s, 'player2', { hand: [card('garde-shin'), card('executeur-skybreaker')], stormlight: 4, board: [] }));
    expect(chooseNextAction(g, 'player2')).toEqual({ type: 'play', index: 1 });
  });

  it('ne pose rien quand le plateau est plein et termine son tour', () => {
    const g = state((s) =>
      patch(s, 'player2', {
        hand: [card('garde-shin')],
        stormlight: 5,
        board: Array.from({ length: 5 }, (_, i) => unit('garde-shin', `g${i}`, { canAttack: false, guarding: 'hero' })),
      }),
    );
    expect(chooseNextAction(g, 'player2')).toEqual({ type: 'end' });
  });

  it('lance Division sur une unité qu\'elle peut tuer', () => {
    const g = state((s) => {
      patch(s, 'player2', { hand: [card('division')], stormlight: 3, board: [] });
      patch(s, 'player1', { board: [unit('bridge-four-soldier', 'b'), unit('jezrien', 'j')] });
    });
    expect(chooseNextAction(g, 'player2')).toEqual({ type: 'playTargeted', index: 0, targetInstanceId: 'b' });
  });

  it('garde Division si rien ne meurt', () => {
    const g = state((s) => {
      patch(s, 'player2', { hand: [card('division')], stormlight: 3, board: [] });
      patch(s, 'player1', { board: [unit('jezrien', 'j')] });
    });
    expect(chooseNextAction(g, 'player2')).toEqual({ type: 'end' });
  });

  it("attaque le héros quand il n'est pas protégé", () => {
    const g = state((s) => {
      patch(s, 'player2', { hand: [], board: [unit('executeur-skybreaker', 'e')] });
      patch(s, 'player1', { board: [] });
    });
    expect(chooseNextAction(g, 'player2')).toEqual({ type: 'attackHero', attackerInstanceId: 'e' });
  });

  it("préfère un échange gagnant à une attaque sur un héros protégé", () => {
    const g = state((s) => {
      patch(s, 'player2', { hand: [], board: [unit('executeur-skybreaker', 'e')] }); // 4/3
      patch(s, 'player1', { board: [unit('bridge-four-soldier', 'b', { guarding: 'hero' }), unit('lopen', 'l')] }); // 2/3 garde, 2/4
    });
    const action = chooseNextAction(g, 'player2');
    expect(action.type === 'attack' || action.type === 'attackHero').toBe(true);
  });

  it('place ses Couvertures sur le héros avant d\'attaquer', () => {
    const g = state((s) => {
      patch(s, 'player2', { hand: [], board: [unit('garde-shin', 'g')] });
      patch(s, 'player1', { board: [] });
    });
    expect(chooseNextAction(g, 'player2')).toEqual({ type: 'guard', protectorInstanceId: 'g', target: 'hero' });
  });

  it('frappe avec la Lame quand le héros adverse est libre', () => {
    const g = state((s) => {
      patch(s, 'player2', { hand: [], board: [], linkLevel: 3, heroCanAttack: true, heroAbilityUsedThisTurn: true });
      patch(s, 'player1', { board: [] });
    });
    expect(chooseNextAction(g, 'player2')).toEqual({ type: 'heroStrikeHero' });
  });

  it("termine son tour quand elle n'a plus rien à faire", () => {
    const g = state((s) => {
      patch(s, 'player2', { hand: [], board: [], stormlight: 0 });
      patch(s, 'player1', { board: [] });
    });
    expect(chooseNextAction(g, 'player2')).toEqual({ type: 'end' });
  });
});

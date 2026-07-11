import { useFxStore } from '../store/fxStore';
import type { FxKind } from '../store/fxStore';
import type { GameState, UnitInPlay } from '../types/game';

export function heroFxId(playerId: string): string {
  return `hero:${playerId}`;
}

interface Point {
  x: number;
  y: number;
}

/** Centre viewport d'un élément porteur d'un attribut data-fx. */
function centerOf(el: Element): Point {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

/** Capture la position de toutes les cibles VFX AVANT une mutation (unités qui vont mourir incluses). */
export function captureFxRects(): Record<string, Point> {
  const out: Record<string, Point> = {};
  document.querySelectorAll<HTMLElement>('[data-fx]').forEach((el) => {
    const id = el.dataset.fx;
    if (id) out[id] = centerOf(el);
  });
  return out;
}

function liveRect(fxId: string): Point | null {
  const el = document.querySelector(`[data-fx="${fxId}"]`);
  return el ? centerOf(el) : null;
}

/** Petit bond de l'attaquant vers le haut (le joueur actif est toujours en bas). */
export function lunge(fxId: string): void {
  const el = document.querySelector<HTMLElement>(`[data-fx="${fxId}"]`);
  if (!el) return;
  el.classList.remove('fx-lunge');
  void el.offsetWidth; // force un reflow pour relancer l'animation
  el.classList.add('fx-lunge');
  setTimeout(() => el.classList.remove('fx-lunge'), 360);
}

interface UnitRef {
  unit: UnitInPlay;
  ownerId: string;
}

function allUnits(game: GameState): UnitRef[] {
  const refs: UnitRef[] = [];
  for (const pid of Object.keys(game.players)) {
    for (const unit of game.players[pid].board) refs.push({ unit, ownerId: pid });
  }
  return refs;
}

/**
 * Compare l'état avant/après une action et déclenche les effets visuels
 * correspondants (dégâts flottants, morts, buffs, entraves, gains de Lien).
 * `kind` colore les effets selon l'origine (attaque, type de sort, pouvoir).
 */
export function diffAndSpawn(
  before: GameState,
  after: GameState,
  rects: Record<string, Point>,
  kind: FxKind = 'attack',
): void {
  const spawn = useFxStore.getState().spawn;

  const afterUnits = new Map<string, UnitInPlay>();
  for (const { unit } of allUnits(after)) afterUnits.set(unit.instanceId, unit);

  for (const { unit } of allUnits(before)) {
    const pos = rects[unit.instanceId];
    if (!pos) continue;
    const now = afterUnits.get(unit.instanceId);

    if (!now) {
      // L'unité a quitté le plateau : renvoi (bounce) ou destruction.
      if (kind === 'bounce') {
        spawn({ ...pos, kind: 'bounce', text: '↩' });
      } else {
        spawn({ ...pos, kind: 'death' });
        spawn({ ...pos, kind: 'damage', text: `-${unit.currentHealth}` });
      }
      continue;
    }

    const hpDelta = unit.currentHealth - now.currentHealth;
    if (hpDelta > 0) {
      spawn({ ...pos, kind: kind === 'attack' ? 'damage' : kind, text: `-${hpDelta}` });
    } else if (now.currentHealth > unit.currentHealth || now.currentAttack > unit.currentAttack) {
      const atk = now.currentAttack - unit.currentAttack;
      const hp = now.currentHealth - unit.currentHealth;
      spawn({ ...pos, kind: 'buff', text: `+${atk}/+${hp}` });
    } else if (now.isLashed && !unit.isLashed) {
      spawn({ ...pos, kind: 'disable', text: '⊘' });
    }
  }

  // Héros : dégâts (vie + bouclier) et gains de Lien.
  for (const pid of Object.keys(before.players)) {
    const b = before.players[pid];
    const a = after.players[pid];
    const pos = rects[heroFxId(pid)] ?? liveRect(heroFxId(pid));
    if (!pos) continue;
    const dmg = b.heroHealth + b.heroShield - (a.heroHealth + a.heroShield);
    if (dmg > 0) spawn({ ...pos, kind: 'damage', text: `-${dmg}` });
    if (a.linkLevel > b.linkLevel) spawn({ ...pos, kind: 'link', text: '✦ Lien' });
  }
}

import { useFxStore } from '../store/fxStore';
import type { FxKind } from '../store/fxStore';
import { hasVideo, prefersStillMedia, vfxClips } from '../assets/artwork';
import type { VfxClip } from '../assets/artwork';
import type { GameState, UnitInPlay } from '../types/game';

export function heroFxId(playerId: string): string {
  return `hero:${playerId}`;
}

interface Point {
  x: number;
  y: number;
}

/** Taille (px) du clip vidéo d'effet posé sur une unité. */
const UNIT_CLIP_SIZE = 190;
/** Taille (px) du clip vidéo d'effet posé sur le panneau du héros. */
const HERO_CLIP_SIZE = 260;

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

/** Joue un clip vidéo d'effet centré sur un point (si le clip existe et que l'utilisateur accepte l'animation). */
export function playClipAt(pos: Point, clip: VfxClip, size = UNIT_CLIP_SIZE): void {
  if (prefersStillMedia || !hasVideo(vfxClips[clip])) return;
  useFxStore.getState().spawnClip({ ...pos, clip, size });
}

/** Joue un clip vidéo d'effet sur un élément porteur de data-fx (ex. le héros du joueur). */
export function playClipOn(fxId: string, clip: VfxClip): void {
  const pos = liveRect(fxId);
  if (pos) playClipAt(pos, clip, fxId.startsWith('hero:') ? HERO_CLIP_SIZE : UNIT_CLIP_SIZE);
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
 * `kind` colore les effets selon l'origine (attaque, type de sort, pouvoir) ;
 * `clip` joue en plus un clip vidéo d'effet sur chaque unité touchée.
 */
export function diffAndSpawn(
  before: GameState,
  after: GameState,
  rects: Record<string, Point>,
  kind: FxKind = 'attack',
  clip?: VfxClip,
): void {
  const spawn = useFxStore.getState().spawn;

  const afterUnits = new Map<string, UnitInPlay>();
  for (const { unit } of allUnits(after)) afterUnits.set(unit.instanceId, unit);

  for (const { unit } of allUnits(before)) {
    const pos = rects[unit.instanceId];
    if (!pos) continue;
    const now = afterUnits.get(unit.instanceId);
    let affected = true;

    if (!now) {
      // L'unité a quitté le plateau : renvoi (bounce) ou destruction.
      if (kind === 'bounce') {
        spawn({ ...pos, kind: 'bounce', text: '↩' });
      } else {
        spawn({ ...pos, kind: 'death' });
        spawn({ ...pos, kind: 'damage', text: `-${unit.currentHealth}` });
      }
    } else {
      const hpDelta = unit.currentHealth - now.currentHealth;
      if (hpDelta > 0) {
        spawn({ ...pos, kind: kind === 'attack' ? 'damage' : kind, text: `-${hpDelta}` });
      } else if (now.currentHealth > unit.currentHealth || now.currentAttack > unit.currentAttack) {
        const atk = now.currentAttack - unit.currentAttack;
        const hp = now.currentHealth - unit.currentHealth;
        spawn({ ...pos, kind: 'buff', text: `+${atk}/+${hp}` });
      } else if (now.isLashed && !unit.isLashed) {
        spawn({ ...pos, kind: 'disable', text: '⊘' });
      } else {
        affected = false;
      }
    }

    if (affected && clip) playClipAt(pos, clip);
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

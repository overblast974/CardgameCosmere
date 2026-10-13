import { useCallback, useEffect, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';

/** Ce que le joueur est en train de saisir. */
export type DragSource =
  | { kind: 'hand'; index: number }
  | { kind: 'unit'; instanceId: string }
  | { kind: 'hero' };

export interface DragState {
  src: DragSource;
  x: number;
  y: number;
}

export interface DragCallbacks {
  canDrag: (src: DragSource) => boolean;
  /** La saisie commence (après un petit déplacement) : mettre les cibles en surbrillance. */
  onStart: (src: DragSource) => void;
  /** Relâché : `dropTarget` est la valeur du `data-drop` sous le doigt, ou null. */
  onDrop: (src: DragSource, dropTarget: string | null) => void;
  onCancel: () => void;
  /** Appui long sans déplacement (aperçu de la carte). */
  onLongPress?: (src: DragSource) => void;
  onLongPressEnd?: () => void;
}

interface BindOptions {
  /**
   * Ne démarre la saisie que si le geste part vers le haut ou le bas : un geste
   * horizontal est laissé au défilement natif (touch-action: pan-x sur l'élément).
   */
  verticalOnly?: boolean;
}

const DRAG_THRESHOLD_PX = 10;
const LONG_PRESS_MS = 380;
const CLICK_SUPPRESS_MS = 400;

interface Session {
  pointerId: number;
  dragging: boolean;
  longPressed: boolean;
  timer: number | null;
  cleanup: () => void;
}

/**
 * Saisie « à la Hearthstone » avec les Pointer Events (souris et tactile) :
 * on tire une carte de la main vers le plateau, une unité vers sa cible, ou le
 * héros vers l'ennemi. Un fantôme suit le pointeur (`drag`), et au relâcher la
 * cible est lue sur l'attribut `data-drop` de l'élément sous le pointeur.
 * Un appui long immobile déclenche l'aperçu. Les clics qui suivent une saisie
 * ou un appui long sont absorbés pour ne pas déclencher le tap normal.
 */
export function useDragSource(callbacks: DragCallbacks) {
  // « Latest ref » mis à jour après chaque rendu : les gestionnaires d'événements
  // lisent toujours les callbacks du dernier rendu sans être recréés.
  const callbacksRef = useRef(callbacks);
  useEffect(() => {
    callbacksRef.current = callbacks;
  });

  const [drag, setDrag] = useState<DragState | null>(null);
  const session = useRef<Session | null>(null);
  const suppressClickUntil = useRef(0);

  useEffect(() => {
    const current = session;
    return () => current.current?.cleanup();
  }, []);

  const bind = useCallback((src: DragSource, options: BindOptions = {}) => {
    const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
      if (event.button !== 0 || session.current) return;
      if (!callbacksRef.current.canDrag(src)) return;

      const pointerId = event.pointerId;
      const startX = event.clientX;
      const startY = event.clientY;
      const s: Session = { pointerId, dragging: false, longPressed: false, timer: null, cleanup: () => {} };

      const endLongPress = () => {
        if (!s.longPressed) return;
        s.longPressed = false;
        suppressClickUntil.current = Date.now() + CLICK_SUPPRESS_MS;
        callbacksRef.current.onLongPressEnd?.();
      };

      const onMove = (e: PointerEvent) => {
        if (e.pointerId !== pointerId) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        if (!s.dragging) {
          if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
          if (options.verticalOnly && Math.abs(dx) > Math.abs(dy) && !s.longPressed) {
            s.cleanup();
            return;
          }
          if (s.timer !== null) {
            window.clearTimeout(s.timer);
            s.timer = null;
          }
          endLongPress();
          s.dragging = true;
          callbacksRef.current.onStart(src);
        }
        setDrag({ src, x: e.clientX, y: e.clientY });
      };

      const onUp = (e: PointerEvent) => {
        if (e.pointerId !== pointerId) return;
        if (s.dragging) {
          const under = document.elementFromPoint(e.clientX, e.clientY);
          const target = (under?.closest('[data-drop]') as HTMLElement | null)?.dataset.drop ?? null;
          setDrag(null);
          suppressClickUntil.current = Date.now() + CLICK_SUPPRESS_MS;
          callbacksRef.current.onDrop(src, target);
        } else {
          endLongPress();
        }
        s.cleanup();
      };

      const onCancelEvent = (e: PointerEvent) => {
        if (e.pointerId !== pointerId) return;
        if (s.dragging) {
          setDrag(null);
          callbacksRef.current.onCancel();
        } else {
          endLongPress();
        }
        s.cleanup();
      };

      s.cleanup = () => {
        if (s.timer !== null) window.clearTimeout(s.timer);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onCancelEvent);
        session.current = null;
      };
      session.current = s;

      window.addEventListener('pointermove', onMove, { passive: true });
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onCancelEvent);

      if (callbacksRef.current.onLongPress) {
        s.timer = window.setTimeout(() => {
          s.timer = null;
          if (s.dragging) return;
          s.longPressed = true;
          callbacksRef.current.onLongPress?.(src);
        }, LONG_PRESS_MS);
      }
    };

    const onClickCapture = (event: ReactMouseEvent<HTMLElement>) => {
      if (Date.now() < suppressClickUntil.current) {
        event.stopPropagation();
        event.preventDefault();
      }
    };

    return { onPointerDown, onClickCapture };
  }, []);

  return { drag, bind };
}

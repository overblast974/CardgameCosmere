import { create } from 'zustand';
import type { VfxClip } from '../assets/artwork';
import type { LinkLevel, ManifestationCard } from '../types/card';

export type FxKind = 'attack' | 'damage' | 'death' | 'spell' | 'buff' | 'bounce' | 'disable' | 'link';

export interface Burst {
  id: number;
  /** Coordonnées viewport (centre de la cible). */
  x: number;
  y: number;
  kind: FxKind;
  text?: string;
}

/** Clip vidéo d'effet (fond noir, superposé en mode « screen ») joué une fois à une position. */
export interface Clip {
  id: number;
  x: number;
  y: number;
  clip: VfxClip;
  /** Taille en px du carré vidéo. */
  size: number;
}

/** Cérémonie de serment : un héros vient de gagner un niveau de Lien. */
export interface Ceremony {
  id: number;
  playerId: string;
  playerName: string;
  heroId: string;
  heroName: string;
  level: LinkLevel;
  oath: string;
  abilityName: string;
  abilityDescription: string;
  manifestation?: ManifestationCard;
}

interface FxStore {
  bursts: Burst[];
  clips: Clip[];
  /** Cérémonie affichée, puis celles en attente (Honneur donne 2 niveaux d'un coup). */
  ceremony: Ceremony | null;
  ceremonyQueue: Ceremony[];
  spawn: (burst: Omit<Burst, 'id'>) => void;
  spawnClip: (clip: Omit<Clip, 'id'>) => void;
  removeClip: (id: number) => void;
  remove: (id: number) => void;
  enqueueCeremony: (ceremony: Omit<Ceremony, 'id'>) => void;
  dismissCeremony: () => void;
}

let seq = 0;
const BURST_LIFETIME = 1100;
const CLIP_MAX_LIFETIME = 4000;

export const useFxStore = create<FxStore>((set) => ({
  bursts: [],
  clips: [],
  ceremony: null,
  ceremonyQueue: [],
  spawn: (burst) => {
    const id = ++seq;
    set((state) => ({ bursts: [...state.bursts, { ...burst, id }] }));
    setTimeout(() => set((state) => ({ bursts: state.bursts.filter((b) => b.id !== id) })), BURST_LIFETIME);
  },
  spawnClip: (clip) => {
    const id = ++seq;
    set((state) => ({ clips: [...state.clips, { ...clip, id }] }));
    // Filet de sécurité si l'événement `ended` de la vidéo ne vient jamais.
    setTimeout(() => set((state) => ({ clips: state.clips.filter((c) => c.id !== id) })), CLIP_MAX_LIFETIME);
  },
  removeClip: (id) => set((state) => ({ clips: state.clips.filter((c) => c.id !== id) })),
  remove: (id) => set((state) => ({ bursts: state.bursts.filter((b) => b.id !== id) })),
  enqueueCeremony: (ceremony) => {
    const entry = { ...ceremony, id: ++seq };
    set((state) =>
      state.ceremony ? { ceremonyQueue: [...state.ceremonyQueue, entry] } : { ceremony: entry },
    );
  },
  dismissCeremony: () =>
    set((state) => {
      const [next, ...rest] = state.ceremonyQueue;
      return { ceremony: next ?? null, ceremonyQueue: rest };
    }),
}));

import { create } from 'zustand';

export type FxKind = 'attack' | 'damage' | 'death' | 'spell' | 'buff' | 'bounce' | 'disable' | 'link';

export interface Burst {
  id: number;
  /** Coordonnées viewport (centre de la cible). */
  x: number;
  y: number;
  kind: FxKind;
  text?: string;
}

interface FxStore {
  bursts: Burst[];
  spawn: (burst: Omit<Burst, 'id'>) => void;
  remove: (id: number) => void;
}

let seq = 0;
const BURST_LIFETIME = 1100;

export const useFxStore = create<FxStore>((set) => ({
  bursts: [],
  spawn: (burst) => {
    const id = ++seq;
    set((state) => ({ bursts: [...state.bursts, { ...burst, id }] }));
    setTimeout(() => set((state) => ({ bursts: state.bursts.filter((b) => b.id !== id) })), BURST_LIFETIME);
  },
  remove: (id) => set((state) => ({ bursts: state.bursts.filter((b) => b.id !== id) })),
}));

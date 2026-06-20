import { onValue, ref, set } from 'firebase/database';
import { database } from './config';
import type { GameState } from '../types/game';

function matchRef(matchId: string) {
  if (!database) throw new Error('Firebase non configuré : synchro multijoueur indisponible.');
  return ref(database, `matches/${matchId}/state`);
}

export function pushGameState(matchId: string, state: GameState): Promise<void> {
  if (!database) return Promise.resolve();
  return set(matchRef(matchId), state);
}

export function subscribeToGameState(
  matchId: string,
  onUpdate: (state: GameState | null) => void,
): () => void {
  if (!database) return () => {};
  const unsubscribe = onValue(matchRef(matchId), (snapshot) => {
    onUpdate(snapshot.exists() ? (snapshot.val() as GameState) : null);
  });
  return unsubscribe;
}

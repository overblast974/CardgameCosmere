import { onValue, ref, set } from 'firebase/database';
import { database } from './config';
import type { GameState } from '../types/game';

function matchRef(matchId: string) {
  return ref(database, `matches/${matchId}/state`);
}

export function pushGameState(matchId: string, state: GameState): Promise<void> {
  return set(matchRef(matchId), state);
}

export function subscribeToGameState(
  matchId: string,
  onUpdate: (state: GameState | null) => void,
): () => void {
  const unsubscribe = onValue(matchRef(matchId), (snapshot) => {
    onUpdate(snapshot.exists() ? (snapshot.val() as GameState) : null);
  });
  return unsubscribe;
}

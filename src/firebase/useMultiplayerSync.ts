import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { isFirebaseConfigured } from './config';
import { pushGameState, subscribeToGameState } from './sync';

/**
 * Synchronise le store local avec Firebase Realtime Database pour un match donné.
 * Le premier client à rejoindre un salon vide en devient l'hôte et y publie l'état initial ;
 * les mises à jour distantes écrasent ensuite l'état local, et chaque mutation locale est republiée.
 */
export function useMultiplayerSync(matchId: string | null) {
  const applyingRemote = useRef(false);
  const hasClaimedRoom = useRef(false);

  useEffect(() => {
    if (!matchId || !isFirebaseConfigured) return;

    const unsubscribe = subscribeToGameState(matchId, (remoteGame) => {
      if (remoteGame) {
        applyingRemote.current = true;
        useGameStore.getState().loadGame(remoteGame);
        applyingRemote.current = false;
        return;
      }
      if (!hasClaimedRoom.current) {
        hasClaimedRoom.current = true;
        pushGameState(matchId, useGameStore.getState().game).catch((error) => {
          console.error('Échec de la création du salon multijoueur', error);
        });
      }
    });

    return unsubscribe;
  }, [matchId]);

  useEffect(() => {
    if (!matchId || !isFirebaseConfigured) return;

    const unsubscribe = useGameStore.subscribe((state) => {
      if (applyingRemote.current) return;
      pushGameState(matchId, state.game).catch((error) => {
        console.error('Échec de la synchronisation multijoueur', error);
      });
    });

    return unsubscribe;
  }, [matchId]);
}

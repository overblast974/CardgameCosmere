import { useState } from 'react';
import { GameBoard } from './components/GameBoard';
import { Lobby } from './components/Lobby';
import { RosharBackground } from './components/RosharBackground';
import { useGameStore } from './store/gameStore';
import { useMultiplayerSync } from './firebase/useMultiplayerSync';

type Session = { mode: 'local' } | { mode: 'online'; matchId: string; role: 'player1' | 'player2' };

function getInitialSession(): Session | null {
  const params = new URLSearchParams(window.location.search);
  const matchId = params.get('match');
  const role = params.get('role');
  if (matchId && (role === 'player1' || role === 'player2')) {
    return { mode: 'online', matchId, role };
  }
  return null;
}

function clearMatchParams() {
  const url = new URL(window.location.href);
  url.searchParams.delete('match');
  url.searchParams.delete('role');
  window.history.replaceState(null, '', url.toString());
}

function App() {
  const [session, setSession] = useState<Session | null>(getInitialSession);
  const startGame = useGameStore((state) => state.startGame);

  useMultiplayerSync(session?.mode === 'online' ? session.matchId : null);

  if (!session) {
    return (
      <>
        <RosharBackground />
        <Lobby
        onStartLocal={(deck1Id, deck2Id) => {
          startGame(deck1Id, deck2Id);
          setSession({ mode: 'local' });
        }}
        onJoinMatch={(matchId, role, decks) => {
          // Le créateur du salon fixe les decks ; le joueur qui rejoint
          // recevra l'état complet via la synchro Firebase.
          if (decks) startGame(decks[0], decks[1]);
          const url = new URL(window.location.href);
          url.searchParams.set('match', matchId);
          url.searchParams.set('role', role);
          window.history.replaceState(null, '', url.toString());
          setSession({ mode: 'online', matchId, role });
        }}
        />
      </>
    );
  }

  return (
    <>
      <RosharBackground />
      <GameBoard
        localPlayerId={session.mode === 'online' ? session.role : 'player1'}
        hotseat={session.mode === 'local'}
        onExit={() => {
          clearMatchParams();
          setSession(null);
        }}
      />
    </>
  );
}

export default App;

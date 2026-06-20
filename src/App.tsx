import { useState } from 'react';
import { GameBoard } from './components/GameBoard';
import { Lobby } from './components/Lobby';
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

function App() {
  const [session, setSession] = useState<Session | null>(getInitialSession);

  useMultiplayerSync(session?.mode === 'online' ? session.matchId : null);

  if (!session) {
    return (
      <Lobby
        onStartLocal={() => setSession({ mode: 'local' })}
        onJoinMatch={(matchId, role) => {
          const url = new URL(window.location.href);
          url.searchParams.set('match', matchId);
          url.searchParams.set('role', role);
          window.history.replaceState(null, '', url.toString());
          setSession({ mode: 'online', matchId, role });
        }}
      />
    );
  }

  return (
    <GameBoard
      localPlayerId={session.mode === 'online' ? session.role : 'player1'}
      hotseat={session.mode === 'local'}
    />
  );
}

export default App;

import { useState } from 'react';
import { isFirebaseConfigured } from '../firebase/config';
import './Lobby.css';

interface LobbyProps {
  onStartLocal: () => void;
  onJoinMatch: (matchId: string, role: 'player1' | 'player2') => void;
}

function randomMatchId(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function Lobby({ onStartLocal, onJoinMatch }: LobbyProps) {
  const [matchId, setMatchId] = useState('');

  return (
    <div className="lobby">
      <h1>Archives de Roshar</h1>
      <p className="lobby__subtitle">Windrunners — prototype</p>

      <section className="lobby__section">
        <h2>Partie locale</h2>
        <p>Les deux joueurs jouent à tour de rôle sur cet écran.</p>
        <button type="button" onClick={onStartLocal}>
          Démarrer une partie locale
        </button>
      </section>

      <section className="lobby__section">
        <h2>Partie multijoueur</h2>
        {!isFirebaseConfigured && (
          <p className="lobby__warning">
            Firebase n'est pas configuré (voir .env.example). Le multijoueur en ligne est indisponible.
          </p>
        )}
        <div className="lobby__row">
          <button type="button" disabled={!isFirebaseConfigured} onClick={() => onJoinMatch(randomMatchId(), 'player1')}>
            Créer un salon
          </button>
        </div>
        <div className="lobby__row">
          <input
            type="text"
            placeholder="Code du salon"
            value={matchId}
            onChange={(event) => setMatchId(event.target.value.toUpperCase())}
          />
          <button
            type="button"
            disabled={!isFirebaseConfigured || matchId.trim().length === 0}
            onClick={() => onJoinMatch(matchId.trim(), 'player2')}
          >
            Rejoindre
          </button>
        </div>
      </section>
    </div>
  );
}

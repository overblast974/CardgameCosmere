import { useState } from 'react';
import { isFirebaseConfigured } from '../firebase/config';
import { deckBundles, DEFAULT_DECK_IDS } from '../data/cards/loader';
import { cardArt } from '../assets/artwork';
import './Lobby.css';

interface LobbyProps {
  onStartLocal: (deck1Id: string, deck2Id: string) => void;
  onStartSolo: (deck1Id: string, deck2Id: string) => void;
  onJoinMatch: (matchId: string, role: 'player1' | 'player2', decks?: [string, string]) => void;
}

const HERO_GLYPHS: Record<string, string> = {
  'kaladin-stormblessed': '⚡',
  'szeth-vallano': '🗡️',
};

function randomMatchId(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

interface DeckPickerProps {
  label: string;
  value: string;
  onChange: (deckId: string) => void;
}

function DeckPicker({ label, value, onChange }: DeckPickerProps) {
  return (
    <div className="deck-picker">
      <span className="deck-picker__label">{label}</span>
      <div className="deck-picker__options">
        {Object.values(deckBundles).map((bundle) => (
          <button
            key={bundle.deck.id}
            type="button"
            className={`deck-picker__option deck-picker__option--${bundle.heroDefinition.order.toLowerCase()}${
              value === bundle.deck.id ? ' deck-picker__option--selected' : ''
            }`}
            onClick={() => onChange(bundle.deck.id)}
          >
            {cardArt[bundle.hero.id] ? (
              <img className="deck-picker__art" src={cardArt[bundle.hero.id]} alt="" />
            ) : (
              <span className="deck-picker__glyph">{HERO_GLYPHS[bundle.hero.id] ?? '🃏'}</span>
            )}
            <span className="deck-picker__hero">{bundle.hero.name}</span>
            <span className="deck-picker__deck-name">{bundle.deck.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function Lobby({ onStartLocal, onStartSolo, onJoinMatch }: LobbyProps) {
  const [matchId, setMatchId] = useState('');
  const [deck1, setDeck1] = useState<string>(DEFAULT_DECK_IDS[0]);
  const [deck2, setDeck2] = useState<string>(DEFAULT_DECK_IDS[1]);

  return (
    <div className="lobby">
      <header className="lobby__header">
        <h1>Archives de Roshar</h1>
        <p className="lobby__subtitle">Le jeu de cartes des Chevaliers Radieux</p>
      </header>

      <section className="lobby__section">
        <h2>Choix des decks</h2>
        <DeckPicker label="Joueur 1" value={deck1} onChange={setDeck1} />
        <DeckPicker label="Joueur 2" value={deck2} onChange={setDeck2} />
      </section>

      <section className="lobby__section">
        <h2>Partie locale</h2>
        <p className="lobby__hint">Les deux joueurs jouent à tour de rôle sur cet écran.</p>
        <button type="button" className="lobby__cta" onClick={() => onStartSolo(deck1, deck2)}>
          🤖 Jouer contre l'IA (vous : joueur 1)
        </button>
        <button type="button" className="lobby__cta lobby__cta--secondary" onClick={() => onStartLocal(deck1, deck2)}>
          ⚔️ Partie locale à deux (tour à tour)
        </button>
      </section>

      <section className="lobby__section">
        <h2>Partie en ligne</h2>
        {!isFirebaseConfigured && (
          <p className="lobby__warning">
            Firebase n'est pas configuré (voir .env.example). Le multijoueur en ligne est indisponible.
          </p>
        )}
        <div className="lobby__row">
          <button
            type="button"
            disabled={!isFirebaseConfigured}
            onClick={() => onJoinMatch(randomMatchId(), 'player1', [deck1, deck2])}
          >
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

import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { CardComponent } from './CardComponent';
import { HeroPanel } from './HeroPanel';
import { PlayerHand } from './PlayerHand';
import './GameBoard.css';

const LOCAL_PLAYER_ID = 'player1';
const OPPONENT_PLAYER_ID = 'player2';

export function GameBoard() {
  const game = useGameStore((state) => state.game);
  const playCard = useGameStore((state) => state.playCard);
  const endTurn = useGameStore((state) => state.endTurn);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const localPlayer = game.players[LOCAL_PLAYER_ID];
  const opponent = game.players[OPPONENT_PLAYER_ID];
  const isLocalTurn = game.activePlayerId === LOCAL_PLAYER_ID;

  const handlePlayCard = (index: number) => {
    if (!isLocalTurn) return;
    playCard(LOCAL_PLAYER_ID, index);
    setSelectedIndex(null);
  };

  return (
    <div className="game-board">
      <header className="game-board__status">
        <span>Tour {game.turn}</span>
        <span>{isLocalTurn ? 'Votre tour' : `Tour de ${opponent.name}`}</span>
        <button type="button" onClick={endTurn} disabled={!isLocalTurn}>
          Passer le tour
        </button>
      </header>

      <section className="game-board__zone game-board__zone--opponent">
        <HeroPanel player={opponent} isActive={!isLocalTurn} />
        <div className="game-board__units">
          {opponent.board.map((unit) => (
            <CardComponent key={unit.instanceId} card={unit.card} sprenLevel={opponent.linkLevel} />
          ))}
        </div>
      </section>

      <section className="game-board__zone game-board__zone--local">
        <div className="game-board__units">
          {localPlayer.board.map((unit) => (
            <CardComponent key={unit.instanceId} card={unit.card} sprenLevel={localPlayer.linkLevel} />
          ))}
        </div>
        <HeroPanel player={localPlayer} isActive={isLocalTurn} />
      </section>

      <footer className="game-board__hand">
        <PlayerHand
          cards={localPlayer.hand}
          stormlight={localPlayer.stormlight}
          onPlayCard={handlePlayCard}
          selectedIndex={selectedIndex}
        />
      </footer>
    </div>
  );
}

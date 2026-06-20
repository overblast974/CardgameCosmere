import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { CardComponent } from './CardComponent';
import { HeroPanel } from './HeroPanel';
import { PlayerHand } from './PlayerHand';
import type { UnitInPlay } from '../types/game';
import './GameBoard.css';

type ActionMode =
  | { type: 'idle' }
  | { type: 'attack'; attackerInstanceId: string }
  | { type: 'guard'; protectorInstanceId: string }
  | { type: 'lashing' };

interface GameBoardProps {
  localPlayerId?: string;
  /** En mode local « hotseat », la perspective suit toujours le joueur actif. */
  hotseat?: boolean;
}

export function GameBoard({ localPlayerId = 'player1', hotseat = false }: GameBoardProps) {
  const game = useGameStore((state) => state.game);
  const playCard = useGameStore((state) => state.playCard);
  const endTurn = useGameStore((state) => state.endTurn);
  const attackUnit = useGameStore((state) => state.attackUnit);
  const attackHero = useGameStore((state) => state.attackHero);
  const declareGuard = useGameStore((state) => state.declareGuard);
  const triggerLashing = useGameStore((state) => state.useLashing);

  const [mode, setMode] = useState<ActionMode>({ type: 'idle' });

  // En hotseat, le joueur « local » est toujours celui dont c'est le tour.
  const perspectiveId = hotseat ? game.activePlayerId : localPlayerId;
  const playerIds = Object.keys(game.players);
  const opponentId = playerIds.find((id) => id !== perspectiveId) ?? perspectiveId;
  const localPlayer = game.players[perspectiveId];
  const opponent = game.players[opponentId];
  const isLocalTurn = game.activePlayerId === perspectiveId;

  if (!localPlayer || !opponent) return null;

  if (game.winnerId) {
    const localWon = game.winnerId === perspectiveId;
    return (
      <div className="game-board game-board--ended">
        <h1>{hotseat ? 'Partie terminée' : localWon ? 'Victoire !' : 'Défaite'}</h1>
        <p>{game.players[game.winnerId].name} l'emporte.</p>
      </div>
    );
  }

  const resetMode = () => setMode({ type: 'idle' });

  const handleEndTurn = () => {
    resetMode();
    endTurn();
  };

  const handlePlayCard = (index: number) => {
    if (!isLocalTurn) return;
    playCard(perspectiveId, index);
  };

  const handleLocalUnitClick = (unit: UnitInPlay) => {
    if (!isLocalTurn) return;
    if (mode.type === 'guard') {
      declareGuard(perspectiveId, mode.protectorInstanceId, unit.instanceId);
      resetMode();
      return;
    }
    if (unit.canAttack && !unit.isLashed) {
      setMode({ type: 'attack', attackerInstanceId: unit.instanceId });
    }
  };

  const handleLocalHeroClick = () => {
    if (!isLocalTurn || mode.type !== 'guard') return;
    declareGuard(perspectiveId, mode.protectorInstanceId, 'hero');
    resetMode();
  };

  const handleOpponentUnitClick = (unit: UnitInPlay) => {
    if (!isLocalTurn) return;
    if (mode.type === 'attack') {
      attackUnit(perspectiveId, mode.attackerInstanceId, unit.instanceId);
      resetMode();
    } else if (mode.type === 'lashing') {
      triggerLashing(perspectiveId, unit.instanceId);
      resetMode();
    }
  };

  const handleOpponentHeroClick = () => {
    if (!isLocalTurn || mode.type !== 'attack') return;
    attackHero(perspectiveId, mode.attackerInstanceId);
    resetMode();
  };

  const handleGuardButton = (unit: UnitInPlay) => {
    setMode({ type: 'guard', protectorInstanceId: unit.instanceId });
  };

  const handleLashingButton = () => {
    setMode({ type: 'lashing' });
  };

  return (
    <div className="game-board">
      <header className="game-board__status">
        <span>Tour {game.turn}</span>
        <span>{hotseat ? `Tour de ${localPlayer.name}` : isLocalTurn ? 'Votre tour' : `Tour de ${opponent.name}`}</span>
        {mode.type !== 'idle' && (
          <span className="game-board__hint">
            {mode.type === 'attack' && 'Choisissez une cible ennemie...'}
            {mode.type === 'guard' && 'Choisissez l\'allié à protéger...'}
            {mode.type === 'lashing' && 'Choisissez une unité ennemie à Lasher...'}
            <button type="button" onClick={resetMode}>
              Annuler
            </button>
          </span>
        )}
        {isLocalTurn && localPlayer.linkLevel >= 3 && !localPlayer.heroAbilityUsedThisTurn && mode.type === 'idle' && (
          <button type="button" onClick={handleLashingButton}>
            Lashing (Jureur)
          </button>
        )}
        <button type="button" onClick={handleEndTurn} disabled={!isLocalTurn}>
          Passer le tour
        </button>
      </header>

      <section className="game-board__zone game-board__zone--opponent">
        <HeroPanel
          player={opponent}
          isActive={!isLocalTurn}
          onClick={mode.type === 'attack' ? handleOpponentHeroClick : undefined}
          targetable={mode.type === 'attack'}
        />
        <div className="game-board__units">
          {opponent.board.map((unit) => (
            <CardComponent
              key={unit.instanceId}
              card={unit.card}
              sprenLevel={opponent.linkLevel}
              disabled={!(mode.type === 'attack' || mode.type === 'lashing')}
              onClick={() => handleOpponentUnitClick(unit)}
            />
          ))}
        </div>
      </section>

      <section className="game-board__zone game-board__zone--local">
        <div className="game-board__units">
          {localPlayer.board.map((unit) => (
            <div key={unit.instanceId} className="game-board__unit-slot">
              <CardComponent
                card={unit.card}
                sprenLevel={localPlayer.linkLevel}
                selected={mode.type === 'attack' && mode.attackerInstanceId === unit.instanceId}
                disabled={!isLocalTurn || mode.type === 'lashing'}
                onClick={() => handleLocalUnitClick(unit)}
              />
              <div className="game-board__unit-actions">
                {unit.guarding && <span className="game-board__guard-badge">Protège</span>}
                {isLocalTurn && unit.card.id === 'bridge-four-soldier' && mode.type === 'idle' && (
                  <button type="button" onClick={() => handleGuardButton(unit)}>
                    Couverture
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <HeroPanel
          player={localPlayer}
          isActive={isLocalTurn}
          onClick={mode.type === 'guard' ? handleLocalHeroClick : undefined}
          targetable={mode.type === 'guard'}
        />
      </section>

      <footer className="game-board__hand">
        <PlayerHand cards={localPlayer.hand} stormlight={localPlayer.stormlight} onPlayCard={handlePlayCard} />
      </footer>
    </div>
  );
}

import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { getDeckBundle } from '../data/cards/loader';
import { CardComponent } from './CardComponent';
import { HeroPanel } from './HeroPanel';
import { PlayerHand } from './PlayerHand';
import type { UnitInPlay } from '../types/game';
import type { Card, SurgeCard, FabrialCard } from '../types/card';
import './GameBoard.css';

type ActionMode =
  | { type: 'idle' }
  | { type: 'attack'; attackerInstanceId: string }
  | { type: 'guard'; protectorInstanceId: string }
  | { type: 'power' }
  | { type: 'card'; cardIndex: number; side: 'enemy' | 'ally' };

interface GameBoardProps {
  localPlayerId?: string;
  /** En mode local « hotseat », la perspective suit toujours le joueur actif. */
  hotseat?: boolean;
  onExit?: () => void;
}

const MODE_HINTS: Record<Exclude<ActionMode['type'], 'idle'>, string> = {
  attack: 'Choisissez une cible ennemie',
  guard: "Choisissez l'allié à protéger (ou le héros)",
  power: 'Choisissez une unité ennemie',
  card: 'Choisissez une cible pour la carte',
};

function isTargetedCard(card: SurgeCard | FabrialCard): 'enemy' | 'ally' | null {
  switch (card.effectType) {
    case 'damage':
    case 'disable':
    case 'bounce':
      return 'enemy';
    case 'buff':
      return 'ally';
    default:
      return null;
  }
}

export function GameBoard({ localPlayerId = 'player1', hotseat = false, onExit }: GameBoardProps) {
  const game = useGameStore((state) => state.game);
  const playCard = useGameStore((state) => state.playCard);
  const playTargetedCard = useGameStore((state) => state.playTargetedCard);
  const endTurn = useGameStore((state) => state.endTurn);
  const attackUnit = useGameStore((state) => state.attackUnit);
  const attackHero = useGameStore((state) => state.attackHero);
  const declareGuard = useGameStore((state) => state.declareGuard);
  const triggerHeroPower = useGameStore((state) => state.useHeroPower);
  const startGame = useGameStore((state) => state.startGame);

  const [mode, setMode] = useState<ActionMode>({ type: 'idle' });
  const [passPending, setPassPending] = useState(false);

  // En hotseat, le joueur « local » est toujours celui dont c'est le tour.
  const perspectiveId = hotseat ? game.activePlayerId : localPlayerId;
  const playerIds = Object.keys(game.players);
  const opponentId = playerIds.find((id) => id !== perspectiveId) ?? perspectiveId;
  const localPlayer = game.players[perspectiveId];
  const opponent = game.players[opponentId];
  const isLocalTurn = game.activePlayerId === perspectiveId;

  if (!localPlayer || !opponent) return null;

  const heroDefinition = getDeckBundle(localPlayer.deckId).heroDefinition;

  if (game.winnerId) {
    const winner = game.players[game.winnerId];
    const localWon = game.winnerId === perspectiveId;
    return (
      <div className="game-board game-board--ended">
        <div className="game-over">
          <span className="game-over__glyph">{hotseat || localWon ? '🏆' : '💀'}</span>
          <h1>{hotseat ? 'Partie terminée' : localWon ? 'Victoire !' : 'Défaite'}</h1>
          <p>
            <strong>{winner.name}</strong> l'emporte avec {winner.heroCard.name}.
          </p>
          <div className="game-over__actions">
            <button
              type="button"
              className="game-over__replay"
              onClick={() => {
                setMode({ type: 'idle' });
                setPassPending(false);
                startGame(game.players.player1.deckId, game.players.player2.deckId);
              }}
            >
              ⚔️ Rejouer
            </button>
            {onExit && (
              <button type="button" className="game-over__menu" onClick={onExit}>
                Menu principal
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const resetMode = () => setMode({ type: 'idle' });

  const handleEndTurn = () => {
    resetMode();
    endTurn();
    if (hotseat) setPassPending(true);
  };

  const handlePlayCard = (index: number) => {
    if (!isLocalTurn) return;
    const card = localPlayer.hand[index];
    if (!card || card.cost > localPlayer.stormlight) return;

    if (card.type === 'surge' || card.type === 'fabrial') {
      const side = isTargetedCard(card);
      if (side === 'enemy') {
        if (opponent.board.length === 0) return;
        setMode({ type: 'card', cardIndex: index, side });
        return;
      }
      if (side === 'ally') {
        if (localPlayer.board.length === 0) return;
        setMode({ type: 'card', cardIndex: index, side });
        return;
      }
    }
    playCard(perspectiveId, index);
  };

  const handleLocalUnitClick = (unit: UnitInPlay) => {
    if (!isLocalTurn) return;
    if (mode.type === 'guard') {
      declareGuard(perspectiveId, mode.protectorInstanceId, unit.instanceId);
      resetMode();
      return;
    }
    if (mode.type === 'card' && mode.side === 'ally') {
      playTargetedCard(perspectiveId, mode.cardIndex, unit.instanceId);
      resetMode();
      return;
    }
    if (mode.type === 'attack' && mode.attackerInstanceId === unit.instanceId) {
      resetMode();
      return;
    }
    if (mode.type === 'idle' && unit.canAttack && !unit.isLashed) {
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
    } else if (mode.type === 'power') {
      triggerHeroPower(perspectiveId, unit.instanceId);
      resetMode();
    } else if (mode.type === 'card' && mode.side === 'enemy') {
      playTargetedCard(perspectiveId, mode.cardIndex, unit.instanceId);
      resetMode();
    }
  };

  const handleOpponentHeroClick = () => {
    if (!isLocalTurn || mode.type !== 'attack') return;
    attackHero(perspectiveId, mode.attackerInstanceId);
    resetMode();
  };

  // Une carte ciblée sans cible valide est injouable (grisée en main).
  const canPlayFromHand = (card: Card): boolean => {
    if (card.type === 'surge' || card.type === 'fabrial') {
      const side = isTargetedCard(card);
      if (side === 'enemy') return opponent.board.length > 0;
      if (side === 'ally') return localPlayer.board.length > 0;
    }
    return true;
  };

  const enemyTargetable =
    mode.type === 'attack' || mode.type === 'power' || (mode.type === 'card' && mode.side === 'enemy');
  const allyTargetable = mode.type === 'guard' || (mode.type === 'card' && mode.side === 'ally');
  const canUsePower =
    isLocalTurn && localPlayer.linkLevel >= 3 && !localPlayer.heroAbilityUsedThisTurn && opponent.board.length > 0;

  return (
    <div className="game-board">
      {passPending && (
        <div className="pass-overlay">
          <div className="pass-overlay__panel">
            <span className="pass-overlay__glyph">🌪️</span>
            <h2>Tour {game.turn}</h2>
            <p>
              Passez l'appareil à <strong>{localPlayer.name}</strong>
            </p>
            <button type="button" onClick={() => setPassPending(false)}>
              Commencer le tour
            </button>
          </div>
        </div>
      )}

      <header className="game-board__hud">
        <div className="game-board__hud-left">
          {onExit && (
            <button type="button" className="game-board__exit" onClick={onExit} title="Quitter la partie">
              ✕
            </button>
          )}
          <span className="game-board__turn">Tour {game.turn}</span>
        </div>
        <div className="game-board__hud-center">
          <span className="game-board__active">
            {hotseat ? `Tour de ${localPlayer.name}` : isLocalTurn ? 'Votre tour' : `Tour de ${opponent.name}`}
          </span>
        </div>
        <div className="game-board__hud-right">
          {canUsePower && mode.type === 'idle' && (
            <button type="button" className="game-board__power" onClick={() => setMode({ type: 'power' })}>
              ✨ {heroDefinition.heroPowerName}
            </button>
          )}
          <button type="button" className="game-board__end-turn" onClick={handleEndTurn} disabled={!isLocalTurn}>
            Fin du tour
          </button>
        </div>
      </header>

      {mode.type !== 'idle' && (
        <div className="game-board__hint">
          <span>{MODE_HINTS[mode.type]}</span>
          <button type="button" onClick={resetMode}>
            Annuler
          </button>
        </div>
      )}

      <section className="game-board__zone game-board__zone--opponent">
        <HeroPanel
          player={opponent}
          isActive={!isLocalTurn}
          compact
          onClick={mode.type === 'attack' ? handleOpponentHeroClick : undefined}
          targetable={mode.type === 'attack'}
        />
        <div className="game-board__units game-board__units--opponent">
          {opponent.board.length === 0 && <span className="game-board__empty">Aucune unité</span>}
          {opponent.board.map((unit) => (
            <CardComponent
              key={unit.instanceId}
              card={unit.card}
              currentAttack={unit.currentAttack}
              currentHealth={unit.currentHealth}
              lashed={unit.isLashed}
              guarding={Boolean(unit.guarding)}
              targetable={enemyTargetable}
              disabled={!enemyTargetable}
              compact
              onClick={() => handleOpponentUnitClick(unit)}
            />
          ))}
        </div>
      </section>

      <div className="game-board__divider" aria-hidden="true" />

      <section className="game-board__zone game-board__zone--local">
        <div className="game-board__units">
          {localPlayer.board.length === 0 && <span className="game-board__empty">Aucune unité</span>}
          {localPlayer.board.map((unit) => (
            <div key={unit.instanceId} className="game-board__unit-slot">
              <CardComponent
                card={unit.card}
                currentAttack={unit.currentAttack}
                currentHealth={unit.currentHealth}
                lashed={unit.isLashed}
                guarding={Boolean(unit.guarding)}
                exhausted={isLocalTurn && !unit.canAttack && !unit.isLashed}
                selected={mode.type === 'attack' && mode.attackerInstanceId === unit.instanceId}
                targetable={allyTargetable}
                disabled={!isLocalTurn || mode.type === 'power' || (mode.type === 'card' && mode.side === 'enemy')}
                compact
                onClick={() => handleLocalUnitClick(unit)}
              />
              {isLocalTurn && unit.card.keywords?.includes('couverture') && !unit.guarding && mode.type === 'idle' && (
                <button
                  type="button"
                  className="game-board__guard-btn"
                  onClick={() => setMode({ type: 'guard', protectorInstanceId: unit.instanceId })}
                >
                  🛡️ Protéger
                </button>
              )}
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
        <PlayerHand
          cards={localPlayer.hand}
          stormlight={localPlayer.stormlight}
          onPlayCard={handlePlayCard}
          selectedIndex={mode.type === 'card' ? mode.cardIndex : null}
          disabled={!isLocalTurn}
          canPlay={canPlayFromHand}
        />
      </footer>
    </div>
  );
}

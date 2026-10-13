import { useEffect, useRef, useState } from 'react';
import { MAX_BOARD_UNITS, canHeroAttack, getEffectiveAttack, useGameStore } from '../store/gameStore';
import { useFxStore } from '../store/fxStore';
import { getDeckBundle } from '../data/cards/loader';
import { CardComponent } from './CardComponent';
import { HeroPanel } from './HeroPanel';
import { PlayerHand } from './PlayerHand';
import { CombatFX } from './CombatFX';
import { OathCeremony } from './OathCeremony';
import { BattlefieldMap } from './BattlefieldMap';
import { captureFxRects, diffAndSpawn, heroFxId, lunge, playClipOn } from '../game/combatFx';
import { useDragSource } from '../game/useDragSource';
import { chooseNextAction } from '../game/ai';
import type { AiAction } from '../game/ai';
import type { DragSource } from '../game/useDragSource';
import type { FxKind } from '../store/fxStore';
import { heroStageArtFor } from '../assets/artwork';
import type { VfxClip } from '../assets/artwork';
import type { UnitInPlay } from '../types/game';
import type { Card, LinkLevel, SurgeCard, FabrialCard } from '../types/card';
import { LINK_LEVEL_NAMES } from '../types/card';
import './GameBoard.css';

type ActionMode =
  | { type: 'idle' }
  | { type: 'attack'; attackerInstanceId: string }
  | { type: 'heroAttack' }
  | { type: 'guard'; protectorInstanceId: string }
  | { type: 'power' }
  | { type: 'card'; cardIndex: number; side: 'enemy' | 'ally' }
  | { type: 'play'; cardIndex: number };

interface GameBoardProps {
  localPlayerId?: string;
  /** En mode local « hotseat », la perspective suit toujours le joueur actif. */
  hotseat?: boolean;
  /** Joueur piloté par l'IA (mode solo) : ses tours se jouent tout seuls. */
  aiPlayerId?: string;
  onExit?: () => void;
}

/** Délai entre deux actions de l'IA, pour laisser lire les effets. */
const AI_STEP_MS = 750;

/** Applique une action de l'IA avec les mêmes effets visuels qu'un joueur humain. */
function applyAiAction(action: AiAction, playerId: string): void {
  const s = useGameStore.getState();
  const before = s.game;
  const me = before.players[playerId];
  const heroDefinition = getDeckBundle(me.deckId).heroDefinition;
  switch (action.type) {
    case 'play': {
      const card = me.hand[action.index];
      const clip = card ? spellClip(card) : undefined;
      runWithFx('damage', () => s.playCard(playerId, action.index), {
        clip,
        clipOnFxId: clip === 'stormlight' ? heroFxId(playerId) : undefined,
      });
      break;
    }
    case 'playTargeted': {
      const card = me.hand[action.index];
      runWithFx(card ? spellFxKind(card) : 'spell', () => s.playTargetedCard(playerId, action.index, action.targetInstanceId), {
        clip: card ? spellClip(card) : undefined,
      });
      break;
    }
    case 'guard':
      s.declareGuard(playerId, action.protectorInstanceId, action.target);
      break;
    case 'power': {
      const isLashing = heroDefinition.heroPowerType === 'lashing';
      runWithFx(isLashing ? 'disable' : 'damage', () => s.useHeroPower(playerId, action.targetInstanceId), {
        clip: isLashing ? 'lashing' : 'division',
      });
      break;
    }
    case 'attack':
      runWithFx('attack', () => s.attackUnit(playerId, action.attackerInstanceId, action.defenderInstanceId), {
        attackerFxId: action.attackerInstanceId,
      });
      break;
    case 'attackHero':
      runWithFx('attack', () => s.attackHero(playerId, action.attackerInstanceId), { attackerFxId: action.attackerInstanceId });
      break;
    case 'heroStrikeUnit':
      runWithFx('attack', () => s.heroAttackUnit(playerId, action.defenderInstanceId), { attackerFxId: heroFxId(playerId) });
      break;
    case 'heroStrikeHero':
      runWithFx('attack', () => s.heroAttackHero(playerId), { attackerFxId: heroFxId(playerId) });
      break;
    case 'end':
      s.endTurn();
      return;
  }
  // Garde-fou : une action refusée par le moteur ne doit jamais bloquer l'IA.
  if (useGameStore.getState().game === before) s.endTurn();
}

const MODE_HINTS: Record<Exclude<ActionMode['type'], 'idle'>, string> = {
  attack: 'Choisissez une cible ennemie',
  heroAttack: "Choisissez la cible de la Lame d'Éclat",
  guard: "Choisissez l'allié à protéger (ou le héros)",
  power: 'Choisissez une unité ennemie',
  card: 'Choisissez une cible pour la carte',
  play: 'Déposez la carte sur votre champ de bataille',
};

function isTargetedCard(card: SurgeCard | FabrialCard): 'enemy' | 'ally' | null {
  switch (card.effectType) {
    case 'damage':
    case 'disable':
    case 'lash':
    case 'bounce':
      return 'enemy';
    case 'buff':
      return 'ally';
    default:
      return null;
  }
}

function targetSideOf(card: Card): 'enemy' | 'ally' | null {
  return card.type === 'surge' || card.type === 'fabrial' ? isTargetedCard(card) : null;
}

/** Couleur d'effet visuel associée à un sort selon son type. */
function spellFxKind(card: Card): FxKind {
  if ('effectType' in card) {
    switch (card.effectType) {
      case 'damage':
        return 'damage';
      case 'disable':
      case 'lash':
        return 'disable';
      case 'bounce':
        return 'bounce';
      case 'buff':
        return 'buff';
    }
  }
  return 'spell';
}

/**
 * Clip vidéo d'effet associé à une carte. Le choix suit la nature de la magie,
 * pas sa couleur par défaut : les Lashings (gravité) soufflent une bourrasque
 * de Stormlight, la Division brûle et effrite, les sphères libèrent une brume
 * froide. Aucune « flamme » générique : le feu n'existe que pour la Division.
 */
function spellClip(card: Card): VfxClip | undefined {
  switch (card.id) {
    case 'lashing-basique':
    case 'lashing-complet':
    case 'contre-gravite':
    case 'gravitation':
      return 'lashing';
    case 'division':
      return 'division';
    case 'sphere-infusion':
    case 'sphere-de-jugement':
    case 'loi-du-ciel':
    case 'cri-du-pont-quatre':
      return 'stormlight';
    default:
      return undefined;
  }
}

interface FxOptions {
  /** Anime en plus le bond de l'attaquant. */
  attackerFxId?: string;
  /** Clip vidéo joué sur chaque unité touchée. */
  clip?: VfxClip;
  /** Clip vidéo joué sur un élément précis (ex. le héros qui gagne de la Stormlight). */
  clipOnFxId?: string;
}

/**
 * Exécute une action du jeu en capturant les positions des cibles avant la
 * mutation, puis déclenche les effets visuels correspondants.
 */
function runWithFx(kind: FxKind, action: () => void, options: FxOptions = {}) {
  const before = useGameStore.getState().game;
  const rects = captureFxRects();
  action();
  const after = useGameStore.getState().game;
  if (after === before) return; // action invalide : rien ne s'est passé
  diffAndSpawn(before, after, rects, kind, options.clip);
  if (options.clipOnFxId && options.clip) playClipOn(options.clipOnFxId, options.clip);
  // setTimeout (et non rAF) pour s'exécuter après le commit React qui réécrit
  // la className de la carte, sinon le bond serait effacé aussitôt.
  if (options.attackerFxId) setTimeout(() => lunge(options.attackerFxId!), 0);
}

/** Décode un `data-drop` : `enemy-unit:<id>` → { zone: 'enemy-unit', id }. */
function parseDrop(target: string | null): { zone: string; id?: string } | null {
  if (!target) return null;
  const [zone, id] = target.split(':');
  return { zone, id };
}

export function GameBoard({ localPlayerId = 'player1', hotseat = false, aiPlayerId, onExit }: GameBoardProps) {
  const game = useGameStore((state) => state.game);
  const playCard = useGameStore((state) => state.playCard);
  const playTargetedCard = useGameStore((state) => state.playTargetedCard);
  const endTurn = useGameStore((state) => state.endTurn);
  const attackUnit = useGameStore((state) => state.attackUnit);
  const attackHero = useGameStore((state) => state.attackHero);
  const heroAttackUnit = useGameStore((state) => state.heroAttackUnit);
  const heroAttackHero = useGameStore((state) => state.heroAttackHero);
  const declareGuard = useGameStore((state) => state.declareGuard);
  const triggerHeroPower = useGameStore((state) => state.useHeroPower);
  const startGame = useGameStore((state) => state.startGame);

  const [mode, setMode] = useState<ActionMode>({ type: 'idle' });
  const [passPending, setPassPending] = useState(false);
  const [preview, setPreview] = useState<Card | null>(null);

  // Cérémonie de serment : dès qu'un héros gagne un niveau de Lien (localement
  // ou via la synchro en ligne), on met en file une cérémonie par niveau gagné.
  const linkLevelsRef = useRef<Record<string, LinkLevel>>({});
  useEffect(() => {
    const enqueue = useFxStore.getState().enqueueCeremony;
    const previous = linkLevelsRef.current;
    const next: Record<string, LinkLevel> = {};
    for (const playerId of Object.keys(game.players)) {
      const player = game.players[playerId];
      next[playerId] = player.linkLevel;
      const before = previous[playerId];
      if (before === undefined || player.linkLevel <= before) continue;
      const definition = getDeckBundle(player.deckId).heroDefinition;
      for (let level = before + 1; level <= player.linkLevel; level += 1) {
        const linkLevel = level as LinkLevel;
        const oathLevel = linkLevel as 1 | 2 | 3 | 4;
        const ability = definition.abilities.find((a) => a.linkLevelRequired === linkLevel);
        enqueue({
          playerId,
          playerName: player.name,
          heroId: player.heroCard.id,
          heroName: player.heroCard.name,
          level: linkLevel,
          oath: definition.oaths[oathLevel],
          abilityName: ability?.name ?? LINK_LEVEL_NAMES[linkLevel],
          abilityDescription: ability?.description ?? '',
          manifestation: definition.manifestations.find((m) => m.linkLevel === linkLevel),
        });
      }
    }
    linkLevelsRef.current = next;
  }, [game]);

  // En hotseat, le joueur « local » est toujours celui dont c'est le tour.
  const perspectiveId = hotseat ? game.activePlayerId : localPlayerId;
  const playerIds = Object.keys(game.players);
  const opponentId = playerIds.find((id) => id !== perspectiveId) ?? perspectiveId;
  const localPlayer = game.players[perspectiveId];
  const opponent = game.players[opponentId];
  const isLocalTurn = game.activePlayerId === perspectiveId;

  const heroDefinition = getDeckBundle(localPlayer.deckId).heroDefinition;

  const resetMode = () => setMode({ type: 'idle' });

  // Une carte ciblée sans cible valide est injouable (grisée en main).
  const canPlayFromHand = (card: Card): boolean => {
    const side = targetSideOf(card);
    if (side === 'enemy') return opponent.board.length > 0;
    if (side === 'ally') return localPlayer.board.length > 0;
    if (card.type === 'radiant' || card.type === 'heraut') return localPlayer.board.length < MAX_BOARD_UNITS;
    return true;
  };

  // ---------- Actions de jeu (communes au tap et à la saisie) ----------

  const playUntargeted = (index: number) => {
    const card = localPlayer.hand[index];
    if (!card) return;
    const clip = spellClip(card);
    runWithFx('damage', () => playCard(perspectiveId, index), {
      clip,
      clipOnFxId: clip === 'stormlight' ? heroFxId(perspectiveId) : undefined,
    });
  };

  const playTargeted = (index: number, targetInstanceId: string) => {
    const card = localPlayer.hand[index];
    if (!card) return;
    runWithFx(spellFxKind(card), () => playTargetedCard(perspectiveId, index, targetInstanceId), {
      clip: spellClip(card),
    });
  };

  const attackWith = (attackerId: string, defenderId: string) =>
    runWithFx('attack', () => attackUnit(perspectiveId, attackerId, defenderId), { attackerFxId: attackerId });

  const attackHeroWith = (attackerId: string) =>
    runWithFx('attack', () => attackHero(perspectiveId, attackerId), { attackerFxId: attackerId });

  const strikeUnit = (defenderId: string) =>
    runWithFx('attack', () => heroAttackUnit(perspectiveId, defenderId), { attackerFxId: heroFxId(perspectiveId) });

  const strikeHero = () =>
    runWithFx('attack', () => heroAttackHero(perspectiveId), { attackerFxId: heroFxId(perspectiveId) });

  const castPowerOn = (targetId: string) => {
    const isLashing = heroDefinition.heroPowerType === 'lashing';
    runWithFx(isLashing ? 'disable' : 'damage', () => triggerHeroPower(perspectiveId, targetId), {
      clip: isLashing ? 'lashing' : 'division',
    });
  };

  // ---------- Saisie (drag & drop) ----------

  const cardOfSource = (src: DragSource): Card | null => {
    if (src.kind === 'hand') return localPlayer.hand[src.index] ?? null;
    if (src.kind === 'unit') return localPlayer.board.find((u) => u.instanceId === src.instanceId)?.card ?? null;
    return localPlayer.heroCard;
  };

  const canDragSource = (src: DragSource): boolean => {
    if (!isLocalTurn || passPending) return false;
    if (src.kind === 'hand') {
      const card = localPlayer.hand[src.index];
      return Boolean(card) && card.cost <= localPlayer.stormlight && canPlayFromHand(card);
    }
    if (src.kind === 'unit') {
      const unit = localPlayer.board.find((u) => u.instanceId === src.instanceId);
      return Boolean(unit && unit.canAttack && !unit.isLashed);
    }
    return canHeroAttack(localPlayer);
  };

  const startDragMode = (src: DragSource) => {
    if (src.kind === 'hand') {
      const card = localPlayer.hand[src.index];
      const side = card ? targetSideOf(card) : null;
      setMode(side ? { type: 'card', cardIndex: src.index, side } : { type: 'play', cardIndex: src.index });
    } else if (src.kind === 'unit') {
      setMode({ type: 'attack', attackerInstanceId: src.instanceId });
    } else {
      setMode({ type: 'heroAttack' });
    }
  };

  const resolveDrop = (src: DragSource, target: string | null) => {
    const drop = parseDrop(target);
    if (src.kind === 'hand') {
      const card = localPlayer.hand[src.index];
      if (!card) return;
      const side = targetSideOf(card);
      if (side === 'enemy') {
        if (drop?.zone === 'enemy-unit' && drop.id) playTargeted(src.index, drop.id);
      } else if (side === 'ally') {
        if (drop?.zone === 'ally-unit' && drop.id) playTargeted(src.index, drop.id);
      } else if (drop && ['ally-field', 'ally-unit', 'ally-hero', 'battlefield'].includes(drop.zone)) {
        playUntargeted(src.index);
      }
      return;
    }
    if (src.kind === 'unit') {
      if (drop?.zone === 'enemy-unit' && drop.id) attackWith(src.instanceId, drop.id);
      else if (drop?.zone === 'enemy-hero') attackHeroWith(src.instanceId);
      return;
    }
    if (drop?.zone === 'enemy-unit' && drop.id) strikeUnit(drop.id);
    else if (drop?.zone === 'enemy-hero') strikeHero();
  };

  // ---------- Tap (toujours disponible, en complément de la saisie) ----------

  const handleEndTurn = () => {
    resetMode();
    endTurn();
    if (hotseat) setPassPending(true);
  };

  const handlePlayCard = (index: number) => {
    if (!isLocalTurn) return;
    const card = localPlayer.hand[index];
    if (!card || card.cost > localPlayer.stormlight || !canPlayFromHand(card)) return;
    if (mode.type === 'card' && mode.cardIndex === index) {
      resetMode();
      return;
    }
    const side = targetSideOf(card);
    if (side) {
      setMode({ type: 'card', cardIndex: index, side });
      return;
    }
    playUntargeted(index);
  };

  const handleLocalUnitClick = (unit: UnitInPlay) => {
    if (!isLocalTurn) return;
    if (mode.type === 'guard') {
      declareGuard(perspectiveId, mode.protectorInstanceId, unit.instanceId);
      resetMode();
      return;
    }
    if (mode.type === 'card' && mode.side === 'ally') {
      playTargeted(mode.cardIndex, unit.instanceId);
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
      attackWith(mode.attackerInstanceId, unit.instanceId);
    } else if (mode.type === 'heroAttack') {
      strikeUnit(unit.instanceId);
    } else if (mode.type === 'power') {
      castPowerOn(unit.instanceId);
    } else if (mode.type === 'card' && mode.side === 'enemy') {
      playTargeted(mode.cardIndex, unit.instanceId);
    } else {
      return;
    }
    resetMode();
  };

  const handleOpponentHeroClick = () => {
    if (!isLocalTurn) return;
    if (mode.type === 'attack') attackHeroWith(mode.attackerInstanceId);
    else if (mode.type === 'heroAttack') strikeHero();
    else return;
    resetMode();
  };

  // Tour de l'IA : une action toutes les AI_STEP_MS, jusqu'à la fin de son tour.
  useEffect(() => {
    if (!aiPlayerId || game.winnerId || game.activePlayerId !== aiPlayerId) return;
    const timer = window.setTimeout(() => {
      const current = useGameStore.getState().game;
      if (current.winnerId || current.activePlayerId !== aiPlayerId) return;
      applyAiAction(chooseNextAction(current, aiPlayerId), aiPlayerId);
    }, AI_STEP_MS);
    return () => window.clearTimeout(timer);
  }, [game, aiPlayerId]);

  // Saisie à la Hearthstone (après les handlers, avant tout retour anticipé :
  // l'ordre des hooks reste stable et les callbacks sont déjà déclarés).
  const { drag, bind } = useDragSource({
    canDrag: canDragSource,
    onStart: startDragMode,
    onDrop: (src, target) => {
      resolveDrop(src, target);
      resetMode();
    },
    onCancel: () => resetMode(),
    onLongPress: (src) => setPreview(cardOfSource(src)),
    onLongPressEnd: () => setPreview(null),
  });

  if (!localPlayer || !opponent) return null;

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

  // ---------- Rendu ----------

  const enemyTargetable =
    mode.type === 'attack' ||
    mode.type === 'heroAttack' ||
    mode.type === 'power' ||
    (mode.type === 'card' && mode.side === 'enemy');
  const enemyHeroTargetable = mode.type === 'attack' || mode.type === 'heroAttack';
  const allyTargetable = mode.type === 'guard' || (mode.type === 'card' && mode.side === 'ally');
  const fieldDroppable = mode.type === 'play';
  const canUsePower =
    isLocalTurn && localPlayer.linkLevel >= 3 && !localPlayer.heroAbilityUsedThisTurn && opponent.board.length > 0;
  const heroArmed = isLocalTurn && canHeroAttack(localPlayer);
  const draggingIndex = drag?.src.kind === 'hand' ? drag.src.index : null;
  const dragSrc = drag?.src;
  const draggedUnit =
    dragSrc?.kind === 'unit' ? localPlayer.board.find((u) => u.instanceId === dragSrc.instanceId) : undefined;

  return (
    <div className={`game-board${drag ? ' game-board--dragging' : ''}`}>
      <BattlefieldMap />
      <CombatFX />
      <OathCeremony />

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

      {preview && (
        <div className="card-preview" aria-hidden="true">
          <CardComponent card={preview} sprenLevel={localPlayer.linkLevel} disabled />
        </div>
      )}

      {drag && (
        <div className="drag-ghost" style={{ left: `${drag.x}px`, top: `${drag.y}px` }}>
          {drag.src.kind === 'hand' && localPlayer.hand[drag.src.index] && (
            <CardComponent card={localPlayer.hand[drag.src.index]} compact disabled />
          )}
          {draggedUnit && (
            <CardComponent
              card={draggedUnit.card}
              compact
              disabled
              currentAttack={getEffectiveAttack(localPlayer, draggedUnit)}
              currentHealth={draggedUnit.currentHealth}
            />
          )}
          {drag.src.kind === 'hero' && (
            <span className="drag-ghost__hero">
              <img src={heroStageArtFor(localPlayer.heroCard.id, localPlayer.linkLevel)} alt="" />
            </span>
          )}
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

      <HeroPanel
        player={opponent}
        isActive={!isLocalTurn}
        compact
        dropId="enemy-hero"
        onClick={enemyHeroTargetable ? handleOpponentHeroClick : undefined}
        targetable={enemyHeroTargetable}
      />

      <section className="battlefield" data-drop="battlefield">
        <div className="battlefield__row battlefield__row--enemy">
          <div className="battlefield__units">
            {Array.from({ length: MAX_BOARD_UNITS }, (_, slot) => opponent.board[slot]).map((unit, slot) =>
              unit === undefined ? (
                <div key={`empty-${slot}`} className="battlefield__placeholder" aria-hidden="true" />
              ) : (
              <CardComponent
                key={unit.instanceId}
                card={unit.card}
                fxId={unit.instanceId}
                dropId={`enemy-unit:${unit.instanceId}`}
                currentAttack={getEffectiveAttack(opponent, unit)}
                currentHealth={unit.currentHealth}
                lashed={unit.isLashed}
                guarding={Boolean(unit.guarding)}
                targetable={enemyTargetable}
                disabled={!enemyTargetable}
                compact
                onClick={() => handleOpponentUnitClick(unit)}
              />
              ),
            )}
          </div>
        </div>

        <div className="battlefield__divider" aria-hidden="true" />

        <div className={`battlefield__row battlefield__row--ally${fieldDroppable ? ' battlefield__row--droppable' : ''}`} data-drop="ally-field">
          <div className="battlefield__units">
            {Array.from({ length: MAX_BOARD_UNITS }, (_, slot) => localPlayer.board[slot]).map((unit, slot) =>
              unit === undefined ? (
                <div
                  key={`empty-${slot}`}
                  className={`battlefield__placeholder${fieldDroppable ? ' battlefield__placeholder--open' : ''}`}
                  aria-hidden="true"
                />
              ) : (
              <div key={unit.instanceId} className="battlefield__slot">
                <CardComponent
                  card={unit.card}
                  fxId={unit.instanceId}
                  dropId={`ally-unit:${unit.instanceId}`}
                  currentAttack={getEffectiveAttack(localPlayer, unit)}
                  currentHealth={unit.currentHealth}
                  lashed={unit.isLashed}
                  guarding={Boolean(unit.guarding)}
                  exhausted={isLocalTurn && !unit.canAttack && !unit.isLashed}
                  selected={mode.type === 'attack' && mode.attackerInstanceId === unit.instanceId}
                  dragging={draggedUnit?.instanceId === unit.instanceId}
                  targetable={allyTargetable}
                  disabled={
                    !isLocalTurn ||
                    mode.type === 'power' ||
                    mode.type === 'heroAttack' ||
                    (mode.type === 'card' && mode.side === 'enemy')
                  }
                  compact
                  handlers={bind({ kind: 'unit', instanceId: unit.instanceId }, { verticalOnly: true })}
                  onClick={() => handleLocalUnitClick(unit)}
                />
                {isLocalTurn && unit.card.keywords?.includes('couverture') && !unit.guarding && mode.type === 'idle' && (
                  <button
                    type="button"
                    className="battlefield__guard-btn"
                    title="Se placer en Couverture"
                    onClick={() => setMode({ type: 'guard', protectorInstanceId: unit.instanceId })}
                  >
                    🛡️ Protéger
                  </button>
                )}
              </div>
              ),
            )}
          </div>
        </div>
      </section>

      <HeroPanel
        player={localPlayer}
        isActive={isLocalTurn}
        dropId="ally-hero"
        onClick={mode.type === 'guard' ? handleLocalHeroClick : undefined}
        targetable={mode.type === 'guard'}
        portraitHandlers={bind({ kind: 'hero' })}
        attackReady={heroArmed}
        onAttack={() => setMode(mode.type === 'heroAttack' ? { type: 'idle' } : { type: 'heroAttack' })}
      />

      <footer className="game-board__hand">
        <PlayerHand
          cards={localPlayer.hand}
          stormlight={localPlayer.stormlight}
          onPlayCard={handlePlayCard}
          selectedIndex={mode.type === 'card' || mode.type === 'play' ? mode.cardIndex : null}
          draggingIndex={draggingIndex}
          disabled={!isLocalTurn}
          canPlay={canPlayFromHand}
          cardHandlers={(index) => bind({ kind: 'hand', index }, { verticalOnly: true })}
        />
      </footer>
    </div>
  );
}

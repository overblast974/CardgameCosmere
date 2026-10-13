import type { GameState, PlayerState, UnitInPlay } from '../types/game';
import type { Card } from '../types/card';
import { MAX_BOARD_UNITS, canHeroAttack, getEffectiveAttack, getEffectiveHeroAttack, unitHasKeyword } from '../store/gameStore';
import { getDeckBundle } from '../data/cards/loader';

/**
 * IA gloutonne, volontairement simple : elle sert à tester l'équilibre seul,
 * pas à briller. Elle choisit UNE action à la fois ; l'interface l'applique
 * avec ses effets, puis redemande la suivante, jusqu'à `end`.
 */
export type AiAction =
  | { type: 'play'; index: number }
  | { type: 'playTargeted'; index: number; targetInstanceId: string }
  | { type: 'guard'; protectorInstanceId: string; target: 'hero' | string }
  | { type: 'power'; targetInstanceId: string }
  | { type: 'attack'; attackerInstanceId: string; defenderInstanceId: string }
  | { type: 'attackHero'; attackerInstanceId: string }
  | { type: 'heroStrikeUnit'; defenderInstanceId: string }
  | { type: 'heroStrikeHero' }
  | { type: 'end' };

/** Valeur grossière d'une unité sur le plateau. */
function valueOf(owner: PlayerState, unit: UnitInPlay): number {
  return getEffectiveAttack(owner, unit) + unit.currentHealth;
}

function otherPlayerId(game: GameState, playerId: string): string {
  return Object.keys(game.players).find((id) => id !== playerId) ?? playerId;
}

/** L'unité qui encaisse réellement une attaque visant `target` (Couverture, ignorée par une unité qui Vole). */
function defenderFor(enemy: PlayerState, target: UnitInPlay | 'hero', attacker?: UnitInPlay): UnitInPlay | undefined {
  const key = target === 'hero' ? 'hero' : target.instanceId;
  const guard = attacker && unitHasKeyword(attacker, 'vol') ? undefined : enemy.board.find((u) => u.guarding === key);
  if (guard) return guard;
  return target === 'hero' ? undefined : target;
}

/** Riposte du héros ennemi quand une unité l'attaque (Lame d'Éclat, Lien 3). */
function heroRetaliation(enemy: PlayerState): number {
  return enemy.linkLevel >= 3 ? getEffectiveHeroAttack(enemy) : 0;
}

/** Mulligan de l'IA : elle renvoie ses cartes à 5+ de coût pour une main jouable tôt. */
export function chooseMulligan(player: PlayerState): number[] {
  return player.hand.map((card, index) => (card.cost >= 5 ? index : -1)).filter((i) => i >= 0);
}

function affordable(me: PlayerState, card: Card): boolean {
  return card.cost <= me.stormlight;
}

function bestBy<T>(items: T[], score: (item: T) => number): { item: T; score: number } | null {
  let best: { item: T; score: number } | null = null;
  for (const item of items) {
    const s = score(item);
    if (!best || s > best.score) best = { item, score: s };
  }
  return best;
}

export function chooseNextAction(game: GameState, playerId: string): AiAction {
  const me = game.players[playerId];
  const enemyId = otherPlayerId(game, playerId);
  const enemy = game.players[enemyId];
  if (!me || !enemy || game.winnerId) return { type: 'end' };

  const hand = me.hand.map((card, index) => ({ card, index }));
  const boardFull = me.board.length >= MAX_BOARD_UNITS;
  const hasEffect = (card: Card, type: string) => 'effectType' in card && card.effectType === type;

  // 1. Stormlight et pioche d'abord : elles ouvrent les autres coups.
  const gain = hand.find(({ card }) => hasEffect(card, 'stormlight') && affordable(me, card));
  if (gain && hand.some(({ card }) => card.cost > me.stormlight)) return { type: 'play', index: gain.index };
  const draw = hand.find(({ card }) => hasEffect(card, 'draw') && affordable(me, card));
  if (draw) return { type: 'play', index: draw.index };

  // 2. Poser l'unité la plus chère possible tant qu'il y a de la place.
  if (!boardFull) {
    const units = hand.filter(({ card }) => (card.type === 'radiant' || card.type === 'heraut') && affordable(me, card));
    const unit = bestBy(units, ({ card }) => card.cost * 10 + ('attack' in card ? card.attack : 0));
    if (unit) return { type: 'play', index: unit.item.index };
  }

  // 3. Éclats : Honneur dès que possible, Nightblood face à un plateau garni.
  const honor = hand.find(({ card }) => card.id === 'honor' && affordable(me, card));
  if (honor) return { type: 'play', index: honor.index };
  const nightblood = hand.find(({ card }) => card.id === 'nightblood' && affordable(me, card));
  if (nightblood && enemy.board.length >= 2 && me.heroHealth > 10) return { type: 'play', index: nightblood.index };

  // 4. Sorts ciblés.
  for (const { card, index } of hand) {
    if (!('effectType' in card) || !affordable(me, card)) continue;
    const dmg = card.effectValue ?? 1;
    switch (card.effectType) {
      case 'damage':
      case 'lash': {
        const killable = enemy.board.filter((u) => u.currentHealth <= dmg);
        const kill = bestBy(killable, (u) => valueOf(enemy, u));
        if (kill) return { type: 'playTargeted', index, targetInstanceId: kill.item.instanceId };
        if (card.effectType === 'lash') {
          const strongest = bestBy(enemy.board, (u) => getEffectiveAttack(enemy, u));
          if (strongest && strongest.score >= 3) return { type: 'playTargeted', index, targetInstanceId: strongest.item.instanceId };
        }
        break;
      }
      case 'disable': {
        const strongest = bestBy(
          enemy.board.filter((u) => !u.isLashed),
          (u) => getEffectiveAttack(enemy, u),
        );
        if (strongest && strongest.score >= 3) return { type: 'playTargeted', index, targetInstanceId: strongest.item.instanceId };
        break;
      }
      case 'bounce': {
        const pricey = bestBy(enemy.board, (u) => u.card.cost);
        if (pricey && pricey.score >= 4) return { type: 'playTargeted', index, targetInstanceId: pricey.item.instanceId };
        break;
      }
      case 'buff':
      case 'equip': {
        // Un équipement va sur une unité durable (pas le Spren, qui se dissipe).
        const carriers = me.board.filter((u) => !u.isLashed && (card.effectType === 'buff' ? u.canAttack : !u.isSpren));
        const striker = bestBy(carriers, (u) => getEffectiveAttack(me, u) + u.currentHealth);
        if (striker) return { type: 'playTargeted', index, targetInstanceId: striker.item.instanceId };
        break;
      }
      case 'aoe-buff':
        if (me.board.length >= 2) return { type: 'play', index };
        break;
      default:
        break;
    }
  }

  // 5. Pouvoir du héros.
  if (me.linkLevel >= 3 && !me.heroAbilityUsedThisTurn && enemy.board.length > 0) {
    const definition = getDeckBundle(me.deckId).heroDefinition;
    if (definition.heroPowerType === 'smite') {
      const smite = definition.heroPowerValue ?? 3;
      const kill = bestBy(enemy.board.filter((u) => u.currentHealth <= smite), (u) => valueOf(enemy, u));
      const target = kill ?? bestBy(enemy.board, (u) => getEffectiveAttack(enemy, u));
      if (target) return { type: 'power', targetInstanceId: target.item.instanceId };
    } else {
      const target = bestBy(enemy.board.filter((u) => !u.isLashed), (u) => getEffectiveAttack(enemy, u));
      if (target && target.score >= 2) return { type: 'power', targetInstanceId: target.item.instanceId };
    }
  }

  // 6. Couverture sur le héros (nourrit aussi le Lien des Windrunners).
  const guard = me.board.find((u) => unitHasKeyword(u, 'couverture') && !u.guarding);
  if (guard) return { type: 'guard', protectorInstanceId: guard.instanceId, target: 'hero' };

  // 7. Attaques des unités : meilleur échange, sinon le visage s'il est libre.
  const attackers = me.board.filter((u) => u.canAttack && !u.isLashed);
  const heroGuard = defenderFor(enemy, 'hero');
  let bestAttack: { action: AiAction; score: number } | null = null;
  for (const attacker of attackers) {
    const myAtk = getEffectiveAttack(me, attacker);
    const consider = (action: AiAction, score: number) => {
      if (!bestAttack || score > bestAttack.score) bestAttack = { action, score };
    };
    for (const target of enemy.board) {
      const defender = defenderFor(enemy, target, attacker) ?? target;
      const kill = defender.currentHealth <= myAtk;
      const die = attacker.currentHealth <= getEffectiveAttack(enemy, defender);
      const score = (kill ? valueOf(enemy, defender) + 2 : 0) - (die ? valueOf(me, attacker) : 0) + (kill && !die ? 3 : 0);
      consider({ type: 'attack', attackerInstanceId: attacker.instanceId, defenderInstanceId: target.instanceId }, score);
    }
    const myHeroGuard = defenderFor(enemy, 'hero', attacker);
    if (myHeroGuard) {
      const kill = myHeroGuard.currentHealth <= myAtk;
      const die = attacker.currentHealth <= getEffectiveAttack(enemy, myHeroGuard);
      const score = (kill ? valueOf(enemy, myHeroGuard) + 2 : 0) - (die ? valueOf(me, attacker) : 0);
      consider({ type: 'attackHero', attackerInstanceId: attacker.instanceId }, score);
    } else {
      const lethal = myAtk >= enemy.heroHealth + enemy.heroShield;
      // Le héros armé riposte : on n'envoie pas une unité mourir pour rien (sauf létal).
      const die = attacker.currentHealth <= heroRetaliation(enemy) && !attacker.indestructible;
      consider(
        { type: 'attackHero', attackerInstanceId: attacker.instanceId },
        myAtk + (lethal ? 100 : 0) - (die ? valueOf(me, attacker) : 0),
      );
    }
  }
  if (bestAttack !== null) {
    const chosen = bestAttack as { action: AiAction; score: number };
    if (chosen.score > 0) return chosen.action;
  }

  // 8. Frappe de la Lame d'Éclat.
  if (canHeroAttack(me)) {
    const heroAtk = getEffectiveHeroAttack(me);
    if (!heroGuard) {
      return { type: 'heroStrikeHero' };
    }
    const candidates = enemy.board.map((target) => {
      const defender = defenderFor(enemy, target) ?? target;
      const retaliation = getEffectiveAttack(enemy, defender);
      const kill = defender.currentHealth <= heroAtk;
      const survivable = me.heroHealth + me.heroShield - retaliation > 8;
      return { target, score: kill && survivable ? valueOf(enemy, defender) + 2 - retaliation : -1 };
    });
    const best = bestBy(candidates, (c) => c.score);
    if (best && best.score > 0) return { type: 'heroStrikeUnit', defenderInstanceId: best.item.target.instanceId };
  }

  return { type: 'end' };
}

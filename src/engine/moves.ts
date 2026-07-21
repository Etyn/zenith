import { cardOf, resolve, decide as decideEffect, chooseBranch, skipBranch, decideTech as decideTechEffect, decideCard as decideCardEffect } from './effects';
import { activeFace } from '../data/tech';
import { developTech } from './develop';
import { CENTER } from './setup';
import { DIPLOMACY } from '../data/diplomacy';
import type { GameState, People, Planet, PlayerIndex, PlayerState } from './types';
import { PLANETS } from './types';

export type Move =
  | { t: 'recruit'; cardId: string }
  | { t: 'develop'; cardId: string; people: People }
  | { t: 'leadership'; cardId: string }
  | { t: 'decide'; planet: Planet }
  | { t: 'choose'; index: number }
  | { t: 'skip' }
  | { t: 'decideTech'; people: People }
  | { t: 'decideCard'; cardId: string };

function recruitCost(state: GameState, player: PlayerIndex, planet: Planet, baseCost: number): number {
  return Math.max(0, baseCost - state.players[player].columns[planet].length);
}

function handLimit(state: GameState, player: PlayerIndex): number {
  if (state.diplomacy.leader !== player) return 4;
  return state.diplomacy.side === 'gold' ? 6 : 5;
}

function finishOrPending(state: GameState): GameState {
  return state.pending === null && state.resolution === null && state.winner === null ? endTurn(state) : state;
}

function endTurn(state: GameState): GameState {
  const player = state.current;
  const need = handLimit(state, player) - state.players[player].hand.length;
  let deck = state.deck;
  let hand = state.players[player].hand;
  if (need > 0) {
    const drawn = deck.slice(0, need);
    deck = deck.slice(drawn.length);
    hand = [...hand, ...drawn];
  }
  const players: [PlayerState, PlayerState] = [state.players[0], state.players[1]];
  players[player] = { ...players[player], hand };
  const next: PlayerIndex = player === 0 ? 1 : 0;
  return { ...state, players, deck, current: next };
}

export function applyMove(state: GameState, move: Move): GameState {
  if (move.t === 'decide') {
    if (state.pending === null) return state;
    const afterDecide = decideEffect(state, move.planet);
    return finishOrPending(afterDecide);
  }
  if (move.t === 'choose') {
    if (state.pending === null) return state;
    return finishOrPending(chooseBranch(state, move.index));
  }
  if (move.t === 'skip') {
    if (state.pending === null) return state;
    return finishOrPending(skipBranch(state));
  }
  if (move.t === 'decideTech') {
    if (state.pending === null) return state;
    return finishOrPending(decideTechEffect(state, move.people));
  }
  if (move.t === 'decideCard') {
    if (state.pending === null) return state;
    return finishOrPending(decideCardEffect(state, move.cardId));
  }

  if (move.t === 'develop') {
    if (state.winner !== null || state.pending !== null || state.resolution !== null) return state;
    const player = state.current;
    if (!state.players[player].hand.includes(move.cardId)) return state;
    const card = cardOf(move.cardId);
    if (!card || card.people !== move.people) return state;
    const players: [PlayerState, PlayerState] = [state.players[0], state.players[1]];
    players[player] = { ...players[player], hand: players[player].hand.filter((id) => id !== move.cardId) };
    const afterCard: GameState = { ...state, players, discard: [...state.discard, move.cardId] };
    const res = developTech(afterCard, player, move.people);
    if (res === null) return state; // niveau/coût invalide → move ignoré
    const started: GameState = {
      ...res.state,
      resolution: { queue: res.queue, ctx: { player, planet: card.planet, people: card.people } },
    };
    return finishOrPending(resolve(started));
  }

  if (move.t === 'leadership') {
    if (state.winner !== null || state.pending !== null || state.resolution !== null) return state;
    const player = state.current;
    if (!state.players[player].hand.includes(move.cardId)) return state;
    const card = cardOf(move.cardId);
    if (!card) return state;
    const players: [PlayerState, PlayerState] = [state.players[0], state.players[1]];
    players[player] = { ...players[player], hand: players[player].hand.filter((id) => id !== move.cardId) };
    const started: GameState = {
      ...state,
      players,
      discard: [...state.discard, move.cardId],
      resolution: { queue: [...DIPLOMACY[card.people]], ctx: { player, planet: card.planet } },
    };
    const resolved = resolve(started);
    return finishOrPending(resolved);
  }

  // recruit
  if (state.winner !== null || state.pending !== null || state.resolution !== null) return state;
  const player = state.current;
  if (!state.players[player].hand.includes(move.cardId)) return state;
  const card = cardOf(move.cardId);
  if (!card) return state;
  const cost = recruitCost(state, player, card.planet, card.cost);
  if (cost > state.players[player].credits) return state;

  const players: [PlayerState, PlayerState] = [state.players[0], state.players[1]];
  const hand = players[player].hand.filter((id) => id !== move.cardId);
  const columns = { ...players[player].columns, [card.planet]: [...players[player].columns[card.planet], move.cardId] };
  players[player] = { ...players[player], hand, columns, credits: players[player].credits - cost };

  const started: GameState = {
    ...state,
    players,
    resolution: { queue: [...card.effects], ctx: { player, planet: card.planet, people: card.people } },
  };
  const resolved = resolve(started);
  return finishOrPending(resolved);
}

export function legalMoves(state: GameState, player: PlayerIndex): Move[] {
  if (state.winner !== null) return [];
  if (state.pending !== null) {
    // décision en attente : le joueur en cours de résolution choisit une planète
    if (state.resolution === null || state.resolution.ctx.player !== player) return [];
    const pending = state.pending;
    if (pending.kind === 'confirmOptional') {
      return [{ t: 'choose', index: 0 }, { t: 'skip' }];
    }
    if (pending.kind === 'chooseOption') {
      return Array.from({ length: pending.count }, (_, i) => ({ t: 'choose', index: i }));
    }
    if (pending.kind === 'chooseTier') {
      return [...Array.from({ length: pending.count }, (_, i) => ({ t: 'choose' as const, index: i })), { t: 'skip' as const }];
    }
    if (pending.kind === 'moveDiscToCenter') {
      return PLANETS.map((planet) => ({ t: 'decide', planet }));
    }
    if (pending.kind === 'chooseTech') {
      return pending.candidates.map((people) => ({ t: 'decideTech', people }));
    }
    if (pending.kind === 'chooseHandCard') {
      return state.players[player].hand.map((cardId) => ({ t: 'decideCard', cardId }));
    }
    if (pending.kind === 'chooseBoardToken') {
      return pending.slots.map((_, i) => ({ t: 'choose', index: i }));
    }
    let candidates: Planet[] = [];
    if (pending.kind === 'chooseSegment') {
      // seuls les débuts de segment valides (pas d'enroulement en fin de rangée)
      candidates = PLANETS.filter((_, i) => i + pending.count <= PLANETS.length);
    } else if (pending.kind === 'chooseColumn') {
      const ownerIndex: PlayerIndex = pending.owner === 'self' ? player : player === 0 ? 1 : 0;
      const exclude = pending.exclude ?? [];
      candidates = PLANETS.filter(
        (planet) => state.players[ownerIndex].columns[planet].length > 0 && !exclude.includes(planet),
      );
    } else if (pending.kind === 'choosePlanet') {
      const exclude = pending.exclude ?? [];
      candidates = PLANETS.filter(
        (planet) => !exclude.includes(planet) && (!pending.atCenter || state.planets[planet].discPos === CENTER),
      );
    }
    return candidates.map((planet) => ({ t: 'decide', planet }));
  }
  if (state.resolution !== null || player !== state.current) return [];
  const recruits: Move[] = state.players[player].hand
    .filter((id) => {
      const c = cardOf(id);
      return c !== undefined && recruitCost(state, player, c.planet, c.cost) <= state.players[player].credits;
    })
    .map((id) => ({ t: 'recruit', cardId: id }));
  const develops: Move[] = state.players[player].hand
    .filter((id) => {
      const c = cardOf(id);
      if (!c) return false;
      const lvl = state.players[player].techMarkers[c.people];
      if (lvl >= 5) return false;
      const cost = activeFace(c.people, state.config.techSetup).levels[lvl]!.zenithium;
      return cost <= state.players[player].zenithium;
    })
    .map((id) => ({ t: 'develop', cardId: id, people: cardOf(id)!.people }));
  const leaderships: Move[] = state.players[player].hand.map((id) => ({ t: 'leadership', cardId: id }));
  return [...recruits, ...develops, ...leaderships];
}

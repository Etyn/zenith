import { cardOf, resolve, decide as decideEffect } from './effects';
import { activeFace } from '../data/tech';
import { DIPLOMACY } from '../data/diplomacy';
import type { Effect, GameState, People, Planet, PlayerIndex, PlayerState } from './types';
import { PLANETS } from './types';

const HAND_LIMIT = 4; // limite de base ; le badge Leader (5/6) viendra dans un plan suivant

export type Move =
  | { t: 'recruit'; cardId: string }
  | { t: 'develop'; cardId: string; people: People }
  | { t: 'leadership'; cardId: string }
  | { t: 'decide'; planet: Planet };

function recruitCost(state: GameState, player: PlayerIndex, planet: Planet, baseCost: number): number {
  return Math.max(0, baseCost - state.players[player].columns[planet].length);
}

function finishOrPending(state: GameState): GameState {
  return state.pending === null && state.resolution === null && state.winner === null ? endTurn(state) : state;
}

function endTurn(state: GameState): GameState {
  const player = state.current;
  const need = HAND_LIMIT - state.players[player].hand.length;
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

  if (move.t === 'develop') {
    if (state.winner !== null || state.pending !== null || state.resolution !== null) return state;
    const player = state.current;
    if (!state.players[player].hand.includes(move.cardId)) return state;
    const card = cardOf(move.cardId);
    if (!card || card.people !== move.people) return state;
    const current = state.players[player].techMarkers[move.people];
    if (current >= 5) return state;
    const face = activeFace(move.people, state.config.techSetup);
    const newLevel = current + 1;
    const cost = face.levels[newLevel - 1]!.zenithium;
    if (cost > state.players[player].zenithium) return state;

    const players: [PlayerState, PlayerState] = [state.players[0], state.players[1]];
    const hand = players[player].hand.filter((id) => id !== move.cardId);
    const techMarkers = { ...players[player].techMarkers, [move.people]: newLevel };
    players[player] = { ...players[player], hand, techMarkers, zenithium: players[player].zenithium - cost };
    // Effets cumulés : niveau atteint puis tous les inférieurs (haut → bas).
    const queue: Effect[] = [];
    for (let lvl = newLevel; lvl >= 1; lvl--) queue.push(...face.levels[lvl - 1]!.effects);

    // Primes de ligne : 3 technos au niveau tier → +tier influence au choix (1 fois chacune).
    // Appliquées APRÈS les effets de colonne (poussées à la suite dans la file).
    const claimed = { ...players[player].lineBonusClaimed };
    const markers = players[player].techMarkers;
    for (const tier of [1, 2, 3] as const) {
      const allReached = markers.animod >= tier && markers.humain >= tier && markers.robot >= tier;
      if (allReached && !claimed[tier]) {
        claimed[tier] = true;
        queue.push({ k: 'influence', amount: tier, on: 'choice' });
      }
    }
    players[player] = { ...players[player], lineBonusClaimed: claimed };

    const started: GameState = {
      ...state,
      players,
      discard: [...state.discard, move.cardId],
      resolution: { queue, ctx: { player, planet: card.planet } },
    };
    const resolved = resolve(started);
    return finishOrPending(resolved);
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
    resolution: { queue: [...card.effects], ctx: { player, planet: card.planet } },
  };
  const resolved = resolve(started);
  return finishOrPending(resolved);
}

export function legalMoves(state: GameState, player: PlayerIndex): Move[] {
  if (state.winner !== null) return [];
  if (state.pending !== null) {
    // décision en attente : le joueur en cours de résolution choisit une planète
    if (state.resolution === null || state.resolution.ctx.player !== player) return [];
    return PLANETS.map((planet) => ({ t: 'decide', planet }));
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

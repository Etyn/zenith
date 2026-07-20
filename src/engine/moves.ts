import { cardOf, resolve, decide as decideEffect } from './effects';
import type { GameState, Planet, PlayerIndex, PlayerState } from './types';
import { PLANETS } from './types';

const HAND_LIMIT = 4; // limite de base ; le badge Leader (5/6) viendra dans un plan suivant

export type Move = { t: 'recruit'; cardId: string } | { t: 'decide'; planet: Planet };

function recruitCost(state: GameState, player: PlayerIndex, planet: Planet, baseCost: number): number {
  return Math.max(0, baseCost - state.players[player].columns[planet].length);
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
    const afterDecide = decideEffect(state, move.planet);
    return afterDecide.pending === null && afterDecide.resolution === null ? endTurn(afterDecide) : afterDecide;
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
  return resolved.pending === null && resolved.resolution === null ? endTurn(resolved) : resolved;
}

export function legalMoves(state: GameState, player: PlayerIndex): Move[] {
  if (state.winner !== null) return [];
  if (state.pending !== null) {
    // décision en attente : le joueur en cours de résolution choisit une planète
    if (state.resolution === null || state.resolution.ctx.player !== player) return [];
    return PLANETS.map((planet) => ({ t: 'decide', planet }));
  }
  if (state.resolution !== null || player !== state.current) return [];
  return state.players[player].hand
    .filter((id) => {
      const c = cardOf(id);
      return c !== undefined && recruitCost(state, player, c.planet, c.cost) <= state.players[player].credits;
    })
    .map((id) => ({ t: 'recruit', cardId: id }));
}

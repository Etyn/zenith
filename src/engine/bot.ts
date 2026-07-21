import { legalMoves, type Move } from './moves';
import { nextInt, type RngState } from './rng';
import type { GameState, PlayerIndex } from './types';

/** Bot de test : choisit uniformément un coup légal pour `player`. RNG séparé de state.rng. */
export function pickMove(
  state: GameState,
  player: PlayerIndex,
  rng: RngState,
): [Move | null, RngState] {
  const moves = legalMoves(state, player);
  if (moves.length === 0) return [null, rng];
  const [i, next] = nextInt(rng, moves.length);
  return [moves[i]!, next];
}

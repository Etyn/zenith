import { pickMove } from './bot';
import { createGame } from './setup';
import { applyMove } from './moves';
import { makeRng, type RngState } from './rng';
import type { GameConfig, GameState, PlayerIndex } from './types';

export function activePlayer(state: GameState): PlayerIndex | null {
  if (state.winner !== null) return null;
  // Invariant du moteur : pending non nul ⇒ resolution non nulle. Le `!` s'appuie dessus.
  return state.pending !== null ? state.resolution!.ctx.player : state.current;
}

export type SelfPlayResult = {
  state: GameState;
  winner: PlayerIndex | null;
  outcome: 'winner' | 'stuck' | 'maxSteps';
  moves: number;
};

/** Fait jouer deux bots aléatoires-légaux jusqu'à victoire, blocage ou plafond de coups. */
export function selfPlay(
  config: GameConfig,
  gameSeed: number,
  botSeed: number,
  maxSteps = 1000,
): SelfPlayResult {
  let state = createGame(config, gameSeed);
  let rng: RngState = makeRng(botSeed);
  let moves = 0;
  let outcome: SelfPlayResult['outcome'] = 'maxSteps';

  for (let step = 0; step < maxSteps; step++) {
    if (state.winner !== null) {
      outcome = 'winner';
      break;
    }
    const p = activePlayer(state);
    if (p === null) {
      throw new Error('selfPlay: invariant rompu — aucun joueur actif alors que winner est null');
    }
    const [move, nextRng] = pickMove(state, p, rng);
    rng = nextRng;
    if (move === null) {
      outcome = 'stuck';
      break;
    }
    state = applyMove(state, move);
    moves++;
  }
  return { state, winner: state.winner, outcome, moves };
}

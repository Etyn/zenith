import { createGame } from '../setup';
import { applyMove, legalMoves } from '../moves';
import type { GameState } from '../types';

const CONFIG = { techSetup: { animod: 'S', humain: 'U', robot: 'N' }, firstPlayer: 0 } as const;

function playToEnd(seed: number): { turns: number; winner: number | null; final: GameState } {
  let s = createGame(CONFIG, seed);
  let turns = 0;
  while (s.winner === null && turns < 2000) {
    const mover = s.pending !== null ? s.resolution!.ctx.player : s.current;
    const moves = legalMoves(s, mover);
    if (moves.length === 0) break;
    s = applyMove(s, moves[0]!); // toujours le 1er coup légal → déterministe
    turns++;
    // invariants
    expect(s.players[0].credits).toBeGreaterThanOrEqual(0);
    expect(s.players[1].credits).toBeGreaterThanOrEqual(0);
  }
  return { turns, winner: s.winner, final: s };
}

test('une partie « toujours le 1er coup légal » progresse sans casser les invariants', () => {
  const r = playToEnd(1);
  expect(r.turns).toBeGreaterThan(0);
});

test('applyMove/legalMoves sont déterministes pour une même graine', () => {
  const a = playToEnd(7);
  const b = playToEnd(7);
  expect(a.turns).toBe(b.turns);
  expect(a.winner).toBe(b.winner);
});

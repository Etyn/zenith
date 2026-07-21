import { pickMove } from '../bot';
import { legalMoves } from '../moves';
import { createGame } from '../setup';
import { makeRng } from '../rng';

const CONFIG = { techSetup: { animod: 'S', humain: 'U', robot: 'N' }, firstPlayer: 0 } as const;

test('pickMove renvoie un coup appartenant à legalMoves', () => {
  const s = createGame(CONFIG, 1);
  const [move] = pickMove(s, s.current, makeRng(42));
  const legal = legalMoves(s, s.current);
  expect(move).not.toBeNull();
  expect(legal).toContainEqual(move);
});

test('pickMove est déterministe pour une même graine et avance le RNG', () => {
  const s = createGame(CONFIG, 1);
  const [m1, r1] = pickMove(s, s.current, makeRng(7));
  const [m2] = pickMove(s, s.current, makeRng(7));
  expect(m1).toEqual(m2);
  expect(r1.counter).toBeGreaterThan(0);
});

test('pickMove renvoie null quand aucun coup légal (pas le tour du joueur)', () => {
  const s = createGame(CONFIG, 1);
  const other = (s.current === 0 ? 1 : 0) as 0 | 1;
  const [move] = pickMove(s, other, makeRng(1));
  expect(move).toBeNull();
});

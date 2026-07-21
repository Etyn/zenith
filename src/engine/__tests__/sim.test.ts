import { selfPlay, activePlayer } from '../sim';
import { createGame } from '../setup';
import { winnerOf } from '../influence';
import { pickMove } from '../bot';
import { applyMove } from '../moves';
import { makeRng } from '../rng';

const CONFIG = { techSetup: { animod: 'S', humain: 'U', robot: 'N' }, firstPlayer: 0 } as const;

test('selfPlay termine sans exception et rend un résultat cohérent', () => {
  const res = selfPlay(CONFIG, 1, 42, 500);
  expect(['winner', 'stuck', 'maxSteps']).toContain(res.outcome);
  expect(res.moves).toBeGreaterThan(0);
  if (res.outcome === 'winner') expect(res.winner).not.toBeNull();
  else expect(res.winner).toBeNull();
});

test('selfPlay est déterministe (mêmes graines → même partie)', () => {
  const a = selfPlay(CONFIG, 3, 9, 500);
  const b = selfPlay(CONFIG, 3, 9, 500);
  expect(a.outcome).toBe(b.outcome);
  expect(a.moves).toBe(b.moves);
  expect(a.winner).toBe(b.winner);
});

test('selfPlay ne mute pas l\'état initial de createGame', () => {
  const initial = createGame(CONFIG, 5);
  const snapshot = JSON.stringify(initial);
  selfPlay(CONFIG, 5, 11, 200);
  expect(JSON.stringify(createGame(CONFIG, 5))).toBe(snapshot);
});

test('pickMove et applyMove ne mutent pas l\'état qu\'on leur passe', () => {
  const s = createGame(CONFIG, 5);
  const frozen = JSON.stringify(s);
  const [move] = pickMove(s, s.current, makeRng(3));
  expect(move).not.toBeNull();
  applyMove(s, move!);
  expect(JSON.stringify(s)).toBe(frozen); // s inchangé après pickMove + applyMove
});

test('activePlayer renvoie current hors décision et null à la victoire', () => {
  const s = createGame(CONFIG, 1);
  expect(activePlayer(s)).toBe(s.current);
  expect(activePlayer({ ...s, winner: 0 })).toBeNull();
});

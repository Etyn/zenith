import { TOKENS, tokenOf } from '../tokens';
import type { Effect } from '../../engine/types';

// Compte les jetons dont l'unique effet correspond au prédicat.
function count(pred: (e: Effect) => boolean): number {
  return TOKENS.filter((t) => t.effects.length === 1 && pred(t.effects[0]!)).length;
}

test('le catalogue contient exactement 16 jetons', () => {
  expect(TOKENS).toHaveLength(16);
});

test('tous les ids sont uniques', () => {
  const ids = TOKENS.map((t) => t.id);
  expect(new Set(ids).size).toBe(16);
});

test('répartition confirmée des 16 jetons (docs/content/jetons-bonus.md)', () => {
  expect(count((e) => e.k === 'zenithium' && e.amount === 1 && e.target === 'self')).toBe(3);
  expect(count((e) => e.k === 'credits' && e.amount === 3 && e.target === 'self')).toBe(2);
  expect(count((e) => e.k === 'credits' && e.amount === 4 && e.target === 'self')).toBe(2);
  expect(count((e) => e.k === 'influence' && e.on === 'choice' && e.amount === 1)).toBe(4);
  expect(count((e) => e.k === 'exile' && e.side === 'opponent' && e.count === 2)).toBe(1);
  expect(count((e) => e.k === 'transfer' && e.count === 1)).toBe(1);
  expect(count((e) => e.k === 'mobilize' && e.count === 2 && e.thenInfluence === false)).toBe(1);
  expect(count((e) => e.k === 'takeLeader' && e.side === 'silver')).toBe(2);
});

test('tokenOf retourne la définition et lève si inconnu', () => {
  const first = TOKENS[0]!;
  expect(tokenOf(first.id)).toBe(first);
  expect(() => tokenOf('tok-inexistant')).toThrow();
});

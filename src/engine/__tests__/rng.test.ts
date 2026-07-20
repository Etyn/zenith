import { makeRng, nextFloat, nextInt, shuffle } from '../rng';

test('nextFloat is deterministic for same seed', () => {
  const a = nextFloat(makeRng(42));
  const b = nextFloat(makeRng(42));
  expect(a[0]).toBe(b[0]);
  expect(a[0]).toBeGreaterThanOrEqual(0);
  expect(a[0]).toBeLessThan(1);
});

test('different seeds produce different sequences', () => {
  expect(nextFloat(makeRng(1))[0]).not.toBe(nextFloat(makeRng(2))[0]);
});

test('nextInt stays in [0, max)', () => {
  let s = makeRng(7);
  for (let i = 0; i < 50; i++) {
    const [v, ns] = nextInt(s, 5);
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThan(5);
    s = ns;
  }
});

test('shuffle is deterministic permutation and does not mutate input', () => {
  const input = [1, 2, 3, 4, 5];
  const [out1] = shuffle(input, makeRng(3));
  const [out2] = shuffle(input, makeRng(3));
  expect(out1).toEqual(out2);
  expect([...out1].sort()).toEqual([1, 2, 3, 4, 5]);
  expect(input).toEqual([1, 2, 3, 4, 5]); // not mutated
});

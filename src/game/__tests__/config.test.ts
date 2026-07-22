import { randomConfig } from '../config';

test('randomConfig tire des faces valides par colonne + un premier joueur valide', () => {
  for (let seed = 0; seed < 30; seed++) {
    const c = randomConfig(seed);
    expect(['S', 'D']).toContain(c.techSetup.animod);
    expect(['O', 'U']).toContain(c.techSetup.humain);
    expect(['N', 'P']).toContain(c.techSetup.robot);
    expect([0, 1]).toContain(c.firstPlayer);
  }
});

test('randomConfig est déterministe pour une même graine', () => {
  expect(randomConfig(42)).toEqual(randomConfig(42));
});

test('randomConfig produit des configs variées selon la graine (pas toujours identiques)', () => {
  const configs = Array.from({ length: 20 }, (_, i) => JSON.stringify(randomConfig(i)));
  expect(new Set(configs).size).toBeGreaterThan(1);
});

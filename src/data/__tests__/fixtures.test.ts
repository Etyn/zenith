import { PLANETS } from '../../engine/types';
import { FIXTURE_CARDS, FIXTURE_NON_CANONICAL } from '../fixtures';

test('les fixtures sont marquées non canoniques', () => {
  expect(FIXTURE_NON_CANONICAL).toBe(true);
});

test('au moins une carte fixture par planète', () => {
  for (const planet of PLANETS) {
    expect(FIXTURE_CARDS.some((c) => c.planet === planet)).toBe(true);
  }
});

test('les coûts des cartes sont dans [1, 10]', () => {
  for (const c of FIXTURE_CARDS) {
    expect(c.cost).toBeGreaterThanOrEqual(1);
    expect(c.cost).toBeLessThanOrEqual(10);
  }
});

test('chaque carte fixture a au moins un effet d’influence sur sa planète', () => {
  for (const c of FIXTURE_CARDS) {
    expect(c.effects.some((e) => e.k === 'influence' && e.on === c.planet)).toBe(true);
  }
});

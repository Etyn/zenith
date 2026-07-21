import { PLANETS, type Effect } from '../../engine/types';
import { CARDS, MARS_CARDS, MERCURE_CARDS, VENUS_CARDS, TERRA_CARDS, JUPITER_CARDS } from '../cards';

test('Mars : 18 cartes', () => {
  expect(MARS_CARDS).toHaveLength(18);
  expect(MARS_CARDS.every((c) => c.planet === 'mars')).toBe(true);
});

test('Mercure : 18 cartes', () => {
  expect(MERCURE_CARDS).toHaveLength(18);
  expect(MERCURE_CARDS.every((c) => c.planet === 'mercure')).toBe(true);
});

test('Vénus : 18 cartes', () => {
  expect(VENUS_CARDS).toHaveLength(18);
  expect(VENUS_CARDS.every((c) => c.planet === 'venus')).toBe(true);
});

test('Terra : 18 cartes', () => {
  expect(TERRA_CARDS).toHaveLength(18);
  expect(TERRA_CARDS.every((c) => c.planet === 'terra')).toBe(true);
});

test('Jupiter : 18 cartes', () => {
  expect(JUPITER_CARDS).toHaveLength(18);
  expect(JUPITER_CARDS.every((c) => c.planet === 'jupiter')).toBe(true);
});

test('catalogue complet : 90 cartes', () => {
  expect(CARDS).toHaveLength(90);
});

test('ids uniques sur le catalogue', () => {
  const ids = CARDS.map((c) => c.id);
  expect(new Set(ids).size).toBe(ids.length);
});

test('1er effet = influence 1 sur la planète de la carte', () => {
  for (const c of CARDS) {
    const first = c.effects[0]!;
    expect(first.k).toBe('influence');
    expect(first).toMatchObject({ k: 'influence', amount: 1, on: c.planet });
  }
});

test('coûts dans [1, 10] et planètes connues', () => {
  for (const c of CARDS) {
    expect(c.cost).toBeGreaterThanOrEqual(1);
    expect(c.cost).toBeLessThanOrEqual(10);
    expect(PLANETS).toContain(c.planet);
  }
});

// Garde-fou « give-* toujours enveloppé » : aucun atome give-* nu à la racine de effects[].
test('les atomes give-* ne sont jamais nus dans effects[]', () => {
  const GIVE = new Set(['giveOpponent', 'giveLeaderBadge', 'giveInfluenceOpponent']);
  for (const c of CARDS) {
    for (const e of c.effects as Effect[]) {
      expect(GIVE.has(e.k)).toBe(false);
    }
  }
});

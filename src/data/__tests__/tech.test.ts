import { TECH, activeFace } from '../tech';
import type { TechFace } from '../tech';
import type { Effect } from '../../engine/types';

// Helper : effets d'un niveau (1-indexé) d'une face.
function fx(face: TechFace, level: number): Effect[] {
  return face.levels[level - 1]!.effects;
}

test('coûts : chaque face a 5 niveaux de coût 1..5', () => {
  const faces: TechFace[] = [TECH.animod.S, TECH.animod.D, TECH.humain.O, TECH.humain.U, TECH.robot.N, TECH.robot.P];
  for (const face of faces) {
    expect(face.levels.map((l) => l.zenithium)).toEqual([1, 2, 3, 4, 5]);
  }
});

test('les 6 faces sont présentes et distinctes des slots de config', () => {
  expect(TECH.animod.S).toBeDefined();
  expect(TECH.animod.D).toBeDefined();
  expect(TECH.humain.O).toBeDefined();
  expect(TECH.humain.U).toBeDefined();
  expect(TECH.robot.N).toBeDefined();
  expect(TECH.robot.P).toBeDefined();
  // activeFace lit bien la face de la config
  const setup = { animod: 'S', humain: 'U', robot: 'N' } as const;
  expect(activeFace('animod', setup, TECH)).toBe(TECH.animod.S);
  expect(activeFace('humain', setup, TECH)).toBe(TECH.humain.U);
  expect(activeFace('robot', setup, TECH)).toBe(TECH.robot.N);
});

test('tous les niveaux 5 = 1 influence au choix de valeur 2 (planète grise, double flèche)', () => {
  const faces: TechFace[] = [TECH.animod.S, TECH.animod.D, TECH.humain.O, TECH.humain.U, TECH.robot.N, TECH.robot.P];
  for (const face of faces) {
    expect(fx(face, 5)).toEqual([{ k: 'influence', on: 'choice', amount: 2 }]);
  }
});

test('S — Animod : contenu littéral confirmé', () => {
  expect(fx(TECH.animod.S, 1)).toEqual([{ k: 'credits', amount: 2, target: 'self' }]);
  expect(fx(TECH.animod.S, 2)).toEqual([{ k: 'influenceNeighbors', count: 2, amount: 1 }]);
  expect(fx(TECH.animod.S, 3)).toEqual([{ k: 'transfer', count: 3 }]);
  expect(fx(TECH.animod.S, 4)).toEqual([{ k: 'mobilize', count: 3, thenInfluence: true }]);
});

test('U — Humain : contenu littéral confirmé', () => {
  expect(fx(TECH.humain.U, 1)).toEqual([{ k: 'influence', on: 'choice', amount: 1 }]);
  expect(fx(TECH.humain.U, 2)).toEqual([{ k: 'mobilize', count: 2, thenInfluence: false }]);
  expect(fx(TECH.humain.U, 3)).toEqual([{ k: 'steal', resource: 'credits', amount: 3 }]);
  expect(fx(TECH.humain.U, 4)).toEqual([{ k: 'influenceNeighbors', count: 3, amount: 1 }]);
});

test('N — Robot : contenu littéral confirmé (N3 = influence choice 2 + influenceDifferent 1)', () => {
  expect(fx(TECH.robot.N, 1)).toEqual([{ k: 'transfer', count: 1 }]);
  expect(fx(TECH.robot.N, 2)).toEqual([{ k: 'takeLeader', side: 'silver' }]);
  expect(fx(TECH.robot.N, 3)).toEqual([
    { k: 'influence', on: 'choice', amount: 2 },
    { k: 'influenceDifferent', amount: 1 },
  ]);
  expect(fx(TECH.robot.N, 4)).toEqual([{ k: 'credits', amount: 20, target: 'self' }]);
});

test('D — Animod : contenu littéral confirmé (D3 = influence choice 1 PUIS bonusToken)', () => {
  expect(fx(TECH.animod.D, 1)).toEqual([{ k: 'exile', side: 'opponent', count: 1 }]);
  expect(fx(TECH.animod.D, 2)).toEqual([{ k: 'credits', amount: 5, target: 'self' }]);
  expect(fx(TECH.animod.D, 3)).toEqual([{ k: 'influence', on: 'choice', amount: 1 }, { k: 'bonusToken' }]);
  expect(fx(TECH.animod.D, 4)).toEqual([{ k: 'influenceEach', amount: 1 }]);
});

test('O — Humain : contenu littéral confirmé', () => {
  expect(fx(TECH.humain.O, 1)).toEqual([{ k: 'bonusToken' }]);
  expect(fx(TECH.humain.O, 2)).toEqual([{ k: 'steal', resource: 'zenithium', amount: 1 }]);
  expect(fx(TECH.humain.O, 3)).toEqual([{ k: 'mobilize', count: 3, thenInfluence: false }]);
  expect(fx(TECH.humain.O, 4)).toEqual([{ k: 'influenceNeighbors', count: 2, amount: 2 }]);
});

test('P — Robot : contenu littéral confirmé (P2 ordre mobilize→transfer→exile ; P4 exileForInfluence 2/2)', () => {
  expect(fx(TECH.robot.P, 1)).toEqual([{ k: 'mobilize', count: 1, thenInfluence: false }]);
  expect(fx(TECH.robot.P, 2)).toEqual([
    { k: 'mobilize', count: 1, thenInfluence: false },
    { k: 'transfer', count: 1 },
    { k: 'exile', side: 'opponent', count: 1 },
  ]);
  expect(fx(TECH.robot.P, 3)).toEqual([{ k: 'credits', amount: 10, target: 'self' }]);
  expect(fx(TECH.robot.P, 4)).toEqual([{ k: 'exileForInfluence', count: 2, amount: 2 }]);
});

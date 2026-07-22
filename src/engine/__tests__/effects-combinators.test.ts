import { createGame } from '../setup';
import { resolve, chooseBranch, skipBranch } from '../effects';
import type { EffectCtx, GameState } from '../types';

const CONFIG = { techSetup: { animod: 'S', humain: 'U', robot: 'N' }, firstPlayer: 0 } as const;
const CTX: EffectCtx = { player: 0, planet: 'mars' };

test("optional pose un confirmOptional ; accepter applique les sous-effets", () => {
  const base = createGame(CONFIG, 1);
  const s: GameState = {
    ...base,
    resolution: { queue: [{ k: 'optional', effects: [{ k: 'credits', amount: 3, target: 'self' }] }], ctx: CTX },
  };
  const paused = resolve(s);
  expect(paused.pending).toEqual({ kind: 'confirmOptional' });
  expect(paused.resolution).not.toBeNull();

  const done = chooseBranch(paused, 0);
  expect(done.pending).toBeNull();
  expect(done.resolution).toBeNull();
  expect(done.players[0].credits).toBe(base.players[0].credits + 3);
});

test("optional : renoncer (skip) n'applique rien et vide la file", () => {
  const base = createGame(CONFIG, 1);
  const s: GameState = {
    ...base,
    resolution: { queue: [{ k: 'optional', effects: [{ k: 'credits', amount: 3, target: 'self' }] }], ctx: CTX },
  };
  const paused = resolve(s);
  const done = skipBranch(paused);
  expect(done.pending).toBeNull();
  expect(done.resolution).toBeNull();
  expect(done.players[0].credits).toBe(base.players[0].credits);
});

test("conditional VRAI : les effets sont appliqués immédiatement, sans aucun pending", () => {
  const base = createGame(CONFIG, 1);
  const s: GameState = {
    ...base,
    diplomacy: { leader: 0, side: 'silver' }, // le joueur 0 possède le badge
    resolution: {
      queue: [{ k: 'conditional', cond: { c: 'hasLeaderBadge' }, effects: [{ k: 'credits', amount: 8, target: 'self' }] }],
      ctx: CTX,
    },
  };
  const done = resolve(s);
  expect(done.pending).toBeNull(); // aucune confirmation demandée : « ! » est obligatoire
  expect(done.resolution).toBeNull();
  expect(done.players[0].credits).toBe(base.players[0].credits + 8);
});

test("conditional FAUX : l'atome est sauté (aucun pending), la suite s'applique", () => {
  const base = createGame(CONFIG, 1);
  const s: GameState = {
    ...base,
    diplomacy: { leader: null, side: 'silver' }, // personne n'a le badge
    resolution: {
      queue: [
        { k: 'conditional', cond: { c: 'hasLeaderBadge' }, effects: [{ k: 'credits', amount: 8, target: 'self' }] },
        { k: 'zenithium', amount: 1, target: 'self' },
      ],
      ctx: CTX,
    },
  };
  const out = resolve(s);
  expect(out.pending).toBeNull();
  expect(out.resolution).toBeNull();
  expect(out.players[0].credits).toBe(base.players[0].credits);       // saut : rien de gagné
  expect(out.players[0].zenithium).toBe(base.players[0].zenithium + 1); // la suite s'applique
});

test("conditional VRAI : les effets sont insérés en tête de file, avant le reste de la file", () => {
  const base = createGame(CONFIG, 1);
  const s: GameState = {
    ...base,
    diplomacy: { leader: 0, side: 'silver' },
    resolution: {
      queue: [
        { k: 'conditional', cond: { c: 'hasLeaderBadge' }, effects: [{ k: 'credits', amount: 8, target: 'self' }] },
        { k: 'zenithium', amount: 1, target: 'self' },
      ],
      ctx: CTX,
    },
  };
  const out = resolve(s);
  expect(out.pending).toBeNull();
  expect(out.resolution).toBeNull();
  expect(out.players[0].credits).toBe(base.players[0].credits + 8);
  expect(out.players[0].zenithium).toBe(base.players[0].zenithium + 1);
});

test("conditional VRAI : préserve resolution.chosen et n'affecte pas l'état d'origine (immutabilité)", () => {
  const base = createGame(CONFIG, 1);
  const s: GameState = {
    ...base,
    diplomacy: { leader: 0, side: 'silver' },
    resolution: {
      queue: [
        { k: 'conditional', cond: { c: 'hasLeaderBadge' }, effects: [{ k: 'credits', amount: 8, target: 'self' }] },
        { k: 'influence', on: 'choice', amount: 1 }, // laisse un pending après le conditional, pour vérifier `chosen`
      ],
      ctx: CTX,
      chosen: ['mars'],
    },
  };
  const snapshotQueue = s.resolution!.queue;
  const out = resolve(s);
  expect(out.pending).toEqual({ kind: 'choosePlanet', amount: 1 });
  expect(out.resolution!.chosen).toEqual(['mars']); // chosen préservé au travers du conditional
  expect(out.players[0].credits).toBe(base.players[0].credits + 8); // effet du conditional bien appliqué
  expect(s.resolution!.queue).toBe(snapshotQueue); // l'état d'origine n'a pas été muté
  expect(s.players[0].credits).toBe(base.players[0].credits); // idem pour l'état d'origine
});

test("choice pose un chooseOption ; choisir l'option 1 applique cette branche seule", () => {
  const base = createGame(CONFIG, 1);
  const s: GameState = {
    ...base,
    resolution: {
      queue: [{
        k: 'choice',
        options: [
          [{ k: 'takeLeader', side: 'gold' }],
          [{ k: 'credits', amount: 8, target: 'self' }],
        ],
      }],
      ctx: CTX,
    },
  };
  const paused = resolve(s);
  expect(paused.pending).toEqual({ kind: 'chooseOption', count: 2 });
  const done = chooseBranch(paused, 1); // branche « 8 crédits »
  expect(done.pending).toBeNull();
  expect(done.resolution).toBeNull();
  expect(done.players[0].credits).toBe(base.players[0].credits + 8);
  expect(done.diplomacy.leader).toBeNull(); // l'autre branche n'est PAS appliquée
});

test("choice : un index hors bornes est rejeté", () => {
  const base = createGame(CONFIG, 1);
  const s: GameState = {
    ...base,
    resolution: { queue: [{ k: 'choice', options: [[{ k: 'credits', amount: 1, target: 'self' }]] }], ctx: CTX },
  };
  const paused = resolve(s);
  expect(() => chooseBranch(paused, 5)).toThrow();
});

test("scale : un palier payable applique spend puis reward ; renoncer n'applique rien", () => {
  const base = createGame(CONFIG, 1); // 12 credits, 1 zenithium au depart
  const scale = {
    k: 'scale' as const,
    tiers: [
      { cost: [{ k: 'spend' as const, resource: 'credits' as const, amount: 3 }], reward: [{ k: 'zenithium' as const, amount: 1, target: 'self' as const }] },
      { cost: [{ k: 'spend' as const, resource: 'credits' as const, amount: 7 }], reward: [{ k: 'zenithium' as const, amount: 2, target: 'self' as const }] },
    ],
  };
  const s: GameState = { ...base, resolution: { queue: [scale], ctx: CTX } };
  const paused = resolve(s);
  expect(paused.pending).toEqual({ kind: 'chooseTier', count: 2 });

  const done = chooseBranch(paused, 1); // palier 2 : depense 7 credits -> +2 zenithium
  expect(done.players[0].credits).toBe(base.players[0].credits - 7);
  expect(done.players[0].zenithium).toBe(base.players[0].zenithium + 2);

  const renounced = skipBranch(resolve({ ...base, resolution: { queue: [scale], ctx: CTX } }));
  expect(renounced.players[0].credits).toBe(base.players[0].credits);
  expect(renounced.players[0].zenithium).toBe(base.players[0].zenithium);
});

test("spend : borne a 0, ne rend jamais une reserve negative", () => {
  const base = createGame(CONFIG, 1); // 1 zenithium
  const s: GameState = { ...base, resolution: { queue: [{ k: 'spend', resource: 'zenithium', amount: 5 }], ctx: CTX } };
  const out = resolve(s);
  expect(out.players[0].zenithium).toBe(0); // 1 - 5 borne a 0
});

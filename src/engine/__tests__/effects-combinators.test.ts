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

test("conditional VRAI : pose un confirmOptional (reste facultatif) et accepter applique", () => {
  const base = createGame(CONFIG, 1);
  const s: GameState = {
    ...base,
    diplomacy: { leader: 0, side: 'silver' }, // le joueur 0 possède le badge
    resolution: {
      queue: [{ k: 'conditional', cond: { c: 'hasLeaderBadge' }, effects: [{ k: 'credits', amount: 8, target: 'self' }] }],
      ctx: CTX,
    },
  };
  const paused = resolve(s);
  expect(paused.pending).toEqual({ kind: 'confirmOptional' });
  const done = chooseBranch(paused, 0);
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

test("conditional VRAI mais le joueur RENONCE (facultatif)", () => {
  const base = createGame(CONFIG, 1);
  const s: GameState = {
    ...base,
    diplomacy: { leader: 0, side: 'silver' },
    resolution: {
      queue: [{ k: 'conditional', cond: { c: 'hasLeaderBadge' }, effects: [{ k: 'credits', amount: 8, target: 'self' }] }],
      ctx: CTX,
    },
  };
  const out = skipBranch(resolve(s));
  expect(out.players[0].credits).toBe(base.players[0].credits);
});

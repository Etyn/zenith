import { createGame } from '../setup';
import { applyEffect, resolve, decide } from '../effects';
import { CENTER } from '../setup';
import type { EffectCtx, GameState } from '../types';

const CONFIG = { techSetup: { animod: 'S', humain: 'U', robot: 'N' }, firstPlayer: 0 } as const;
const CTX: EffectCtx = { player: 0, planet: 'mars' };

test("applyEffect crédite le joueur courant (self)", () => {
  const s = createGame(CONFIG, 1);
  const s2 = applyEffect(s, { k: 'credits', amount: 3, target: 'self' }, CTX);
  expect(s2.players[0].credits).toBe(s.players[0].credits + 3);
  expect(s2.players[1].credits).toBe(s.players[1].credits);
});

test("applyEffect crédite l'adversaire (opponent)", () => {
  const s = createGame(CONFIG, 1);
  const s2 = applyEffect(s, { k: 'zenithium', amount: 2, target: 'opponent' }, CTX);
  expect(s2.players[1].zenithium).toBe(s.players[1].zenithium + 2);
  expect(s2.players[0].zenithium).toBe(s.players[0].zenithium);
});

test("applyEffect ne mute pas l'état d'entrée", () => {
  const s = createGame(CONFIG, 1);
  const before = s.players[0].credits;
  applyEffect(s, { k: 'credits', amount: 5, target: 'self' }, CTX);
  expect(s.players[0].credits).toBe(before);
});

test("resolve dépile toute la file d'atomes sans choix puis remet resolution à null", () => {
  const base = createGame(CONFIG, 1);
  const s: GameState = {
    ...base,
    resolution: {
      queue: [
        { k: 'credits', amount: 1, target: 'self' },
        { k: 'zenithium', amount: 1, target: 'self' },
      ],
      ctx: CTX,
    },
  };
  const out = resolve(s);
  expect(out.resolution).toBeNull();
  expect(out.players[0].credits).toBe(base.players[0].credits + 1);
  expect(out.players[0].zenithium).toBe(base.players[0].zenithium + 1);
});

test('influence sur une planète précise est appliquée sans pause', () => {
  const base = createGame(CONFIG, 1);
  const s: GameState = { ...base, resolution: { queue: [{ k: 'influence', amount: 1, on: 'mars' }], ctx: CTX } };
  const out = resolve(s);
  expect(out.pending).toBeNull();
  expect(out.resolution).toBeNull();
  expect(out.planets.mars.discPos).toBe(CENTER - 1); // joueur 0 → vers sa zone
});

test("influence 'choice' met une decision en attente, puis decide l'applique", () => {
  const base = createGame(CONFIG, 1);
  const s: GameState = { ...base, resolution: { queue: [{ k: 'influence', amount: 2, on: 'choice' }], ctx: CTX } };
  const paused = resolve(s);
  expect(paused.pending).toEqual({ kind: 'choosePlanet', amount: 2 });
  expect(paused.resolution).not.toBeNull(); // la résolution reste en cours

  const done = decide(paused, 'venus');
  expect(done.pending).toBeNull();
  expect(done.resolution).toBeNull();
  expect(done.planets.venus.discPos).toBe(CENTER - 2); // joueur 0, 2 crans
});

test('resolve arrête d’appliquer les effets restants après une victoire', () => {
  const base = createGame(CONFIG, 1);
  const s: GameState = {
    ...base,
    planets: { ...base.planets, mars: { discPos: 1, captured: [2, 0], bonusActive: false } },
    resolution: {
      queue: [
        { k: 'influence', amount: 1, on: 'mars' },
        { k: 'credits', amount: 5, target: 'self' },
      ],
      ctx: { player: 0, planet: 'mars' },
    },
  };
  const creditsBefore = s.players[0].credits;
  const out = resolve(s);
  expect(out.winner).toBe(0);                          // 3e capture mars → victoire
  expect(out.resolution).toBeNull();                   // résolution nettoyée
  expect(out.players[0].credits).toBe(creditsBefore);  // l'effet credits résiduel N'EST PAS appliqué
});

test('mobilize place N cartes du deck dans les colonnes du joueur sans appliquer leurs effets', () => {
  const base = createGame(CONFIG, 1);
  const topTwo = base.deck.slice(0, 2);
  const s: GameState = { ...base, resolution: { queue: [{ k: 'mobilize', count: 2, thenInfluence: false }], ctx: CTX } };
  const out = resolve(s);
  const placed = ([] as string[]).concat(
    out.players[0].columns.mercure, out.players[0].columns.venus, out.players[0].columns.terra,
    out.players[0].columns.mars, out.players[0].columns.jupiter,
  );
  for (const id of topTwo) expect(placed).toContain(id);
  expect(out.deck.length).toBe(base.deck.length - 2);
});

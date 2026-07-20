import { createGame } from '../setup';
import { applyEffect, resolve } from '../effects';
import type { EffectCtx, GameState } from '../types';

const CONFIG = { techSetup: { animod: 'S', humain: 'U', robot: 'N' }, firstPlayer: 0 } as const;
const CTX: EffectCtx = { player: 0, planet: 'mars' };

function withResolution(base: GameState, queue: GameState['resolution'] extends null ? never : any): GameState {
  return { ...base, resolution: { queue, ctx: CTX } };
}

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

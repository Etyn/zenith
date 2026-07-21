import { createGame } from '../setup';
import { applyEffect } from '../effects';
import type { EffectCtx, GameState, Planet } from '../types';

const CONFIG = { techSetup: { animod: 'S', humain: 'U', robot: 'N' }, firstPlayer: 0 } as const;
const CTX: EffectCtx = { player: 0, planet: 'mars' };

function withColumns(base: GameState, index: 0 | 1, cols: Partial<Record<Planet, string[]>>): GameState {
  const players: [GameState['players'][0], GameState['players'][1]] = [base.players[0], base.players[1]];
  players[index] = { ...players[index], columns: { ...players[index].columns, ...cols } };
  return { ...base, players };
}

test("creditsPerCardColors self : 2 crédits par couleur présente dans SA zone", () => {
  const base = createGame(CONFIG, 1);
  const seeded = withColumns(base, 0, { terra: ['a'], mars: ['b'], venus: ['c'] }); // 3 couleurs
  const out = applyEffect(seeded, { k: 'creditsPerCardColors', zone: 'self', per: 2 }, CTX);
  expect(out.players[0].credits).toBe(seeded.players[0].credits + 6);
});

test("creditsPerCardColors opponent : compte la zone adverse, crédite le joueur actif", () => {
  const base = createGame(CONFIG, 1);
  const seeded = withColumns(base, 1, { terra: ['a'], mars: ['b'] }); // 2 couleurs chez l'adversaire
  const out = applyEffect(seeded, { k: 'creditsPerCardColors', zone: 'opponent', per: 2 }, CTX);
  expect(out.players[0].credits).toBe(seeded.players[0].credits + 4);
  expect(out.players[1].credits).toBe(seeded.players[1].credits); // l'adversaire ne gagne rien
});

test("creditsPerTechLevels : 4/8/12 selon le nombre de technos niveau >= 1 (0 => 0)", () => {
  const base = createGame(CONFIG, 1);
  const players: [GameState['players'][0], GameState['players'][1]] = [base.players[0], base.players[1]];
  players[0] = { ...players[0], techMarkers: { animod: 2, humain: 1, robot: 0 } }; // 2 technos >= 1
  const seeded: GameState = { ...base, players };
  const out = applyEffect(seeded, { k: 'creditsPerTechLevels', tiers: [4, 8, 12] }, CTX);
  expect(out.players[0].credits).toBe(seeded.players[0].credits + 8);
});

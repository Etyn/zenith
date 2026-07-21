import { createGame, CENTER } from '../setup';
import { applyEffect, resolve, decide } from '../effects';
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

test("giveOpponent : retire de sa réserve et donne à l'adversaire (borné au stock)", () => {
  const base = createGame(CONFIG, 1);
  const players: [GameState['players'][0], GameState['players'][1]] = [base.players[0], base.players[1]];
  players[0] = { ...players[0], zenithium: 2 };
  const seeded: GameState = { ...base, players };
  const out = applyEffect(seeded, { k: 'giveOpponent', resource: 'zenithium', amount: 5 }, CTX);
  expect(out.players[0].zenithium).toBe(0);                                   // borné : n'avait que 2
  expect(out.players[1].zenithium).toBe(seeded.players[1].zenithium + 2);
});

test("giveLeaderBadge : le joueur qui le détient le donne à l'adversaire", () => {
  const base = createGame(CONFIG, 1);
  const s: GameState = { ...base, diplomacy: { leader: 0, side: 'gold' } };
  const out = applyEffect(s, { k: 'giveLeaderBadge' }, CTX);
  expect(out.diplomacy).toEqual({ leader: 1, side: 'gold' }); // côté conservé
});

test("giveLeaderBadge : no-op si le joueur actif ne détient pas le badge", () => {
  const base = createGame(CONFIG, 1);
  const s: GameState = { ...base, diplomacy: { leader: 1, side: 'silver' } };
  const out = applyEffect(s, { k: 'giveLeaderBadge' }, CTX);
  expect(out.diplomacy).toEqual({ leader: 1, side: 'silver' });
});

test("influenceChoiceExcept : la planète barrée n'est pas proposée et rechoisie => throw", () => {
  const base = createGame(CONFIG, 1);
  const s: GameState = { ...base, resolution: { queue: [{ k: 'influenceChoiceExcept', exceptColor: 'mars', amount: 1 }], ctx: CTX } };
  const paused = resolve(s);
  expect(paused.pending).toEqual({ kind: 'choosePlanet', amount: 1, exclude: ['mars'] });
  expect(() => decide(paused, 'mars')).toThrow();
  const out = decide(paused, 'venus');
  expect(out.planets.venus.discPos).toBe(base.planets.venus.discPos - 1); // joueur 0, dir -1
});

test("influenceChoiceAtCenter : seules les planètes au centre sont éligibles", () => {
  const base = createGame(CONFIG, 1); // 2e joueur = 1 => terra décalée (pos 5), les autres au centre (4)
  const s: GameState = { ...base, resolution: { queue: [{ k: 'influenceChoiceAtCenter', amount: 2 }], ctx: CTX } };
  const paused = resolve(s);
  expect(paused.pending).toEqual({ kind: 'choosePlanet', amount: 2, atCenter: true });
  expect(() => decide(paused, 'terra')).toThrow();      // terra n'est pas au centre
  const out = decide(paused, 'mars');                   // mars est au centre
  expect(out.planets.mars.discPos).toBe(CENTER - 2);
});

test("giveInfluenceOpponent : l'influence choisie va à l'adversaire", () => {
  const base = createGame(CONFIG, 1);
  const s: GameState = { ...base, resolution: { queue: [{ k: 'giveInfluenceOpponent', amount: 1 }], ctx: CTX } };
  const paused = resolve(s);
  expect(paused.pending).toEqual({ kind: 'choosePlanet', amount: 1, beneficiary: 'opponent' });
  const out = decide(paused, 'venus');
  expect(out.planets.venus.discPos).toBe(base.planets.venus.discPos + 1); // joueur 1, dir +1
});

test("moveDiscToCenter : repositionne au centre le disque choisi", () => {
  const base = createGame(CONFIG, 1); // terra à 5
  const s: GameState = { ...base, resolution: { queue: [{ k: 'moveDiscToCenter' }], ctx: CTX } };
  const paused = resolve(s);
  expect(paused.pending).toEqual({ kind: 'moveDiscToCenter' });
  const out = decide(paused, 'terra');
  expect(out.planets.terra.discPos).toBe(CENTER);
  expect(out.resolution).toBeNull();
});

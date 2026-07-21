import { createGame } from '../setup';
import { developTech } from '../develop';
import { resolve, decideTech } from '../effects';
import type { GameState } from '../types';

const CONFIG = { techSetup: { animod: 'S', humain: 'U', robot: 'N' }, firstPlayer: 0 } as const;

test("developTech : monte le marqueur, déduit le coût, retourne la file d'effets", () => {
  const base = createGame(CONFIG, 1); // zénithium départ = 1 ; animod S L1 coût 1, effet credits +2
  const res = developTech(base, 0, 'animod');
  expect(res).not.toBeNull();
  expect(res!.state.players[0].techMarkers.animod).toBe(1);
  expect(res!.state.players[0].zenithium).toBe(base.players[0].zenithium - 1);
  expect(res!.queue).toEqual([{ k: 'credits', amount: 2, target: 'self' }]);
});

test('developTech : coût > zénithium => null', () => {
  const base = createGame(CONFIG, 1);
  const poor: GameState = { ...base, players: [{ ...base.players[0], zenithium: 0 }, base.players[1]] };
  expect(developTech(poor, 0, 'animod')).toBeNull();
});

test('developTech : coût 0 forcé développe sans dépenser', () => {
  const base = createGame(CONFIG, 1);
  const res = developTech(base, 0, 'animod', 0);
  expect(res!.state.players[0].zenithium).toBe(base.players[0].zenithium); // rien dépensé
  expect(res!.state.players[0].techMarkers.animod).toBe(1);
});

test('developDiscounted cardPeople : coût réduit, peuple = ctx.people', () => {
  const base = createGame(CONFIG, 1); // animod L1 coût 1 ; discount 1 => coût 0
  const s: GameState = {
    ...base,
    resolution: {
      queue: [{ k: 'developDiscounted', which: 'cardPeople', discount: 1 }],
      ctx: { player: 0, planet: 'mercure', people: 'animod' },
    },
  };
  const out = resolve(s);
  expect(out.pending).toBeNull();
  expect(out.players[0].techMarkers.animod).toBe(1);
  expect(out.players[0].zenithium).toBe(base.players[0].zenithium); // coût 0
  expect(out.players[0].credits).toBe(base.players[0].credits + 2); // effet L1 animod S
});

test('developLowest : niveau le plus bas unique, coût 0', () => {
  const base = createGame(CONFIG, 1);
  const seeded: GameState = {
    ...base,
    players: [{ ...base.players[0], techMarkers: { animod: 0, humain: 1, robot: 2 } }, base.players[1]],
  };
  const s: GameState = { ...seeded, resolution: { queue: [{ k: 'developLowest' }], ctx: { player: 0, planet: 'mercure' } } };
  const out = resolve(s);
  expect(out.players[0].techMarkers.animod).toBe(1); // animod était le plus bas
  expect(out.players[0].zenithium).toBe(seeded.players[0].zenithium); // coût 0
});

test('developLowest : égalité => chooseTech ; decideTech applique le peuple choisi', () => {
  const base = createGame(CONFIG, 1); // tous à 0 => égalité
  const s: GameState = { ...base, resolution: { queue: [{ k: 'developLowest' }], ctx: { player: 0, planet: 'mercure' } } };
  const paused = resolve(s);
  expect(paused.pending).toEqual({ kind: 'chooseTech', discount: 0, zeroCost: true, candidates: ['animod', 'humain', 'robot'] });
  const out = decideTech(paused, 'animod'); // L1 animod S = credits +2 (non interactif)
  expect(out.pending).toBeNull();
  expect(out.players[0].techMarkers.animod).toBe(1);
  expect(out.players[0].zenithium).toBe(base.players[0].zenithium); // coût 0
});

test('developDiscounted choice : chooseTech puis decideTech déduit le coût réduit', () => {
  const base = createGame(CONFIG, 1);
  const rich: GameState = { ...base, players: [{ ...base.players[0], zenithium: 3 }, base.players[1]] };
  const s: GameState = {
    ...rich,
    resolution: { queue: [{ k: 'developDiscounted', which: 'choice', discount: 0 }], ctx: { player: 0, planet: 'mercure' } },
  };
  const paused = resolve(s);
  expect(paused.pending).toEqual({ kind: 'chooseTech', discount: 0, zeroCost: false, candidates: ['animod', 'humain', 'robot'] });
  const out = decideTech(paused, 'animod'); // coût 1
  expect(out.players[0].techMarkers.animod).toBe(1);
  expect(out.players[0].zenithium).toBe(rich.players[0].zenithium - 1);
});

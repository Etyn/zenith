import { createGame } from '../setup';
import { gainInfluence, checkVictory, winnerOf } from '../influence';
import { CENTER } from '../setup';
import { resolve, decide } from '../effects';
import type { GameConfig, GameState } from '../types';

const CONFIG: GameConfig = { techSetup: { animod: 'S', humain: 'U', robot: 'N' }, firstPlayer: 0 };

test('gagner 1 influence déplace le disque vers la zone du joueur', () => {
  const s = createGame(CONFIG, 1);
  const s2 = gainInfluence(s, 'mars', 0, 1); // joueur 0 → discPos diminue
  expect(s2.planets.mars.discPos).toBe(CENTER - 1);
  const s3 = gainInfluence(s, 'mars', 1, 1); // joueur 1 → discPos augmente
  expect(s3.planets.mars.discPos).toBe(CENTER + 1);
});

test('atteindre sa zone capture le disque et le renvoie au centre', () => {
  let s = createGame(CONFIG, 1);
  s = gainInfluence(s, 'mars', 0, 4); // de 4 à 0 → capture
  expect(s.planets.mars.captured[0]).toBe(1);
  expect(s.planets.mars.discPos).toBe(CENTER);
  expect(s.planets.mars.bonusToken).toBeNull(); // 1re capture
});

test('ne mute pas l\'état d\'entrée', () => {
  const s = createGame(CONFIG, 1);
  gainInfluence(s, 'mars', 0, 1);
  expect(s.planets.mars.discPos).toBe(CENTER);
});

test('une capture ne mute pas le tableau captured de l\'état d\'entrée', () => {
  const s = createGame(CONFIG, 1);
  const before = s.planets.mars.captured.slice();
  gainInfluence(s, 'mars', 0, 4); // amount=4 → déclenche une capture
  expect(s.planets.mars.captured).toEqual(before); // l'état d'entrée n'est pas muté
  expect(s.planets.mars.discPos).toBe(CENTER);      // ni le disque
});

test('victoire absolue : 3 disques d\'une même planète', () => {
  let s = createGame(CONFIG, 1);
  for (let i = 0; i < 3; i++) s = gainInfluence(s, 'mars', 0, 4);
  expect(checkVictory(s, 0)).toBe(true);
  expect(winnerOf(s)).toBe(0);
});

test('victoire populaire : 5 disques au total', () => {
  let s = createGame(CONFIG, 1);
  const planets = ['mercure', 'venus', 'mars', 'jupiter'] as const;
  // 2 sur mercure + 1 sur chacune des 3 autres = 5, sans atteindre 3 sur une seule
  s = gainInfluence(s, 'mercure', 1, 4);
  s = gainInfluence(s, 'mercure', 1, 4);
  for (const p of ['venus', 'mars', 'jupiter'] as const) s = gainInfluence(s, p, 1, 4);
  expect(checkVictory(s, 1)).toBe(true);
});

test('pas de fausse victoire au départ', () => {
  const s = createGame(CONFIG, 1);
  expect(winnerOf(s)).toBeNull();
});

test("capture d'une planète portant un jeton : le jeton se résout AVANT les effets restants", () => {
  const base = createGame(CONFIG, 1);
  // mars à un cran de la capture pour J0 ; on force le jeton de mars = influence au choix.
  const s: GameState = {
    ...base,
    planets: { ...base.planets, mars: { discPos: 4, captured: [0, 0], bonusToken: 'tok-inf1-1' } },
    resolution: {
      queue: [
        { k: 'influence', amount: 4, on: 'mars' } as const, // capture mars (4 → 0)
        { k: 'credits', amount: 5, target: 'self' } as const,
      ],
      ctx: { player: 0 as const, planet: 'mars' as const },
    },
  };
  const out = resolve(s);
  // le jeton (influence au choix) s'intercale et pose un pending AVANT credits
  expect(out.pending).toEqual({ kind: 'choosePlanet', amount: 1 });
  expect(out.players[0].credits).toBe(base.players[0].credits); // credits pas encore appliqué
  expect(out.planets.mars.bonusToken).toBeNull();               // jeton retiré de la planète
  expect(out.bonusDiscard).toContain('tok-inf1-1');             // défaussé
  expect(out.planets.mars.captured[0]).toBe(1);                 // capture effective
  // on termine : le jeton se résout (influence venus), puis credits
  const done = decide(out, 'venus');
  expect(done.players[0].credits).toBe(base.players[0].credits + 5);
  expect(done.resolution).toBeNull();
});

test("capture d'une planète avec jeton immédiat : effet appliqué puis suite", () => {
  const base = createGame(CONFIG, 1);
  const s: GameState = {
    ...base,
    planets: { ...base.planets, mars: { discPos: 4, captured: [0, 0], bonusToken: 'tok-zen1-1' } },
    resolution: {
      queue: [
        { k: 'influence', amount: 4, on: 'mars' } as const,
        { k: 'credits', amount: 5, target: 'self' } as const,
      ],
      ctx: { player: 0 as const, planet: 'mars' as const },
    },
  };
  const out = resolve(s);
  expect(out.pending).toBeNull();
  expect(out.resolution).toBeNull();
  expect(out.players[0].zenithium).toBe(base.players[0].zenithium + 1); // jeton zénithium
  expect(out.players[0].credits).toBe(base.players[0].credits + 5);     // puis credits
  expect(out.planets.mars.bonusToken).toBeNull();
  expect(out.bonusDiscard).toContain('tok-zen1-1');
});

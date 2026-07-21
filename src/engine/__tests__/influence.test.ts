import { createGame } from '../setup';
import { gainInfluence, checkVictory, winnerOf } from '../influence';
import { CENTER } from '../setup';
import type { GameConfig } from '../types';

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

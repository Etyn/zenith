import { createGame, START_CREDITS, START_ZENITHIUM, START_HAND, CENTER } from '../setup';
import { PLANETS, type GameConfig } from '../types';

const CONFIG: GameConfig = {
  techSetup: { animod: 'S', humain: 'U', robot: 'N' },
  firstPlayer: 0,
};

test('chaque joueur démarre avec 12 crédits, 1 zénithium, 4 cartes', () => {
  const s = createGame(CONFIG, 123);
  for (const p of s.players) {
    expect(p.credits).toBe(START_CREDITS);
    expect(p.zenithium).toBe(START_ZENITHIUM);
    expect(p.hand.length).toBe(START_HAND);
  }
});

test('le premier joueur est celui de la config', () => {
  expect(createGame(CONFIG, 1).current).toBe(0);
  expect(createGame({ ...CONFIG, firstPlayer: 1 }, 1).current).toBe(1);
});

test('les disques partent au centre, sauf Terra décalée vers le 2e joueur', () => {
  const s = createGame(CONFIG, 1); // firstPlayer=0 → 2e joueur = 1 (zone = position 8)
  for (const planet of PLANETS) {
    if (planet === 'terra') continue;
    expect(s.planets[planet].discPos).toBe(CENTER);
  }
  expect(s.planets.terra.discPos).toBe(CENTER + 1); // décalé d'un cran vers le joueur 1
});

test('mélange déterministe : même seed → mêmes mains', () => {
  const a = createGame(CONFIG, 999);
  const b = createGame(CONFIG, 999);
  expect(a.players[0].hand).toEqual(b.players[0].hand);
  expect(a.deck).toEqual(b.deck);
});

test('aucune carte perdue : main0 + main1 + deck = tout le paquet', () => {
  const s = createGame(CONFIG, 5);
  const total = s.players[0].hand.length + s.players[1].hand.length + s.deck.length;
  expect(total).toBe(10); // FIXTURE_CARDS
});

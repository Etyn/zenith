import { createGame, START_CREDITS, START_ZENITHIUM, START_HAND, CENTER } from '../setup';
import { PLANETS, type GameConfig } from '../types';
import { TOKENS } from '../../data/tokens';

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

test('une nouvelle partie n’a ni résolution ni décision en attente', () => {
  const s = createGame(CONFIG, 1);
  expect(s.resolution).toBeNull();
  expect(s.pending).toBeNull();
});

test('setup : 8 jetons sur le plateau (5 planètes + 3 technos) et 8 en réserve', () => {
  const s = createGame(CONFIG, 42);
  const onPlanets = PLANETS.map((p) => s.planets[p].bonusToken);
  const onTech = (['animod', 'humain', 'robot'] as const).map((pe) => s.techBonus[pe]);
  expect(onPlanets.every((t) => t !== null)).toBe(true); // 5 planètes garnies
  expect(onTech.every((t) => t !== null)).toBe(true); // 3 emplacements niveau 2 garnis
  expect(s.bonusReserve).toHaveLength(8);
  expect(s.bonusDiscard).toEqual([]);
});

test('setup : les 16 jetons sont répartis sans perte ni doublon', () => {
  const s = createGame(CONFIG, 42);
  const placed = [
    ...PLANETS.map((p) => s.planets[p].bonusToken!),
    ...(['animod', 'humain', 'robot'] as const).map((pe) => s.techBonus[pe]!),
    ...s.bonusReserve,
  ];
  expect(placed).toHaveLength(16);
  expect(new Set(placed)).toEqual(new Set(TOKENS.map((t) => t.id)));
});

test('setup : placement des jetons déterministe pour une même graine', () => {
  const a = createGame(CONFIG, 999);
  const b = createGame(CONFIG, 999);
  expect(a.bonusReserve).toEqual(b.bonusReserve);
  expect(PLANETS.map((p) => a.planets[p].bonusToken)).toEqual(PLANETS.map((p) => b.planets[p].bonusToken));
  expect(a.techBonus).toEqual(b.techBonus);
});

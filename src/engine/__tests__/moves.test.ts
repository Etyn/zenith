import { createGame } from '../setup';
import { applyMove, legalMoves } from '../moves';
import { cardOf, resolve } from '../effects';
import type { GameState, Planet } from '../types';
import { activeFace } from '../../data/tech';
import { FIXTURE_CARDS } from '../../data/fixtures';

// Fabrique un état avec des colonnes préremplies pour le joueur donné.
function withColumns(base: GameState, index: 0 | 1, cols: Partial<Record<Planet, string[]>>): GameState {
  const players: [GameState['players'][0], GameState['players'][1]] = [base.players[0], base.players[1]];
  players[index] = { ...players[index], columns: { ...players[index].columns, ...cols } };
  return { ...base, players };
}

const CONFIG = { techSetup: { animod: 'S', humain: 'U', robot: 'N' }, firstPlayer: 0 } as const;

function firstAffordableFixedInfluenceCard(s: GameState): string {
  // Une carte de la main du joueur courant dont le 1er effet influence est sur une planète précise
  // (les fixtures le sont toutes) et abordable.
  for (const id of s.players[s.current].hand) {
    const c = cardOf(id)!;
    if (c.cost <= s.players[s.current].credits) return id;
  }
  return s.players[s.current].hand[0]!;
}

test('legalMoves propose des recruit (et desormais des develop et leadership) pour le joueur courant au départ', () => {
  const s = createGame(CONFIG, 1);
  const moves = legalMoves(s, 0);
  expect(moves.length).toBeGreaterThan(0);
  // Depuis l'ajout de l'action develop (coût niveau 1 = 1 Zénithium = START_ZENITHIUM), les deux
  // types de coup sont légaux dès le début de partie ; seul le type recruit était possible avant.
  // leadership est toujours légal (aucune ressource requise) dès qu'il y a une carte en main.
  expect(moves.some((m) => m.t === 'recruit')).toBe(true);
  expect(moves.some((m) => m.t === 'develop')).toBe(true);
  expect(moves.some((m) => m.t === 'leadership')).toBe(true);
  expect(moves.every((m) => m.t === 'recruit' || m.t === 'develop' || m.t === 'leadership')).toBe(true);
  expect(legalMoves(s, 1)).toEqual([]); // pas le tour du joueur 1
});

test('recruter pose la carte, paie le coût réduit, applique les effets et passe la main', () => {
  const s = createGame(CONFIG, 1);
  const id = firstAffordableFixedInfluenceCard(s);
  const card = cardOf(id)!;
  const creditsBefore = s.players[0].credits;
  const out = applyMove(s, { t: 'recruit', cardId: id });

  // carte posée dans sa colonne, retirée de la main
  expect(out.players[0].columns[card.planet]).toContain(id);
  expect(out.players[0].hand).not.toContain(id);
  // coût payé = cost - 0 carte déjà présente = cost
  expect(out.players[0].credits).toBe(creditsBefore - card.cost);
  // effet d'influence appliqué sur la planète de la carte (disque bougé vers J0)
  expect(out.planets[card.planet].discPos).toBeLessThanOrEqual(4);
  // fin de tour : main du joueur 0 repiochée à 4, tour passé à J1
  expect(out.players[0].hand.length).toBe(4);
  expect(out.current).toBe(1);
});

test('la réduction de coût s’applique par carte déjà présente dans la colonne', () => {
  // On force une 2e carte de même planète pour vérifier la réduction (via état construit à la main).
  const base = createGame(CONFIG, 1);
  const id = base.players[0].hand.find((cid) => cardOf(cid)!.planet === 'mars');
  if (!id) return; // si la main ne contient pas de carte mars, test trivialement ok
  const card = cardOf(id)!;
  const s: GameState = {
    ...base,
    players: [
      { ...base.players[0], columns: { ...base.players[0].columns, mars: ['FIX_mars_0'] } },
      base.players[1],
    ],
  };
  const creditsBefore = s.players[0].credits;
  const out = applyMove(s, { t: 'recruit', cardId: id });
  expect(out.players[0].credits).toBe(creditsBefore - Math.max(0, card.cost - 1));
});

test('applyMove ne mute pas l’état d’entrée', () => {
  const s = createGame(CONFIG, 1);
  const id = firstAffordableFixedInfluenceCard(s);
  const handBefore = [...s.players[0].hand];
  applyMove(s, { t: 'recruit', cardId: id });
  expect(s.players[0].hand).toEqual(handBefore);
});

test('applyMove decide sans décision en attente renvoie l’état inchangé (pas d’exception)', () => {
  const s = createGame(CONFIG, 1);
  expect(applyMove(s, { t: 'decide', planet: 'mars' })).toBe(s);
});

test('legalMoves pendant un pending propose une décision par planète, réservée au joueur en résolution', () => {
  const base = createGame(CONFIG, 1);
  const s: GameState = {
    ...base,
    resolution: { queue: [], ctx: { player: 0, planet: 'mars' } },
    pending: { kind: 'choosePlanet', amount: 1 },
  };
  const moves = legalMoves(s, 0);
  expect(moves).toHaveLength(5);
  expect(moves.every((m) => m.t === 'decide')).toBe(true);
  expect(legalMoves(s, 1)).toEqual([]);
});

test('legalMoves sous un chooseSegment ne propose que les débuts de segment valides (pas de débordement)', () => {
  const base = createGame(CONFIG, 1);
  const s: GameState = {
    ...base,
    resolution: { queue: [], ctx: { player: 0, planet: 'terra' } },
    pending: { kind: 'chooseSegment', count: 2, amount: 1 },
  };
  const moves = legalMoves(s, 0);
  const planets = moves.map((m) => (m as { t: 'decide'; planet: string }).planet);
  expect(planets).not.toContain('jupiter'); // jupiter + 2 déborderait de la rangée
  expect(planets).toEqual(expect.arrayContaining(['mercure', 'venus', 'terra', 'mars']));
  expect(planets).toHaveLength(4);
});

test('legalMoves sous un choosePlanet avec exclude ne propose pas les planètes exclues', () => {
  const base = createGame(CONFIG, 1);
  const s: GameState = {
    ...base,
    resolution: { queue: [], ctx: { player: 0, planet: 'terra' } },
    pending: { kind: 'choosePlanet', amount: 1, exclude: ['terra'] },
  };
  const moves = legalMoves(s, 0);
  const planets = moves.map((m) => (m as { t: 'decide'; planet: string }).planet);
  expect(planets).not.toContain('terra');
  expect(planets).toHaveLength(4);
});

test('une victoire en cours de résolution ne repioche pas et ne passe pas la main', () => {
  const base = createGame(CONFIG, 1);
  const id = base.players[0].hand.find((cid) => cardOf(cid)!.planet === 'mars');
  if (!id) return; // main sans carte mars → test trivialement ok
  const s: GameState = {
    ...base,
    planets: { ...base.planets, mars: { discPos: 1, captured: [2, 0], bonusToken: null } },
  };
  const out = applyMove(s, { t: 'recruit', cardId: id });
  expect(out.winner).toBe(0);   // 3e capture mars → victoire absolue
  expect(out.current).toBe(0);  // la main n'est PAS passée
});

test('develop : défausse la carte, paie le coût du niveau, avance le marqueur', () => {
  const base = createGame(CONFIG, 1);
  const id = base.players[0].hand[0]!;
  const people = cardOf(id)!.people;
  const s: GameState = { ...base, players: [{ ...base.players[0], zenithium: 5 }, base.players[1]] };
  const zBefore = s.players[0].zenithium;
  const cost = activeFace(people, s.config.techSetup).levels[0]!.zenithium; // niveau 1
  const out = applyMove(s, { t: 'develop', cardId: id, people });
  expect(out.players[0].techMarkers[people]).toBe(1);
  expect(out.players[0].zenithium).toBe(zBefore - cost);
  expect(out.discard).toContain(id);
  expect(out.players[0].hand).not.toContain(id);
  expect(out.current).toBe(1); // fin de tour
});

test('develop illégal si zénithium insuffisant', () => {
  const base = createGame(CONFIG, 1);
  const id = base.players[0].hand[0]!;
  const people = cardOf(id)!.people;
  const s: GameState = { ...base, players: [{ ...base.players[0], zenithium: 0 }, base.players[1]] };
  expect(applyMove(s, { t: 'develop', cardId: id, people })).toBe(s); // no-op
});

test('prime de ligne niveau 1 : quand les 3 technos atteignent le niveau 1, +1 influence au choix', () => {
  const base = createGame(CONFIG, 1);
  // marqueurs : animod=1, humain=1, robot=0 ; on va développer robot avec une carte robot.
  const robotId = base.players[0].hand.find((id) => cardOf(id)!.people === 'robot');
  if (!robotId) return;
  const s: GameState = {
    ...base,
    players: [
      { ...base.players[0], zenithium: 5, techMarkers: { animod: 1, humain: 1, robot: 0 } },
      base.players[1],
    ],
  };
  const out = applyMove(s, { t: 'develop', cardId: robotId, people: 'robot' });
  // develop robot niv.1 → effet niv.1 (influence choice) PUIS prime de ligne niv.1 (influence choice)
  // les deux sont des influence 'choice' → une décision est en attente (pas de fin de tour)
  expect(out.pending).not.toBeNull();
  expect(out.players[0].lineBonusClaimed[1]).toBe(true);
});

test('leadership robot : défausse la carte, prend le badge (Argent) et gagne 1 zénithium', () => {
  const base = createGame(CONFIG, 1);
  const robotId = base.players[0].hand.find((id) => cardOf(id)!.people === 'robot');
  if (!robotId) return;
  const zBefore = base.players[0].zenithium;
  const out = applyMove(base, { t: 'leadership', cardId: robotId });
  expect(out.discard).toContain(robotId);
  expect(out.diplomacy).toEqual({ leader: 0, side: 'silver' });
  expect(out.players[0].zenithium).toBe(zBefore + 1);
  expect(out.current).toBe(1); // fin de tour (leadership robot = pas de décision)
});

test('la limite de repioche suit le badge Leader (4 / 5 / 6)', () => {
  const base = createGame(CONFIG, 1);
  const allIds = FIXTURE_CARDS.map((c) => c.id);
  // Main courte (2 cartes) et deck volontairement large (6 cartes, > need max = 5) pour que
  // la repioche de fin de tour ne soit jamais bridée par la taille du deck : l'assertion porte
  // alors uniquement sur handLimit(). Crédits élevés pour que le recruit soit toujours légal.
  function stateWithBadge(diplomacy: GameState['diplomacy']): GameState {
    return {
      ...base,
      current: 0,
      diplomacy,
      players: [
        { ...base.players[0], hand: [allIds[0]!, allIds[1]!], credits: 999 },
        base.players[1],
      ],
      deck: allIds.slice(2, 8),
    };
  }

  // sans badge (ou badge détenu par l'adversaire) → limite 4
  const noBadge = applyMove(stateWithBadge({ leader: null, side: 'silver' }), {
    t: 'recruit',
    cardId: allIds[0]!,
  });
  expect(noBadge.current).toBe(1); // fin de tour bien effectuée
  expect(noBadge.players[0].hand.length).toBe(4);

  // badge Argent détenu par le joueur 0 → limite 5
  const silver = applyMove(stateWithBadge({ leader: 0, side: 'silver' }), {
    t: 'recruit',
    cardId: allIds[0]!,
  });
  expect(silver.players[0].hand.length).toBe(5);

  // badge Or détenu par le joueur 0 → limite 6
  const gold = applyMove(stateWithBadge({ leader: 0, side: 'gold' }), {
    t: 'recruit',
    cardId: allIds[0]!,
  });
  expect(gold.players[0].hand.length).toBe(6);
});

test('leadership humain : défausse la carte, prend le badge (Argent) et gagne 3 crédits', () => {
  const base = createGame(CONFIG, 1);
  const humainId = 'FIX_mercure_1';
  expect(cardOf(humainId)!.people).toBe('humain'); // garde-fou si les fixtures changent
  const creditsBefore = base.players[0].credits;
  const s: GameState = {
    ...base,
    current: 0,
    players: [{ ...base.players[0], hand: [humainId] }, base.players[1]],
  };
  const out = applyMove(s, { t: 'leadership', cardId: humainId });
  expect(out.discard).toContain(humainId);
  expect(out.diplomacy).toEqual({ leader: 0, side: 'silver' });
  expect(out.players[0].credits).toBe(creditsBefore + 3);
});

test('leadership animod : défausse la carte, prend le badge (Argent) et mobilise 2 cartes du deck', () => {
  const base = createGame(CONFIG, 1);
  const animodId = 'FIX_mercure_0';
  expect(cardOf(animodId)!.people).toBe('animod'); // garde-fou si les fixtures changent
  // Deck connu et court pour observer précisément l'effet de mobilize (2 cartes retirées du deck
  // et posées dans les colonnes du joueur, sans gain d'influence : thenInfluence=false pour animod).
  const s: GameState = {
    ...base,
    current: 0,
    players: [{ ...base.players[0], hand: [animodId] }, base.players[1]],
    deck: ['FIX_venus_0', 'FIX_terra_1'],
  };
  const out = applyMove(s, { t: 'leadership', cardId: animodId });
  expect(out.discard).toContain(animodId);
  expect(out.diplomacy).toEqual({ leader: 0, side: 'silver' });
  expect(out.deck).toHaveLength(0); // les 2 cartes du deck ont été mobilisées
  expect(out.players[0].columns.venus).toContain('FIX_venus_0');
  expect(out.players[0].columns.terra).toContain('FIX_terra_1');
});

test('legalMoves sous chooseColumn(owner:self) ne propose que les colonnes non vides du joueur', () => {
  const base = createGame(CONFIG, 1);
  const seeded = withColumns(base, 0, { terra: ['a'], venus: ['b'] });
  const s: GameState = {
    ...seeded,
    resolution: { queue: [{ k: 'exile', side: 'self', count: 1 } as const], ctx: { player: 0 as const, planet: 'terra' as const } },
  };
  const paused = resolve(s);
  const moves = legalMoves(paused, 0);
  const planets = moves.map((m) => (m.t === 'decide' ? m.planet : null)).sort();
  expect(moves.every((m) => m.t === 'decide')).toBe(true);
  expect(planets).toEqual(['terra', 'venus']); // mercure/mars/jupiter vides → exclues
});

test('legalMoves sous chooseColumn(owner:opponent) cible les colonnes non vides de l\'adversaire', () => {
  const base = createGame(CONFIG, 1);
  const seeded = withColumns(base, 1, { mars: ['x'] });
  const s: GameState = {
    ...seeded,
    resolution: { queue: [{ k: 'transfer', count: 1 } as const], ctx: { player: 0 as const, planet: 'mars' as const } },
  };
  const paused = resolve(s);
  const moves = legalMoves(paused, 0);
  expect(moves).toEqual([{ t: 'decide', planet: 'mars' }]);
});

test('applyMove enchaîne un decide de chooseColumn (exile) puis termine la résolution', () => {
  const base = createGame(CONFIG, 1);
  const seeded = withColumns(base, 0, { terra: ['a', 'b'] });
  const s: GameState = {
    ...seeded,
    resolution: { queue: [{ k: 'exile', side: 'self', count: 1 } as const], ctx: { player: 0 as const, planet: 'terra' as const } },
  };
  const paused = resolve(s);
  const out = applyMove(paused, { t: 'decide', planet: 'terra' });
  expect(out.pending).toBeNull();
  expect(out.resolution).toBeNull();
  expect(out.players[0].columns.terra).toEqual(['a']);
  expect(out.discard).toContain('b');
});

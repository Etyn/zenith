import { createGame } from '../setup';
import { applyEffect, resolve, decide } from '../effects';
import { CENTER } from '../setup';
import { PLANETS } from '../types';
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

test('resolve arrête d\'appliquer les effets restants après une victoire', () => {
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

test('takeLeader silver : prend le badge, puis passe Or si deja possede', () => {
  const s0 = createGame(CONFIG, 1); // leader: null
  const s1 = applyEffect(s0, { k: 'takeLeader', side: 'silver' }, { player: 0, planet: 'mars' });
  expect(s1.diplomacy).toEqual({ leader: 0, side: 'silver' });
  const s2 = applyEffect(s1, { k: 'takeLeader', side: 'silver' }, { player: 0, planet: 'mars' });
  expect(s2.diplomacy).toEqual({ leader: 0, side: 'gold' });
  const s3 = applyEffect(s2, { k: 'takeLeader', side: 'silver' }, { player: 0, planet: 'mars' });
  expect(s3.diplomacy).toEqual({ leader: 0, side: 'gold' }); // deja Or → inchange
});

test('takeLeader silver : reprend le badge a l\'adversaire cote Argent', () => {
  const base = createGame(CONFIG, 1);
  const s0 = { ...base, diplomacy: { leader: 1 as const, side: 'gold' as const } };
  const s1 = applyEffect(s0, { k: 'takeLeader', side: 'silver' }, { player: 0, planet: 'mars' });
  expect(s1.diplomacy).toEqual({ leader: 0, side: 'silver' });
});

test('takeLeader gold : prend directement le badge cote Or', () => {
  const s0 = createGame(CONFIG, 1);
  const s1 = applyEffect(s0, { k: 'takeLeader', side: 'gold' }, { player: 1, planet: 'mars' });
  expect(s1.diplomacy).toEqual({ leader: 1, side: 'gold' });
});

test("steal retire la ressource à l'adversaire et la donne au joueur (borné)", () => {
  const base = createGame(CONFIG, 1);
  const ctx = { player: 0 as const, planet: 'terra' as const };
  // adversaire (joueur 1) : on fixe 2 crédits pour tester le plafonnement à son stock
  const s: GameState = {
    ...base,
    players: [
      { ...base.players[0], credits: 5 },
      { ...base.players[1], credits: 2 },
    ],
  };
  const out = applyEffect(s, { k: 'steal', resource: 'credits', amount: 3 }, ctx);
  // l'adversaire n'a que 2 : on vole 2, pas 3
  expect(out.players[1].credits).toBe(0);
  expect(out.players[0].credits).toBe(5 + 2);
});

test('influenceEach déplace le disque de chaque planète pour le joueur', () => {
  const base = createGame(CONFIG, 1);
  const before = PLANETS.map((p) => base.planets[p].discPos);
  const out = applyEffect(base, { k: 'influenceEach', amount: 1 }, { player: 0, planet: 'terra' });
  // joueur 0 pousse vers sa zone (dir -1) : chaque disque diminue de 1 (aucune capture ici)
  PLANETS.forEach((p, i) => expect(out.planets[p].discPos).toBe(before[i]! - 1));
});

test('influenceNeighbors met en attente un chooseSegment puis applique amount sur count planètes contiguës', () => {
  const base = createGame(CONFIG, 1);
  const s = {
    ...base,
    resolution: { queue: [{ k: 'influenceNeighbors', count: 2, amount: 1 } as const], ctx: { player: 0 as const, planet: 'terra' as const } },
  };
  const paused = resolve(s);
  expect(paused.pending).toEqual({ kind: 'chooseSegment', count: 2, amount: 1 });
  // segment commençant à 'venus' → venus + terra reçoivent chacune 1 (dir -1 pour joueur 0)
  const before = { venus: base.planets.venus.discPos, terra: base.planets.terra.discPos };
  const out = decide(paused, 'venus');
  expect(out.pending).toBeNull();
  expect(out.planets.venus.discPos).toBe(before.venus - 1);
  expect(out.planets.terra.discPos).toBe(before.terra - 1);
});

test('influenceNeighbors rejette un segment qui dépasse la rangée (pas d’enroulement)', () => {
  const base = createGame(CONFIG, 1);
  const s = {
    ...base,
    resolution: { queue: [{ k: 'influenceNeighbors', count: 2, amount: 1 } as const], ctx: { player: 0 as const, planet: 'terra' as const } },
  };
  const paused = resolve(s);
  // 'jupiter' est la dernière : un segment de 2 déborderait → erreur
  expect(() => decide(paused, 'jupiter')).toThrow();
});

test('influenceDifferent exclut la planète déjà choisie dans la même résolution (N3)', () => {
  const base = createGame(CONFIG, 1);
  const s = {
    ...base,
    resolution: {
      queue: [
        { k: 'influence', on: 'choice', amount: 2 } as const,
        { k: 'influenceDifferent', amount: 1 } as const,
      ],
      ctx: { player: 0 as const, planet: 'terra' as const },
    },
  };
  const p1 = resolve(s); // 1er choix (amount 2)
  expect(p1.pending).toEqual({ kind: 'choosePlanet', amount: 2 });
  const p2 = decide(p1, 'terra'); // choisit terra ; enchaîne sur influenceDifferent
  expect(p2.pending).toEqual({ kind: 'choosePlanet', amount: 1, exclude: ['terra'] });
  // rechoisir terra est interdit
  expect(() => decide(p2, 'terra')).toThrow();
  // une autre planète est acceptée et clôt la résolution
  const out = decide(p2, 'mars');
  expect(out.pending).toBeNull();
  expect(out.resolution).toBeNull();
});

test('resolve propage resolution.chosen à travers un atome sans choix intercalé (invariant N3)', () => {
  const base = createGame(CONFIG, 1);
  const s = {
    ...base,
    resolution: {
      queue: [
        { k: 'influence', on: 'choice', amount: 2 } as const,
        { k: 'credits', amount: 3, target: 'self' } as const,
        { k: 'influenceDifferent', amount: 1 } as const,
      ],
      ctx: { player: 0 as const, planet: 'terra' as const },
    },
  };
  const p1 = resolve(s); // 1er choix (amount 2)
  expect(p1.pending).toEqual({ kind: 'choosePlanet', amount: 2 });
  // choisit terra ; enchaîne sur 'credits' (sans choix) puis sur influenceDifferent
  const p2 = decide(p1, 'terra');
  expect(p2.pending).toEqual({ kind: 'choosePlanet', amount: 1, exclude: ['terra'] });
  // rechoisir terra est interdit : le suivi de 'chosen' n'a pas été perdu par l'atome intercalé
  expect(() => decide(p2, 'terra')).toThrow();
  // une autre planète est acceptée et clôt la résolution
  const out = decide(p2, 'mars');
  expect(out.pending).toBeNull();
  expect(out.resolution).toBeNull();
});

// Fabrique un état avec des colonnes préremplies pour le joueur donné.
function withColumns(base: GameState, index: 0 | 1, cols: Partial<Record<import('../types').Planet, string[]>>): GameState {
  const players: [GameState['players'][0], GameState['players'][1]] = [base.players[0], base.players[1]];
  players[index] = { ...players[index], columns: { ...players[index].columns, ...cols } };
  return { ...base, players };
}

test("exile pose un chooseColumn côté self puis défausse la dernière carte de la colonne choisie", () => {
  const base = createGame(CONFIG, 1);
  const seeded = withColumns(base, 0, { terra: ['c1', 'c2'] });
  const s: GameState = {
    ...seeded,
    resolution: { queue: [{ k: 'exile', side: 'self', count: 1 } as const], ctx: { player: 0 as const, planet: 'terra' as const } },
  };
  const paused = resolve(s);
  expect(paused.pending).toEqual({ kind: 'chooseColumn', owner: 'self', purpose: 'exile', remaining: 1 });
  const out = decide(paused, 'terra');
  expect(out.pending).toBeNull();
  expect(out.resolution).toBeNull();
  expect(out.players[0].columns.terra).toEqual(['c1']); // dernière carte retirée
  expect(out.discard).toContain('c2'); // partie à la défausse
});

test("exile côté opponent vise les colonnes de l'adversaire", () => {
  const base = createGame(CONFIG, 1);
  const seeded = withColumns(base, 1, { mars: ['x1'] });
  const s: GameState = {
    ...seeded,
    resolution: { queue: [{ k: 'exile', side: 'opponent', count: 1 } as const], ctx: { player: 0 as const, planet: 'mars' as const } },
  };
  const paused = resolve(s);
  expect(paused.pending).toEqual({ kind: 'chooseColumn', owner: 'opponent', purpose: 'exile', remaining: 1 });
  const out = decide(paused, 'mars');
  expect(out.players[1].columns.mars).toEqual([]);
  expect(out.discard).toContain('x1');
});

test("exile count=2 enchaîne deux décisions (remaining décrémenté, atome maintenu en tête)", () => {
  const base = createGame(CONFIG, 1);
  const seeded = withColumns(base, 0, { terra: ['a', 'b'], venus: ['v'] });
  const s: GameState = {
    ...seeded,
    resolution: { queue: [{ k: 'exile', side: 'self', count: 2 } as const], ctx: { player: 0 as const, planet: 'terra' as const } },
  };
  const p1 = resolve(s);
  expect(p1.pending).toEqual({ kind: 'chooseColumn', owner: 'self', purpose: 'exile', remaining: 2 });
  const p2 = decide(p1, 'terra'); // retire 'b'
  expect(p2.pending).toEqual({ kind: 'chooseColumn', owner: 'self', purpose: 'exile', remaining: 1 });
  expect(p2.resolution!.queue.length).toBe(1); // atome toujours en tête
  const out = decide(p2, 'venus'); // retire 'v' → terminé
  expect(out.pending).toBeNull();
  expect(out.resolution).toBeNull();
  expect(out.players[0].columns.terra).toEqual(['a']);
  expect(out.players[0].columns.venus).toEqual([]);
  expect(out.discard).toEqual(expect.arrayContaining(['b', 'v']));
});

test("exile count=2 s'arrête (application partielle) quand il ne reste plus de colonne éligible", () => {
  const base = createGame(CONFIG, 1);
  const seeded = withColumns(base, 0, { terra: ['only'] });
  const s: GameState = {
    ...seeded,
    resolution: { queue: [{ k: 'exile', side: 'self', count: 2 } as const], ctx: { player: 0 as const, planet: 'terra' as const } },
  };
  const p1 = resolve(s);
  const out = decide(p1, 'terra'); // seule carte retirée → plus rien d'éligible
  expect(out.pending).toBeNull();
  expect(out.resolution).toBeNull();
  expect(out.players[0].columns.terra).toEqual([]);
});

test("exile est ignoré (skip sans pending) quand aucune colonne du côté visé n'est éligible", () => {
  const base = createGame(CONFIG, 1); // colonnes vides au départ
  const s: GameState = {
    ...base,
    resolution: {
      queue: [
        { k: 'exile', side: 'self', count: 1 } as const,
        { k: 'credits', amount: 3, target: 'self' } as const,
      ],
      ctx: { player: 0 as const, planet: 'terra' as const },
    },
  };
  const out = resolve(s);
  expect(out.pending).toBeNull(); // aucun chooseColumn posé
  expect(out.resolution).toBeNull(); // exile skippé, credits appliqué, file vidée
  expect(out.players[0].credits).toBe(base.players[0].credits + 3);
});

test("transfer déplace la dernière carte d'une colonne adverse vers la même colonne du joueur actif", () => {
  const base = createGame(CONFIG, 1);
  // joueur 0 = actif (destinataire), joueur 1 = adversaire (source)
  let s0 = withColumns(base, 1, { terra: ['e1', 'e2'] });
  s0 = withColumns(s0, 0, { terra: ['m1'] });
  const s: GameState = {
    ...s0,
    resolution: { queue: [{ k: 'transfer', count: 1 } as const], ctx: { player: 0 as const, planet: 'terra' as const } },
  };
  const paused = resolve(s);
  expect(paused.pending).toEqual({ kind: 'chooseColumn', owner: 'opponent', purpose: 'transfer', remaining: 1 });
  const out = decide(paused, 'terra');
  expect(out.pending).toBeNull();
  expect(out.resolution).toBeNull();
  expect(out.players[1].columns.terra).toEqual(['e1']); // dernière carte adverse retirée
  expect(out.players[0].columns.terra).toEqual(['m1', 'e2']); // ajoutée à MA colonne même planète
  expect(out.discard).not.toContain('e2'); // pas de défausse : c'est un transfert
});

test('transfer count=2 depuis deux colonnes adverses différentes', () => {
  const base = createGame(CONFIG, 1);
  const s0 = withColumns(base, 1, { terra: ['t1'], mars: ['m1'] });
  const s: GameState = {
    ...s0,
    resolution: { queue: [{ k: 'transfer', count: 2 } as const], ctx: { player: 0 as const, planet: 'terra' as const } },
  };
  const p1 = resolve(s);
  const p2 = decide(p1, 'terra'); // prend t1
  expect(p2.pending).toEqual({ kind: 'chooseColumn', owner: 'opponent', purpose: 'transfer', remaining: 1 });
  const out = decide(p2, 'mars'); // prend m1
  expect(out.pending).toBeNull();
  expect(out.players[0].columns.terra).toEqual(['t1']);
  expect(out.players[0].columns.mars).toEqual(['m1']);
  expect(out.players[1].columns.terra).toEqual([]);
  expect(out.players[1].columns.mars).toEqual([]);
});

test("transfer est ignoré quand l'adversaire n'a aucune colonne non vide", () => {
  const base = createGame(CONFIG, 1); // colonnes adverses vides
  const s: GameState = {
    ...base,
    resolution: {
      queue: [
        { k: 'transfer', count: 1 } as const,
        { k: 'credits', amount: 2, target: 'self' } as const,
      ],
      ctx: { player: 0 as const, planet: 'terra' as const },
    },
  };
  const out = resolve(s);
  expect(out.pending).toBeNull();
  expect(out.resolution).toBeNull();
  expect(out.players[0].credits).toBe(base.players[0].credits + 2);
});

test('exileForInfluence : exile 2 cartes de couleurs DIFFÉRENTES + 2 influence sur chaque planète', () => {
  const base = createGame(CONFIG, 1);
  const seeded = withColumns(base, 0, { terra: ['t1'], mars: ['m1'] });
  const before = { terra: seeded.planets.terra.discPos, mars: seeded.planets.mars.discPos };
  const s: GameState = {
    ...seeded,
    resolution: { queue: [{ k: 'exileForInfluence', count: 2, amount: 2 } as const], ctx: { player: 0 as const, planet: 'terra' as const } },
  };
  const p1 = resolve(s);
  expect(p1.pending).toEqual({ kind: 'chooseColumn', owner: 'self', purpose: 'exileInfluence', remaining: 2, amount: 2, exclude: [] });
  const p2 = decide(p1, 'terra'); // exile t1, +2 influence terra
  expect(p2.pending).toEqual({ kind: 'chooseColumn', owner: 'self', purpose: 'exileInfluence', remaining: 1, amount: 2, exclude: ['terra'] });
  expect(() => decide(p2, 'terra')).toThrow(); // même couleur interdite
  const out = decide(p2, 'mars'); // exile m1, +2 influence mars
  expect(out.pending).toBeNull();
  expect(out.resolution).toBeNull();
  expect(out.players[0].columns.terra).toEqual([]);
  expect(out.players[0].columns.mars).toEqual([]);
  expect(out.discard).toEqual(expect.arrayContaining(['t1', 'm1']));
  expect(out.planets.terra.discPos).toBe(before.terra - 2); // joueur 0, dir -1, amount 2
  expect(out.planets.mars.discPos).toBe(before.mars - 2);
});

test('exileForInfluence : une seule couleur non vide → application partielle (1 exil, perte de la 2e influence)', () => {
  const base = createGame(CONFIG, 1);
  const seeded = withColumns(base, 0, { terra: ['t1'] });
  const s: GameState = {
    ...seeded,
    resolution: { queue: [{ k: 'exileForInfluence', count: 2, amount: 2 } as const], ctx: { player: 0 as const, planet: 'terra' as const } },
  };
  const p1 = resolve(s);
  const out = decide(p1, 'terra'); // seule couleur → s'arrête après 1
  expect(out.pending).toBeNull();
  expect(out.resolution).toBeNull();
  expect(out.players[0].columns.terra).toEqual([]);
});

test('exileForInfluence : aucune colonne → atome ignoré (skip)', () => {
  const base = createGame(CONFIG, 1);
  const s: GameState = {
    ...base,
    resolution: {
      queue: [
        { k: 'exileForInfluence', count: 2, amount: 2 } as const,
        { k: 'credits', amount: 3, target: 'self' } as const,
      ],
      ctx: { player: 0 as const, planet: 'terra' as const },
    },
  };
  const out = resolve(s);
  expect(out.pending).toBeNull();
  expect(out.resolution).toBeNull();
  expect(out.players[0].credits).toBe(base.players[0].credits + 3);
});

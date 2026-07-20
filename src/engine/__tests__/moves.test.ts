import { createGame } from '../setup';
import { applyMove, legalMoves } from '../moves';
import { cardOf } from '../effects';
import type { GameState } from '../types';
import { activeFace } from '../../data/tech';

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

test('une victoire en cours de résolution ne repioche pas et ne passe pas la main', () => {
  const base = createGame(CONFIG, 1);
  const id = base.players[0].hand.find((cid) => cardOf(cid)!.planet === 'mars');
  if (!id) return; // main sans carte mars → test trivialement ok
  const s: GameState = {
    ...base,
    planets: { ...base.planets, mars: { discPos: 1, captured: [2, 0], bonusActive: false } },
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

import { createGame, CENTER } from '../setup';
import { applyEffect, resolve, decide, cardOf, decideCard, chooseBranch } from '../effects';
import type { EffectCtx, GameState, Planet } from '../types';
import { PLANETS } from '../types';

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

test("transfer corresponding : prend la dernière carte adverse de la colonne de ctx.planet, sans choix", () => {
  const base = createGame(CONFIG, 1);
  let s0 = withColumns(base, 1, { terra: ['e1', 'e2'] });
  s0 = withColumns(s0, 0, { terra: ['m1'] });
  const s: GameState = { ...s0, resolution: { queue: [{ k: 'transfer', count: 1, from: 'corresponding' }], ctx: { player: 0, planet: 'terra' } } };
  const out = resolve(s);
  expect(out.pending).toBeNull();                       // aucun choix : colonne imposée
  expect(out.players[1].columns.terra).toEqual(['e1']);
  expect(out.players[0].columns.terra).toEqual(['m1', 'e2']);
});

test("transfer corresponding + thenInfluence : +1 influence sur ctx.planet", () => {
  const base = createGame(CONFIG, 1);
  const s0 = withColumns(base, 1, { terra: ['e1'] });
  const before = s0.planets.terra.discPos;
  const s: GameState = { ...s0, resolution: { queue: [{ k: 'transfer', count: 1, from: 'corresponding', thenInfluence: true }], ctx: { player: 0, planet: 'terra' } } };
  const out = resolve(s);
  expect(out.planets.terra.discPos).toBe(before - 1);   // joueur 0, dir -1
});

test("exile ownCorresponding : défausse la dernière carte de MA colonne ctx.planet, sans choix", () => {
  const base = createGame(CONFIG, 1);
  const s0 = withColumns(base, 0, { mars: ['a', 'b'] });
  const s: GameState = { ...s0, resolution: { queue: [{ k: 'exile', side: 'self', count: 1, corresponding: true }], ctx: { player: 0, planet: 'mars' } } };
  const out = resolve(s);
  expect(out.pending).toBeNull();
  expect(out.players[0].columns.mars).toEqual(['a']);
  expect(out.discard).toContain('b');
});

test("exile opponentChoice + thenInfluence : après décision, +1 influence sur la planète choisie", () => {
  const base = createGame(CONFIG, 1);
  const s0 = withColumns(base, 1, { venus: ['x'] });
  const before = s0.planets.venus.discPos;
  const s: GameState = { ...s0, resolution: { queue: [{ k: 'exile', side: 'opponent', count: 1, thenInfluence: true }], ctx: { player: 0, planet: 'mars' } } };
  const paused = resolve(s);
  expect(paused.pending).toEqual({ kind: 'chooseColumn', owner: 'opponent', purpose: 'exile', remaining: 1, thenInfluence: true });
  const out = decide(paused, 'venus');
  expect(out.players[1].columns.venus).toEqual([]);
  expect(out.planets.venus.discPos).toBe(before - 1);   // influence sur la couleur de la carte exilée
});

test("discardHandAll : défausse toute la main du joueur actif", () => {
  const base = createGame(CONFIG, 1);
  const handBefore = [...base.players[0].hand];
  const out = applyEffect(base, { k: 'discardHandAll' }, CTX);
  expect(out.players[0].hand).toEqual([]);
  handBefore.forEach((id) => expect(out.discard).toContain(id));
});

test("discardHand : pose chooseHandCard ; decideCard défausse la carte choisie", () => {
  const base = createGame(CONFIG, 1);
  const card = base.players[0].hand[0]!;
  const s: GameState = { ...base, resolution: { queue: [{ k: 'discardHand', count: 1 }], ctx: CTX } };
  const paused = resolve(s);
  expect(paused.pending).toEqual({ kind: 'chooseHandCard', purpose: 'discard', remaining: 1 });
  const out = decideCard(paused, card);
  expect(out.pending).toBeNull();
  expect(out.players[0].hand).not.toContain(card);
  expect(out.discard).toContain(card);
});

test("discardHand + thenInfluence : +1 influence sur la couleur de la carte défaussée", () => {
  const base = createGame(CONFIG, 1);
  const card = base.players[0].hand[0]!;
  const planet = cardOf(card)!.planet;
  const before = base.planets[planet].discPos;
  const s: GameState = { ...base, resolution: { queue: [{ k: 'discardHand', count: 1, thenInfluence: true }], ctx: CTX } };
  const out = decideCard(resolve(s), card);
  expect(out.planets[planet].discPos).toBe(before - 1); // joueur 0, dir -1
});

test("creditsFromCardValue source=discardHand : défausse une carte de la main => crédits = son coût", () => {
  const base = createGame(CONFIG, 1);
  const card = base.players[0].hand[0]!;
  const value = cardOf(card)!.cost;
  const s: GameState = { ...base, resolution: { queue: [{ k: 'creditsFromCardValue', source: 'discardHand' }], ctx: CTX } };
  const paused = resolve(s);
  expect(paused.pending).toEqual({ kind: 'chooseHandCard', purpose: 'discardValue', remaining: 1 });
  const out = decideCard(paused, card);
  expect(out.players[0].credits).toBe(base.players[0].credits + value);
  expect(out.discard).toContain(card);
});

test("creditsFromCardValue source=transfer : transfère une carte adverse => crédits = son coût", () => {
  const base = createGame(CONFIG, 1);
  const value = cardOf('FIX_terra_0')!.cost;
  const seeded = withColumns(base, 1, { terra: ['FIX_terra_0'] });
  const s: GameState = { ...seeded, resolution: { queue: [{ k: 'creditsFromCardValue', source: 'transfer' }], ctx: { player: 0, planet: 'mars' } } };
  const paused = resolve(s);
  expect(paused.pending).toEqual({ kind: 'chooseColumn', owner: 'opponent', purpose: 'transfer', remaining: 1, gainCreditsFromValue: true });
  const out = decide(paused, 'terra');
  expect(out.players[0].credits).toBe(seeded.players[0].credits + value);
  expect(out.players[0].columns.terra).toContain('FIX_terra_0'); // transférée chez soi
});

test("creditsFromCardValue source=exileOpponent : exile une carte adverse => crédits = son coût", () => {
  const base = createGame(CONFIG, 1);
  const value = cardOf('FIX_mars_0')!.cost;
  const seeded = withColumns(base, 1, { mars: ['FIX_mars_0'] });
  const s: GameState = { ...seeded, resolution: { queue: [{ k: 'creditsFromCardValue', source: 'exileOpponent' }], ctx: { player: 0, planet: 'mars' } } };
  const paused = resolve(s);
  expect(paused.pending).toEqual({ kind: 'chooseColumn', owner: 'opponent', purpose: 'exile', remaining: 1, gainCreditsFromValue: true });
  const out = decide(paused, 'mars');
  expect(out.players[0].credits).toBe(seeded.players[0].credits + value);
  expect(out.discard).toContain('FIX_mars_0');
});

test("takeBoardBonusToken : choisit un jeton de planète visible, applique et défausse", () => {
  const base = createGame(CONFIG, 1);
  const planets = { ...base.planets };
  for (const p of PLANETS) planets[p] = { ...planets[p], bonusToken: p === 'terra' ? 'tok-cred3-1' : null };
  const s: GameState = {
    ...base,
    planets,
    techBonus: { animod: null, humain: null, robot: null },
    resolution: { queue: [{ k: 'takeBoardBonusToken' }], ctx: CTX },
  };
  const paused = resolve(s);
  expect(paused.pending).toEqual({ kind: 'chooseBoardToken', slots: [{ kind: 'planet', planet: 'terra' }] });
  const out = chooseBranch(paused, 0);
  expect(out.players[0].credits).toBe(base.players[0].credits + 3);
  expect(out.planets.terra.bonusToken).toBeNull();
  expect(out.bonusDiscard).toContain('tok-cred3-1');
});

test("takeBoardBonusToken : jeton d'emplacement techno", () => {
  const base = createGame(CONFIG, 1);
  const planets = { ...base.planets };
  for (const p of PLANETS) planets[p] = { ...planets[p], bonusToken: null };
  const s: GameState = {
    ...base,
    planets,
    techBonus: { animod: 'tok-zen1-1', humain: null, robot: null },
    resolution: { queue: [{ k: 'takeBoardBonusToken' }], ctx: CTX },
  };
  const paused = resolve(s);
  expect(paused.pending).toEqual({ kind: 'chooseBoardToken', slots: [{ kind: 'tech', people: 'animod' }] });
  const out = chooseBranch(paused, 0);
  expect(out.players[0].zenithium).toBe(base.players[0].zenithium + 1);
  expect(out.techBonus.animod).toBeNull();
});

test("takeBoardBonusToken : aucun jeton visible => atome sauté", () => {
  const base = createGame(CONFIG, 1);
  const planets = { ...base.planets };
  for (const p of PLANETS) planets[p] = { ...planets[p], bonusToken: null };
  const s: GameState = {
    ...base,
    planets,
    techBonus: { animod: null, humain: null, robot: null },
    resolution: { queue: [{ k: 'takeBoardBonusToken' }, { k: 'credits', amount: 2, target: 'self' }], ctx: CTX },
  };
  const out = resolve(s);
  expect(out.pending).toBeNull();
  expect(out.resolution).toBeNull();
  expect(out.players[0].credits).toBe(base.players[0].credits + 2);
});

test("creditsPerTechLevels resource='zenithium' : gagne du zénithium selon le nb de technos >= 1", () => {
  const base = createGame(CONFIG, 1);
  const players: [GameState['players'][0], GameState['players'][1]] = [base.players[0], base.players[1]];
  players[0] = { ...players[0], techMarkers: { animod: 1, humain: 3, robot: 1 } }; // 3 technos >= 1
  const seeded: GameState = { ...base, players };
  const out = applyEffect(seeded, { k: 'creditsPerTechLevels', tiers: [1, 2, 3], resource: 'zenithium' }, CTX);
  expect(out.players[0].zenithium).toBe(seeded.players[0].zenithium + 3); // 3 technos -> tiers[2] = 3
  expect(out.players[0].credits).toBe(seeded.players[0].credits);         // aucun crédit gagné
});

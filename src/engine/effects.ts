import { gainInfluence } from './influence';
import type { CardDef } from '../data/types';
import { FIXTURE_CARDS } from '../data/fixtures';
import { CARDS as REAL_CARDS } from '../data/cards';
import { PLANETS, PEOPLES } from './types';
import type { BoardTokenSlot, Condition, Effect, EffectCtx, GameState, People, Planet, PlayerIndex, PlayerState, Side } from './types';
import { shuffle } from './rng';
import { tokenOf } from '../data/tokens';
import { CENTER } from './setup';
import { developTech } from './develop';
import { activeFace } from '../data/tech';

// Catalogue = fusion des fixtures (doublures de test) et du contenu réel : les ids réels ET
// les ids FIX_* résolvent. Les ids sont disjoints par convention, aucune collision attendue.
const CATALOG: Record<string, CardDef> = Object.fromEntries(
  [...FIXTURE_CARDS, ...REAL_CARDS].map((c) => [c.id, c]),
);
export function cardOf(id: string): CardDef | undefined {
  return CATALOG[id];
}

function creditPlayer(
  state: GameState,
  index: PlayerIndex,
  patch: Partial<Pick<PlayerState, 'credits' | 'zenithium'>>,
): GameState {
  const players: [PlayerState, PlayerState] = [state.players[0], state.players[1]];
  players[index] = { ...players[index], ...patch };
  return { ...state, players };
}

function hasEligibleColumn(state: GameState, ownerIndex: PlayerIndex): boolean {
  return PLANETS.some((p) => state.players[ownerIndex].columns[p].length > 0);
}

function evalCondition(state: GameState, cond: Condition, ctx: EffectCtx): boolean {
  switch (cond.c) {
    case 'hasLeaderBadge': {
      const holdsBadge = state.diplomacy.leader === ctx.player;
      if (!holdsBadge) return false;
      // badge argent OU or : sans `side` précisé, la simple possession suffit.
      return cond.side === undefined || cond.side === 'silver' || state.diplomacy.side === 'gold';
    }
    case 'creditsAtLeast':
      return state.players[ctx.player].credits >= cond.amount;
  }
}

export function canPayTier(state: GameState, player: PlayerIndex, cost: Effect[]): boolean {
  return cost.every((e) => (e.k === 'spend' ? state.players[player][e.resource] >= e.amount : true));
}

export function applyEffect(state: GameState, effect: Effect, ctx: EffectCtx): GameState {
  const target: PlayerIndex = 'target' in effect && effect.target === 'opponent' ? (ctx.player === 0 ? 1 : 0) : ctx.player;
  switch (effect.k) {
    case 'credits':
      return creditPlayer(state, target, { credits: state.players[target].credits + effect.amount });
    case 'zenithium':
      return creditPlayer(state, target, { zenithium: state.players[target].zenithium + effect.amount });
    case 'spend': {
      const cur = state.players[ctx.player][effect.resource];
      const players: [PlayerState, PlayerState] = [state.players[0], state.players[1]];
      players[ctx.player] = { ...players[ctx.player], [effect.resource]: Math.max(0, cur - effect.amount) };
      return { ...state, players };
    }
    case 'influence':
      // Seul le cas planète précise est appliqué directement ; 'choice' est géré par resolve/decide.
      if (effect.on === 'choice') throw new Error("applyEffect: 'influence choice' passe par resolve/decide");
      return gainInfluence(state, effect.on, ctx.player, effect.amount);
    case 'influenceEach': {
      let s = state;
      for (const p of PLANETS) {
        s = gainInfluence(s, p, ctx.player, effect.amount);
        if (s.winner !== null) break;
      }
      return s;
    }
    case 'takeLeader': {
      const me = ctx.player;
      const d = state.diplomacy;
      let next: GameState['diplomacy'];
      if (effect.side === 'gold') {
        next = { leader: me, side: 'gold' };
      } else if (d.leader !== me) {
        next = { leader: me, side: 'silver' };
      } else {
        next = { leader: me, side: 'gold' };
      }
      return { ...state, diplomacy: next };
    }
    case 'mobilize':
      return applyMobilize(state, effect.count, effect.thenInfluence, ctx.player);
    case 'steal': {
      const thief = ctx.player;
      const victim: PlayerIndex = thief === 0 ? 1 : 0;
      const avail = state.players[victim][effect.resource];
      const taken = Math.min(effect.amount, avail);
      const players: [PlayerState, PlayerState] = [state.players[0], state.players[1]];
      players[victim] = { ...players[victim], [effect.resource]: avail - taken };
      players[thief] = { ...players[thief], [effect.resource]: players[thief][effect.resource] + taken };
      return { ...state, players };
    }
    case 'influenceNeighbors':
      // Toujours intercepté par resolve/decide (pose un pending 'chooseSegment') ; jamais appliqué directement.
      throw new Error("applyEffect: 'influenceNeighbors' passe par resolve/decide");
    case 'influenceDifferent':
      // Toujours intercepté par resolve/decide (pose un pending 'choosePlanet' avec exclusion) ; jamais appliqué directement.
      throw new Error("applyEffect: 'influenceDifferent' passe par resolve/decide");
    case 'transfer':
      throw new Error("applyEffect: 'transfer' passe par resolve/decide");
    case 'exile':
      throw new Error("applyEffect: 'exile' passe par resolve/decide");
    case 'exileForInfluence':
      throw new Error("applyEffect: 'exileForInfluence' passe par resolve/decide");
    case 'optional':
      throw new Error("applyEffect: 'optional' passe par resolve/chooseBranch");
    case 'bonusToken':
      throw new Error("applyEffect: 'bonusToken' passe par resolve (interception)");
    case 'conditional':
      throw new Error("applyEffect: 'conditional' passe par resolve/chooseBranch");
    case 'choice':
      throw new Error("applyEffect: 'choice' passe par resolve/chooseBranch");
    case 'scale':
      throw new Error("applyEffect: 'scale' passe par resolve/chooseBranch");
    case 'creditsPerCardColors': {
      const zoneIndex: PlayerIndex = effect.zone === 'opponent' ? (ctx.player === 0 ? 1 : 0) : ctx.player;
      const colors = PLANETS.filter((p) => state.players[zoneIndex].columns[p].length > 0).length;
      return creditPlayer(state, ctx.player, { credits: state.players[ctx.player].credits + effect.per * colors });
    }
    case 'creditsPerTechLevels': {
      const n = PEOPLES.filter((pe) => state.players[ctx.player].techMarkers[pe] >= 1).length;
      const gain = n === 0 ? 0 : effect.tiers[Math.min(n, effect.tiers.length) - 1]!;
      const resource = effect.resource ?? 'credits';
      return creditPlayer(state, ctx.player, { [resource]: state.players[ctx.player][resource] + gain });
    }
    case 'giveOpponent': {
      const giver = ctx.player;
      const receiver: PlayerIndex = giver === 0 ? 1 : 0;
      const given = Math.min(effect.amount, state.players[giver][effect.resource]);
      const players: [PlayerState, PlayerState] = [state.players[0], state.players[1]];
      players[giver] = { ...players[giver], [effect.resource]: players[giver][effect.resource] - given };
      players[receiver] = { ...players[receiver], [effect.resource]: players[receiver][effect.resource] + given };
      return { ...state, players };
    }
    case 'giveLeaderBadge': {
      if (state.diplomacy.leader !== ctx.player) return state; // ne possède pas le badge → no-op
      const receiver: PlayerIndex = ctx.player === 0 ? 1 : 0;
      return { ...state, diplomacy: { leader: receiver, side: state.diplomacy.side } };
    }
    case 'influenceChoiceExcept':
    case 'influenceChoiceAtCenter':
    case 'giveInfluenceOpponent':
    case 'moveDiscToCenter':
      throw new Error(`applyEffect: '${effect.k}' passe par resolve/decide`);
    case 'developDiscounted':
    case 'developLowest':
      throw new Error(`applyEffect: '${effect.k}' passe par resolve/decideTech`);
    case 'discardHandAll': {
      const me = ctx.player;
      const players: [PlayerState, PlayerState] = [state.players[0], state.players[1]];
      const oldHand = players[me].hand;
      players[me] = { ...players[me], hand: [] };
      return { ...state, players, discard: [...state.discard, ...oldHand] };
    }
    case 'discardHand':
    case 'creditsFromCardValue':
      throw new Error(`applyEffect: '${effect.k}' passe par resolve/decide/decideCard`);
    case 'takeBoardBonusToken':
      throw new Error("applyEffect: 'takeBoardBonusToken' passe par resolve/chooseBranch");
  }
}

function applyMobilize(state: GameState, count: number, thenInfluence: boolean, player: PlayerIndex): GameState {
  let s = state;
  for (let i = 0; i < count; i++) {
    if (s.deck.length === 0) break;
    const [top, ...restDeck] = s.deck;
    const card = cardOf(top!);
    const planet: Planet | null = card ? card.planet : null;
    const players: [PlayerState, PlayerState] = [s.players[0], s.players[1]];
    if (planet) {
      const columns = { ...players[player].columns, [planet]: [...players[player].columns[planet], top!] };
      players[player] = { ...players[player], columns };
    }
    s = { ...s, deck: restDeck, players };
    if (thenInfluence && planet) s = gainInfluence(s, planet, player, 1);
  }
  return s;
}

export function resolve(state: GameState): GameState {
  let s = state;
  while (s.resolution && s.resolution.queue.length > 0 && s.pending === null && s.winner === null) {
    const head = s.resolution.queue[0]!;
    const ctx = s.resolution.ctx;
    if (head.k === 'influence' && head.on === 'choice') {
      s = { ...s, pending: { kind: 'choosePlanet', amount: head.amount } };
      break; // en attente d'une décision ; l'atome reste en tête de file
    }
    if (head.k === 'influenceNeighbors') {
      s = { ...s, pending: { kind: 'chooseSegment', count: head.count, amount: head.amount } };
      break;
    }
    if (head.k === 'influenceDifferent') {
      const chosen = s.resolution!.chosen ?? [];
      s = { ...s, pending: { kind: 'choosePlanet', amount: head.amount, exclude: chosen } };
      break;
    }
    if (head.k === 'influenceChoiceExcept') {
      s = { ...s, pending: { kind: 'choosePlanet', amount: head.amount, exclude: [head.exceptColor] } };
      break;
    }
    if (head.k === 'influenceChoiceAtCenter') {
      s = { ...s, pending: { kind: 'choosePlanet', amount: head.amount, atCenter: true } };
      break;
    }
    if (head.k === 'giveInfluenceOpponent') {
      s = { ...s, pending: { kind: 'choosePlanet', amount: head.amount, beneficiary: 'opponent', exclude: head.exceptColor ? [head.exceptColor] : undefined } };
      break;
    }
    if (head.k === 'moveDiscToCenter') {
      s = { ...s, pending: { kind: 'moveDiscToCenter' } };
      break;
    }
    if (head.k === 'transfer' && (head.from ?? 'choice') === 'corresponding') {
      const opp: PlayerIndex = ctx.player === 0 ? 1 : 0;
      let ns = s;
      for (let i = 0; i < head.count; i++) {
        const col = ns.players[opp].columns[ctx.planet];
        if (col.length === 0) break;
        const card = col[col.length - 1]!;
        const players: [PlayerState, PlayerState] = [ns.players[0], ns.players[1]];
        players[opp] = { ...players[opp], columns: { ...players[opp].columns, [ctx.planet]: col.slice(0, -1) } };
        players[ctx.player] = { ...players[ctx.player], columns: { ...players[ctx.player].columns, [ctx.planet]: [...players[ctx.player].columns[ctx.planet], card] } };
        ns = { ...ns, players };
        if (head.thenInfluence) ns = gainInfluence(ns, ctx.planet, ctx.player, 1);
        if (ns.winner !== null) break;
      }
      s = { ...ns, resolution: { queue: ns.resolution!.queue.slice(1), ctx, chosen: ns.resolution!.chosen } };
      continue;
    }
    if (head.k === 'exile' && head.side === 'self' && head.corresponding) {
      let ns = s;
      for (let i = 0; i < head.count; i++) {
        const col = ns.players[ctx.player].columns[ctx.planet];
        if (col.length === 0) break;
        const card = col[col.length - 1]!;
        const players: [PlayerState, PlayerState] = [ns.players[0], ns.players[1]];
        players[ctx.player] = { ...players[ctx.player], columns: { ...players[ctx.player].columns, [ctx.planet]: col.slice(0, -1) } };
        ns = { ...ns, players, discard: [...ns.discard, card] };
        if (head.thenInfluence) ns = gainInfluence(ns, ctx.planet, ctx.player, 1);
        if (ns.winner !== null) break;
      }
      s = { ...ns, resolution: { queue: ns.resolution!.queue.slice(1), ctx, chosen: ns.resolution!.chosen } };
      continue;
    }
    if (head.k === 'exile' && head.side === 'self' && head.color) {
      let ns = s;
      for (let i = 0; i < head.count; i++) {
        const col = ns.players[ctx.player].columns[head.color];
        if (col.length === 0) break;
        const card = col[col.length - 1]!;
        const players: [PlayerState, PlayerState] = [ns.players[0], ns.players[1]];
        players[ctx.player] = { ...players[ctx.player], columns: { ...players[ctx.player].columns, [head.color]: col.slice(0, -1) } };
        ns = { ...ns, players, discard: [...ns.discard, card] };
        if (head.thenInfluence) ns = gainInfluence(ns, head.color, ctx.player, 1);
        if (ns.winner !== null) break;
      }
      s = { ...ns, resolution: { queue: ns.resolution!.queue.slice(1), ctx, chosen: ns.resolution!.chosen } };
      continue;
    }
    if (head.k === 'transfer' || head.k === 'exile') {
      const owner: Side = head.k === 'transfer' ? 'opponent' : head.side;
      const ownerIndex: PlayerIndex = owner === 'self' ? ctx.player : ctx.player === 0 ? 1 : 0;
      const exclude = head.k === 'exile' && head.exceptColor ? [head.exceptColor] : undefined;
      const eligible = PLANETS.some((p) => s.players[ownerIndex].columns[p].length > 0 && !(exclude ?? []).includes(p));
      if (!eligible) {
        s = { ...s, resolution: { queue: s.resolution!.queue.slice(1), ctx, chosen: s.resolution!.chosen } };
        continue;
      }
      s = { ...s, pending: { kind: 'chooseColumn', owner, purpose: head.k, remaining: head.count, thenInfluence: head.thenInfluence, exclude } };
      break;
    }
    if (head.k === 'discardHand') {
      if (head.count <= 0 || s.players[ctx.player].hand.length === 0) {
        s = { ...s, resolution: { queue: s.resolution!.queue.slice(1), ctx, chosen: s.resolution!.chosen } };
        continue;
      }
      s = { ...s, pending: { kind: 'chooseHandCard', purpose: head.thenInfluence ? 'discardInfluence' : 'discard', remaining: head.count } };
      break;
    }
    if (head.k === 'creditsFromCardValue') {
      if (head.source === 'discardHand') {
        if (s.players[ctx.player].hand.length === 0) {
          s = { ...s, resolution: { queue: s.resolution!.queue.slice(1), ctx, chosen: s.resolution!.chosen } };
          continue;
        }
        s = { ...s, pending: { kind: 'chooseHandCard', purpose: 'discardValue', remaining: 1 } };
        break;
      }
      const opp: PlayerIndex = ctx.player === 0 ? 1 : 0;
      if (!hasEligibleColumn(s, opp)) {
        s = { ...s, resolution: { queue: s.resolution!.queue.slice(1), ctx, chosen: s.resolution!.chosen } };
        continue;
      }
      const purpose = head.source === 'transfer' ? 'transfer' : 'exile';
      s = { ...s, pending: { kind: 'chooseColumn', owner: 'opponent', purpose, remaining: 1, gainCreditsFromValue: true } };
      break;
    }
    if (head.k === 'exileForInfluence') {
      const me = ctx.player;
      const hasEligible = hasEligibleColumn(s, me);
      if (head.count <= 0 || !hasEligible) {
        s = { ...s, resolution: { queue: s.resolution!.queue.slice(1), ctx, chosen: s.resolution!.chosen } };
        continue;
      }
      s = { ...s, pending: { kind: 'chooseColumn', owner: 'self', purpose: 'exileInfluence', remaining: head.count, amount: head.amount, exclude: [] } };
      break;
    }
    if (head.k === 'bonusToken') {
      let reserve = s.bonusReserve;
      let discard = s.bonusDiscard;
      let rng = s.rng;
      if (reserve.length === 0 && discard.length > 0) {
        const [refilled, nextRng] = shuffle(discard, rng);
        reserve = refilled;
        discard = [];
        rng = nextRng;
      }
      if (reserve.length === 0) {
        // aucun jeton disponible → no-op : on retire l'atome et on continue
        s = { ...s, rng, resolution: { queue: s.resolution!.queue.slice(1), ctx, chosen: s.resolution!.chosen } };
        continue;
      }
      const [takenId, ...restReserve] = reserve;
      const tokenFx = tokenOf(takenId!).effects;
      s = {
        ...s,
        rng,
        bonusReserve: restReserve,
        bonusDiscard: [...discard, takenId!],
        // l'atome bonusToken est retiré (slice(1)) ET ses effets insérés en tête du reste
        resolution: { queue: [...tokenFx, ...s.resolution!.queue.slice(1)], ctx, chosen: s.resolution!.chosen },
      };
      continue;
    }
    if (head.k === 'takeBoardBonusToken') {
      const slots: BoardTokenSlot[] = [
        ...PLANETS.filter((p) => s.planets[p].bonusToken !== null).map((p) => ({ kind: 'planet' as const, planet: p })),
        ...PEOPLES.filter((pe) => s.techBonus[pe] !== null).map((pe) => ({ kind: 'tech' as const, people: pe })),
      ];
      if (slots.length === 0) {
        s = { ...s, resolution: { queue: s.resolution!.queue.slice(1), ctx, chosen: s.resolution!.chosen } };
        continue;
      }
      s = { ...s, pending: { kind: 'chooseBoardToken', slots } };
      break;
    }
    if (head.k === 'developDiscounted') {
      const me = ctx.player;
      if (head.which === 'cardPeople') {
        const people = ctx.people;
        if (!people) throw new Error("resolve: developDiscounted 'cardPeople' requiert ctx.people");
        const lvl = s.players[me].techMarkers[people];
        const affordable = lvl < 5 && developTech(s, me, people, Math.max(0, activeFace(people, s.config.techSetup).levels[lvl]!.zenithium - head.discount)) !== null;
        if (!affordable) {
          s = { ...s, resolution: { queue: s.resolution!.queue.slice(1), ctx, chosen: s.resolution!.chosen } };
          continue;
        }
        const cost = Math.max(0, activeFace(people, s.config.techSetup).levels[lvl]!.zenithium - head.discount);
        const res = developTech(s, me, people, cost)!;
        s = { ...res.state, resolution: { queue: [...res.queue, ...s.resolution!.queue.slice(1)], ctx, chosen: s.resolution!.chosen } };
        continue;
      }
      const cands = PEOPLES.filter((pe) => {
        const lvl = s.players[me].techMarkers[pe];
        if (lvl >= 5) return false;
        const cost = Math.max(0, activeFace(pe, s.config.techSetup).levels[lvl]!.zenithium - head.discount);
        return cost <= s.players[me].zenithium;
      });
      if (cands.length === 0) {
        s = { ...s, resolution: { queue: s.resolution!.queue.slice(1), ctx, chosen: s.resolution!.chosen } };
        continue;
      }
      s = { ...s, pending: { kind: 'chooseTech', discount: head.discount, zeroCost: false, candidates: cands } };
      break;
    }
    if (head.k === 'developLowest') {
      const me = ctx.player;
      const markers = s.players[me].techMarkers;
      const eligible = PEOPLES.filter((pe) => markers[pe] < 5);
      if (eligible.length === 0) {
        s = { ...s, resolution: { queue: s.resolution!.queue.slice(1), ctx, chosen: s.resolution!.chosen } };
        continue;
      }
      const min = Math.min(...eligible.map((pe) => markers[pe]));
      const tied = eligible.filter((pe) => markers[pe] === min);
      if (tied.length === 1) {
        // Coût forcé à 0, mais developTech renvoie tout de même null si le zénithium du joueur
        // est déjà négatif (cf. autres effets non bornés) : on retombe alors sur le skip, comme
        // pour eligible.length === 0 ci-dessus, plutôt que de forcer un état inexistant.
        const res = developTech(s, me, tied[0]!, 0);
        if (res === null) {
          s = { ...s, resolution: { queue: s.resolution!.queue.slice(1), ctx, chosen: s.resolution!.chosen } };
          continue;
        }
        s = { ...res.state, resolution: { queue: [...res.queue, ...s.resolution!.queue.slice(1)], ctx, chosen: s.resolution!.chosen } };
        continue;
      }
      s = { ...s, pending: { kind: 'chooseTech', discount: 0, zeroCost: true, candidates: tied } };
      break;
    }
    if (head.k === 'optional') {
      s = { ...s, pending: { kind: 'confirmOptional' } };
      break;
    }
    if (head.k === 'conditional') {
      if (!evalCondition(s, head.cond, ctx)) {
        s = { ...s, resolution: { queue: s.resolution!.queue.slice(1), ctx, chosen: s.resolution!.chosen } };
        continue; // condition fausse → atome sauté
      }
      s = { ...s, pending: { kind: 'confirmOptional' } };
      break; // condition vraie → reste facultatif
    }
    if (head.k === 'choice') {
      s = { ...s, pending: { kind: 'chooseOption', count: head.options.length } };
      break;
    }
    if (head.k === 'scale') {
      s = { ...s, pending: { kind: 'chooseTier', count: head.tiers.length } };
      break;
    }
    s = applyEffect(s, head, ctx);
    s = { ...s, resolution: { queue: s.resolution!.queue.slice(1), ctx, chosen: s.resolution!.chosen } };
  }
  if (s.resolution && (s.resolution.queue.length === 0 || s.winner !== null)) s = { ...s, resolution: null };
  return s;
}

export function decide(state: GameState, planet: Planet): GameState {
  if (state.pending === null || state.resolution === null) {
    throw new Error('decide: aucune décision en attente');
  }
  const ctx = state.resolution.ctx;
  const pending = state.pending;
  let s: GameState;
  if (pending.kind === 'chooseSegment') {
    const start = PLANETS.indexOf(planet);
    if (start < 0 || start + pending.count > PLANETS.length) {
      throw new Error('decide: segment invalide (débordement de la rangée)');
    }
    s = state;
    for (let i = 0; i < pending.count; i++) {
      s = gainInfluence(s, PLANETS[start + i]!, ctx.player, pending.amount);
      if (s.winner !== null) break;
    }
  } else if (pending.kind === 'chooseColumn') {
    const active = ctx.player;
    const ownerIndex: PlayerIndex = pending.owner === 'self' ? active : active === 0 ? 1 : 0;
    const column = state.players[ownerIndex].columns[planet];
    if (column.length === 0) {
      throw new Error('decide: colonne vide (choix invalide)');
    }
    if ((pending.exclude ?? []).includes(planet)) {
      throw new Error('decide: couleur exclue (choix invalide)');
    }
    const card = column[column.length - 1]!;
    const players: [PlayerState, PlayerState] = [state.players[0], state.players[1]];
    players[ownerIndex] = {
      ...players[ownerIndex],
      columns: { ...players[ownerIndex].columns, [planet]: column.slice(0, -1) },
    };
    let moved: GameState;
    if (pending.purpose === 'transfer') {
      // adverse → joueur actif, même planète (active !== ownerIndex par construction)
      players[active] = {
        ...players[active],
        columns: { ...players[active].columns, [planet]: [...players[active].columns[planet], card] },
      };
      moved = { ...state, players };
    } else {
      // exile ET exileInfluence : la carte part à la défausse
      moved = { ...state, players, discard: [...state.discard, card] };
      if (pending.purpose === 'exileInfluence') {
        moved = gainInfluence(moved, planet, active, pending.amount ?? 0);
      }
    }
    if (pending.thenInfluence) {
      moved = gainInfluence(moved, planet, active, 1);
    }
    if (pending.gainCreditsFromValue) {
      const def = cardOf(card);
      const value = def ? def.cost : 0;
      const players2: [PlayerState, PlayerState] = [moved.players[0], moved.players[1]];
      players2[active] = { ...players2[active], credits: players2[active].credits + value };
      moved = { ...moved, players: players2 };
    }
    const remaining = pending.remaining - 1;
    const nextExclude = pending.purpose === 'exileInfluence' ? [...(pending.exclude ?? []), planet] : pending.exclude;
    const stillEligible = PLANETS.some(
      (p) => moved.players[ownerIndex].columns[p].length > 0 && !(nextExclude ?? []).includes(p),
    );
    if (remaining > 0 && stillEligible && moved.winner === null) {
      return {
        ...moved,
        pending: {
          kind: 'chooseColumn',
          owner: pending.owner,
          purpose: pending.purpose,
          remaining,
          amount: pending.amount,
          exclude: nextExclude,
          thenInfluence: pending.thenInfluence,
          gainCreditsFromValue: pending.gainCreditsFromValue,
        },
      };
    }
    const done: GameState = {
      ...moved,
      pending: null,
      resolution: { queue: moved.resolution!.queue.slice(1), ctx, chosen: moved.resolution!.chosen },
    };
    return resolve(done);
  } else if (pending.kind === 'moveDiscToCenter') {
    const track = state.planets[planet];
    s = { ...state, planets: { ...state.planets, [planet]: { ...track, discPos: CENTER } } };
  } else if (pending.kind === 'choosePlanet') {
    // choosePlanet (+ variantes exclude / atCenter / beneficiary)
    if (pending.exclude && pending.exclude.includes(planet)) {
      throw new Error('decide: planète exclue (doit être différente)');
    }
    if (pending.atCenter && state.planets[planet].discPos !== CENTER) {
      throw new Error('decide: planète non centrale');
    }
    const beneficiary: PlayerIndex = pending.beneficiary === 'opponent' ? (ctx.player === 0 ? 1 : 0) : ctx.player;
    s = gainInfluence(state, planet, beneficiary, pending.amount);
  } else {
    throw new Error('decide: décision non compatible (planète attendue)');
  }
  const prevChosen = state.resolution.chosen ?? [];
  const justChosen: Planet[] =
    pending.kind === 'chooseSegment'
      ? PLANETS.slice(PLANETS.indexOf(planet), PLANETS.indexOf(planet) + pending.count)
      : [planet];
  s = {
    ...s,
    pending: null,
    resolution: { queue: s.resolution!.queue.slice(1), ctx, chosen: [...prevChosen, ...justChosen] },
  };
  return resolve(s);
}

export function decideTech(state: GameState, people: People): GameState {
  if (state.pending === null || state.resolution === null || state.pending.kind !== 'chooseTech') {
    throw new Error('decideTech: aucune décision chooseTech en attente');
  }
  const pending = state.pending;
  const ctx = state.resolution.ctx;
  const chosen = state.resolution.chosen;
  if (!pending.candidates.includes(people)) throw new Error('decideTech: peuple non éligible');
  const lvl = state.players[ctx.player].techMarkers[people];
  const base = activeFace(people, state.config.techSetup).levels[lvl]!.zenithium;
  const cost = pending.zeroCost ? 0 : Math.max(0, base - pending.discount);
  const res = developTech(state, ctx.player, people, cost);
  const rest = state.resolution.queue.slice(1);
  const next =
    res === null
      ? { ...state, pending: null, resolution: { queue: rest, ctx, chosen } }
      : { ...res.state, pending: null, resolution: { queue: [...res.queue, ...rest], ctx, chosen } };
  return resolve(next);
}

export function decideCard(state: GameState, cardId: string): GameState {
  if (state.pending === null || state.resolution === null || state.pending.kind !== 'chooseHandCard') {
    throw new Error('decideCard: aucune décision chooseHandCard en attente');
  }
  const pending = state.pending;
  const ctx = state.resolution.ctx;
  const chosen = state.resolution.chosen;
  const active = ctx.player;
  if (!state.players[active].hand.includes(cardId)) {
    throw new Error('decideCard: carte absente de la main');
  }
  const players: [PlayerState, PlayerState] = [state.players[0], state.players[1]];
  players[active] = { ...players[active], hand: players[active].hand.filter((id) => id !== cardId) };
  let moved: GameState = { ...state, players, discard: [...state.discard, cardId] };
  const def = cardOf(cardId);
  if (pending.purpose === 'discardInfluence' && def) {
    moved = gainInfluence(moved, def.planet, active, 1);
  } else if (pending.purpose === 'discardValue') {
    const value = def ? def.cost : 0;
    const p2: [PlayerState, PlayerState] = [moved.players[0], moved.players[1]];
    p2[active] = { ...p2[active], credits: p2[active].credits + value };
    moved = { ...moved, players: p2 };
  }
  const remaining = pending.remaining - 1;
  if (remaining > 0 && moved.players[active].hand.length > 0 && moved.winner === null) {
    return { ...moved, pending: { kind: 'chooseHandCard', purpose: pending.purpose, remaining } };
  }
  return resolve({ ...moved, pending: null, resolution: { queue: moved.resolution!.queue.slice(1), ctx, chosen } });
}

export function chooseBranch(state: GameState, index: number): GameState {
  if (state.pending === null || state.resolution === null) {
    throw new Error('chooseBranch: aucune décision en attente');
  }
  const ctx = state.resolution.ctx;
  const chosen = state.resolution.chosen;
  const head = state.resolution.queue[0]!;
  const rest = state.resolution.queue.slice(1);
  const pending = state.pending;
  if (pending.kind === 'confirmOptional') {
    if (index !== 0) throw new Error("chooseBranch: seule l'option 0 (accepter) est valide");
    if (head.k !== 'optional' && head.k !== 'conditional') {
      throw new Error('chooseBranch: atome de tête inattendu');
    }
    const s: GameState = { ...state, pending: null, resolution: { queue: [...head.effects, ...rest], ctx, chosen } };
    return resolve(s);
  }
  if (pending.kind === 'chooseOption') {
    if (head.k !== 'choice') throw new Error('chooseBranch: atome de tête inattendu');
    if (index < 0 || index >= head.options.length) throw new Error('chooseBranch: option hors bornes');
    const s: GameState = { ...state, pending: null, resolution: { queue: [...head.options[index]!, ...rest], ctx, chosen } };
    return resolve(s);
  }
  if (pending.kind === 'chooseTier') {
    if (head.k !== 'scale') throw new Error('chooseBranch: atome de tête inattendu');
    if (index < 0 || index >= head.tiers.length) throw new Error('chooseBranch: palier hors bornes');
    const tier = head.tiers[index]!;
    if (!canPayTier(state, ctx.player, tier.cost)) throw new Error('chooseBranch: palier non payable');
    const s: GameState = { ...state, pending: null, resolution: { queue: [...tier.cost, ...tier.reward, ...rest], ctx, chosen } };
    return resolve(s);
  }
  if (pending.kind === 'chooseBoardToken') {
    if (head.k !== 'takeBoardBonusToken') throw new Error('chooseBranch: atome de tête inattendu');
    const slot = pending.slots[index];
    if (!slot) throw new Error('chooseBranch: jeton hors bornes');
    let tokenId: string;
    let ns: GameState;
    if (slot.kind === 'planet') {
      tokenId = state.planets[slot.planet].bonusToken!;
      ns = { ...state, planets: { ...state.planets, [slot.planet]: { ...state.planets[slot.planet], bonusToken: null } } };
    } else {
      tokenId = state.techBonus[slot.people]!;
      ns = { ...state, techBonus: { ...state.techBonus, [slot.people]: null } };
    }
    const fx = tokenOf(tokenId).effects;
    const s: GameState = { ...ns, bonusDiscard: [...ns.bonusDiscard, tokenId], pending: null, resolution: { queue: [...fx, ...rest], ctx, chosen } };
    return resolve(s);
  }
  throw new Error('chooseBranch: décision non compatible');
}

export function skipBranch(state: GameState): GameState {
  if (state.pending === null || state.resolution === null) {
    throw new Error('skipBranch: aucune décision en attente');
  }
  const pending = state.pending;
  if (pending.kind !== 'confirmOptional' && pending.kind !== 'chooseTier') {
    throw new Error("skipBranch: cette décision n'est pas facultative");
  }
  const ctx = state.resolution.ctx;
  const chosen = state.resolution.chosen;
  const rest = state.resolution.queue.slice(1);
  const s: GameState = { ...state, pending: null, resolution: { queue: rest, ctx, chosen } };
  return resolve(s);
}

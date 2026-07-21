import { gainInfluence } from './influence';
import type { CardDef } from '../data/types';
import { FIXTURE_CARDS } from '../data/fixtures';
import { PLANETS, PEOPLES } from './types';
import type { Condition, Effect, EffectCtx, GameState, Planet, PlayerIndex, PlayerState, Side } from './types';
import { shuffle } from './rng';
import { tokenOf } from '../data/tokens';

// Accès au catalogue de cartes (fixtures pour l'instant ; le vrai contenu s'y substituera plus tard).
const CARDS: Record<string, CardDef> = Object.fromEntries(FIXTURE_CARDS.map((c) => [c.id, c]));
export function cardOf(id: string): CardDef | undefined {
  return CARDS[id];
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

export function applyEffect(state: GameState, effect: Effect, ctx: EffectCtx): GameState {
  const target: PlayerIndex = 'target' in effect && effect.target === 'opponent' ? (ctx.player === 0 ? 1 : 0) : ctx.player;
  switch (effect.k) {
    case 'credits':
      return creditPlayer(state, target, { credits: state.players[target].credits + effect.amount });
    case 'zenithium':
      return creditPlayer(state, target, { zenithium: state.players[target].zenithium + effect.amount });
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
      return creditPlayer(state, ctx.player, { credits: state.players[ctx.player].credits + gain });
    }
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
    if (head.k === 'transfer' || head.k === 'exile') {
      const owner: Side = head.k === 'transfer' ? 'opponent' : head.side;
      const ownerIndex: PlayerIndex = owner === 'self' ? ctx.player : ctx.player === 0 ? 1 : 0;
      const hasEligible = hasEligibleColumn(s, ownerIndex);
      if (!hasEligible) {
        // effet inapplicable → ignoré (aucun pending), on passe à l'atome suivant
        s = { ...s, resolution: { queue: s.resolution!.queue.slice(1), ctx, chosen: s.resolution!.chosen } };
        continue;
      }
      s = { ...s, pending: { kind: 'chooseColumn', owner, purpose: head.k, remaining: head.count } };
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
    if (pending.purpose === 'exileInfluence' && (pending.exclude ?? []).includes(planet)) {
      throw new Error('decide: couleur déjà choisie (doit être différente)');
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
    const remaining = pending.remaining - 1;
    const nextExclude = pending.purpose === 'exileInfluence' ? [...(pending.exclude ?? []), planet] : pending.exclude;
    const stillEligible = PLANETS.some(
      (p) => moved.players[ownerIndex].columns[p].length > 0 && !(nextExclude ?? []).includes(p),
    );
    if (remaining > 0 && stillEligible && moved.winner === null) {
      return {
        ...moved,
        pending: { kind: 'chooseColumn', owner: pending.owner, purpose: pending.purpose, remaining, amount: pending.amount, exclude: nextExclude },
      };
    }
    const done: GameState = {
      ...moved,
      pending: null,
      resolution: { queue: moved.resolution!.queue.slice(1), ctx, chosen: moved.resolution!.chosen },
    };
    return resolve(done);
  } else if (pending.kind === 'choosePlanet') {
    if (pending.exclude && pending.exclude.includes(planet)) {
      throw new Error('decide: planète exclue (doit être différente)');
    }
    s = gainInfluence(state, planet, ctx.player, pending.amount);
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
    const s: GameState = { ...state, pending: null, resolution: { queue: [...tier.cost, ...tier.reward, ...rest], ctx, chosen } };
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

import { gainInfluence } from './influence';
import type { CardDef } from '../data/types';
import { FIXTURE_CARDS } from '../data/fixtures';
import { PLANETS } from './types';
import type { Effect, EffectCtx, GameState, Planet, PlayerIndex, PlayerState } from './types';

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
    s = applyEffect(s, head, ctx);
    s = { ...s, resolution: { queue: s.resolution!.queue.slice(1), ctx } };
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
  } else {
    // choosePlanet
    if (pending.exclude && pending.exclude.includes(planet)) {
      throw new Error('decide: planète exclue (doit être différente)');
    }
    s = gainInfluence(state, planet, ctx.player, pending.amount);
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

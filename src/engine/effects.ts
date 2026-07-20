import type { Effect, EffectCtx, GameState, PlayerIndex, PlayerState } from './types';

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
    case 'mobilize':
      throw new Error(`applyEffect: atome '${effect.k}' non géré ici (voir resolve)`);
  }
}

export function resolve(state: GameState): GameState {
  let s = state;
  while (s.resolution && s.resolution.queue.length > 0 && s.pending === null) {
    const [head, ...rest] = s.resolution.queue;
    const ctx = s.resolution.ctx;
    // Atomes sans choix uniquement en Task 2 ; les autres seront gérés en Task 3.
    s = applyEffect(s, head!, ctx);
    s = { ...s, resolution: { queue: rest, ctx } };
  }
  if (s.resolution && s.resolution.queue.length === 0) s = { ...s, resolution: null };
  return s;
}

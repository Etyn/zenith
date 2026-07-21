import {
  activePlayer,
  applyMove,
  createGame,
  legalMoves,
  makeRng,
  pickMove,
  playerView,
  type GameConfig,
  type GameState,
  type Move,
  type PlayerIndex,
  type PlayerView,
  type RngState,
} from '../engine';
import { describeMove, decisionPrompt } from './labels';

export const HUMAN: PlayerIndex = 0;
export const BOT: PlayerIndex = 1;

export type Phase = 'human' | 'bot' | 'over';
export type Outcome = 'playing' | 'winner' | 'stuck';
export type LabeledMove = { move: Move; label: string };

export type SessionState = {
  config: GameConfig;
  gameSeed: number;
  botRng: RngState;
  game: GameState;
};

export type SessionSnapshot = {
  view: PlayerView;
  phase: Phase;
  outcome: Outcome;
  winner: PlayerIndex | null;
  actions: { recruit: LabeledMove[]; develop: LabeledMove[]; leadership: LabeledMove[] };
  decision: { prompt: string; options: LabeledMove[] } | null;
};

export function initSession(config: GameConfig, gameSeed: number, botSeed: number): SessionState {
  return { config, gameSeed, botRng: makeRng(botSeed), game: createGame(config, gameSeed) };
}

export function isBotActive(s: SessionState): boolean {
  return s.game.winner === null && activePlayer(s.game) === BOT;
}

/** Applique un coup du joueur humain. N'avance PAS le bot (voir `stepBot`). */
export function humanMove(s: SessionState, move: Move): SessionState {
  if (s.game.winner !== null) return s;
  if (activePlayer(s.game) !== HUMAN) return s;
  return { ...s, game: applyMove(s.game, move) };
}

/** Joue UN coup du bot s'il est actif. Renvoie le même objet si le bot est bloqué. */
export function stepBot(s: SessionState): SessionState {
  if (!isBotActive(s)) return s;
  const [move, nextRng] = pickMove(s.game, BOT, s.botRng);
  if (move === null) return s;
  return { ...s, botRng: nextRng, game: applyMove(s.game, move) };
}

/** Rejoue : 1er joueur inversé (règle), graines dérivées de façon déterministe. */
export function replay(s: SessionState): SessionState {
  const nextFirst: PlayerIndex = s.config.firstPlayer === 0 ? 1 : 0;
  const config: GameConfig = { ...s.config, firstPlayer: nextFirst };
  return initSession(config, s.gameSeed + 1, s.botRng.seed + 1);
}

function phaseOf(game: GameState): Phase {
  if (game.winner !== null) return 'over';
  return activePlayer(game) === BOT ? 'bot' : 'human';
}

function outcomeOf(game: GameState): Outcome {
  if (game.winner !== null) return 'winner';
  const p = activePlayer(game);
  if (p !== null && legalMoves(game, p).length === 0) return 'stuck';
  return 'playing';
}

export function snapshot(s: SessionState): SessionSnapshot {
  const game = s.game;
  const view = playerView(game, HUMAN);
  const phase = phaseOf(game);
  const outcome = outcomeOf(game);

  const recruit: LabeledMove[] = [];
  const develop: LabeledMove[] = [];
  const leadership: LabeledMove[] = [];
  let decision: SessionSnapshot['decision'] = null;

  if (phase === 'human') {
    const moves = legalMoves(game, HUMAN);
    if (game.pending !== null) {
      decision = {
        prompt: decisionPrompt(game),
        options: moves.map((move) => ({ move, label: describeMove(game, move) })),
      };
    } else {
      for (const move of moves) {
        const lm: LabeledMove = { move, label: describeMove(game, move) };
        if (move.t === 'recruit') recruit.push(lm);
        else if (move.t === 'develop') develop.push(lm);
        else if (move.t === 'leadership') leadership.push(lm);
      }
    }
  }

  return {
    view,
    phase,
    outcome,
    winner: game.winner,
    actions: { recruit, develop, leadership },
    decision,
  };
}

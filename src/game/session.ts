import {
  activePlayer,
  applyMove,
  createGame,
  legalMoves,
  makeRng,
  pickMove,
  playerView,
  PLANETS,
  type GameConfig,
  type GameState,
  type Move,
  type PlayerIndex,
  type PlayerView,
  type RngState,
} from '../engine';
import { describeMove, decisionPrompt, describePlanet, signed, PLANET_FR } from './labels';

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

export type BotTurnLog = { moves: string[]; deltas: string[] };

function playerLabel(side: PlayerIndex): string {
  return side === HUMAN ? 'Toi' : 'Bot';
}

/** Lignes d'influence/capture par planète, du point de vue du joueur humain. */
function planetDeltaLines(before: GameState, after: GameState): string[] {
  const lines: string[] = [];
  for (const planet of PLANETS) {
    const b = before.planets[planet];
    const a = after.planets[planet];
    if (b.discPos !== a.discPos) {
      lines.push(`${PLANET_FR[planet]} : ${describePlanet(b, HUMAN)} → ${describePlanet(a, HUMAN)}`);
    }
    for (const side of [HUMAN, BOT]) {
      if (a.captured[side] > b.captured[side]) {
        lines.push(`${playerLabel(side)} capture ${PLANET_FR[planet]}`);
      }
    }
  }
  return lines;
}

/** Variations de crédits/zénithium des deux joueurs. */
function resourceDeltaLines(before: GameState, after: GameState): string[] {
  const lines: string[] = [];
  for (const side of [HUMAN, BOT]) {
    const dc = after.players[side].credits - before.players[side].credits;
    if (dc !== 0) lines.push(`${playerLabel(side)} : ${signed(dc)} crédits`);
    const dz = after.players[side].zenithium - before.players[side].zenithium;
    if (dz !== 0) lines.push(`${playerLabel(side)} : ${signed(dz)} zénithium`);
  }
  return lines;
}

/** Changement de badge de leader. */
function leaderDeltaLines(before: GameState, after: GameState): string[] {
  const b = before.diplomacy;
  const a = after.diplomacy;
  if (b.leader === a.leader && b.side === a.side) return [];
  if (a.leader === null) return [];
  const side = a.side === 'gold' ? 'or' : 'argent';
  return [`${playerLabel(a.leader)} prend le badge de leader (${side})`];
}

function columnsCount(state: GameState, side: PlayerIndex): number {
  return Object.values(state.players[side].columns).reduce((n, c) => n + c.length, 0);
}

/** Nombre d'agents posés dans les colonnes (recrutés/transférés/exilés) pour chaque joueur. */
function columnsDeltaLines(before: GameState, after: GameState): string[] {
  const lines: string[] = [];
  for (const side of [HUMAN, BOT]) {
    const b = columnsCount(before, side);
    const a = columnsCount(after, side);
    if (a !== b) lines.push(`${playerLabel(side)} : agents en jeu ${b} → ${a}`);
  }
  return lines;
}

/**
 * Résumé lisible (FR) des changements d'état entre avant/après le tour du bot,
 * du point de vue du joueur humain. Ne décrit QUE de l'état public (planètes,
 * crédits/zénithium, badge de leader, nb de cartes en colonnes) — jamais le
 * contenu de la main du bot.
 */
function computeBotTurnDeltas(before: GameState, after: GameState): string[] {
  return [
    ...planetDeltaLines(before, after),
    ...resourceDeltaLines(before, after),
    ...leaderDeltaLines(before, after),
    ...columnsDeltaLines(before, after),
  ];
}

/**
 * Joue le tour complet du bot (tous ses coups jusqu'à ce que la main revienne à
 * l'humain ou que la partie se termine), et renvoie un résumé lisible du tour.
 * Garde anti-boucle : si `stepBot` ne fait pas avancer l'état (même référence),
 * on arrête plutôt que de boucler indéfiniment.
 */
export function runBotTurn(s: SessionState): { session: SessionState; log: BotTurnLog } {
  const startGame = s.game;
  let cur = s;
  const moves: string[] = [];

  for (;;) {
    if (!isBotActive(cur)) break;
    // Rejoue le même choix que `stepBot` (même state + même rng ⇒ déterministe)
    // uniquement pour obtenir un libellé, sans dupliquer la logique de progression.
    const [move] = pickMove(cur.game, BOT, cur.botRng);
    const next = stepBot(cur);
    if (next === cur) break;
    if (move !== null) moves.push(describeMove(cur.game, move));
    cur = next;
  }

  return { session: cur, log: { moves, deltas: computeBotTurnDeltas(startGame, cur.game) } };
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

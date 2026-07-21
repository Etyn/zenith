import { PLANETS, type GameState, type Planet, type PlayerIndex } from './types';
import { tokenOf } from '../data/tokens';

const CENTER = 4;
const ZONE = { 0: 0, 1: 8 } as const; // position de la zone de contrôle de chaque joueur

export function gainInfluence(
  state: GameState,
  planet: Planet,
  player: PlayerIndex,
  amount: number,
): GameState {
  const track = state.planets[planet];
  const dir = player === 0 ? -1 : +1;
  let pos = track.discPos + dir * amount;

  const captured: [number, number] = [track.captured[0], track.captured[1]];
  let bonusToken = track.bonusToken;
  let bonusDiscard = state.bonusDiscard;
  let resolution = state.resolution;

  const reachedZone = player === 0 ? pos <= ZONE[0] : pos >= ZONE[1];
  if (reachedZone) {
    captured[player] += 1;
    pos = CENTER; // nouveau disque au centre (simplifié ; remise en fin de tour affinée plus tard)
    if (bonusToken !== null) {
      // Le jeton de la planète se déclenche AVANT les effets restants.
      // ATTENTION : si `resolution === null` (capture hors résolution, ex. une influence
      // « gratuite » future), le jeton est retiré/défaussé mais son effet n'est PAS mis en
      // file (aucune file où l'enfiler). Non atteignable aujourd'hui (toute capture passe par
      // resolve/decide) ; à revoir si un appelant capture hors résolution.
      if (state.resolution !== null) {
        const tokenFx = tokenOf(bonusToken).effects;
        const q = state.resolution.queue;
        // Insertion APRÈS l'atome courant (index 0) : l'appelant fera queue.slice(1),
        // laissant les effets du jeton en tête du reste (« jeton d'abord »).
        resolution = { ...state.resolution, queue: [...q.slice(0, 1), ...tokenFx, ...q.slice(1)] };
      }
      bonusDiscard = [...bonusDiscard, bonusToken];
      bonusToken = null; // le jeton quitte la planète
    }
  } else {
    pos = Math.max(0, Math.min(8, pos));
  }

  const planets = { ...state.planets, [planet]: { discPos: pos, captured, bonusToken } };
  const next: GameState = { ...state, planets, resolution, bonusDiscard };
  const w = winnerOf(next);
  return w === null ? next : { ...next, winner: w };
}

export function checkVictory(state: GameState, player: PlayerIndex): boolean {
  const counts = PLANETS.map((p) => state.planets[p].captured[player]);
  const absolute = counts.some((c) => c >= 3);
  const democratic = counts.filter((c) => c >= 1).length >= 4;
  const popular = counts.reduce((a, b) => a + b, 0) >= 5;
  return absolute || democratic || popular;
}

export function winnerOf(state: GameState): PlayerIndex | null {
  if (checkVictory(state, 0)) return 0;
  if (checkVictory(state, 1)) return 1;
  return null;
}

import { PLANETS, type GameState, type Planet, type PlayerIndex } from './types';

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

  let captured: [number, number] = [track.captured[0], track.captured[1]];
  let bonusActive = track.bonusActive;

  const reachedZone = player === 0 ? pos <= ZONE[0] : pos >= ZONE[1];
  if (reachedZone) {
    captured = [captured[0], captured[1]];
    captured[player] += 1;
    pos = CENTER; // nouveau disque au centre (simplifié ; remise en fin de tour affinée plus tard)
    if (captured[0] + captured[1] === 1) bonusActive = false; // 1re capture de la planète
  } else {
    pos = Math.max(0, Math.min(8, pos));
  }

  const planets = { ...state.planets, [planet]: { discPos: pos, captured, bonusActive } };
  const next: GameState = { ...state, planets };
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

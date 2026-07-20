import { makeRng, shuffle } from './rng';
import {
  PLANETS,
  type GameConfig,
  type GameState,
  type Planet,
  type PlayerIndex,
  type PlayerState,
} from './types';
import { FIXTURE_CARDS } from '../data/fixtures';
import type { CardDef } from '../data/types';

export const START_CREDITS = 12;
export const START_ZENITHIUM = 1;
export const START_HAND = 4;
export const CENTER = 4;

function emptyColumns(): Record<Planet, string[]> {
  return { mercure: [], venus: [], terra: [], mars: [], jupiter: [] };
}

function newPlayer(hand: string[]): PlayerState {
  return {
    hand,
    columns: emptyColumns(),
    credits: START_CREDITS,
    zenithium: START_ZENITHIUM,
    techMarkers: { animod: 0, humain: 0, robot: 0 },
    lineBonusClaimed: { 1: false, 2: false, 3: false },
  };
}

export function createGame(config: GameConfig, seed: number, deck: CardDef[] = FIXTURE_CARDS): GameState {
  const [shuffled, rng] = shuffle(deck.map((c) => c.id), makeRng(seed));
  const hand0 = shuffled.slice(0, START_HAND);
  const hand1 = shuffled.slice(START_HAND, START_HAND * 2);
  const rest = shuffled.slice(START_HAND * 2);

  const secondPlayer: PlayerIndex = config.firstPlayer === 0 ? 1 : 0;

  const planets = {} as Record<Planet, GameState['planets'][Planet]>;
  for (const planet of PLANETS) {
    // +1 Influence Terra pour le 2e joueur : disque décalé d'un cran vers SA zone.
    const offset = planet === 'terra' ? (secondPlayer === 0 ? -1 : +1) : 0;
    planets[planet] = { discPos: CENTER + offset, captured: [0, 0], bonusActive: true };
  }

  return {
    config,
    rng,
    current: config.firstPlayer,
    players: [newPlayer(hand0), newPlayer(hand1)],
    deck: rest,
    discard: [],
    planets,
    diplomacy: { leader: null, side: 'silver' },
    winner: null,
  };
}

import { makeRng, shuffle } from './rng';
import {
  PLANETS,
  PEOPLES,
  type GameConfig,
  type GameState,
  type People,
  type Planet,
  type PlayerIndex,
  type PlayerState,
} from './types';
import { FIXTURE_CARDS } from '../data/fixtures';
import type { CardDef } from '../data/types';
import { TOKENS } from '../data/tokens';

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
  const [shuffled, rngAfterDeck] = shuffle(deck.map((c) => c.id), makeRng(seed));
  const hand0 = shuffled.slice(0, START_HAND);
  const hand1 = shuffled.slice(START_HAND, START_HAND * 2);
  const rest = shuffled.slice(START_HAND * 2);

  const secondPlayer: PlayerIndex = config.firstPlayer === 0 ? 1 : 0;

  // Jetons bonus : mélange déterministe (rng post-deck → n'altère pas les mains).
  const [tokenIds, rng] = shuffle(TOKENS.map((t) => t.id), rngAfterDeck);
  const boardPlanets = tokenIds.slice(0, 5); // 5 premiers → planètes (ordre PLANETS)
  const boardTech = tokenIds.slice(5, 8); // 3 suivants → colonnes techno (ordre PEOPLES)
  const bonusReserve = tokenIds.slice(8); // 8 restants → réserve

  const planets = {} as Record<Planet, GameState['planets'][Planet]>;
  PLANETS.forEach((planet, i) => {
    // +1 Influence Terra pour le 2e joueur : disque décalé d'un cran vers SA zone.
    const offset = planet === 'terra' ? (secondPlayer === 0 ? -1 : +1) : 0;
    planets[planet] = { discPos: CENTER + offset, captured: [0, 0], bonusToken: boardPlanets[i]! };
  });

  const techBonus = {} as Record<People, string | null>;
  PEOPLES.forEach((people, j) => {
    techBonus[people] = boardTech[j]!;
  });

  return {
    config,
    rng,
    current: config.firstPlayer,
    players: [newPlayer(hand0), newPlayer(hand1)],
    deck: rest,
    discard: [],
    planets,
    diplomacy: { leader: null, side: 'silver' },
    resolution: null,
    pending: null,
    winner: null,
    bonusReserve,
    bonusDiscard: [],
    techBonus,
  };
}

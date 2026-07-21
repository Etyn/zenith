import type { RngState } from './rng';

export type Planet = 'mercure' | 'venus' | 'terra' | 'mars' | 'jupiter';
export const PLANETS: Planet[] = ['mercure', 'venus', 'terra', 'mars', 'jupiter'];

export type People = 'animod' | 'humain' | 'robot';
export const PEOPLES: People[] = ['animod', 'humain', 'robot'];

export type PlayerIndex = 0 | 1;

/** 9 positions : 0 = zone contrôle J0, 4 = centre, 8 = zone contrôle J1. */
export type PlanetTrack = { discPos: number; captured: [number, number]; bonusActive: boolean };

export type PlayerState = {
  hand: string[];
  columns: Record<Planet, string[]>;
  credits: number;
  zenithium: number;
  techMarkers: Record<People, number>;
  lineBonusClaimed: { 1: boolean; 2: boolean; 3: boolean };
};

export type TechSetup = { animod: 'S' | 'D'; humain: 'O' | 'U'; robot: 'N' | 'P' };
export type GameConfig = { techSetup: TechSetup; firstPlayer: PlayerIndex };

export type Side = 'self' | 'opponent';
export type PlanetSelector = Planet | 'choice';

export type Effect =
  | { k: 'influence'; amount: number; on: PlanetSelector }
  | { k: 'influenceEach'; amount: number }
  | { k: 'credits'; amount: number; target: Side }
  | { k: 'zenithium'; amount: number; target: Side }
  | { k: 'mobilize'; count: number; thenInfluence: boolean }
  | { k: 'takeLeader'; side: 'silver' | 'gold' }
  | { k: 'steal'; resource: 'credits' | 'zenithium'; amount: number };

export type EffectCtx = { player: PlayerIndex; planet: Planet };
export type ResolutionState = { queue: Effect[]; ctx: EffectCtx };
export type PendingDecision = { kind: 'choosePlanet'; amount: number };

export type GameState = {
  config: GameConfig;
  rng: RngState;
  current: PlayerIndex;
  players: [PlayerState, PlayerState];
  deck: string[];
  discard: string[];
  planets: Record<Planet, PlanetTrack>;
  diplomacy: { leader: PlayerIndex | null; side: 'silver' | 'gold' };
  resolution: ResolutionState | null;
  pending: PendingDecision | null;
  winner: PlayerIndex | null;
};

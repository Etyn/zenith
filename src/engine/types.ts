import type { RngState } from './rng';

export type Planet = 'mercure' | 'venus' | 'terra' | 'mars' | 'jupiter';
export const PLANETS: Planet[] = ['mercure', 'venus', 'terra', 'mars', 'jupiter'];

export type People = 'animod' | 'humain' | 'robot';
export const PEOPLES: People[] = ['animod', 'humain', 'robot'];

export type PlayerIndex = 0 | 1;

/** 9 positions : 0 = zone contrôle J0, 4 = centre, 8 = zone contrôle J1. */
export type PlanetTrack = { discPos: number; captured: [number, number]; bonusToken: string | null };

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

export type Condition =
  | { c: 'hasLeaderBadge'; side?: 'silver' | 'gold' }
  | { c: 'creditsAtLeast'; amount: number };

export type Effect =
  | { k: 'influence'; amount: number; on: PlanetSelector }
  | { k: 'influenceEach'; amount: number }
  | { k: 'credits'; amount: number; target: Side }
  | { k: 'zenithium'; amount: number; target: Side }
  | { k: 'mobilize'; count: number; thenInfluence: boolean }
  | { k: 'takeLeader'; side: 'silver' | 'gold' }
  | { k: 'steal'; resource: 'credits' | 'zenithium'; amount: number }
  | { k: 'influenceNeighbors'; count: number; amount: number }
  | { k: 'influenceDifferent'; amount: number }
  | { k: 'transfer'; count: number; from?: 'corresponding' | 'choice'; thenInfluence?: boolean }
  | { k: 'exile'; side: Side; count: number; corresponding?: boolean; thenInfluence?: boolean }
  | { k: 'exileForInfluence'; count: number; amount: number }
  | { k: 'discardHandAll' }
  | { k: 'optional'; effects: Effect[] }
  | { k: 'bonusToken' }
  | { k: 'conditional'; cond: Condition; effects: Effect[] }
  | { k: 'choice'; options: Effect[][] }
  | { k: 'scale'; tiers: { cost: Effect[]; reward: Effect[] }[] }
  | { k: 'creditsPerCardColors'; zone: Side; per: number }
  | { k: 'creditsPerTechLevels'; tiers: number[] }
  | { k: 'giveOpponent'; resource: 'credits' | 'zenithium'; amount: number }
  | { k: 'giveLeaderBadge' }
  | { k: 'influenceChoiceExcept'; exceptColor: Planet; amount: number }
  | { k: 'influenceChoiceAtCenter'; amount: number }
  | { k: 'giveInfluenceOpponent'; amount: number }
  | { k: 'moveDiscToCenter' }
  | { k: 'developDiscounted'; which: 'cardPeople' | 'choice'; discount: number }
  | { k: 'developLowest' };

export type EffectCtx = { player: PlayerIndex; planet: Planet; people?: People };
export type ResolutionState = { queue: Effect[]; ctx: EffectCtx; chosen?: Planet[] };
export type PendingDecision =
  | { kind: 'choosePlanet'; amount: number; exclude?: Planet[]; atCenter?: boolean; beneficiary?: Side }
  | { kind: 'moveDiscToCenter' }
  | { kind: 'chooseSegment'; count: number; amount: number }
  | {
      kind: 'chooseColumn';
      owner: 'self' | 'opponent';
      purpose: 'transfer' | 'exile' | 'exileInfluence';
      remaining: number;
      amount?: number;
      exclude?: Planet[];
      thenInfluence?: boolean;
    }
  | { kind: 'confirmOptional' }
  | { kind: 'chooseOption'; count: number }
  | { kind: 'chooseTier'; count: number }
  | { kind: 'chooseTech'; discount: number; zeroCost: boolean; candidates: People[] };

export type GameState = {
  config: GameConfig;
  rng: RngState;
  current: PlayerIndex;
  players: [PlayerState, PlayerState];
  deck: string[];
  discard: string[];
  planets: Record<Planet, PlanetTrack>;
  bonusReserve: string[];
  bonusDiscard: string[];
  techBonus: Record<People, string | null>;
  diplomacy: { leader: PlayerIndex | null; side: 'silver' | 'gold' };
  resolution: ResolutionState | null;
  pending: PendingDecision | null;
  winner: PlayerIndex | null;
};

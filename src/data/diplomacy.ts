import type { Effect, People } from '../engine/types';

export type DiplomacyDef = Record<People, Effect[]>;

// Effets RÉELS de l'action « Prendre le Leadership » (livret).
export const DIPLOMACY: DiplomacyDef = {
  robot: [{ k: 'takeLeader', side: 'silver' }, { k: 'zenithium', amount: 1, target: 'self' }],
  humain: [{ k: 'takeLeader', side: 'silver' }, { k: 'credits', amount: 3, target: 'self' }],
  animod: [{ k: 'takeLeader', side: 'silver' }, { k: 'mobilize', count: 2, thenInfluence: false }],
};

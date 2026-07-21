import type { Effect } from '../engine/types';

export type TokenDef = { id: string; effects: Effect[] };

// Catalogue RÉEL confirmé (docs/content/jetons-bonus.md, 2026-07-22) — 16 jetons.
// Chaque effet se mappe sur un atome existant de l'union Effect (aucun nouvel effet de jeu).
export const TOKENS: TokenDef[] = [
  { id: 'tok-zen1-1', effects: [{ k: 'zenithium', amount: 1, target: 'self' }] },
  { id: 'tok-zen1-2', effects: [{ k: 'zenithium', amount: 1, target: 'self' }] },
  { id: 'tok-zen1-3', effects: [{ k: 'zenithium', amount: 1, target: 'self' }] },
  { id: 'tok-cred3-1', effects: [{ k: 'credits', amount: 3, target: 'self' }] },
  { id: 'tok-cred3-2', effects: [{ k: 'credits', amount: 3, target: 'self' }] },
  { id: 'tok-cred4-1', effects: [{ k: 'credits', amount: 4, target: 'self' }] },
  { id: 'tok-cred4-2', effects: [{ k: 'credits', amount: 4, target: 'self' }] },
  { id: 'tok-inf1-1', effects: [{ k: 'influence', on: 'choice', amount: 1 }] },
  { id: 'tok-inf1-2', effects: [{ k: 'influence', on: 'choice', amount: 1 }] },
  { id: 'tok-inf1-3', effects: [{ k: 'influence', on: 'choice', amount: 1 }] },
  { id: 'tok-inf1-4', effects: [{ k: 'influence', on: 'choice', amount: 1 }] },
  { id: 'tok-exile2', effects: [{ k: 'exile', side: 'opponent', count: 2 }] },
  { id: 'tok-transfer1', effects: [{ k: 'transfer', count: 1 }] },
  { id: 'tok-mobilize2', effects: [{ k: 'mobilize', count: 2, thenInfluence: false }] },
  { id: 'tok-leader-1', effects: [{ k: 'takeLeader', side: 'silver' }] },
  { id: 'tok-leader-2', effects: [{ k: 'takeLeader', side: 'silver' }] },
];

const BY_ID: Record<string, TokenDef> = Object.fromEntries(TOKENS.map((t) => [t.id, t]));

export function tokenOf(id: string): TokenDef {
  const def = BY_ID[id];
  if (!def) throw new Error(`tokenOf: jeton inconnu « ${id} »`);
  return def;
}

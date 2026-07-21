import type { Effect, People, TechSetup } from '../engine/types';

export type TechLevel = { zenithium: number; effects: Effect[] };
export type TechFace = { levels: TechLevel[] };
export type TechCatalog = {
  animod: { S: TechFace; D: TechFace };
  humain: { O: TechFace; U: TechFace };
  robot: { N: TechFace; P: TechFace };
};

/** ⚠️ Faces FIXTURES non canoniques (effets placeholder). Le vrai contenu techno viendra plus tard. */
export const FIXTURE_TECH_NON_CANONICAL = true;

function fixtureFace(): TechFace {
  return {
    levels: [1, 2, 3, 4, 5].map((n) => ({
      zenithium: n,
      // Placeholder déterministe (non canonique) : un effet 'influence on:choice' bloquerait la
      // résolution sur une décision (pending) sans call explicite à decide(), ce qui empêcherait
      // develop de terminer le tour dans le même applyMove. On choisit donc un effet simple qui se
      // résout immédiatement ; le vrai contenu techno (et son interaction avec les décisions) viendra
      // avec les vrais atomes.
      effects: [{ k: 'credits', amount: 1, target: 'self' }] as Effect[],
    })),
  };
}

export const FIXTURE_TECH: TechCatalog = {
  animod: { S: fixtureFace(), D: fixtureFace() },
  humain: { O: fixtureFace(), U: fixtureFace() },
  robot: { N: fixtureFace(), P: fixtureFace() },
};

/**
 * Catalogue RÉEL confirmé des 30 faces Technologie (docs/content/technologies.md →
 * « ✅ CATALOGUE CONFIRMÉ → ATOMES », 2026-07-22). Transcription LITTÉRALE, aucun effet inventé.
 * Coût pour atteindre le niveau N = N Zénithium. Effets cumulés N→…→1 (géré par le moteur).
 * Le jeton d'emplacement niveau 2 est géré par l'infra (`techBonus`), hors effets de face.
 */
export const TECH: TechCatalog = {
  animod: {
    // S — Animod (config S.U.N.)
    S: {
      levels: [
        { zenithium: 1, effects: [{ k: 'credits', amount: 2, target: 'self' }] },
        { zenithium: 2, effects: [{ k: 'influenceNeighbors', count: 2, amount: 1 }] },
        { zenithium: 3, effects: [{ k: 'transfer', count: 3 }] },
        { zenithium: 4, effects: [{ k: 'mobilize', count: 3, thenInfluence: true }] },
        { zenithium: 5, effects: [{ k: 'influence', on: 'choice', amount: 2 }] },
      ],
    },
    // D — Animod (config D.O.P.)
    D: {
      levels: [
        { zenithium: 1, effects: [{ k: 'exile', side: 'opponent', count: 1 }] },
        { zenithium: 2, effects: [{ k: 'credits', amount: 5, target: 'self' }] },
        // L3 : influence PUIS jeton bonus (ordre significatif).
        { zenithium: 3, effects: [{ k: 'influence', on: 'choice', amount: 1 }, { k: 'bonusToken' }] },
        { zenithium: 4, effects: [{ k: 'influenceEach', amount: 1 }] },
        { zenithium: 5, effects: [{ k: 'influence', on: 'choice', amount: 2 }] },
      ],
    },
  },
  humain: {
    // O — Humain (config D.O.P.)
    O: {
      levels: [
        { zenithium: 1, effects: [{ k: 'bonusToken' }] },
        { zenithium: 2, effects: [{ k: 'steal', resource: 'zenithium', amount: 1 }] },
        { zenithium: 3, effects: [{ k: 'mobilize', count: 3, thenInfluence: false }] },
        { zenithium: 4, effects: [{ k: 'influenceNeighbors', count: 2, amount: 2 }] },
        { zenithium: 5, effects: [{ k: 'influence', on: 'choice', amount: 2 }] },
      ],
    },
    // U — Humain (config S.U.N.)
    U: {
      levels: [
        { zenithium: 1, effects: [{ k: 'influence', on: 'choice', amount: 1 }] },
        { zenithium: 2, effects: [{ k: 'mobilize', count: 2, thenInfluence: false }] },
        { zenithium: 3, effects: [{ k: 'steal', resource: 'credits', amount: 3 }] },
        { zenithium: 4, effects: [{ k: 'influenceNeighbors', count: 3, amount: 1 }] },
        { zenithium: 5, effects: [{ k: 'influence', on: 'choice', amount: 2 }] },
      ],
    },
  },
  robot: {
    // N — Robot (config S.U.N.)
    N: {
      levels: [
        { zenithium: 1, effects: [{ k: 'transfer', count: 1 }] },
        { zenithium: 2, effects: [{ k: 'takeLeader', side: 'silver' }] },
        // L3 : 2 influences sur une même planète au choix + 1 sur une planète différente.
        { zenithium: 3, effects: [{ k: 'influence', on: 'choice', amount: 2 }, { k: 'influenceDifferent', amount: 1 }] },
        { zenithium: 4, effects: [{ k: 'credits', amount: 20, target: 'self' }] },
        { zenithium: 5, effects: [{ k: 'influence', on: 'choice', amount: 2 }] },
      ],
    },
    // P — Robot (config D.O.P.)
    P: {
      levels: [
        { zenithium: 1, effects: [{ k: 'mobilize', count: 1, thenInfluence: false }] },
        // L2 : dans cet ordre — mobiliser 1, transférer 1, exiler 1 chez l'adversaire.
        {
          zenithium: 2,
          effects: [
            { k: 'mobilize', count: 1, thenInfluence: false },
            { k: 'transfer', count: 1 },
            { k: 'exile', side: 'opponent', count: 1 },
          ],
        },
        { zenithium: 3, effects: [{ k: 'credits', amount: 10, target: 'self' }] },
        // L4 : exiler 2 cartes de couleurs différentes chez soi, +2 influence par couleur exilée.
        { zenithium: 4, effects: [{ k: 'exileForInfluence', count: 2, amount: 2 }] },
        { zenithium: 5, effects: [{ k: 'influence', on: 'choice', amount: 2 }] },
      ],
    },
  },
};

export function activeFace(people: People, setup: TechSetup, catalog: TechCatalog = FIXTURE_TECH): TechFace {
  const faceKey = setup[people];
  return (catalog[people] as Record<string, TechFace>)[faceKey]!;
}

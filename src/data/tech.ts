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

export function activeFace(people: People, setup: TechSetup, catalog: TechCatalog = FIXTURE_TECH): TechFace {
  const faceKey = setup[people];
  return (catalog[people] as Record<string, TechFace>)[faceKey]!;
}

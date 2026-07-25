import type { Planet } from '../engine';

export { PLANET_FR } from './labels';

/** Couleur d'une planète : `hex` (traits/disques), `bgTint` (teinte douce, ~18% opacité, pour les fonds). */
export type PlanetColor = { hex: string; bgTint: string };

/** Source unique des couleurs planètes (mercure=violet, venus=orange, terra=bleu, mars=rouge, jupiter=vert). */
export const PLANET_COLORS: Record<Planet, PlanetColor> = {
  mercure: { hex: '#8b5cf6', bgTint: 'rgba(139, 92, 246, 0.18)' },
  venus: { hex: '#f97316', bgTint: 'rgba(249, 115, 22, 0.18)' },
  terra: { hex: '#3b82f6', bgTint: 'rgba(59, 130, 246, 0.18)' },
  mars: { hex: '#ef4444', bgTint: 'rgba(239, 68, 68, 0.18)' },
  jupiter: { hex: '#22c55e', bgTint: 'rgba(34, 197, 94, 0.18)' },
};

export function planetColor(planet: Planet): PlanetColor {
  return PLANET_COLORS[planet];
}

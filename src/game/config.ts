import type { GameConfig } from '../engine';

/** Config solo par défaut : l'humain (joueur 0) commence, plateau techno SUN cohérent (S/U/N). */
export const DEFAULT_CONFIG: GameConfig = {
  firstPlayer: 0,
  techSetup: { animod: 'S', humain: 'U', robot: 'N' },
};

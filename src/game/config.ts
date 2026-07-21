import type { GameConfig } from '../engine';

/** Config solo par défaut : l'humain (joueur 0) commence, faces techno fixées. */
export const DEFAULT_CONFIG: GameConfig = {
  firstPlayer: 0,
  techSetup: { animod: 'S', humain: 'O', robot: 'N' },
};

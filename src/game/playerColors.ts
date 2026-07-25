import { makeRng, nextInt, type PlayerIndex } from '../engine';

/** Couleur « point de légende » d'un joueur : gris ou blanc (attribution tirée du seed). */
export const PLAYER_DOT_GRAY = '#9ca3af';
export const PLAYER_DOT_WHITE = '#f8fafc';

/**
 * Couleur (gris/blanc) attribuée à un joueur, tirée déterministement du `seed` de partie :
 * un joueur est gris, l'autre blanc, et l'ordre dépend du seed (stable pour toute la partie).
 */
export function playerDotColor(seed: number, player: PlayerIndex): string {
  const [pick] = nextInt(makeRng(seed), 2);
  const grayPlayer: PlayerIndex = pick === 0 ? 0 : 1;
  return player === grayPlayer ? PLAYER_DOT_GRAY : PLAYER_DOT_WHITE;
}

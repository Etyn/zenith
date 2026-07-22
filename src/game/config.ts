import { makeRng, nextInt, type GameConfig, type PlayerIndex } from '../engine';

/** Config solo par défaut (déterministe) : l'humain (joueur 0) commence, plateau techno SUN. */
export const DEFAULT_CONFIG: GameConfig = {
  firstPlayer: 0,
  techSetup: { animod: 'S', humain: 'U', robot: 'N' },
};

/**
 * Config d'une nouvelle partie, tirée au sort à partir d'une graine (déterministe) :
 * chaque colonne techno tire sa face indépendamment (Animod S|D, Humain O|U, Robot N|P)
 * et le premier joueur est tiré au sort.
 */
export function randomConfig(seed: number): GameConfig {
  let rng = makeRng(seed);
  const [a, r1] = nextInt(rng, 2);
  rng = r1;
  const [h, r2] = nextInt(rng, 2);
  rng = r2;
  const [r, r3] = nextInt(rng, 2);
  rng = r3;
  const [fp, r4] = nextInt(rng, 2);
  rng = r4;
  return {
    firstPlayer: fp as PlayerIndex,
    techSetup: {
      animod: a === 0 ? 'S' : 'D',
      humain: h === 0 ? 'O' : 'U',
      robot: r === 0 ? 'N' : 'P',
    },
  };
}

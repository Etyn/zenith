import { activeFace } from '../data/tech';
import { tokenOf } from '../data/tokens';
import type { Effect, GameState, People, PlayerIndex, PlayerState } from './types';

export type DevelopResult = { state: GameState; queue: Effect[] };

/**
 * Monte d'UN niveau la techno `people` de `player` : déduit le coût (costOverride ?? coût du
 * niveau), met à jour le marqueur, consomme le jeton d'emplacement niveau 2, réclame les primes
 * de ligne, et RETOURNE la file d'effets cumulés (N→1) à résoudre. Ne touche PAS à la carte
 * (main/défausse). Retourne null si niveau 5 atteint ou coût > zénithium disponible.
 */
export function developTech(
  state: GameState,
  player: PlayerIndex,
  people: People,
  costOverride?: number,
): DevelopResult | null {
  const current = state.players[player].techMarkers[people];
  if (current >= 5) return null;
  const face = activeFace(people, state.config.techSetup);
  const newLevel = current + 1;
  const cost = costOverride ?? face.levels[newLevel - 1]!.zenithium;
  if (cost > state.players[player].zenithium) return null;

  const players: [PlayerState, PlayerState] = [state.players[0], state.players[1]];
  const techMarkers = { ...players[player].techMarkers, [people]: newLevel };
  players[player] = { ...players[player], techMarkers, zenithium: players[player].zenithium - cost };

  const queue: Effect[] = [];
  let techBonus = state.techBonus;
  let bonusDiscard = state.bonusDiscard;
  for (let lvl = newLevel; lvl >= 1; lvl--) {
    queue.push(...face.levels[lvl - 1]!.effects);
    if (lvl === 2 && newLevel === 2 && techBonus[people] !== null) {
      const tokenId = techBonus[people]!;
      queue.push(...tokenOf(tokenId).effects);
      techBonus = { ...techBonus, [people]: null };
      bonusDiscard = [...bonusDiscard, tokenId];
    }
  }

  const claimed = { ...players[player].lineBonusClaimed };
  const markers = players[player].techMarkers;
  for (const tier of [1, 2, 3] as const) {
    const allReached = markers.animod >= tier && markers.humain >= tier && markers.robot >= tier;
    if (allReached && !claimed[tier]) {
      claimed[tier] = true;
      queue.push({ k: 'influence', amount: tier, on: 'choice' });
    }
  }
  players[player] = { ...players[player], lineBonusClaimed: claimed };

  return { state: { ...state, players, techBonus, bonusDiscard }, queue };
}

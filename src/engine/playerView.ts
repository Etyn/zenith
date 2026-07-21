import type {
  GameState,
  People,
  Planet,
  PlanetTrack,
  PlayerIndex,
  PendingDecision,
} from './types';

/**
 * Ce que le joueur `viewer` voit d'un `PlayerState` : ses propres champs publics,
 * plus soit `hand` (main complète, si c'est le viewer) soit `handCount` (si c'est
 * l'adversaire — la composition de la main reste secrète).
 */
export type PlayerPublicState = {
  columns: Record<Planet, string[]>;
  credits: number;
  zenithium: number;
  techMarkers: Record<People, number>;
  lineBonusClaimed: { 1: boolean; 2: boolean; 3: boolean };
} & ({ hand: string[]; handCount?: never } | { hand?: never; handCount: number });

/**
 * Projection caviardée de `GameState` du point de vue d'un joueur donné.
 *
 * Info cachée :
 * - la main de l'ADVERSAIRE → `handCount` (nombre de cartes, pas les ids) ;
 * - la pioche → `deckCount` ;
 * - la réserve de jetons bonus (face cachée) → `bonusReserveCount` ;
 * - `rng` (aléa interne, jamais exposé) ;
 * - la file d'effets interne (`resolution.queue`/`ctx` bruts) — seule la décision
 *   en attente (`pending`) et le joueur à qui elle revient (`pendingPlayer`) sont
 *   exposés, dérivés de `resolution?.ctx.player` (ou `null` s'il n'y a rien en attente).
 *
 * Tout le reste (planètes, jetons posés sur le plateau, défausses, diplomatie,
 * crédits/zénithium/colonnes/marqueurs techno/lignes bonus de CHAQUE joueur,
 * `current`, `winner`) est public et recopié tel quel.
 */
export type PlayerView = {
  viewer: PlayerIndex;
  current: PlayerIndex;
  players: [PlayerPublicState, PlayerPublicState];
  deckCount: number;
  discard: string[];
  planets: Record<Planet, PlanetTrack>;
  bonusReserveCount: number;
  bonusDiscard: string[];
  techBonus: Record<People, string | null>;
  diplomacy: { leader: PlayerIndex | null; side: 'silver' | 'gold' };
  pending: PendingDecision | null;
  /** Joueur à qui revient la décision `pending`, ou `null` si rien n'est en attente. */
  pendingPlayer: PlayerIndex | null;
  winner: PlayerIndex | null;
};

export function playerView(state: GameState, viewer: PlayerIndex): PlayerView {
  const players = state.players.map((p, i): PlayerPublicState => {
    const base = {
      columns: p.columns,
      credits: p.credits,
      zenithium: p.zenithium,
      techMarkers: p.techMarkers,
      lineBonusClaimed: p.lineBonusClaimed,
    };
    return i === viewer ? { ...base, hand: p.hand } : { ...base, handCount: p.hand.length };
  }) as [PlayerPublicState, PlayerPublicState];

  return {
    viewer,
    current: state.current,
    players,
    deckCount: state.deck.length,
    discard: state.discard,
    planets: state.planets,
    bonusReserveCount: state.bonusReserve.length,
    bonusDiscard: state.bonusDiscard,
    techBonus: state.techBonus,
    diplomacy: state.diplomacy,
    pending: state.pending,
    pendingPlayer: state.resolution?.ctx.player ?? null,
    winner: state.winner,
  };
}

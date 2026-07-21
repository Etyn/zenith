import { createGame } from '../setup';
import { playerView } from '../playerView';
import type { GameConfig, GameState } from '../types';

const CONFIG: GameConfig = {
  techSetup: { animod: 'S', humain: 'U', robot: 'N' },
  firstPlayer: 0,
};

function makeState(): GameState {
  return createGame(CONFIG, 42);
}

test('la main de l\'adversaire est cachée (handCount uniquement, pas les ids)', () => {
  const s = makeState();
  const view = playerView(s, 0);

  expect(view.players[1].handCount).toBe(s.players[1].hand.length);
  expect((view.players[1] as { hand?: unknown }).hand).toBeUndefined();
  expect(JSON.stringify(view)).not.toContain(JSON.stringify(s.players[1].hand[0]));
});

test('la main du viewer reste visible en entier', () => {
  const s = makeState();
  const view = playerView(s, 0);

  expect(view.players[0].hand).toEqual(s.players[0].hand);
});

test('symétrie : playerView(s,1) cache la main de 0 et montre celle de 1', () => {
  const s = makeState();
  const view = playerView(s, 1);

  expect(view.players[1].hand).toEqual(s.players[1].hand);
  expect((view.players[0] as { hand?: unknown }).hand).toBeUndefined();
  expect(view.players[0].handCount).toBe(s.players[0].hand.length);
});

test('deckCount correct, contenu de la pioche non exposé', () => {
  const s = makeState();
  const view = playerView(s, 0);

  expect(view.deckCount).toBe(s.deck.length);
  expect((view as { deck?: unknown }).deck).toBeUndefined();
});

test('bonusReserveCount correct, contenu de la réserve non exposé', () => {
  const s = makeState();
  const view = playerView(s, 0);

  expect(view.bonusReserveCount).toBe(s.bonusReserve.length);
  expect((view as { bonusReserve?: unknown }).bonusReserve).toBeUndefined();
});

test('état public fidèle : planètes, jetons de plateau, défausses, diplomatie, current, winner', () => {
  const s = makeState();
  const view = playerView(s, 0);

  expect(view.planets).toEqual(s.planets);
  expect(view.techBonus).toEqual(s.techBonus);
  expect(view.bonusDiscard).toEqual(s.bonusDiscard);
  expect(view.discard).toEqual(s.discard);
  expect(view.diplomacy).toEqual(s.diplomacy);
  expect(view.current).toBe(s.current);
  expect(view.winner).toBe(s.winner);
});

test('les stats publiques par joueur sont fidèles pour les deux joueurs', () => {
  const s = makeState();
  const view = playerView(s, 0);

  for (const i of [0, 1] as const) {
    expect(view.players[i].columns).toEqual(s.players[i].columns);
    expect(view.players[i].credits).toBe(s.players[i].credits);
    expect(view.players[i].zenithium).toBe(s.players[i].zenithium);
    expect(view.players[i].techMarkers).toEqual(s.players[i].techMarkers);
    expect(view.players[i].lineBonusClaimed).toEqual(s.players[i].lineBonusClaimed);
  }
});

test('pending est exposé avec le joueur à qui revient la décision', () => {
  const s = makeState();
  // Simule une décision en attente pour le joueur 1.
  const withPending: GameState = {
    ...s,
    pending: { kind: 'moveDiscToCenter' },
    resolution: { queue: [], ctx: { player: 1, planet: 'mercure' } },
  };
  const view = playerView(withPending, 0);

  expect(view.pending).toEqual({ kind: 'moveDiscToCenter' });
  expect(view.pendingPlayer).toBe(1);
});

test('pendingPlayer est null quand il n\'y a pas de décision en attente', () => {
  const s = makeState();
  const view = playerView(s, 0);

  expect(s.pending).toBeNull();
  expect(view.pending).toBeNull();
  expect(view.pendingPlayer).toBeNull();
});

test('la vue n\'expose jamais rng ni resolution brut', () => {
  const s = makeState();
  const view = playerView(s, 0);

  expect((view as { rng?: unknown }).rng).toBeUndefined();
  expect((view as { resolution?: unknown }).resolution).toBeUndefined();
});

test('pureté : state est inchangé après appel (snapshot JSON)', () => {
  const s = makeState();
  const before = JSON.stringify(s);
  playerView(s, 0);
  playerView(s, 1);
  const after = JSON.stringify(s);

  expect(after).toBe(before);
});

test('playerView renvoie un nouvel objet racine (pas state lui-même)', () => {
  const s = makeState();
  const view = playerView(s, 0);

  expect(view).not.toBe(s);
  expect(view.players).not.toBe(s.players);
});

import { selfPlay, type SelfPlayResult } from '../sim';
import { winnerOf } from '../influence';

const CONFIG = { techSetup: { animod: 'S', humain: 'U', robot: 'N' }, firstPlayer: 0 } as const;
const SEEDS = Array.from({ length: 50 }, (_, i) => i + 1);

test('aucune partie ne lève d’exception et toutes terminent dans le plafond', () => {
  for (const seed of SEEDS) {
    const res = selfPlay(CONFIG, seed, seed * 7 + 1, 1000);
    expect(res.moves).toBeLessThanOrEqual(1000);
    // cohérence de l'issue déclarée avec l'état final
    if (res.outcome === 'winner') {
      expect(res.winner).not.toBeNull();
      expect(winnerOf(res.state)).toBe(res.winner);
    } else {
      expect(res.winner).toBeNull();
    }
  }
});

// Avec le VRAI deck (90 cartes), les parties progressent : les mains se rechargent et
// les captures de planètes finissent par produire des vainqueurs — contrairement au deck
// fixture (10 cartes) qui bloquait en `stuck` après ~8-10 coups. On vérifie ici que le
// self-play traverse les effets interactifs sans crash ET qu'au moins une graine mène à
// une victoire (le blocage systématique `stuck` du fixture est levé).
test('sur le vrai deck, au moins une graine mène à une victoire (blocage stuck levé)', () => {
  const outcomes: Record<SelfPlayResult['outcome'], number> = { winner: 0, stuck: 0, maxSteps: 0 };
  for (const seed of SEEDS) {
    const res = selfPlay(CONFIG, seed, seed * 3 + 2, 1000);
    expect(['winner', 'stuck', 'maxSteps']).toContain(res.outcome);
    outcomes[res.outcome]++;
  }
  expect(outcomes.winner + outcomes.stuck + outcomes.maxSteps).toBe(SEEDS.length);
  expect(outcomes.winner).toBeGreaterThan(0); // au moins une victoire sur 50 graines
});

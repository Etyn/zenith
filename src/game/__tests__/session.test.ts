import { pickMove, type PlayerIndex } from '../../engine';
import { makeRng, type RngState } from '../../engine';
import { DEFAULT_CONFIG } from '../config';
import {
  BOT,
  HUMAN,
  humanMove,
  initSession,
  replay,
  snapshot,
  stepBot,
  type SessionState,
} from '../session';

describe('session layer', () => {
  test('init : humain (joueur 0) commence → phase human, décision nulle, actions présentes', () => {
    const s = initSession(DEFAULT_CONFIG, 1, 2);
    const snap = snapshot(s);
    expect(snap.view.viewer).toBe(HUMAN);
    expect(snap.phase).toBe('human');
    expect(snap.decision).toBeNull();
    expect(snap.actions.leadership.length).toBeGreaterThan(0);
  });

  test('la vue ne divulgue jamais la main adverse', () => {
    const s = initSession(DEFAULT_CONFIG, 3, 4);
    const opp = snapshot(s).view.players[1];
    expect(opp.hand).toBeUndefined();
    expect(typeof opp.handCount).toBe('number');
  });

  test('un recruit du 1er coup place la carte dans une colonne du joueur', () => {
    const s = initSession(DEFAULT_CONFIG, 5, 6);
    const before = snapshot(s);
    const recruit = before.actions.recruit[0];
    expect(recruit).toBeDefined();
    const after = snapshot(humanMove(s, recruit!.move));
    const cols = after.view.players[0].columns;
    const total = Object.values(cols).reduce((n, c) => n + c.length, 0);
    expect(total).toBe(1);
  });

  test('stepBot ne fait rien quand c’est au joueur humain (même référence)', () => {
    const s = initSession(DEFAULT_CONFIG, 7, 8);
    expect(stepBot(s)).toBe(s);
  });

  test('si le bot commence (firstPlayer=1), stepBot le fait avancer vers le tour humain', () => {
    const s = initSession({ ...DEFAULT_CONFIG, firstPlayer: 1 }, 9, 10);
    expect(snapshot(s).phase).toBe('bot');
    let cur = s;
    for (let i = 0; i < 200 && snapshot(cur).phase === 'bot'; i++) cur = stepBot(cur);
    expect(['human', 'over']).toContain(snapshot(cur).phase);
  });

  test('replay inverse le premier joueur', () => {
    const s = initSession(DEFAULT_CONFIG, 11, 12);
    expect(replay(s).config.firstPlayer).toBe(1);
  });

  test('partie complète pilotée (humain aléatoire + bot) : se termine sans exception', () => {
    let s: SessionState = initSession(DEFAULT_CONFIG, 42, 99);
    let rng: RngState = makeRng(1234);
    for (let step = 0; step < 3000; step++) {
      const snap = snapshot(s);
      if (snap.outcome !== 'playing') break;
      if (snap.phase === 'bot') {
        s = stepBot(s);
        continue;
      }
      // phase humaine : on choisit un coup légal via le bot moteur sur le joueur 0
      const [move, next] = pickMove(s.game, HUMAN as PlayerIndex, rng);
      rng = next;
      if (move === null) break;
      s = humanMove(s, move);
    }
    const final = snapshot(s);
    expect(['winner', 'stuck']).toContain(final.outcome);
    expect(final.phase === 'over' || final.outcome === 'stuck').toBe(true);
    expect(BOT).toBe(1);
  });
});

# Harnais d'auto-jeu (bot de test) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Étapes en checkbox (`- [ ]`).

**Goal:** Valider le moteur de bout en bout en faisant jouer des parties complètes bot-contre-bot, sans jamais inventer de contenu de jeu (le bot ne choisit que parmi les coups légaux produits par `legalMoves`).

**Architecture:** Deux fonctions pures nouvelles — `pickMove` (bot aléatoire-légal, `src/engine/bot.ts`) et `selfPlay` (boucle de partie, `src/engine/sim.ts`). Le bot tire sa décision d'un **RngState séparé** de `state.rng` (le RNG de la partie), afin de ne pas perturber le déterminisme du moteur. Un test « propriété » fait tourner de nombreuses graines et vérifie les invariants (pas d'exception, terminaison bornée, cohérence des tours, atteignabilité de la victoire).

**Tech Stack:** TypeScript strict, jest + ts-jest.

## Global Constraints

- **Moteur pur** : aucun import react/react-native/expo/expo-*/net dans `src/engine`/`src/data` (garanti par `purity.test.ts`, qui scanne ces dossiers — `bot.ts`/`sim.ts` y seront donc soumis).
- **Immuabilité** : `pickMove`/`selfPlay` ne mutent jamais l'état reçu ; ils réutilisent `applyMove` (déjà immuable).
- **Déterminisme** : le bot n'utilise QUE le `RngState` qu'on lui passe (via `nextInt` de `./rng`), jamais `Math.random`. Mêmes graines → même partie.
- **Aucun contenu inventé** : le bot ne fabrique pas de coups ; il choisit parmi `legalMoves(state, player)`. Sur les fixtures non-canoniques existantes.
- **Ne rien casser** : les 58 tests existants restent verts.

## File Structure

- `src/engine/bot.ts` — `pickMove(state, player, rng): [Move | null, RngState]`.
- `src/engine/sim.ts` — `activePlayer`, `selfPlay(config, gameSeed, botSeed, maxSteps?): SelfPlayResult`.
- `src/engine/index.ts` — réexporter `./bot` et `./sim`.
- Tests : `src/engine/__tests__/bot.test.ts`, `src/engine/__tests__/sim.test.ts`.

---

### Task 1: Bot aléatoire-légal `pickMove`

**Files:**
- Create: `src/engine/bot.ts`
- Modify: `src/engine/index.ts` (réexport)
- Test: `src/engine/__tests__/bot.test.ts`

**Interfaces:**
- Produces: `pickMove(state: GameState, player: PlayerIndex, rng: RngState): [Move | null, RngState]` — renvoie un coup tiré uniformément parmi `legalMoves(state, player)` (et le RNG avancé), ou `[null, rng]` si aucun coup légal.
- Consumes: `legalMoves` (`./moves`), `nextInt` (`./rng`).

- [ ] **Step 1: Écrire le test** — `src/engine/__tests__/bot.test.ts`

```ts
import { pickMove } from '../bot';
import { legalMoves } from '../moves';
import { createGame } from '../setup';
import { makeRng } from '../rng';

const CONFIG = { techSetup: { animod: 'S', humain: 'U', robot: 'N' }, firstPlayer: 0 } as const;

test('pickMove renvoie un coup appartenant à legalMoves', () => {
  const s = createGame(CONFIG, 1);
  const [move] = pickMove(s, s.current, makeRng(42));
  const legal = legalMoves(s, s.current);
  expect(move).not.toBeNull();
  expect(legal).toContainEqual(move);
});

test('pickMove est déterministe pour une même graine et avance le RNG', () => {
  const s = createGame(CONFIG, 1);
  const [m1, r1] = pickMove(s, s.current, makeRng(7));
  const [m2] = pickMove(s, s.current, makeRng(7));
  expect(m1).toEqual(m2);
  expect(r1.counter).toBeGreaterThan(0);
});

test('pickMove renvoie null quand aucun coup légal (pas le tour du joueur)', () => {
  const s = createGame(CONFIG, 1);
  const other = (s.current === 0 ? 1 : 0) as 0 | 1;
  const [move] = pickMove(s, other, makeRng(1));
  expect(move).toBeNull();
});
```

- [ ] **Step 2: Lancer → échec**

Run: `npx jest bot`
Expected: FAIL (`../bot` inexistant).

- [ ] **Step 3: Implémenter** — `src/engine/bot.ts`

```ts
import { legalMoves, type Move } from './moves';
import { nextInt, type RngState } from './rng';
import type { GameState, PlayerIndex } from './types';

/** Bot de test : choisit uniformément un coup légal pour `player`. RNG séparé de state.rng. */
export function pickMove(
  state: GameState,
  player: PlayerIndex,
  rng: RngState,
): [Move | null, RngState] {
  const moves = legalMoves(state, player);
  if (moves.length === 0) return [null, rng];
  const [i, next] = nextInt(rng, moves.length);
  return [moves[i]!, next];
}
```

- [ ] **Step 4: Réexport** — `src/engine/index.ts`

Ajouter : `export * from './bot';`

- [ ] **Step 5: Relancer → vert, puis suite complète**

Run: `npx jest bot` → PASS ; puis `npx jest && npm run typecheck` → PASS.

- [ ] **Step 6: Commit**

```bash
git add src/engine/bot.ts src/engine/index.ts src/engine/__tests__/bot.test.ts
git commit -m "feat(engine): bot de test pickMove (choix uniforme parmi les coups légaux)"
```

---

### Task 2: Harnais de partie `selfPlay`

**Files:**
- Create: `src/engine/sim.ts`
- Modify: `src/engine/index.ts` (réexport)
- Test: `src/engine/__tests__/sim.test.ts`

**Interfaces:**
- Consumes: `pickMove` (`./bot`), `createGame` (`./setup`), `applyMove` (`./moves`), `makeRng` (`./rng`).
- Produces:
  - `activePlayer(state: GameState): PlayerIndex | null` — le joueur qui doit agir : celui de la décision en attente si `pending`, sinon `current` ; `null` si `winner`.
  - `type SelfPlayResult = { state: GameState; winner: PlayerIndex | null; outcome: 'winner' | 'stuck' | 'maxSteps'; moves: number }`.
  - `selfPlay(config: GameConfig, gameSeed: number, botSeed: number, maxSteps?: number): SelfPlayResult`.

- [ ] **Step 1: Écrire le test** — `src/engine/__tests__/sim.test.ts`

```ts
import { selfPlay, activePlayer } from '../sim';
import { createGame } from '../setup';
import { winnerOf } from '../influence';

const CONFIG = { techSetup: { animod: 'S', humain: 'U', robot: 'N' }, firstPlayer: 0 } as const;

test('selfPlay termine sans exception et rend un résultat cohérent', () => {
  const res = selfPlay(CONFIG, 1, 42, 500);
  expect(['winner', 'stuck', 'maxSteps']).toContain(res.outcome);
  expect(res.moves).toBeGreaterThan(0);
  if (res.outcome === 'winner') expect(res.winner).not.toBeNull();
  else expect(res.winner).toBeNull();
});

test('selfPlay est déterministe (mêmes graines → même partie)', () => {
  const a = selfPlay(CONFIG, 3, 9, 500);
  const b = selfPlay(CONFIG, 3, 9, 500);
  expect(a.outcome).toBe(b.outcome);
  expect(a.moves).toBe(b.moves);
  expect(a.winner).toBe(b.winner);
});

test('selfPlay ne mute pas l’état initial de createGame', () => {
  const initial = createGame(CONFIG, 5);
  const snapshot = JSON.stringify(initial);
  selfPlay(CONFIG, 5, 11, 200);
  expect(JSON.stringify(createGame(CONFIG, 5))).toBe(snapshot);
});

test('activePlayer renvoie current hors décision et null à la victoire', () => {
  const s = createGame(CONFIG, 1);
  expect(activePlayer(s)).toBe(s.current);
  expect(activePlayer({ ...s, winner: 0 })).toBeNull();
});
```

- [ ] **Step 2: Lancer → échec**

Run: `npx jest sim`
Expected: FAIL (`../sim` inexistant).

- [ ] **Step 3: Implémenter** — `src/engine/sim.ts`

```ts
import { pickMove } from './bot';
import { createGame } from './setup';
import { applyMove } from './moves';
import { makeRng, type RngState } from './rng';
import type { GameConfig, GameState, PlayerIndex } from './types';

export function activePlayer(state: GameState): PlayerIndex | null {
  if (state.winner !== null) return null;
  if (state.pending !== null) return state.resolution ? state.resolution.ctx.player : null;
  return state.current;
}

export type SelfPlayResult = {
  state: GameState;
  winner: PlayerIndex | null;
  outcome: 'winner' | 'stuck' | 'maxSteps';
  moves: number;
};

/** Fait jouer deux bots aléatoires-légaux jusqu'à victoire, blocage ou plafond de coups. */
export function selfPlay(
  config: GameConfig,
  gameSeed: number,
  botSeed: number,
  maxSteps = 1000,
): SelfPlayResult {
  let state = createGame(config, gameSeed);
  let rng: RngState = makeRng(botSeed);
  let moves = 0;
  let outcome: SelfPlayResult['outcome'] = 'maxSteps';

  for (let step = 0; step < maxSteps; step++) {
    if (state.winner !== null) {
      outcome = 'winner';
      break;
    }
    const p = activePlayer(state);
    if (p === null) {
      outcome = 'winner'; // winner !== null déjà traité ; défensif
      break;
    }
    const [move, nextRng] = pickMove(state, p, rng);
    rng = nextRng;
    if (move === null) {
      outcome = 'stuck';
      break;
    }
    state = applyMove(state, move);
    moves++;
  }
  return { state, winner: state.winner, outcome, moves };
}
```

- [ ] **Step 4: Réexport** — `src/engine/index.ts`

Ajouter : `export * from './sim';`

- [ ] **Step 5: Relancer → vert, puis suite complète**

Run: `npx jest sim` → PASS ; puis `npx jest && npm run typecheck` → PASS.

- [ ] **Step 6: Commit**

```bash
git add src/engine/sim.ts src/engine/index.ts src/engine/__tests__/sim.test.ts
git commit -m "feat(engine): harnais d'auto-jeu selfPlay (bot vs bot, déterministe)"
```

---

### Task 3: Test « propriété » multi-graines (invariants du moteur)

Fait tourner beaucoup de parties pour surfacer crashs/boucles/incohérences que les tests unitaires ne voient pas.

**Files:**
- Test: `src/engine/__tests__/sim-properties.test.ts`

**Interfaces:**
- Consumes: `selfPlay` (`./sim`), `winnerOf` (`./influence`).

- [ ] **Step 1: Écrire le test** — `src/engine/__tests__/sim-properties.test.ts`

```ts
import { selfPlay } from '../sim';
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

test('le moteur peut effectivement mener une partie à la victoire (au moins une graine)', () => {
  const anyWinner = SEEDS.some((seed) => selfPlay(CONFIG, seed, seed * 3 + 2, 1000).outcome === 'winner');
  expect(anyWinner).toBe(true);
});
```

> Note d'implémentation : si le second test échoue (aucune victoire atteinte sur 50 graines avec le deck fixture — deck trop petit pour accumuler assez de captures), NE PAS relâcher l'assertion en douce. Consigner l'observation dans le rapport (« la victoire n'est pas atteignable avec le deck fixture non-canonique ; à revérifier avec le vrai contenu ») et remplacer ce test par une assertion plus faible clairement documentée (`outcome ∈ {stuck, maxSteps, winner}` pour toutes) — puis le signaler comme préoccupation.

- [ ] **Step 2: Lancer**

Run: `npx jest sim-properties`
Expected: PASS (ou voir la note ci-dessus).

- [ ] **Step 3: Suite complète + typecheck**

Run: `npx jest && npm run typecheck` → PASS.

- [ ] **Step 4: Commit**

```bash
git add src/engine/__tests__/sim-properties.test.ts
git commit -m "test(engine): propriétés multi-graines de l'auto-jeu (invariants)"
```

---

## Hors périmètre

- **playerView** (état caviardé pour mains cachées) : utile pour l'UI/réseau, sans consommateur ici → phase UI.
- **Bot « intelligent »** : non souhaité (le user a validé un bot faible de test uniquement).
- **Contenu réel** (technos/cartes/jetons) : bloqué sur Q1–Q6.

## Self-Review

- **Couverture** : bot (T1) ; harnais (T2) ; invariants multi-graines (T3). Chaque tâche a un livrable testable indépendant.
- **Placeholders** : aucun ; code complet.
- **Cohérence des types** : `pickMove` renvoie `[Move | null, RngState]` (consommé par `selfPlay`) ; `activePlayer`/`SelfPlayResult`/`selfPlay` cohérents ; `Move`/`GameState`/`PlayerIndex`/`GameConfig`/`RngState` importés de leurs modules réels. `legalMoves(state, player)` et `applyMove(state, move)` correspondent aux signatures existantes.
- **Risque connu** : le deck fixture est petit ; la victoire pourrait n'être pas atteignable → géré explicitement par la note du test T3 (documenter, pas relâcher en silence).

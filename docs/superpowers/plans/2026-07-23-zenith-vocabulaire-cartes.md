# Vocabulaire d'effets des cartes agent — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Doter le moteur Zenith du vocabulaire d'effets des cartes agent — combinateurs interactifs (`optional`, `conditional`, `choice`, `scale`) et ~20 atomes manquants — tel que défini par le lexique officiel, sans transcrire les 90 cartes.

**Architecture:** On ÉTEND le modèle de résolution interactive existant (`resolution.queue: Effect[]` dépilée par `resolve`, atomes différés posant un `pending`, repris par `decide`). On ajoute (a) trois familles de décisions non-planète (`confirmOptional` / `chooseOption` / `chooseTier`) reprises par de nouveaux `Move` (`{t:'choose',index}` / `{t:'skip'}`), (b) deux nouvelles décisions typées (`chooseTech` via `{t:'decideTech',people}`, `chooseHandCard` via `{t:'decideCard',cardId}`, plus `chooseBoardToken` réutilisant `{t:'choose',index}`), (c) les combinateurs comme `Effect` qui, en tête de file, posent la décision puis insèrent leurs sous-effets, (d) les atomes soit purs (dans `applyEffect`) soit interactifs (interceptés dans `resolve`, `throw` dans `applyEffect` pour préserver l'exhaustivité du `switch`). La logique « Développer » est extraite de `moves.ts` vers `engine/develop.ts` (DRY) et réutilisée par `developDiscounted`/`developLowest`.

**Tech Stack:** TypeScript pur, Jest (`ts-jest`), Node. Aucune dépendance runtime.

## Global Constraints

- **Moteur pur** : aucun import `react` / `react-native` / `expo` / réseau / I/O. (test `purity.test.ts` existant garde cet invariant.)
- **Immuabilité stricte** : toute fonction retourne un nouvel état ; jamais de mutation de l'entrée (spread systématique, comme l'existant).
- **Déterminisme** : tout aléa passe par `state.rng` (`shuffle`/`makeRng` de `./rng`). Aucun `Math.random`.
- **TDD obligatoire** : test qui échoue → impl minimale → test qui passe → commit. Code COMPLET à chaque étape.
- **Ne rien casser** : les **108 tests** existants (13 suites) doivent rester verts ; les flux interactifs en place (`choosePlanet`/`chooseSegment`/`chooseColumn`, `decide`) restent intacts.
- **Sémantique STRICTEMENT conforme au lexique officiel** (`docs/content/lexique-icones.md`). AUCUN effet inventé. Toute ambiguïté est signalée (section « Questions ouvertes »), jamais devinée.
- **Ne pas recréer** les atomes existants : `influence` (choice), `influenceEach`, `influenceNeighbors`, `influenceDifferent`, `credits`, `zenithium`, `steal`, `mobilize`, `takeLeader`, `transfer`, `exile`, `exileForInfluence`, `bonusToken`.
- Commandes : tests ciblés `npx jest <fichier> -t "<nom>"` ; suite complète `npx jest` ; types `npm run typecheck`.
- **Exhaustivité du `switch (effect.k)` dans `applyEffect`** : chaque nouvel `Effect` DOIT recevoir, dans la MÊME tâche, soit un `case` réel (atome pur), soit un `case` qui `throw` (atome intercepté par `resolve`), sinon `tsc` échoue (« not all code paths return a value »).

---

## File Structure

- **`src/engine/types.ts`** (Modify) — union `Effect` (nouveaux combinateurs + atomes), `Condition` (nouveau), `EffectCtx` (+ `people?`), `PendingDecision` (nouvelles variantes + champs sur `choosePlanet`/`chooseColumn`), `BoardTokenSlot` (nouveau).
- **`src/engine/effects.ts`** (Modify) — `resolve` (interception des nouveaux atomes/combinateurs), `applyEffect` (atomes purs + `throw` pour les différés), nouvelles fonctions de reprise `chooseBranch`, `skipBranch`, `decideTech`, `decideCard`, helper `evalCondition`.
- **`src/engine/develop.ts`** (Create) — `developTech(state, player, people, costOverride?)` extrait de `moves.ts` (logique cumulée + jeton niveau 2 + primes de ligne), réutilisé par le move `develop` ET par `developDiscounted`/`developLowest`.
- **`src/engine/moves.ts`** (Modify) — union `Move` (`choose`/`skip`/`decideTech`/`decideCard`), `legalMoves` (options légales par `pending.kind`), `applyMove` (routage des nouveaux moves), branche `develop` réécrite pour appeler `developTech`.
- **`src/engine/__tests__/effects-combinators.test.ts`** (Create) — combinateurs `optional`/`conditional`/`choice`/`scale`.
- **`src/engine/__tests__/effects-atoms.test.ts`** (Create) — nouveaux atomes (ressources, influence, cartes, adversaire).
- **`src/engine/__tests__/develop.test.ts`** (Create) — `developTech` + `developDiscounted`/`developLowest`.

Les données (fixtures, cartes) NE sont PAS modifiées : ce plan livre le VOCABULAIRE, pas la transcription des cartes.

---

## Task 1: Infra décisions non-planète + combinateur `optional`

**Files:**
- Modify: `src/engine/types.ts` (union `Effect`, `PendingDecision`)
- Modify: `src/engine/effects.ts` (`resolve`, `applyEffect`, + `chooseBranch`, `skipBranch`)
- Modify: `src/engine/moves.ts` (union `Move`, `legalMoves`, `applyMove`)
- Test: `src/engine/__tests__/effects-combinators.test.ts` (Create)

**Interfaces:**
- Produces:
  - `Effect` variant `{ k: 'optional'; effects: Effect[] }`
  - `PendingDecision` variant `{ kind: 'confirmOptional' }`
  - `Move` variants `{ t: 'choose'; index: number }` et `{ t: 'skip' }`
  - `chooseBranch(state: GameState, index: number): GameState` — reprend une décision `confirmOptional`/`chooseOption`/`chooseTier`/`chooseBoardToken` (T1 : `confirmOptional` seulement ; étendue par les tâches suivantes).
  - `skipBranch(state: GameState): GameState` — renonce à une décision facultative (`confirmOptional` ; étendue `chooseTier` en T4).

- [ ] **Step 1: Écrire le test qui échoue**

```typescript
// src/engine/__tests__/effects-combinators.test.ts
import { createGame } from '../setup';
import { resolve, chooseBranch, skipBranch } from '../effects';
import type { EffectCtx, GameState } from '../types';

const CONFIG = { techSetup: { animod: 'S', humain: 'U', robot: 'N' }, firstPlayer: 0 } as const;
const CTX: EffectCtx = { player: 0, planet: 'mars' };

test("optional pose un confirmOptional ; accepter applique les sous-effets", () => {
  const base = createGame(CONFIG, 1);
  const s: GameState = {
    ...base,
    resolution: { queue: [{ k: 'optional', effects: [{ k: 'credits', amount: 3, target: 'self' }] }], ctx: CTX },
  };
  const paused = resolve(s);
  expect(paused.pending).toEqual({ kind: 'confirmOptional' });
  expect(paused.resolution).not.toBeNull();

  const done = chooseBranch(paused, 0);
  expect(done.pending).toBeNull();
  expect(done.resolution).toBeNull();
  expect(done.players[0].credits).toBe(base.players[0].credits + 3);
});

test("optional : renoncer (skip) n'applique rien et vide la file", () => {
  const base = createGame(CONFIG, 1);
  const s: GameState = {
    ...base,
    resolution: { queue: [{ k: 'optional', effects: [{ k: 'credits', amount: 3, target: 'self' }] }], ctx: CTX },
  };
  const paused = resolve(s);
  const done = skipBranch(paused);
  expect(done.pending).toBeNull();
  expect(done.resolution).toBeNull();
  expect(done.players[0].credits).toBe(base.players[0].credits);
});
```

- [ ] **Step 2: Lancer le test pour vérifier l'échec**

Run: `npx jest effects-combinators -t "optional"`
Expected: FAIL (`chooseBranch`/`skipBranch` non exportés ; `optional` non géré).

- [ ] **Step 3: Étendre les types**

Dans `src/engine/types.ts`, ajouter à l'union `Effect` (avant `| { k: 'bonusToken' }`) :

```typescript
  | { k: 'optional'; effects: Effect[] }
```

Ajouter à l'union `PendingDecision` :

```typescript
  | { kind: 'confirmOptional' }
```

- [ ] **Step 4: Interception dans `resolve` + `throw` dans `applyEffect`**

Dans `src/engine/effects.ts`, `applyEffect`, ajouter un `case` (avec les autres `throw`) :

```typescript
    case 'optional':
      throw new Error("applyEffect: 'optional' passe par resolve/chooseBranch");
```

Dans `resolve`, juste avant la ligne finale `s = applyEffect(s, head, ctx);`, ajouter :

```typescript
    if (head.k === 'optional') {
      s = { ...s, pending: { kind: 'confirmOptional' } };
      break;
    }
```

- [ ] **Step 5: Ajouter `chooseBranch` et `skipBranch`**

Dans `src/engine/effects.ts` (après `decide`) :

```typescript
export function chooseBranch(state: GameState, index: number): GameState {
  if (state.pending === null || state.resolution === null) {
    throw new Error('chooseBranch: aucune décision en attente');
  }
  const ctx = state.resolution.ctx;
  const chosen = state.resolution.chosen;
  const head = state.resolution.queue[0]!;
  const rest = state.resolution.queue.slice(1);
  const pending = state.pending;
  if (pending.kind === 'confirmOptional') {
    if (index !== 0) throw new Error("chooseBranch: seule l'option 0 (accepter) est valide");
    if (head.k !== 'optional') throw new Error('chooseBranch: atome de tête inattendu');
    const s: GameState = { ...state, pending: null, resolution: { queue: [...head.effects, ...rest], ctx, chosen } };
    return resolve(s);
  }
  throw new Error('chooseBranch: décision non compatible');
}

export function skipBranch(state: GameState): GameState {
  if (state.pending === null || state.resolution === null) {
    throw new Error('skipBranch: aucune décision en attente');
  }
  const pending = state.pending;
  if (pending.kind !== 'confirmOptional') {
    throw new Error("skipBranch: cette décision n'est pas facultative");
  }
  const ctx = state.resolution.ctx;
  const chosen = state.resolution.chosen;
  const rest = state.resolution.queue.slice(1);
  const s: GameState = { ...state, pending: null, resolution: { queue: rest, ctx, chosen } };
  return resolve(s);
}
```

- [ ] **Step 6: Câbler `Move`, `legalMoves`, `applyMove`**

Dans `src/engine/moves.ts` : importer les nouvelles fonctions —
`import { cardOf, resolve, decide as decideEffect, chooseBranch, skipBranch } from './effects';`

Étendre l'union `Move` :

```typescript
  | { t: 'choose'; index: number }
  | { t: 'skip' };
```

Dans `applyMove`, en tête (après le `decide` existant) :

```typescript
  if (move.t === 'choose') {
    if (state.pending === null) return state;
    return finishOrPending(chooseBranch(state, move.index));
  }
  if (move.t === 'skip') {
    if (state.pending === null) return state;
    return finishOrPending(skipBranch(state));
  }
```

Dans `legalMoves`, dans le bloc `if (state.pending !== null)`, AVANT le calcul des `candidates` (qui est spécifique aux décisions-planète), ajouter :

```typescript
    if (pending.kind === 'confirmOptional') {
      return [{ t: 'choose', index: 0 }, { t: 'skip' }];
    }
```

- [ ] **Step 7: Lancer le test pour vérifier le succès + non-régression**

Run: `npx jest effects-combinators` puis `npx jest && npm run typecheck`
Expected: PASS (nouveaux tests) ; 108 tests + nouveaux verts ; types OK.

- [ ] **Step 8: Commit**

```bash
git add src/engine/types.ts src/engine/effects.ts src/engine/moves.ts src/engine/__tests__/effects-combinators.test.ts
git commit -m "feat(engine): decisions non-planete + combinateur optional"
```

---

## Task 2: Combinateur `conditional` + type `Condition`

Lexique : « ! + élément » = condition évaluée AU MOMENT de la résolution (après paiement du recrutement). Si la condition est FAUSSE → l'atome est sauté. Si VRAIE → l'action reste **FACULTATIVE** (le joueur peut renoncer) → on pose `confirmOptional`.

**Files:**
- Modify: `src/engine/types.ts` (union `Effect`, nouveau type `Condition`)
- Modify: `src/engine/effects.ts` (`resolve`, `applyEffect`, `chooseBranch`, + `evalCondition`)
- Test: `src/engine/__tests__/effects-combinators.test.ts` (append)

**Interfaces:**
- Consumes: `chooseBranch`/`skipBranch`, `PendingDecision` `confirmOptional` (Task 1).
- Produces:
  - `Condition = { c: 'hasLeaderBadge'; side?: 'silver' | 'gold' } | { c: 'creditsAtLeast'; amount: number }`
  - `Effect` variant `{ k: 'conditional'; cond: Condition; effects: Effect[] }`
  - `evalCondition(state: GameState, cond: Condition, ctx: EffectCtx): boolean` (interne à `effects.ts`)

- [ ] **Step 1: Écrire les tests qui échouent**

```typescript
// append à effects-combinators.test.ts
test("conditional VRAI : pose un confirmOptional (reste facultatif) et accepter applique", () => {
  const base = createGame(CONFIG, 1);
  const s: GameState = {
    ...base,
    diplomacy: { leader: 0, side: 'silver' }, // le joueur 0 possède le badge
    resolution: {
      queue: [{ k: 'conditional', cond: { c: 'hasLeaderBadge' }, effects: [{ k: 'credits', amount: 8, target: 'self' }] }],
      ctx: CTX,
    },
  };
  const paused = resolve(s);
  expect(paused.pending).toEqual({ kind: 'confirmOptional' });
  const done = chooseBranch(paused, 0);
  expect(done.players[0].credits).toBe(base.players[0].credits + 8);
});

test("conditional FAUX : l'atome est sauté (aucun pending), la suite s'applique", () => {
  const base = createGame(CONFIG, 1);
  const s: GameState = {
    ...base,
    diplomacy: { leader: null, side: 'silver' }, // personne n'a le badge
    resolution: {
      queue: [
        { k: 'conditional', cond: { c: 'hasLeaderBadge' }, effects: [{ k: 'credits', amount: 8, target: 'self' }] },
        { k: 'zenithium', amount: 1, target: 'self' },
      ],
      ctx: CTX,
    },
  };
  const out = resolve(s);
  expect(out.pending).toBeNull();
  expect(out.resolution).toBeNull();
  expect(out.players[0].credits).toBe(base.players[0].credits);       // saut : rien de gagné
  expect(out.players[0].zenithium).toBe(base.players[0].zenithium + 1); // la suite s'applique
});

test("conditional VRAI mais le joueur RENONCE (facultatif)", () => {
  const base = createGame(CONFIG, 1);
  const s: GameState = {
    ...base,
    diplomacy: { leader: 0, side: 'silver' },
    resolution: {
      queue: [{ k: 'conditional', cond: { c: 'hasLeaderBadge' }, effects: [{ k: 'credits', amount: 8, target: 'self' }] }],
      ctx: CTX,
    },
  };
  const out = skipBranch(resolve(s));
  expect(out.players[0].credits).toBe(base.players[0].credits);
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx jest effects-combinators -t "conditional"`
Expected: FAIL (`conditional` non géré).

- [ ] **Step 3: Types**

Dans `src/engine/types.ts`, ajouter le type (près de `Effect`) :

```typescript
export type Condition =
  | { c: 'hasLeaderBadge'; side?: 'silver' | 'gold' }
  | { c: 'creditsAtLeast'; amount: number };
```

Ajouter à l'union `Effect` :

```typescript
  | { k: 'conditional'; cond: Condition; effects: Effect[] }
```

- [ ] **Step 4: `evalCondition` + interception + `throw`**

Dans `src/engine/effects.ts`, importer `Condition` dans le `import type { ... }` de `./types`, puis ajouter le helper :

```typescript
function evalCondition(state: GameState, cond: Condition, ctx: EffectCtx): boolean {
  switch (cond.c) {
    case 'hasLeaderBadge': {
      const holdsBadge = state.diplomacy.leader === ctx.player;
      if (!holdsBadge) return false;
      // badge argent OU or : sans `side` précisé, la simple possession suffit.
      return cond.side === undefined || cond.side === 'silver' || state.diplomacy.side === 'gold';
    }
    case 'creditsAtLeast':
      return state.players[ctx.player].credits >= cond.amount;
  }
}
```

Dans `applyEffect`, ajouter :

```typescript
    case 'conditional':
      throw new Error("applyEffect: 'conditional' passe par resolve/chooseBranch");
```

Dans `resolve`, après le bloc `optional` :

```typescript
    if (head.k === 'conditional') {
      if (!evalCondition(s, head.cond, ctx)) {
        s = { ...s, resolution: { queue: s.resolution!.queue.slice(1), ctx, chosen: s.resolution!.chosen } };
        continue; // condition fausse → atome sauté
      }
      s = { ...s, pending: { kind: 'confirmOptional' } };
      break; // condition vraie → reste facultatif
    }
```

- [ ] **Step 5: Étendre `chooseBranch` (accepter aussi une tête `conditional`)**

Dans `chooseBranch`, remplacer le corps du `if (pending.kind === 'confirmOptional')` par :

```typescript
  if (pending.kind === 'confirmOptional') {
    if (index !== 0) throw new Error("chooseBranch: seule l'option 0 (accepter) est valide");
    if (head.k !== 'optional' && head.k !== 'conditional') {
      throw new Error('chooseBranch: atome de tête inattendu');
    }
    const s: GameState = { ...state, pending: null, resolution: { queue: [...head.effects, ...rest], ctx, chosen } };
    return resolve(s);
  }
```

(`skipBranch` fonctionne déjà : `confirmOptional` retire simplement l'atome de tête.)

- [ ] **Step 6: Vérifier le succès + non-régression**

Run: `npx jest effects-combinators && npx jest && npm run typecheck`
Expected: PASS partout.

- [ ] **Step 7: Commit**

```bash
git add src/engine/types.ts src/engine/effects.ts src/engine/__tests__/effects-combinators.test.ts
git commit -m "feat(engine): combinateur conditional + type Condition"
```

---

## Task 3: Combinateur `choice` (choix exclusif « / »)

Lexique : « / » = choix EXCLUSIF (gauche OU droite). Le joueur DOIT choisir une branche (pas de renoncement au niveau du `choice` lui-même ; si l'ensemble est facultatif, il est enveloppé dans un `optional`).

**Files:**
- Modify: `src/engine/types.ts` (union `Effect`, `PendingDecision`)
- Modify: `src/engine/effects.ts` (`resolve`, `applyEffect`, `chooseBranch`)
- Modify: `src/engine/moves.ts` (`legalMoves`)
- Test: `src/engine/__tests__/effects-combinators.test.ts` (append)

**Interfaces:**
- Consumes: `chooseBranch`, `Move` `{t:'choose',index}` (Task 1).
- Produces:
  - `Effect` variant `{ k: 'choice'; options: Effect[][] }`
  - `PendingDecision` variant `{ kind: 'chooseOption'; count: number }`

- [ ] **Step 1: Test qui échoue**

```typescript
// append à effects-combinators.test.ts
test("choice pose un chooseOption ; choisir l'option 1 applique cette branche seule", () => {
  const base = createGame(CONFIG, 1);
  const s: GameState = {
    ...base,
    resolution: {
      queue: [{
        k: 'choice',
        options: [
          [{ k: 'takeLeader', side: 'gold' }],
          [{ k: 'credits', amount: 8, target: 'self' }],
        ],
      }],
      ctx: CTX,
    },
  };
  const paused = resolve(s);
  expect(paused.pending).toEqual({ kind: 'chooseOption', count: 2 });
  const done = chooseBranch(paused, 1); // branche « 8 crédits »
  expect(done.pending).toBeNull();
  expect(done.resolution).toBeNull();
  expect(done.players[0].credits).toBe(base.players[0].credits + 8);
  expect(done.diplomacy.leader).toBeNull(); // l'autre branche n'est PAS appliquée
});

test("choice : un index hors bornes est rejeté", () => {
  const base = createGame(CONFIG, 1);
  const s: GameState = {
    ...base,
    resolution: { queue: [{ k: 'choice', options: [[{ k: 'credits', amount: 1, target: 'self' }]] }], ctx: CTX },
  };
  const paused = resolve(s);
  expect(() => chooseBranch(paused, 5)).toThrow();
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx jest effects-combinators -t "choice"`
Expected: FAIL.

- [ ] **Step 3: Types**

`Effect` (types.ts) :

```typescript
  | { k: 'choice'; options: Effect[][] }
```

`PendingDecision` :

```typescript
  | { kind: 'chooseOption'; count: number }
```

- [ ] **Step 4: `resolve` + `applyEffect`**

`applyEffect` :

```typescript
    case 'choice':
      throw new Error("applyEffect: 'choice' passe par resolve/chooseBranch");
```

`resolve` (après le bloc `conditional`) :

```typescript
    if (head.k === 'choice') {
      s = { ...s, pending: { kind: 'chooseOption', count: head.options.length } };
      break;
    }
```

- [ ] **Step 5: `chooseBranch` — cas `chooseOption`**

Dans `chooseBranch`, avant le `throw` final, ajouter :

```typescript
  if (pending.kind === 'chooseOption') {
    if (head.k !== 'choice') throw new Error('chooseBranch: atome de tête inattendu');
    if (index < 0 || index >= head.options.length) throw new Error('chooseBranch: option hors bornes');
    const s: GameState = { ...state, pending: null, resolution: { queue: [...head.options[index]!, ...rest], ctx, chosen } };
    return resolve(s);
  }
```

- [ ] **Step 6: `legalMoves`**

Dans le bloc `pending`, après le cas `confirmOptional` :

```typescript
    if (pending.kind === 'chooseOption') {
      return Array.from({ length: pending.count }, (_, i) => ({ t: 'choose', index: i }));
    }
```

- [ ] **Step 7: Vérifier + non-régression**

Run: `npx jest effects-combinators && npx jest && npm run typecheck`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/engine/types.ts src/engine/effects.ts src/engine/moves.ts src/engine/__tests__/effects-combinators.test.ts
git commit -m "feat(engine): combinateur choice (choix exclusif)"
```

---

## Task 4: Combinateur `scale` (échelle à paliers)

Lexique : les échelles (`2×/4×/7× ⟋ …`, `3×/7×/12× crédits ⟋ …`) = le joueur choisit UN palier → applique `cost` puis `reward`, OU **renonce** (l'action reste facultative).

> Note (Questions ouvertes) : le gating d'accessibilité d'un palier (« ai-je de quoi payer le `cost` ? ») n'est PAS filtré ici — tous les paliers sont proposés, `cost`/`reward` s'appliquent en séquence (les atomes de coût, ex. `giveOpponent`, sont bornés à la réserve). À affiner si le lexique l'exige.

**Files:**
- Modify: `src/engine/types.ts` (union `Effect`, `PendingDecision`)
- Modify: `src/engine/effects.ts` (`resolve`, `applyEffect`, `chooseBranch`, `skipBranch`)
- Modify: `src/engine/moves.ts` (`legalMoves`)
- Test: `src/engine/__tests__/effects-combinators.test.ts` (append)

**Interfaces:**
- Consumes: `chooseBranch`/`skipBranch`, `Move` `{t:'choose',index}`/`{t:'skip'}`.
- Produces:
  - `Effect` variant `{ k: 'scale'; tiers: { cost: Effect[]; reward: Effect[] }[] }`
  - `PendingDecision` variant `{ kind: 'chooseTier'; count: number }`

- [ ] **Step 1: Test qui échoue**

```typescript
// append à effects-combinators.test.ts
test("scale : choisir un palier applique cost puis reward ; renoncer n'applique rien", () => {
  const base = createGame(CONFIG, 1);
  const scale = {
    k: 'scale' as const,
    tiers: [
      { cost: [{ k: 'credits' as const, amount: -3, target: 'self' as const }], reward: [{ k: 'zenithium' as const, amount: 1, target: 'self' as const }] },
      { cost: [{ k: 'credits' as const, amount: -7, target: 'self' as const }], reward: [{ k: 'zenithium' as const, amount: 2, target: 'self' as const }] },
    ],
  };
  const s: GameState = { ...base, resolution: { queue: [scale], ctx: CTX } };
  const paused = resolve(s);
  expect(paused.pending).toEqual({ kind: 'chooseTier', count: 2 });

  const done = chooseBranch(paused, 1); // palier 2 : -7 crédits → +2 zénithium
  expect(done.players[0].credits).toBe(base.players[0].credits - 7);
  expect(done.players[0].zenithium).toBe(base.players[0].zenithium + 2);

  const renounced = skipBranch(resolve({ ...base, resolution: { queue: [scale], ctx: CTX } }));
  expect(renounced.players[0].credits).toBe(base.players[0].credits);
  expect(renounced.players[0].zenithium).toBe(base.players[0].zenithium);
});
```

> `credits amount: -3` est utilisé ici comme coût-crédits de test (l'atome `credits` accepte un montant négatif). Les vrais coûts de cartes utiliseront les atomes dédiés (`giveOpponent`, etc.).

- [ ] **Step 2: Vérifier l'échec**

Run: `npx jest effects-combinators -t "scale"`
Expected: FAIL.

- [ ] **Step 3: Types**

`Effect` :

```typescript
  | { k: 'scale'; tiers: { cost: Effect[]; reward: Effect[] }[] }
```

`PendingDecision` :

```typescript
  | { kind: 'chooseTier'; count: number }
```

- [ ] **Step 4: `resolve` + `applyEffect`**

`applyEffect` :

```typescript
    case 'scale':
      throw new Error("applyEffect: 'scale' passe par resolve/chooseBranch");
```

`resolve` (après le bloc `choice`) :

```typescript
    if (head.k === 'scale') {
      s = { ...s, pending: { kind: 'chooseTier', count: head.tiers.length } };
      break;
    }
```

- [ ] **Step 5: `chooseBranch` (cas `chooseTier`) + `skipBranch`**

Dans `chooseBranch`, avant le `throw` final :

```typescript
  if (pending.kind === 'chooseTier') {
    if (head.k !== 'scale') throw new Error('chooseBranch: atome de tête inattendu');
    if (index < 0 || index >= head.tiers.length) throw new Error('chooseBranch: palier hors bornes');
    const tier = head.tiers[index]!;
    const s: GameState = { ...state, pending: null, resolution: { queue: [...tier.cost, ...tier.reward, ...rest], ctx, chosen } };
    return resolve(s);
  }
```

Dans `skipBranch`, élargir le garde :

```typescript
  if (pending.kind !== 'confirmOptional' && pending.kind !== 'chooseTier') {
    throw new Error("skipBranch: cette décision n'est pas facultative");
  }
```

- [ ] **Step 6: `legalMoves`**

Après le cas `chooseOption` :

```typescript
    if (pending.kind === 'chooseTier') {
      return [...Array.from({ length: pending.count }, (_, i) => ({ t: 'choose' as const, index: i })), { t: 'skip' as const }];
    }
```

- [ ] **Step 7: Vérifier + non-régression**

Run: `npx jest effects-combinators && npx jest && npm run typecheck`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/engine/types.ts src/engine/effects.ts src/engine/moves.ts src/engine/__tests__/effects-combinators.test.ts
git commit -m "feat(engine): combinateur scale (echelle a paliers)"
```

---

## Task 5: Atomes ressources — `creditsPerCardColors`, `creditsPerTechLevels`

Lexique (p.2) :
- `2 × [couleurs]` = 2 crédits par couleur de carte DIFFÉRENTE dans une zone (`zone: self|opponent`) ; une couleur est « présente » si sa colonne est non vide (5 planètes = 5 couleurs). Le bénéficiaire est TOUJOURS le joueur actif.
- `1×/2×/3× ⟋ 4×/8×/12× [techno niv.1]` = 4/8/12 crédits selon le nombre de technos de niveau ≥ 1 (0 techno → 0). `tiers = [4, 8, 12]`.

> Le champ « zone » est nommé `zone` (et non `target`) pour NE PAS déclencher la logique générique `'target' in effect` de `applyEffect` : le bénéficiaire reste le joueur actif.

**Files:**
- Modify: `src/engine/types.ts` (union `Effect`)
- Modify: `src/engine/effects.ts` (`applyEffect`)
- Test: `src/engine/__tests__/effects-atoms.test.ts` (Create)

**Interfaces:**
- Produces:
  - `{ k: 'creditsPerCardColors'; zone: Side; per: number }`
  - `{ k: 'creditsPerTechLevels'; tiers: number[] }`

- [ ] **Step 1: Test qui échoue**

```typescript
// src/engine/__tests__/effects-atoms.test.ts
import { createGame } from '../setup';
import { applyEffect } from '../effects';
import type { EffectCtx, GameState, Planet } from '../types';

const CONFIG = { techSetup: { animod: 'S', humain: 'U', robot: 'N' }, firstPlayer: 0 } as const;
const CTX: EffectCtx = { player: 0, planet: 'mars' };

function withColumns(base: GameState, index: 0 | 1, cols: Partial<Record<Planet, string[]>>): GameState {
  const players: [GameState['players'][0], GameState['players'][1]] = [base.players[0], base.players[1]];
  players[index] = { ...players[index], columns: { ...players[index].columns, ...cols } };
  return { ...base, players };
}

test("creditsPerCardColors self : 2 crédits par couleur présente dans SA zone", () => {
  const base = createGame(CONFIG, 1);
  const seeded = withColumns(base, 0, { terra: ['a'], mars: ['b'], venus: ['c'] }); // 3 couleurs
  const out = applyEffect(seeded, { k: 'creditsPerCardColors', zone: 'self', per: 2 }, CTX);
  expect(out.players[0].credits).toBe(seeded.players[0].credits + 6);
});

test("creditsPerCardColors opponent : compte la zone adverse, crédite le joueur actif", () => {
  const base = createGame(CONFIG, 1);
  const seeded = withColumns(base, 1, { terra: ['a'], mars: ['b'] }); // 2 couleurs chez l'adversaire
  const out = applyEffect(seeded, { k: 'creditsPerCardColors', zone: 'opponent', per: 2 }, CTX);
  expect(out.players[0].credits).toBe(seeded.players[0].credits + 4);
  expect(out.players[1].credits).toBe(seeded.players[1].credits); // l'adversaire ne gagne rien
});

test("creditsPerTechLevels : 4/8/12 selon le nombre de technos niveau >= 1 (0 => 0)", () => {
  const base = createGame(CONFIG, 1);
  const players: [GameState['players'][0], GameState['players'][1]] = [base.players[0], base.players[1]];
  players[0] = { ...players[0], techMarkers: { animod: 2, humain: 1, robot: 0 } }; // 2 technos >= 1
  const seeded: GameState = { ...base, players };
  const out = applyEffect(seeded, { k: 'creditsPerTechLevels', tiers: [4, 8, 12] }, CTX);
  expect(out.players[0].credits).toBe(seeded.players[0].credits + 8);
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx jest effects-atoms -t "creditsPer"`
Expected: FAIL.

- [ ] **Step 3: Types**

`Effect` :

```typescript
  | { k: 'creditsPerCardColors'; zone: Side; per: number }
  | { k: 'creditsPerTechLevels'; tiers: number[] }
```

- [ ] **Step 4: `applyEffect`**

Assurer l'import de `PEOPLES` dans `effects.ts` (`import { PLANETS, PEOPLES } from './types';`). Ajouter les cases :

```typescript
    case 'creditsPerCardColors': {
      const zoneIndex: PlayerIndex = effect.zone === 'opponent' ? (ctx.player === 0 ? 1 : 0) : ctx.player;
      const colors = PLANETS.filter((p) => state.players[zoneIndex].columns[p].length > 0).length;
      return creditPlayer(state, ctx.player, { credits: state.players[ctx.player].credits + effect.per * colors });
    }
    case 'creditsPerTechLevels': {
      const n = PEOPLES.filter((pe) => state.players[ctx.player].techMarkers[pe] >= 1).length;
      const gain = n === 0 ? 0 : effect.tiers[Math.min(n, effect.tiers.length) - 1]!;
      return creditPlayer(state, ctx.player, { credits: state.players[ctx.player].credits + gain });
    }
```

- [ ] **Step 5: Vérifier + non-régression**

Run: `npx jest effects-atoms && npx jest && npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/engine/types.ts src/engine/effects.ts src/engine/__tests__/effects-atoms.test.ts
git commit -m "feat(engine): atomes creditsPerCardColors + creditsPerTechLevels"
```

---

## Task 6: Atomes « donner à l'adversaire » — `giveOpponent`, `giveLeaderBadge`

Lexique : flèche ROUGE ↑ = donner à l'adversaire depuis SA réserve (c'est le COÛT d'une action facultative, typiquement enveloppée par `optional`/`scale`).
- `giveOpponent { resource: 'credits'|'zenithium'; amount }` = transférer `amount` de sa réserve à l'adversaire (borné à son stock, comme `steal`).
- `giveLeaderBadge` = donner le jeton Leader à l'adversaire (il devient `leader`).

> Questions ouvertes : (a) le côté du badge après don (`silver`/`gold`) n'est pas précisé par le lexique → on **conserve** le `side` courant. (b) Le gating « ne pas offrir le coût si je ne peux pas le payer » n'est pas géré (voir Task 4) : `giveLeaderBadge` est un no-op si le joueur ne détient pas le badge ; `giveOpponent` est borné au stock.

**Files:**
- Modify: `src/engine/types.ts` (union `Effect`)
- Modify: `src/engine/effects.ts` (`applyEffect`)
- Test: `src/engine/__tests__/effects-atoms.test.ts` (append)

**Interfaces:**
- Produces:
  - `{ k: 'giveOpponent'; resource: 'credits' | 'zenithium'; amount: number }`
  - `{ k: 'giveLeaderBadge' }`

- [ ] **Step 1: Test qui échoue**

```typescript
// append à effects-atoms.test.ts
test("giveOpponent : retire de sa réserve et donne à l'adversaire (borné au stock)", () => {
  const base = createGame(CONFIG, 1);
  const players: [GameState['players'][0], GameState['players'][1]] = [base.players[0], base.players[1]];
  players[0] = { ...players[0], zenithium: 2 };
  const seeded: GameState = { ...base, players };
  const out = applyEffect(seeded, { k: 'giveOpponent', resource: 'zenithium', amount: 5 }, CTX);
  expect(out.players[0].zenithium).toBe(0);                                   // borné : n'avait que 2
  expect(out.players[1].zenithium).toBe(seeded.players[1].zenithium + 2);
});

test("giveLeaderBadge : le joueur qui le détient le donne à l'adversaire", () => {
  const base = createGame(CONFIG, 1);
  const s: GameState = { ...base, diplomacy: { leader: 0, side: 'gold' } };
  const out = applyEffect(s, { k: 'giveLeaderBadge' }, CTX);
  expect(out.diplomacy).toEqual({ leader: 1, side: 'gold' }); // côté conservé
});

test("giveLeaderBadge : no-op si le joueur actif ne détient pas le badge", () => {
  const base = createGame(CONFIG, 1);
  const s: GameState = { ...base, diplomacy: { leader: 1, side: 'silver' } };
  const out = applyEffect(s, { k: 'giveLeaderBadge' }, CTX);
  expect(out.diplomacy).toEqual({ leader: 1, side: 'silver' });
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx jest effects-atoms -t "give"`
Expected: FAIL.

- [ ] **Step 3: Types**

`Effect` :

```typescript
  | { k: 'giveOpponent'; resource: 'credits' | 'zenithium'; amount: number }
  | { k: 'giveLeaderBadge' }
```

- [ ] **Step 4: `applyEffect`**

```typescript
    case 'giveOpponent': {
      const giver = ctx.player;
      const receiver: PlayerIndex = giver === 0 ? 1 : 0;
      const given = Math.min(effect.amount, state.players[giver][effect.resource]);
      const players: [PlayerState, PlayerState] = [state.players[0], state.players[1]];
      players[giver] = { ...players[giver], [effect.resource]: players[giver][effect.resource] - given };
      players[receiver] = { ...players[receiver], [effect.resource]: players[receiver][effect.resource] + given };
      return { ...state, players };
    }
    case 'giveLeaderBadge': {
      if (state.diplomacy.leader !== ctx.player) return state; // ne possède pas le badge → no-op
      const receiver: PlayerIndex = ctx.player === 0 ? 1 : 0;
      return { ...state, diplomacy: { leader: receiver, side: state.diplomacy.side } };
    }
```

- [ ] **Step 5: Vérifier + non-régression**

Run: `npx jest effects-atoms && npx jest && npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/engine/types.ts src/engine/effects.ts src/engine/__tests__/effects-atoms.test.ts
git commit -m "feat(engine): atomes giveOpponent + giveLeaderBadge"
```

---

## Task 7: Atomes influence — `influenceChoiceExcept`, `influenceChoiceAtCenter`, `giveInfluenceOpponent`, `moveDiscToCenter`

Lexique (p.2) :
- Disque gris **barré** = 1 influence au choix SAUF une planète → `influenceChoiceExcept { exceptColor, amount }` (réutilise `choosePlanet.exclude`).
- Disque gris double flèche **centre** = 2 influences sur une planète au choix QUI EST au centre → `influenceChoiceAtCenter { amount }` (nouveau champ `choosePlanet.atCenter`).
- ↑rouge + disque = donner à l'adversaire 1 influence sur une planète de ton choix → `giveInfluenceOpponent { amount }` (nouveau champ `choosePlanet.beneficiary`). (FACULTATIF → enveloppé par `optional` lors de la transcription.)
- Disque « → centre » = déplacer un disque d'influence au choix sur son emplacement central → `moveDiscToCenter` (nouvelle décision `{ kind: 'moveDiscToCenter' }`, repositionne le disque à `CENTER`, sans capture).

> **Question ouverte (NON modélisé)** : `influenceOpponentSide` (disque « côté adversaire », lexique ligne « Disque « côté adversaire » = 1 influence sur une planète du côté de l'adversaire ») — la mécanique exacte (pousser le disque vers la zone adverse ? gagner sur une planète penchée côté adverse ?) n'est pas déterminable sans deviner. **Laissé hors périmètre**, à clarifier avec le lexique/PDF avant implémentation. Voir « Questions ouvertes ».

**Files:**
- Modify: `src/engine/types.ts` (union `Effect`, `PendingDecision`)
- Modify: `src/engine/effects.ts` (`resolve`, `applyEffect`, `decide`, import `CENTER`)
- Modify: `src/engine/moves.ts` (`legalMoves`)
- Test: `src/engine/__tests__/effects-atoms.test.ts` (append)

**Interfaces:**
- Consumes: `decide` / `Move` `{t:'decide',planet}` (existant), `CENTER` (de `./setup`).
- Produces:
  - `{ k: 'influenceChoiceExcept'; exceptColor: Planet; amount: number }`
  - `{ k: 'influenceChoiceAtCenter'; amount: number }`
  - `{ k: 'giveInfluenceOpponent'; amount: number }`
  - `{ k: 'moveDiscToCenter' }`
  - `PendingDecision` `choosePlanet` enrichi : `atCenter?: boolean`, `beneficiary?: Side`
  - `PendingDecision` `{ kind: 'moveDiscToCenter' }`

- [ ] **Step 1: Tests qui échouent**

```typescript
// append à effects-atoms.test.ts
import { resolve, decide } from '../effects';
import { CENTER } from '../setup';

test("influenceChoiceExcept : la planète barrée n'est pas proposée et rechoisie => throw", () => {
  const base = createGame(CONFIG, 1);
  const s: GameState = { ...base, resolution: { queue: [{ k: 'influenceChoiceExcept', exceptColor: 'mars', amount: 1 }], ctx: CTX } };
  const paused = resolve(s);
  expect(paused.pending).toEqual({ kind: 'choosePlanet', amount: 1, exclude: ['mars'] });
  expect(() => decide(paused, 'mars')).toThrow();
  const out = decide(paused, 'venus');
  expect(out.planets.venus.discPos).toBe(base.planets.venus.discPos - 1); // joueur 0, dir -1
});

test("influenceChoiceAtCenter : seules les planètes au centre sont éligibles", () => {
  const base = createGame(CONFIG, 1); // 2e joueur = 1 => terra décalée (pos 5), les autres au centre (4)
  const s: GameState = { ...base, resolution: { queue: [{ k: 'influenceChoiceAtCenter', amount: 2 }], ctx: CTX } };
  const paused = resolve(s);
  expect(paused.pending).toEqual({ kind: 'choosePlanet', amount: 2, atCenter: true });
  expect(() => decide(paused, 'terra')).toThrow();      // terra n'est pas au centre
  const out = decide(paused, 'mars');                   // mars est au centre
  expect(out.planets.mars.discPos).toBe(CENTER - 2);
});

test("giveInfluenceOpponent : l'influence choisie va à l'adversaire", () => {
  const base = createGame(CONFIG, 1);
  const s: GameState = { ...base, resolution: { queue: [{ k: 'giveInfluenceOpponent', amount: 1 }], ctx: CTX } };
  const paused = resolve(s);
  expect(paused.pending).toEqual({ kind: 'choosePlanet', amount: 1, beneficiary: 'opponent' });
  const out = decide(paused, 'venus');
  expect(out.planets.venus.discPos).toBe(base.planets.venus.discPos + 1); // joueur 1, dir +1
});

test("moveDiscToCenter : repositionne au centre le disque choisi", () => {
  const base = createGame(CONFIG, 1); // terra à 5
  const s: GameState = { ...base, resolution: { queue: [{ k: 'moveDiscToCenter' }], ctx: CTX } };
  const paused = resolve(s);
  expect(paused.pending).toEqual({ kind: 'moveDiscToCenter' });
  const out = decide(paused, 'terra');
  expect(out.planets.terra.discPos).toBe(CENTER);
  expect(out.resolution).toBeNull();
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx jest effects-atoms -t "influenceChoice|giveInfluenceOpponent|moveDiscToCenter"`
Expected: FAIL.

- [ ] **Step 3: Types**

`Effect` :

```typescript
  | { k: 'influenceChoiceExcept'; exceptColor: Planet; amount: number }
  | { k: 'influenceChoiceAtCenter'; amount: number }
  | { k: 'giveInfluenceOpponent'; amount: number }
  | { k: 'moveDiscToCenter' }
```

`PendingDecision` — enrichir la variante `choosePlanet` et ajouter `moveDiscToCenter` :

```typescript
  | { kind: 'choosePlanet'; amount: number; exclude?: Planet[]; atCenter?: boolean; beneficiary?: Side }
  | { kind: 'moveDiscToCenter' }
```

- [ ] **Step 4: `effects.ts` — import `CENTER`, `applyEffect`, `resolve`**

Ajouter `import { CENTER } from './setup';` en tête de `effects.ts`.

`applyEffect` — 4 `throw` :

```typescript
    case 'influenceChoiceExcept':
    case 'influenceChoiceAtCenter':
    case 'giveInfluenceOpponent':
    case 'moveDiscToCenter':
      throw new Error(`applyEffect: '${effect.k}' passe par resolve/decide`);
```

`resolve` — interceptions (après le bloc `influenceDifferent`) :

```typescript
    if (head.k === 'influenceChoiceExcept') {
      s = { ...s, pending: { kind: 'choosePlanet', amount: head.amount, exclude: [head.exceptColor] } };
      break;
    }
    if (head.k === 'influenceChoiceAtCenter') {
      s = { ...s, pending: { kind: 'choosePlanet', amount: head.amount, atCenter: true } };
      break;
    }
    if (head.k === 'giveInfluenceOpponent') {
      s = { ...s, pending: { kind: 'choosePlanet', amount: head.amount, beneficiary: 'opponent' } };
      break;
    }
    if (head.k === 'moveDiscToCenter') {
      s = { ...s, pending: { kind: 'moveDiscToCenter' } };
      break;
    }
```

- [ ] **Step 5: `decide` — brancher `moveDiscToCenter` et enrichir `choosePlanet`**

Dans `decide`, ajouter une branche AVANT le `else` final (`choosePlanet`) :

```typescript
  } else if (pending.kind === 'moveDiscToCenter') {
    const track = state.planets[planet];
    s = { ...state, planets: { ...state.planets, [planet]: { ...track, discPos: CENTER } } };
```

Remplacer le corps du `else` final (`choosePlanet`) par :

```typescript
  } else {
    // choosePlanet (+ variantes exclude / atCenter / beneficiary)
    if (pending.exclude && pending.exclude.includes(planet)) {
      throw new Error('decide: planète exclue (doit être différente)');
    }
    if (pending.atCenter && state.planets[planet].discPos !== CENTER) {
      throw new Error('decide: planète non centrale');
    }
    const beneficiary: PlayerIndex = pending.beneficiary === 'opponent' ? (ctx.player === 0 ? 1 : 0) : ctx.player;
    s = gainInfluence(state, planet, beneficiary, pending.amount);
  }
```

- [ ] **Step 6: `legalMoves` — filtre `atCenter` + décision `moveDiscToCenter`**

Dans le bloc `pending`, initialiser `let candidates: Planet[] = [];` (au lieu de `let candidates: Planet[];`). Ajouter, après le cas `chooseTier` (early return) :

```typescript
    if (pending.kind === 'moveDiscToCenter') {
      return PLANETS.map((planet) => ({ t: 'decide', planet }));
    }
```

Changer la branche fallback `} else {` (choosePlanet) en `} else if (pending.kind === 'choosePlanet') {` et y appliquer le filtre `atCenter` :

```typescript
    } else if (pending.kind === 'choosePlanet') {
      const exclude = pending.exclude ?? [];
      candidates = PLANETS.filter(
        (planet) => !exclude.includes(planet) && (!pending.atCenter || state.planets[planet].discPos === CENTER),
      );
    }
```

(Importer `CENTER` dans `moves.ts` : `import { activeFace } from '../data/tech';` existe déjà ; ajouter `import { CENTER } from './setup';`.)

- [ ] **Step 7: Vérifier + non-régression**

Run: `npx jest effects-atoms && npx jest && npm run typecheck`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/engine/types.ts src/engine/effects.ts src/engine/moves.ts src/engine/__tests__/effects-atoms.test.ts
git commit -m "feat(engine): atomes influence (except/center/opponent/moveToCenter)"
```

---

## Task 8: Techno — extraction `developTech` + atomes `developDiscounted` / `developLowest`

Lexique (Recherche, p.2) : appliquer TOUTES les règles « Développer une Technologie » (effets cumulés N→1, jeton niveau 2, primes de ligne) SAUF le coût-carte.
- `X-1 ⟋ [peuple indiqué]` → `developDiscounted { which: 'cardPeople', discount: 1 }` (peuple = `ctx.people`).
- `X-2 ⟋ [au choix]` → `developDiscounted { which: 'choice', discount: 2 }` (le joueur choisit le peuple → `chooseTech`).
- `0 ⟋ [la plus basse]` → `developLowest` (coût 0, techno de plus bas niveau ; `chooseTech` si égalité).

On EXTRAIT d'abord la logique « develop » de `moves.ts` vers `engine/develop.ts` (`developTech`), réutilisée par le move `develop` ET par les atomes.

**Files:**
- Create: `src/engine/develop.ts`
- Modify: `src/engine/moves.ts` (branche `develop` réécrite, `Move`, `legalMoves`, `applyMove`)
- Modify: `src/engine/types.ts` (`EffectCtx.people`, union `Effect`, `PendingDecision`)
- Modify: `src/engine/effects.ts` (`resolve`, `applyEffect`, + `decideTech`, imports `developTech`/`activeFace`)
- Test: `src/engine/__tests__/develop.test.ts` (Create)

**Interfaces:**
- Produces:
  - `developTech(state, player, people, costOverride?): { state: GameState; queue: Effect[] } | null` (dans `develop.ts`) — null si niveau 5 atteint ou coût > zénithium.
  - `EffectCtx` = `{ player: PlayerIndex; planet: Planet; people?: People }`
  - `{ k: 'developDiscounted'; which: 'cardPeople' | 'choice'; discount: number }`, `{ k: 'developLowest' }`
  - `PendingDecision` `{ kind: 'chooseTech'; discount: number; zeroCost: boolean; candidates: People[] }`
  - `Move` `{ t: 'decideTech'; people: People }`
  - `decideTech(state: GameState, people: People): GameState`

- [ ] **Step 1: Test `developTech` (extraction) qui échoue**

```typescript
// src/engine/__tests__/develop.test.ts
import { createGame } from '../setup';
import { developTech } from '../develop';
import { resolve, decide, decideTech } from '../effects';
import type { EffectCtx, GameState } from '../types';

const CONFIG = { techSetup: { animod: 'S', humain: 'U', robot: 'N' }, firstPlayer: 0 } as const;

test("developTech : monte le marqueur, déduit le coût, retourne la file d'effets", () => {
  const base = createGame(CONFIG, 1); // zénithium départ = 1 ; animod S L1 coût 1, effet credits +2
  const res = developTech(base, 0, 'animod');
  expect(res).not.toBeNull();
  expect(res!.state.players[0].techMarkers.animod).toBe(1);
  expect(res!.state.players[0].zenithium).toBe(base.players[0].zenithium - 1);
  expect(res!.queue).toEqual([{ k: 'credits', amount: 2, target: 'self' }]);
});

test("developTech : coût > zénithium => null", () => {
  const base = createGame(CONFIG, 1);
  const poor: GameState = { ...base, players: [{ ...base.players[0], zenithium: 0 }, base.players[1]] };
  expect(developTech(poor, 0, 'animod')).toBeNull();
});

test("developTech : coût 0 forcé développe sans dépenser", () => {
  const base = createGame(CONFIG, 1);
  const res = developTech(base, 0, 'animod', 0);
  expect(res!.state.players[0].zenithium).toBe(base.players[0].zenithium); // rien dépensé
  expect(res!.state.players[0].techMarkers.animod).toBe(1);
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx jest develop -t "developTech"`
Expected: FAIL (module `../develop` absent).

- [ ] **Step 3: Créer `src/engine/develop.ts`**

```typescript
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
```

- [ ] **Step 4: Réécrire la branche `develop` de `moves.ts` pour utiliser `developTech`**

Ajouter `import { developTech } from './develop';` en tête. Remplacer TOUT le bloc `if (move.t === 'develop') { ... }` par :

```typescript
  if (move.t === 'develop') {
    if (state.winner !== null || state.pending !== null || state.resolution !== null) return state;
    const player = state.current;
    if (!state.players[player].hand.includes(move.cardId)) return state;
    const card = cardOf(move.cardId);
    if (!card || card.people !== move.people) return state;
    const players: [PlayerState, PlayerState] = [state.players[0], state.players[1]];
    players[player] = { ...players[player], hand: players[player].hand.filter((id) => id !== move.cardId) };
    const afterCard: GameState = { ...state, players, discard: [...state.discard, move.cardId] };
    const res = developTech(afterCard, player, move.people);
    if (res === null) return state; // niveau/coût invalide → move ignoré
    const started: GameState = {
      ...res.state,
      resolution: { queue: res.queue, ctx: { player, planet: card.planet, people: card.people } },
    };
    return finishOrPending(resolve(started));
  }
```

Aussi : dans la branche `recruit`, enrichir le ctx → `ctx: { player, planet: card.planet, people: card.people }` (pour que `developDiscounted 'cardPeople'` connaisse le peuple d'une action de carte recrutée).

- [ ] **Step 5: Vérifier `developTech` + non-régression `moves`**

Run: `npx jest develop -t "developTech" && npx jest moves && npx jest && npm run typecheck`
Expected: PASS (les tests `moves.test.ts` restent verts après extraction).

- [ ] **Step 6: Commit intermédiaire**

```bash
git add src/engine/develop.ts src/engine/moves.ts src/engine/__tests__/develop.test.ts
git commit -m "refactor(engine): extraction developTech (reutilisable)"
```

- [ ] **Step 7: Tests des atomes `developDiscounted` / `developLowest` qui échouent**

```typescript
// append à develop.test.ts
test("developDiscounted cardPeople : coût réduit, peuple = ctx.people", () => {
  const base = createGame(CONFIG, 1); // animod L1 coût 1 ; discount 1 => coût 0
  const s: GameState = {
    ...base,
    resolution: { queue: [{ k: 'developDiscounted', which: 'cardPeople', discount: 1 }], ctx: { player: 0, planet: 'mercure', people: 'animod' } },
  };
  const out = resolve(s);
  expect(out.pending).toBeNull();
  expect(out.players[0].techMarkers.animod).toBe(1);
  expect(out.players[0].zenithium).toBe(base.players[0].zenithium); // coût 0
  expect(out.players[0].credits).toBe(base.players[0].credits + 2);  // effet L1 animod S
});

test("developLowest : niveau le plus bas unique, coût 0", () => {
  const base = createGame(CONFIG, 1);
  const seeded: GameState = { ...base, players: [{ ...base.players[0], techMarkers: { animod: 0, humain: 1, robot: 2 } }, base.players[1]] };
  const s: GameState = { ...seeded, resolution: { queue: [{ k: 'developLowest' }], ctx: { player: 0, planet: 'mercure' } } };
  const out = resolve(s);
  expect(out.players[0].techMarkers.animod).toBe(1);      // animod était le plus bas
  expect(out.players[0].zenithium).toBe(seeded.players[0].zenithium); // coût 0
});

test("developLowest : égalité => chooseTech ; decideTech applique le peuple choisi", () => {
  const base = createGame(CONFIG, 1); // tous à 0 => égalité
  const s: GameState = { ...base, resolution: { queue: [{ k: 'developLowest' }], ctx: { player: 0, planet: 'mercure' } } };
  const paused = resolve(s);
  expect(paused.pending).toEqual({ kind: 'chooseTech', discount: 0, zeroCost: true, candidates: ['animod', 'humain', 'robot'] });
  const out = decideTech(paused, 'animod'); // L1 animod S = credits +2 (non interactif)
  expect(out.pending).toBeNull();
  expect(out.players[0].techMarkers.animod).toBe(1);
  expect(out.players[0].zenithium).toBe(base.players[0].zenithium); // coût 0
});

test("developDiscounted choice : chooseTech puis decideTech déduit le coût réduit", () => {
  const base = createGame(CONFIG, 1);
  const rich: GameState = { ...base, players: [{ ...base.players[0], zenithium: 3 }, base.players[1]] };
  const s: GameState = { ...rich, resolution: { queue: [{ k: 'developDiscounted', which: 'choice', discount: 0 }], ctx: { player: 0, planet: 'mercure' } } };
  const paused = resolve(s);
  expect(paused.pending).toEqual({ kind: 'chooseTech', discount: 0, zeroCost: false, candidates: ['animod', 'humain', 'robot'] });
  const out = decideTech(paused, 'animod'); // coût 1
  expect(out.players[0].techMarkers.animod).toBe(1);
  expect(out.players[0].zenithium).toBe(rich.players[0].zenithium - 1);
});
```

- [ ] **Step 8: Vérifier l'échec**

Run: `npx jest develop -t "developDiscounted|developLowest"`
Expected: FAIL.

- [ ] **Step 9: Types**

`types.ts` — `EffectCtx` :

```typescript
export type EffectCtx = { player: PlayerIndex; planet: Planet; people?: People };
```

`Effect` :

```typescript
  | { k: 'developDiscounted'; which: 'cardPeople' | 'choice'; discount: number }
  | { k: 'developLowest' }
```

`PendingDecision` :

```typescript
  | { kind: 'chooseTech'; discount: number; zeroCost: boolean; candidates: People[] }
```

- [ ] **Step 10: `effects.ts` — imports, `applyEffect`, `resolve`, `decideTech`**

Ajouter en tête : `import { developTech } from './develop';` et `import { activeFace } from '../data/tech';`.

`applyEffect` :

```typescript
    case 'developDiscounted':
    case 'developLowest':
      throw new Error(`applyEffect: '${effect.k}' passe par resolve/decideTech`);
```

`resolve` — après le bloc `bonusToken`, ajouter (le helper `dropHead` illustré inline) :

```typescript
    if (head.k === 'developDiscounted') {
      const me = ctx.player;
      if (head.which === 'cardPeople') {
        const people = ctx.people;
        if (!people) throw new Error("resolve: developDiscounted 'cardPeople' requiert ctx.people");
        const lvl = s.players[me].techMarkers[people];
        const affordable = lvl < 5 && developTech(s, me, people, Math.max(0, activeFace(people, s.config.techSetup).levels[lvl]!.zenithium - head.discount)) !== null;
        if (!affordable) { s = { ...s, resolution: { queue: s.resolution!.queue.slice(1), ctx, chosen: s.resolution!.chosen } }; continue; }
        const cost = Math.max(0, activeFace(people, s.config.techSetup).levels[lvl]!.zenithium - head.discount);
        const res = developTech(s, me, people, cost)!;
        s = { ...res.state, resolution: { queue: [...res.queue, ...s.resolution!.queue.slice(1)], ctx, chosen: s.resolution!.chosen } };
        continue;
      }
      const cands = PEOPLES.filter((pe) => {
        const lvl = s.players[me].techMarkers[pe];
        if (lvl >= 5) return false;
        const cost = Math.max(0, activeFace(pe, s.config.techSetup).levels[lvl]!.zenithium - head.discount);
        return cost <= s.players[me].zenithium;
      });
      if (cands.length === 0) { s = { ...s, resolution: { queue: s.resolution!.queue.slice(1), ctx, chosen: s.resolution!.chosen } }; continue; }
      s = { ...s, pending: { kind: 'chooseTech', discount: head.discount, zeroCost: false, candidates: cands } };
      break;
    }
    if (head.k === 'developLowest') {
      const me = ctx.player;
      const markers = s.players[me].techMarkers;
      const eligible = PEOPLES.filter((pe) => markers[pe] < 5);
      if (eligible.length === 0) { s = { ...s, resolution: { queue: s.resolution!.queue.slice(1), ctx, chosen: s.resolution!.chosen } }; continue; }
      const min = Math.min(...eligible.map((pe) => markers[pe]));
      const tied = eligible.filter((pe) => markers[pe] === min);
      if (tied.length === 1) {
        const res = developTech(s, me, tied[0]!, 0)!;
        s = { ...res.state, resolution: { queue: [...res.queue, ...s.resolution!.queue.slice(1)], ctx, chosen: s.resolution!.chosen } };
        continue;
      }
      s = { ...s, pending: { kind: 'chooseTech', discount: 0, zeroCost: true, candidates: tied } };
      break;
    }
```

Ajouter `decideTech` (après `decide`) :

```typescript
export function decideTech(state: GameState, people: People): GameState {
  if (state.pending === null || state.resolution === null || state.pending.kind !== 'chooseTech') {
    throw new Error('decideTech: aucune décision chooseTech en attente');
  }
  const pending = state.pending;
  const ctx = state.resolution.ctx;
  const chosen = state.resolution.chosen;
  if (!pending.candidates.includes(people)) throw new Error('decideTech: peuple non éligible');
  const lvl = state.players[ctx.player].techMarkers[people];
  const base = activeFace(people, state.config.techSetup).levels[lvl]!.zenithium;
  const cost = pending.zeroCost ? 0 : Math.max(0, base - pending.discount);
  const res = developTech(state, ctx.player, people, cost);
  const rest = state.resolution.queue.slice(1);
  const next = res === null
    ? { ...state, pending: null, resolution: { queue: rest, ctx, chosen } }
    : { ...res.state, pending: null, resolution: { queue: [...res.queue, ...rest], ctx, chosen } };
  return resolve(next);
}
```

(Ajouter `People` au `import type` depuis `./types` dans `effects.ts` s'il n'y est pas.)

- [ ] **Step 11: `moves.ts` — `Move`, `legalMoves`, `applyMove`**

`import { cardOf, resolve, decide as decideEffect, chooseBranch, skipBranch, decideTech as decideTechEffect } from './effects';`

`Move` :

```typescript
  | { t: 'decideTech'; people: People };
```

`applyMove` (après `skip`) :

```typescript
  if (move.t === 'decideTech') {
    if (state.pending === null) return state;
    return finishOrPending(decideTechEffect(state, move.people));
  }
```

`legalMoves` (dans le bloc `pending`, après le cas `moveDiscToCenter`) :

```typescript
    if (pending.kind === 'chooseTech') {
      return pending.candidates.map((people) => ({ t: 'decideTech', people }));
    }
```

- [ ] **Step 12: Vérifier + non-régression**

Run: `npx jest develop && npx jest && npm run typecheck`
Expected: PASS.

- [ ] **Step 13: Commit**

```bash
git add src/engine/types.ts src/engine/effects.ts src/engine/moves.ts src/engine/__tests__/develop.test.ts
git commit -m "feat(engine): atomes developDiscounted + developLowest (chooseTech)"
```

---

## Task 9: Cartes (colonnes) — variantes `transfer`/`exile` + actions combinées « + 1 influence »

Lexique (p.1 « Cartes — actions », p.2 « Gain d'influence ») :
- **Transférer (couleur)** = colonne adverse CORRESPONDANTE (couleur de la carte, = `ctx.planet`), sans choix → `transfer { from: 'corresponding' }`.
- **Transférer (noir)** = colonne adverse AU CHOIX → `transfer { from: 'choice' }` (= comportement actuel).
- **Exiler (couleur)** = dernière carte de TA colonne CORRESPONDANTE → `exile { side: 'self', corresponding: true }` (**ownCorresponding**).
- **Exiler (noir)** = colonne ADVERSE au choix → `exile { side: 'opponent' }` (**opponentChoice**, = comportement actuel).
- **Combinés** : « Transférer + disque », « Exiler adverse + disque » = action + 1 influence sur la planète de la carte déplacée → champ `thenInfluence?: boolean`. (« Mobiliser + disque » existe déjà : `mobilize { thenInfluence: true }`.)

> **Décision de modélisation** : l'atome `exile { side; count }` actuel SUFFIT pour `opponentChoice` (et la variante self-choice des tests/techno). On l'ÉTEND avec `corresponding?: boolean` (ownCorresponding, sans choix) et `thenInfluence?: boolean`. `transfer` gagne `from?: 'corresponding' | 'choice'` (défaut `'choice'`, rétrocompatible) et `thenInfluence?: boolean`. `chooseColumn` gagne `thenInfluence?: boolean`.

**Files:**
- Modify: `src/engine/types.ts` (variantes `transfer`/`exile`, `chooseColumn`, + `discardHandAll`)
- Modify: `src/engine/effects.ts` (`resolve` bloc transfer/exile, `decide` bloc `chooseColumn`, `applyEffect`)
- Test: `src/engine/__tests__/effects-atoms.test.ts` (append)

**Interfaces:**
- Consumes: `hasEligibleColumn`, `gainInfluence`, `decide`/`chooseColumn` (existant).
- Produces:
  - `{ k: 'transfer'; count: number; from?: 'corresponding' | 'choice'; thenInfluence?: boolean }`
  - `{ k: 'exile'; side: Side; count: number; corresponding?: boolean; thenInfluence?: boolean }`
  - `{ k: 'discardHandAll' }`
  - `PendingDecision` `chooseColumn` enrichi : `thenInfluence?: boolean`

- [ ] **Step 1: Tests qui échouent**

```typescript
// append à effects-atoms.test.ts
test("transfer corresponding : prend la dernière carte adverse de la colonne de ctx.planet, sans choix", () => {
  const base = createGame(CONFIG, 1);
  let s0 = withColumns(base, 1, { terra: ['e1', 'e2'] });
  s0 = withColumns(s0, 0, { terra: ['m1'] });
  const s: GameState = { ...s0, resolution: { queue: [{ k: 'transfer', count: 1, from: 'corresponding' }], ctx: { player: 0, planet: 'terra' } } };
  const out = resolve(s);
  expect(out.pending).toBeNull();                       // aucun choix : colonne imposée
  expect(out.players[1].columns.terra).toEqual(['e1']);
  expect(out.players[0].columns.terra).toEqual(['m1', 'e2']);
});

test("transfer corresponding + thenInfluence : +1 influence sur ctx.planet", () => {
  const base = createGame(CONFIG, 1);
  const s0 = withColumns(base, 1, { terra: ['e1'] });
  const before = s0.planets.terra.discPos;
  const s: GameState = { ...s0, resolution: { queue: [{ k: 'transfer', count: 1, from: 'corresponding', thenInfluence: true }], ctx: { player: 0, planet: 'terra' } } };
  const out = resolve(s);
  expect(out.planets.terra.discPos).toBe(before - 1);   // joueur 0, dir -1
});

test("exile ownCorresponding : défausse la dernière carte de MA colonne ctx.planet, sans choix", () => {
  const base = createGame(CONFIG, 1);
  const s0 = withColumns(base, 0, { mars: ['a', 'b'] });
  const s: GameState = { ...s0, resolution: { queue: [{ k: 'exile', side: 'self', count: 1, corresponding: true }], ctx: { player: 0, planet: 'mars' } } };
  const out = resolve(s);
  expect(out.pending).toBeNull();
  expect(out.players[0].columns.mars).toEqual(['a']);
  expect(out.discard).toContain('b');
});

test("exile opponentChoice + thenInfluence : après décision, +1 influence sur la planète choisie", () => {
  const base = createGame(CONFIG, 1);
  const s0 = withColumns(base, 1, { venus: ['x'] });
  const before = s0.planets.venus.discPos;
  const s: GameState = { ...s0, resolution: { queue: [{ k: 'exile', side: 'opponent', count: 1, thenInfluence: true }], ctx: { player: 0, planet: 'mars' } } };
  const paused = resolve(s);
  expect(paused.pending).toEqual({ kind: 'chooseColumn', owner: 'opponent', purpose: 'exile', remaining: 1, thenInfluence: true });
  const out = decide(paused, 'venus');
  expect(out.players[1].columns.venus).toEqual([]);
  expect(out.planets.venus.discPos).toBe(before - 1);   // influence sur la couleur de la carte exilée
});

test("discardHandAll : défausse toute la main du joueur actif", () => {
  const base = createGame(CONFIG, 1);
  const handBefore = [...base.players[0].hand];
  const out = applyEffect(base, { k: 'discardHandAll' }, CTX);
  expect(out.players[0].hand).toEqual([]);
  handBefore.forEach((id) => expect(out.discard).toContain(id));
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx jest effects-atoms -t "transfer corresponding|ownCorresponding|opponentChoice|discardHandAll"`
Expected: FAIL.

- [ ] **Step 3: Types**

`types.ts` — remplacer les variantes `transfer`/`exile` et enrichir `chooseColumn`, ajouter `discardHandAll` :

```typescript
  | { k: 'transfer'; count: number; from?: 'corresponding' | 'choice'; thenInfluence?: boolean }
  | { k: 'exile'; side: Side; count: number; corresponding?: boolean; thenInfluence?: boolean }
  | { k: 'discardHandAll' }
```

`chooseColumn` (ajouter `thenInfluence?`) :

```typescript
  | {
      kind: 'chooseColumn';
      owner: 'self' | 'opponent';
      purpose: 'transfer' | 'exile' | 'exileInfluence';
      remaining: number;
      amount?: number;
      exclude?: Planet[];
      thenInfluence?: boolean;
    }
```

- [ ] **Step 4: `applyEffect` — `discardHandAll` (pur)**

```typescript
    case 'discardHandAll': {
      const me = ctx.player;
      const players: [PlayerState, PlayerState] = [state.players[0], state.players[1]];
      const oldHand = players[me].hand;
      players[me] = { ...players[me], hand: [] };
      return { ...state, players, discard: [...state.discard, ...oldHand] };
    }
```

- [ ] **Step 5: `resolve` — variantes `corresponding` (inline) + passage de `thenInfluence`**

Remplacer le bloc `if (head.k === 'transfer' || head.k === 'exile') { ... }` par :

```typescript
    if (head.k === 'transfer' && (head.from ?? 'choice') === 'corresponding') {
      const opp: PlayerIndex = ctx.player === 0 ? 1 : 0;
      let ns = s;
      for (let i = 0; i < head.count; i++) {
        const col = ns.players[opp].columns[ctx.planet];
        if (col.length === 0) break;
        const card = col[col.length - 1]!;
        const players: [PlayerState, PlayerState] = [ns.players[0], ns.players[1]];
        players[opp] = { ...players[opp], columns: { ...players[opp].columns, [ctx.planet]: col.slice(0, -1) } };
        players[ctx.player] = { ...players[ctx.player], columns: { ...players[ctx.player].columns, [ctx.planet]: [...players[ctx.player].columns[ctx.planet], card] } };
        ns = { ...ns, players };
        if (head.thenInfluence) ns = gainInfluence(ns, ctx.planet, ctx.player, 1);
        if (ns.winner !== null) break;
      }
      s = { ...ns, resolution: { queue: ns.resolution!.queue.slice(1), ctx, chosen: ns.resolution!.chosen } };
      continue;
    }
    if (head.k === 'exile' && head.side === 'self' && head.corresponding) {
      let ns = s;
      for (let i = 0; i < head.count; i++) {
        const col = ns.players[ctx.player].columns[ctx.planet];
        if (col.length === 0) break;
        const card = col[col.length - 1]!;
        const players: [PlayerState, PlayerState] = [ns.players[0], ns.players[1]];
        players[ctx.player] = { ...players[ctx.player], columns: { ...players[ctx.player].columns, [ctx.planet]: col.slice(0, -1) } };
        ns = { ...ns, players, discard: [...ns.discard, card] };
        if (head.thenInfluence) ns = gainInfluence(ns, ctx.planet, ctx.player, 1);
        if (ns.winner !== null) break;
      }
      s = { ...ns, resolution: { queue: ns.resolution!.queue.slice(1), ctx, chosen: ns.resolution!.chosen } };
      continue;
    }
    if (head.k === 'transfer' || head.k === 'exile') {
      const owner: Side = head.k === 'transfer' ? 'opponent' : head.side;
      const ownerIndex: PlayerIndex = owner === 'self' ? ctx.player : ctx.player === 0 ? 1 : 0;
      if (!hasEligibleColumn(s, ownerIndex)) {
        s = { ...s, resolution: { queue: s.resolution!.queue.slice(1), ctx, chosen: s.resolution!.chosen } };
        continue;
      }
      s = { ...s, pending: { kind: 'chooseColumn', owner, purpose: head.k, remaining: head.count, thenInfluence: head.thenInfluence } };
      break;
    }
```

- [ ] **Step 6: `decide` — appliquer `thenInfluence` après le déplacement + propager sur `remaining`**

Dans `decide`, bloc `chooseColumn`, APRÈS la ligne calculant `moved` pour `exileInfluence` (soit après le `if (pending.purpose === 'exileInfluence') { moved = gainInfluence(...) }`), ajouter :

```typescript
    if (pending.thenInfluence) {
      moved = gainInfluence(moved, planet, active, 1);
    }
```

Et dans la ré-émission du pending pour `remaining > 0`, propager `thenInfluence` :

```typescript
      return {
        ...moved,
        pending: { kind: 'chooseColumn', owner: pending.owner, purpose: pending.purpose, remaining, amount: pending.amount, exclude: nextExclude, thenInfluence: pending.thenInfluence },
      };
```

- [ ] **Step 7: Vérifier + non-régression**

Run: `npx jest effects-atoms && npx jest && npm run typecheck`
Expected: PASS (les tests transfer/exile existants restent verts : `from`/`corresponding`/`thenInfluence` sont optionnels).

- [ ] **Step 8: Commit**

```bash
git add src/engine/types.ts src/engine/effects.ts src/engine/__tests__/effects-atoms.test.ts
git commit -m "feat(engine): transfer/exile variantes + influence combinee + discardHandAll"
```

---

## Task 10: Cartes (main) — sélection `chooseHandCard` + `discardHand` + `creditsFromCardValue`

Lexique :
- **Défausser 1 carte de sa main** (gant) → `discardHand { count }` ; **Défausser main + disque** = + 1 influence sur la couleur de la carte défaussée → `discardHand { count, thenInfluence: true }`.
- **Transférer/Exiler 1 carte adverse ⟋ X** = action + gagner **le coût (valeur) de la carte** en crédits → `creditsFromCardValue { source: 'transfer' | 'exileOpponent' }`.
- **Défausser main ⟋ X** = défausser une carte de sa main et gagner son coût → `creditsFromCardValue { source: 'discardHand' }`.

Nouvelle décision typée `chooseHandCard` (sélection d'une carte de la main) reprise par le nouveau `Move` `{ t: 'decideCard'; cardId }`. La valeur d'une carte = son `cost` (via `cardOf`).

**Files:**
- Modify: `src/engine/types.ts` (union `Effect`, `PendingDecision`, `chooseColumn.gainCreditsFromValue`)
- Modify: `src/engine/effects.ts` (`resolve`, `decide`, `applyEffect`, + `decideCard`)
- Modify: `src/engine/moves.ts` (`Move`, `legalMoves`, `applyMove`)
- Test: `src/engine/__tests__/effects-atoms.test.ts` (append)

**Interfaces:**
- Consumes: `cardOf`, `gainInfluence`, `hasEligibleColumn`, `decide`/`chooseColumn` (Task 9).
- Produces:
  - `{ k: 'discardHand'; count: number; thenInfluence?: boolean }`
  - `{ k: 'creditsFromCardValue'; source: 'transfer' | 'exileOpponent' | 'discardHand' }`
  - `PendingDecision` `{ kind: 'chooseHandCard'; purpose: 'discard' | 'discardInfluence' | 'discardValue'; remaining: number }`
  - `PendingDecision` `chooseColumn` enrichi : `gainCreditsFromValue?: boolean`
  - `Move` `{ t: 'decideCard'; cardId: string }`
  - `decideCard(state: GameState, cardId: string): GameState`

- [ ] **Step 1: Tests qui échouent**

```typescript
// append à effects-atoms.test.ts
import { cardOf, decideCard } from '../effects';

test("discardHand : pose chooseHandCard ; decideCard défausse la carte choisie", () => {
  const base = createGame(CONFIG, 1);
  const card = base.players[0].hand[0]!;
  const s: GameState = { ...base, resolution: { queue: [{ k: 'discardHand', count: 1 }], ctx: CTX } };
  const paused = resolve(s);
  expect(paused.pending).toEqual({ kind: 'chooseHandCard', purpose: 'discard', remaining: 1 });
  const out = decideCard(paused, card);
  expect(out.pending).toBeNull();
  expect(out.players[0].hand).not.toContain(card);
  expect(out.discard).toContain(card);
});

test("discardHand + thenInfluence : +1 influence sur la couleur de la carte défaussée", () => {
  const base = createGame(CONFIG, 1);
  const card = base.players[0].hand[0]!;
  const planet = cardOf(card)!.planet;
  const before = base.planets[planet].discPos;
  const s: GameState = { ...base, resolution: { queue: [{ k: 'discardHand', count: 1, thenInfluence: true }], ctx: CTX } };
  const out = decideCard(resolve(s), card);
  expect(out.planets[planet].discPos).toBe(before - 1); // joueur 0, dir -1
});

test("creditsFromCardValue source=discardHand : défausse une carte de la main => crédits = son coût", () => {
  const base = createGame(CONFIG, 1);
  const card = base.players[0].hand[0]!;
  const value = cardOf(card)!.cost;
  const s: GameState = { ...base, resolution: { queue: [{ k: 'creditsFromCardValue', source: 'discardHand' }], ctx: CTX } };
  const paused = resolve(s);
  expect(paused.pending).toEqual({ kind: 'chooseHandCard', purpose: 'discardValue', remaining: 1 });
  const out = decideCard(paused, card);
  expect(out.players[0].credits).toBe(base.players[0].credits + value);
  expect(out.discard).toContain(card);
});

test("creditsFromCardValue source=transfer : transfère une carte adverse => crédits = son coût", () => {
  const base = createGame(CONFIG, 1);
  const value = cardOf('FIX_terra_0')!.cost;
  const seeded = withColumns(base, 1, { terra: ['FIX_terra_0'] });
  const s: GameState = { ...seeded, resolution: { queue: [{ k: 'creditsFromCardValue', source: 'transfer' }], ctx: { player: 0, planet: 'mars' } } };
  const paused = resolve(s);
  expect(paused.pending).toEqual({ kind: 'chooseColumn', owner: 'opponent', purpose: 'transfer', remaining: 1, gainCreditsFromValue: true });
  const out = decide(paused, 'terra');
  expect(out.players[0].credits).toBe(seeded.players[0].credits + value);
  expect(out.players[0].columns.terra).toContain('FIX_terra_0'); // transférée chez soi
});

test("creditsFromCardValue source=exileOpponent : exile une carte adverse => crédits = son coût", () => {
  const base = createGame(CONFIG, 1);
  const value = cardOf('FIX_mars_0')!.cost;
  const seeded = withColumns(base, 1, { mars: ['FIX_mars_0'] });
  const s: GameState = { ...seeded, resolution: { queue: [{ k: 'creditsFromCardValue', source: 'exileOpponent' }], ctx: { player: 0, planet: 'mars' } } };
  const paused = resolve(s);
  expect(paused.pending).toEqual({ kind: 'chooseColumn', owner: 'opponent', purpose: 'exile', remaining: 1, gainCreditsFromValue: true });
  const out = decide(paused, 'mars');
  expect(out.players[0].credits).toBe(seeded.players[0].credits + value);
  expect(out.discard).toContain('FIX_mars_0');
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx jest effects-atoms -t "discardHand|creditsFromCardValue"`
Expected: FAIL.

- [ ] **Step 3: Types**

`Effect` :

```typescript
  | { k: 'discardHand'; count: number; thenInfluence?: boolean }
  | { k: 'creditsFromCardValue'; source: 'transfer' | 'exileOpponent' | 'discardHand' }
```

`PendingDecision` — nouvelle décision + champ sur `chooseColumn` :

```typescript
  | { kind: 'chooseHandCard'; purpose: 'discard' | 'discardInfluence' | 'discardValue'; remaining: number }
```

Et ajouter `gainCreditsFromValue?: boolean;` dans la variante `chooseColumn`.

- [ ] **Step 4: `applyEffect` — `throw`**

```typescript
    case 'discardHand':
    case 'creditsFromCardValue':
      throw new Error(`applyEffect: '${effect.k}' passe par resolve/decide/decideCard`);
```

- [ ] **Step 5: `resolve` — interceptions**

Après le bloc `exile`/`transfer` (Task 9) :

```typescript
    if (head.k === 'discardHand') {
      if (head.count <= 0 || s.players[ctx.player].hand.length === 0) {
        s = { ...s, resolution: { queue: s.resolution!.queue.slice(1), ctx, chosen: s.resolution!.chosen } };
        continue;
      }
      s = { ...s, pending: { kind: 'chooseHandCard', purpose: head.thenInfluence ? 'discardInfluence' : 'discard', remaining: head.count } };
      break;
    }
    if (head.k === 'creditsFromCardValue') {
      if (head.source === 'discardHand') {
        if (s.players[ctx.player].hand.length === 0) {
          s = { ...s, resolution: { queue: s.resolution!.queue.slice(1), ctx, chosen: s.resolution!.chosen } };
          continue;
        }
        s = { ...s, pending: { kind: 'chooseHandCard', purpose: 'discardValue', remaining: 1 } };
        break;
      }
      const opp: PlayerIndex = ctx.player === 0 ? 1 : 0;
      if (!hasEligibleColumn(s, opp)) {
        s = { ...s, resolution: { queue: s.resolution!.queue.slice(1), ctx, chosen: s.resolution!.chosen } };
        continue;
      }
      const purpose = head.source === 'transfer' ? 'transfer' : 'exile';
      s = { ...s, pending: { kind: 'chooseColumn', owner: 'opponent', purpose, remaining: 1, gainCreditsFromValue: true } };
      break;
    }
```

- [ ] **Step 6: `decide` — appliquer `gainCreditsFromValue` + propager sur `remaining`**

Dans le bloc `chooseColumn` de `decide`, APRÈS le bloc `thenInfluence` (Task 9), ajouter :

```typescript
    if (pending.gainCreditsFromValue) {
      const def = cardOf(card);
      const value = def ? def.cost : 0;
      const players2: [PlayerState, PlayerState] = [moved.players[0], moved.players[1]];
      players2[active] = { ...players2[active], credits: players2[active].credits + value };
      moved = { ...moved, players: players2 };
    }
```

Dans la ré-émission du pending (`remaining > 0`), ajouter `gainCreditsFromValue: pending.gainCreditsFromValue` à l'objet `chooseColumn` (à côté de `thenInfluence`).

- [ ] **Step 7: Ajouter `decideCard`**

Dans `effects.ts` (après `decideTech`) :

```typescript
export function decideCard(state: GameState, cardId: string): GameState {
  if (state.pending === null || state.resolution === null || state.pending.kind !== 'chooseHandCard') {
    throw new Error('decideCard: aucune décision chooseHandCard en attente');
  }
  const pending = state.pending;
  const ctx = state.resolution.ctx;
  const chosen = state.resolution.chosen;
  const active = ctx.player;
  if (!state.players[active].hand.includes(cardId)) {
    throw new Error('decideCard: carte absente de la main');
  }
  const players: [PlayerState, PlayerState] = [state.players[0], state.players[1]];
  players[active] = { ...players[active], hand: players[active].hand.filter((id) => id !== cardId) };
  let moved: GameState = { ...state, players, discard: [...state.discard, cardId] };
  const def = cardOf(cardId);
  if (pending.purpose === 'discardInfluence' && def) {
    moved = gainInfluence(moved, def.planet, active, 1);
  } else if (pending.purpose === 'discardValue') {
    const value = def ? def.cost : 0;
    const p2: [PlayerState, PlayerState] = [moved.players[0], moved.players[1]];
    p2[active] = { ...p2[active], credits: p2[active].credits + value };
    moved = { ...moved, players: p2 };
  }
  const remaining = pending.remaining - 1;
  if (remaining > 0 && moved.players[active].hand.length > 0 && moved.winner === null) {
    return { ...moved, pending: { kind: 'chooseHandCard', purpose: pending.purpose, remaining } };
  }
  return resolve({ ...moved, pending: null, resolution: { queue: moved.resolution!.queue.slice(1), ctx, chosen } });
}
```

- [ ] **Step 8: `moves.ts` — `Move`, `legalMoves`, `applyMove`**

`import { cardOf, resolve, decide as decideEffect, chooseBranch, skipBranch, decideTech as decideTechEffect, decideCard as decideCardEffect } from './effects';`

`Move` :

```typescript
  | { t: 'decideCard'; cardId: string };
```

`applyMove` (après `decideTech`) :

```typescript
  if (move.t === 'decideCard') {
    if (state.pending === null) return state;
    return finishOrPending(decideCardEffect(state, move.cardId));
  }
```

`legalMoves` (bloc `pending`, après `chooseTech`) :

```typescript
    if (pending.kind === 'chooseHandCard') {
      return state.players[player].hand.map((cardId) => ({ t: 'decideCard', cardId }));
    }
```

- [ ] **Step 9: Vérifier + non-régression**

Run: `npx jest effects-atoms && npx jest && npm run typecheck`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add src/engine/types.ts src/engine/effects.ts src/engine/moves.ts src/engine/__tests__/effects-atoms.test.ts
git commit -m "feat(engine): discardHand + creditsFromCardValue (chooseHandCard)"
```

---

## Task 11: Cartes — `takeBoardBonusToken` (jeton VISIBLE en jeu)

Lexique (p.1) : **Jeton bonus (étoile + œil)** = prendre 1 jeton VISIBLE en jeu (plateau Planètes OU emplacement Technologie), appliquer son effet, le défausser. (Distinct de `bonusToken` (étoile seule) qui tire de la RÉSERVE — déjà existant.)

Les jetons visibles = `planets[p].bonusToken` (≠ null) et `techBonus[people]` (≠ null). Le joueur choisit un emplacement → on applique les effets du jeton, on retire le jeton du plateau et on le défausse. Réutilise le `Move` `{ t: 'choose'; index }` (Task 1) via la décision `chooseBoardToken`.

**Files:**
- Modify: `src/engine/types.ts` (union `Effect`, `PendingDecision`, + `BoardTokenSlot`)
- Modify: `src/engine/effects.ts` (`resolve`, `applyEffect`, `chooseBranch`)
- Modify: `src/engine/moves.ts` (`legalMoves`)
- Test: `src/engine/__tests__/effects-atoms.test.ts` (append)

**Interfaces:**
- Consumes: `chooseBranch` / `Move` `{t:'choose',index}` (Task 1), `tokenOf`.
- Produces:
  - `{ k: 'takeBoardBonusToken' }`
  - `BoardTokenSlot = { kind: 'planet'; planet: Planet } | { kind: 'tech'; people: People }`
  - `PendingDecision` `{ kind: 'chooseBoardToken'; slots: BoardTokenSlot[] }`

- [ ] **Step 1: Tests qui échouent**

```typescript
// append à effects-atoms.test.ts
import { PLANETS } from '../types';
import { chooseBranch } from '../effects';

test("takeBoardBonusToken : choisit un jeton de planète visible, applique et défausse", () => {
  const base = createGame(CONFIG, 1);
  const planets = { ...base.planets };
  for (const p of PLANETS) planets[p] = { ...planets[p], bonusToken: p === 'terra' ? 'tok-cred3-1' : null };
  const s: GameState = {
    ...base,
    planets,
    techBonus: { animod: null, humain: null, robot: null },
    resolution: { queue: [{ k: 'takeBoardBonusToken' }], ctx: CTX },
  };
  const paused = resolve(s);
  expect(paused.pending).toEqual({ kind: 'chooseBoardToken', slots: [{ kind: 'planet', planet: 'terra' }] });
  const out = chooseBranch(paused, 0);
  expect(out.players[0].credits).toBe(base.players[0].credits + 3);
  expect(out.planets.terra.bonusToken).toBeNull();
  expect(out.bonusDiscard).toContain('tok-cred3-1');
});

test("takeBoardBonusToken : jeton d'emplacement techno", () => {
  const base = createGame(CONFIG, 1);
  const planets = { ...base.planets };
  for (const p of PLANETS) planets[p] = { ...planets[p], bonusToken: null };
  const s: GameState = {
    ...base,
    planets,
    techBonus: { animod: 'tok-zen1-1', humain: null, robot: null },
    resolution: { queue: [{ k: 'takeBoardBonusToken' }], ctx: CTX },
  };
  const paused = resolve(s);
  expect(paused.pending).toEqual({ kind: 'chooseBoardToken', slots: [{ kind: 'tech', people: 'animod' }] });
  const out = chooseBranch(paused, 0);
  expect(out.players[0].zenithium).toBe(base.players[0].zenithium + 1);
  expect(out.techBonus.animod).toBeNull();
});

test("takeBoardBonusToken : aucun jeton visible => atome sauté", () => {
  const base = createGame(CONFIG, 1);
  const planets = { ...base.planets };
  for (const p of PLANETS) planets[p] = { ...planets[p], bonusToken: null };
  const s: GameState = {
    ...base,
    planets,
    techBonus: { animod: null, humain: null, robot: null },
    resolution: { queue: [{ k: 'takeBoardBonusToken' }, { k: 'credits', amount: 2, target: 'self' }], ctx: CTX },
  };
  const out = resolve(s);
  expect(out.pending).toBeNull();
  expect(out.resolution).toBeNull();
  expect(out.players[0].credits).toBe(base.players[0].credits + 2);
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx jest effects-atoms -t "takeBoardBonusToken"`
Expected: FAIL.

- [ ] **Step 3: Types**

`types.ts` — ajouter le type `BoardTokenSlot` (près de `PendingDecision`) :

```typescript
export type BoardTokenSlot = { kind: 'planet'; planet: Planet } | { kind: 'tech'; people: People };
```

`Effect` :

```typescript
  | { k: 'takeBoardBonusToken' }
```

`PendingDecision` :

```typescript
  | { kind: 'chooseBoardToken'; slots: BoardTokenSlot[] }
```

- [ ] **Step 4: `effects.ts` — import type, `applyEffect`, `resolve`, `chooseBranch`**

Ajouter `BoardTokenSlot` au `import type { ... } from './types';`.

`applyEffect` :

```typescript
    case 'takeBoardBonusToken':
      throw new Error("applyEffect: 'takeBoardBonusToken' passe par resolve/chooseBranch");
```

`resolve` (après le bloc `bonusToken`) :

```typescript
    if (head.k === 'takeBoardBonusToken') {
      const slots: BoardTokenSlot[] = [
        ...PLANETS.filter((p) => s.planets[p].bonusToken !== null).map((p) => ({ kind: 'planet' as const, planet: p })),
        ...PEOPLES.filter((pe) => s.techBonus[pe] !== null).map((pe) => ({ kind: 'tech' as const, people: pe })),
      ];
      if (slots.length === 0) {
        s = { ...s, resolution: { queue: s.resolution!.queue.slice(1), ctx, chosen: s.resolution!.chosen } };
        continue;
      }
      s = { ...s, pending: { kind: 'chooseBoardToken', slots } };
      break;
    }
```

`chooseBranch` (avant le `throw` final) :

```typescript
  if (pending.kind === 'chooseBoardToken') {
    if (head.k !== 'takeBoardBonusToken') throw new Error('chooseBranch: atome de tête inattendu');
    const slot = pending.slots[index];
    if (!slot) throw new Error('chooseBranch: jeton hors bornes');
    let tokenId: string;
    let ns: GameState;
    if (slot.kind === 'planet') {
      tokenId = state.planets[slot.planet].bonusToken!;
      ns = { ...state, planets: { ...state.planets, [slot.planet]: { ...state.planets[slot.planet], bonusToken: null } } };
    } else {
      tokenId = state.techBonus[slot.people]!;
      ns = { ...state, techBonus: { ...state.techBonus, [slot.people]: null } };
    }
    const fx = tokenOf(tokenId).effects;
    const s: GameState = { ...ns, bonusDiscard: [...ns.bonusDiscard, tokenId], pending: null, resolution: { queue: [...fx, ...rest], ctx, chosen } };
    return resolve(s);
  }
```

- [ ] **Step 5: `legalMoves`**

Dans le bloc `pending`, après le cas `chooseHandCard` :

```typescript
    if (pending.kind === 'chooseBoardToken') {
      return pending.slots.map((_, i) => ({ t: 'choose', index: i }));
    }
```

- [ ] **Step 6: Vérifier + non-régression**

Run: `npx jest effects-atoms && npx jest && npm run typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/engine/types.ts src/engine/effects.ts src/engine/moves.ts src/engine/__tests__/effects-atoms.test.ts
git commit -m "feat(engine): atome takeBoardBonusToken (jeton visible)"
```

---

## Hors périmètre

- **Transcription des 90 cartes agent** en données (`CardDef.effects`) : c'est le PLAN SUIVANT ; ce plan ne livre que le VOCABULAIRE moteur (combinateurs + atomes) qui la rendra possible. `src/data/fixtures.ts` n'est PAS modifié.
- **UI / rendu** : aucune icône, aucun composant, aucun affichage des décisions (`confirmOptional`, `chooseOption`, `chooseTier`, `chooseTech`, `chooseHandCard`, `chooseBoardToken`). Le moteur expose seulement `legalMoves`/`applyMove`.
- **Réseau / persistance / multijoueur** : hors sujet (moteur pur).
- **Bot / IA** (`bot.ts`) : le bot consomme `legalMoves` ; on ne lui ajoute PAS de stratégie pour les nouveaux moves ici (il choisira une option légale par défaut ; affinage ultérieur).
- **Gating d'accessibilité des coûts** (`optional`/`scale`/`conditional`) : on ne filtre pas « le joueur peut-il payer le coût ? » avant de proposer l'action (les coûts sont bornés à la réserve). À décider si le lexique l'exige.
- **`influenceOpponentSide`** (disque « côté adversaire ») : NON implémenté — mécanique ambiguë (voir Questions ouvertes).

## Questions ouvertes (à clarifier AVANT transcription — ne pas deviner)

1. **`influenceOpponentSide`** (« Disque « côté adversaire » = 1 influence sur une planète du côté de l'adversaire », lexique §Influence) : signifie-t-il pousser le disque vers la ZONE adverse (influence « négative »), gagner de l'influence sur une planète déjà penchée côté adverse, ou autre ? Non modélisable sans deviner → laissé de côté (Task 7).
2. **`transfer`/`exile` « corresponding »** : « colonne correspondante (couleur de la carte) » est interprété comme `ctx.planet` (la planète/couleur de la carte agent qui porte l'effet). À confirmer que l'icône couleur = toujours la couleur de la carte, et non une couleur arbitraire indiquée par l'icône (auquel cas il faudrait un champ `color: Planet` sur l'atome).
3. **`giveLeaderBadge`** : le côté (argent/or) du badge une fois donné à l'adversaire n'est pas précisé → on conserve le `side` courant (Task 6).
4. **Paliers `scale` et coûts d'`optional`** : gating d'accessibilité (cf. Hors périmètre) — comportement à confirmer.
5. **`conditional` — conditions au-delà de `hasLeaderBadge`** : le lexique évoque « possession d'un élément » de façon générique. Seules `hasLeaderBadge` et `creditsAtLeast` sont modélisées ; les autres conditions concrètes (ex. possession d'un jeton, d'une techno) seront ajoutées à `Condition` lors de la transcription, au cas par cas.

## Self-Review

### 1. Couverture du lexique (`docs/content/lexique-icones.md`)

**Combinateurs (§Récap)** :
- `optional` (chevron ⟋) → Task 1 ✅
- `conditional` (« ! ») → Task 2 ✅ (+ `Condition`)
- `choice` (« / ») → Task 3 ✅
- `scale` (échelle à paliers) → Task 4 ✅

**Atomes ressources** :
- `creditsFromCardValue {transfer|exileOpponent|discardHand}` → Task 10 ✅
- `creditsPerCardColors` → Task 5 ✅
- `creditsPerTechLevels {tiers:[4,8,12]}` → Task 5 ✅
- `steal` (`3 rouge ↓`, prendre crédits/zénithium) → DÉJÀ existant ✅ (non recréé)
- `giveOpponent {resource, amount}` → Task 6 ✅ ; `giveLeaderBadge` → Task 6 ✅

**Atomes influence** :
- `influence` choice/neighbors/different/each → DÉJÀ existants ✅
- `influenceChoiceExcept` (barré) → Task 7 ✅
- `influenceOpponentSide` → **NON modélisé** (Question ouverte #1) ⚠️
- `moveDiscToCenter` (→ centre) → Task 7 ✅
- `influenceChoiceAtCenter` (double flèche centre) → Task 7 ✅
- `giveInfluenceOpponent` (↑rouge + disque) → Task 7 ✅
- combinés `transfer/mobilize/exile/discardHand + influence` → Task 9 (transfer/exile) ✅, Task 10 (discardHand) ✅, mobilize+influence DÉJÀ existant (`mobilize.thenInfluence`) ✅
- `exileForInfluence` (exil-échelle couleur ⟋ influence) → DÉJÀ existant ✅
- `influence en payant des crédits` (`3×/7×/12× crédits ⟋ …`) → couvert par composition `scale { tiers: [{cost:[credits -N], reward:[influenceChoiceExcept …]}] }` (Task 4 + Task 7) ✅

**Atomes techno** :
- `developDiscounted {cardPeople|choice, discount}` → Task 8 ✅
- `developLowest {cost:0}` → Task 8 ✅
- règle « toutes les règles Développer sauf coût-carte » → `developTech` réutilisé (Task 8) ✅

**Atomes cartes** :
- `transfer {corresponding|choice}` → Task 9 ✅
- `exile {ownCorresponding|opponentChoice}` → Task 9 (via `{side, corresponding}`) ✅
- `mobilize` → DÉJÀ existant ✅
- `discardHand` (gant) → Task 10 ✅ ; `discardHandAll` (poing) → Task 9 ✅
- `takeBoardBonusToken` (étoile + œil) → Task 11 ✅ ; `bonusToken` (étoile, réserve) → DÉJÀ existant ✅
- `takeLeader` (badge argent/or) → DÉJÀ existant ✅

### 2. Scan des placeholders

Aucun « TBD / TODO / à implémenter plus tard / gérer les cas limites » : chaque étape porte du code réel, des chemins exacts et des commandes exactes. ✅

### 3. Cohérence des types entre tâches

- **`Effect`** : chaque variante ajoutée reçoit, dans la même tâche, soit un `case` réel (`credits*`, `give*`, `discardHandAll`) soit un `case` qui `throw` (atomes/combinateurs différés) → exhaustivité du `switch` de `applyEffect` préservée à chaque commit. ✅
- **`PendingDecision`** : `confirmOptional` (T1) réutilisé par `conditional` (T2) ; `chooseOption` (T3), `chooseTier` (T4), `moveDiscToCenter` (T7), `chooseTech` (T8), `chooseHandCard` (T10), `chooseBoardToken` (T11). Enrichissements de `choosePlanet` (`atCenter`, `beneficiary` — T7) et `chooseColumn` (`thenInfluence` — T9, `gainCreditsFromValue` — T10) sont des champs OPTIONNELS → rétrocompatibles avec les flux existants. ✅
- **`Move`** : `{t:'choose',index}` / `{t:'skip'}` (T1) réutilisés par `chooseOption`/`chooseTier`/`chooseBoardToken` ; `{t:'decideTech',people}` (T8) ; `{t:'decideCard',cardId}` (T10) ; `{t:'decide',planet}` (existant) étendu à `moveDiscToCenter`/`atCenter`/`beneficiary`. `legalMoves` gère explicitement CHAQUE `pending.kind` (retours anticipés) et le fallback `choosePlanet` est gardé par `pending.kind === 'choosePlanet'` (T7). ✅
- **`Condition`** : `{c:'hasLeaderBadge', side?}` / `{c:'creditsAtLeast', amount}` — consommé uniquement par `conditional` via `evalCondition` (T2). ✅
- **Fonctions de reprise** : `chooseBranch`/`skipBranch` (T1, étendues T2/T3/T4/T11), `decide` (existant, étendu T7/T9/T10), `decideTech` (T8), `decideCard` (T10) — nommage cohérent entre `effects.ts` (définition) et `moves.ts` (import aliasé `decideTechEffect`/`decideCardEffect`). ✅
- **`developTech`** : signature unique `(state, player, people, costOverride?) => { state, queue } | null`, appelée à l'identique par le move `develop` (T8) et les atomes `developDiscounted`/`developLowest` (T8) et `decideTech` (T8). ✅

### Liste des tâches

1. **Task 1** — Infra décisions non-planète (`confirmOptional`, Moves `choose`/`skip`) + combinateur `optional`.
2. **Task 2** — Combinateur `conditional` + type `Condition` (`evalCondition`).
3. **Task 3** — Combinateur `choice` (`chooseOption`).
4. **Task 4** — Combinateur `scale` (`chooseTier`, + `skip`).
5. **Task 5** — Atomes ressources `creditsPerCardColors`, `creditsPerTechLevels`.
6. **Task 6** — Atomes adversaire `giveOpponent`, `giveLeaderBadge`.
7. **Task 7** — Atomes influence `influenceChoiceExcept`, `influenceChoiceAtCenter`, `giveInfluenceOpponent`, `moveDiscToCenter` (`influenceOpponentSide` = Question ouverte).
8. **Task 8** — Techno : extraction `developTech` + `developDiscounted` + `developLowest` (`chooseTech`/`decideTech`).
9. **Task 9** — Cartes (colonnes) : variantes `transfer {from}` / `exile {corresponding}` + influence combinée (`thenInfluence`) + `discardHandAll`.
10. **Task 10** — Cartes (main) : `chooseHandCard`/`decideCard` + `discardHand` + `creditsFromCardValue`.
11. **Task 11** — Cartes : `takeBoardBonusToken` (`chooseBoardToken`).

---

## Execution Handoff

**Plan complet, sauvegardé dans `docs/superpowers/plans/2026-07-23-zenith-vocabulaire-cartes.md`. Deux options d'exécution :**

**1. Subagent-Driven (recommandé)** — un subagent frais par tâche, revue entre les tâches, itération rapide (REQUIRED SUB-SKILL : `superpowers:subagent-driven-development`).

**2. Inline Execution** — exécution des tâches dans cette session avec checkpoints (REQUIRED SUB-SKILL : `superpowers:executing-plans`).

**Quelle approche ?**

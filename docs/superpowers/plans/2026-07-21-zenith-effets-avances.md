# Effets avancés (atomes pilotés par les technos confirmées) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development pour exécuter ce plan tâche par tâche. Les étapes utilisent la syntaxe checkbox (`- [ ]`).

**Goal:** Ajouter au moteur pur les atomes d'effet manquants réellement exigés par les faces technologiques **confirmées** par l'utilisateur (`docs/content/technologies.md`), sans rien inventer.

**Architecture:** On étend l'union `Effect` (fichier `src/engine/types.ts`) et le dispatcher `applyEffect` / la boucle `resolve` / le résolveur `decide` (`src/engine/effects.ts`). Les effets multi-parties d'une techno sont déjà modélisés comme un **tableau `Effect[]`** appliqué en ordre (cf. `develop` qui empile `levels[n].effects`) : **aucun combinateur `chain` n'est nécessaire**. Les décisions interactives suivent le patron existant `pending` + `resolve`/`decide` (comme `choosePlanet`).

**Tech Stack:** TypeScript strict, jest + ts-jest. Aucune dépendance runtime.

## Global Constraints

- **Moteur pur** : aucun import `react` / `react-native` / `expo` / `expo-*` / `net` / socket dans `src/engine` ou `src/data` (garanti par `purity.test.ts`).
- **Immuabilité stricte** : aucune mutation en place de `state` ni de ses sous-objets ; toujours des copies (`{...}` / `[...]` / `.map` / `.filter`).
- **Déterminisme** : toute pioche/aléa passe par `state.rng` (jamais `Math.random`).
- **TDD** : chaque tâche = test qui échoue → implémentation minimale → vert → commit. Code complet, aucun placeholder.
- **Ne rien casser** : les 50 tests existants doivent rester verts ; réutiliser `gainInfluence`, `resolve`, `decide`, `finishOrPending`, `applyMobilize`.
- **Effets réels, non inventés** : chaque atome est justifié par une face techno confirmée (citée dans sa tâche). Les fixtures restent marquées `*_NON_CANONICAL`. Les points reposant sur une hypothèse non confirmée renvoient à `docs/content/questions-regles.md` (Q1–Q6) et sont marqués « à confirmer ».
- **Cap de victoire** : `gainInfluence` fixe déjà `state.winner` ; tout atome bouclant sur plusieurs planètes doit s'arrêter dès que `winner !== null`.

## File Structure

- `src/engine/types.ts` — étendre l'union `Effect` (nouveaux atomes) et `PendingDecision` (nouvelles décisions), ajouter le suivi `chosen` à `ResolutionState`.
- `src/engine/effects.ts` — ajouter les branches `applyEffect`, le déclenchement des `pending` dans `resolve`, et les branches de `decide`.
- `src/engine/moves.ts` — `legalMoves`/`applyMove` inchangés sauf si un nouveau type de décision impose un nouveau `Move` (traité en Tâche 3).
- `src/engine/__tests__/effects.test.ts` et `moves.test.ts` — tests par atome.

## Justification atome → face techno (source : technologies.md, colonne « Réel »)

| Atome | Faces justificatives | Statut |
| --- | --- | --- |
| `steal` (crédits/zénithium) | U3 « voler 3 crédits », O2 « voler 1 zénithium » | confirmé |
| `influenceEach` | D4 « 1 influence sur chaque planète (les 5) » | confirmé |
| `influenceNeighbors` (count, amount) | S2 (1×2 voisines), U4 (1×3 voisines), O4 (2×2 voisines) | hypothèse Q5/Q6 |
| influence « différente » (exclude) | N3 « 2 sur une planète au choix + 1 sur une autre différente » | hypothèse N3 |

**Déjà couvert par l'existant, aucune tâche :** S5/U5/N5/D5/O5/P5 (« 2 sur une même planète au choix ») = `influence{on:'choice',amount:2}` ; S4 (« mobiliser 3 + 1 influence par couleur ») = `mobilize{count:3,thenInfluence:true}` ; N4/P3 (crédits) = `credits` ; N2 = `takeLeader`.

---

### Task 1: Atome `steal` (voler crédits/zénithium à l'adversaire)

Justifié par **U3** (voler 3 crédits) et **O2** (voler 1 zénithium). Sémantique : l'adversaire perd jusqu'à `amount` de la ressource (borné par son stock), le joueur actif gagne exactement ce qui a été retiré.

**Files:**
- Modify: `src/engine/types.ts` (union `Effect`)
- Modify: `src/engine/effects.ts` (`applyEffect`)
- Test: `src/engine/__tests__/effects.test.ts`

**Interfaces:**
- Produces: variante `{ k: 'steal'; resource: 'credits' | 'zenithium'; amount: number }` ajoutée à `Effect`.
- Consumes: `applyEffect(state, effect, ctx)` existant ; `ctx.player` = voleur ; l'adversaire = `ctx.player === 0 ? 1 : 0`.

- [ ] **Step 1: Écrire le test** — `src/engine/__tests__/effects.test.ts`

```ts
import { applyEffect } from '../effects';
import { createGame } from '../setup';
import type { GameState } from '../types';

const CONFIG = { techSetup: { animod: 'S', humain: 'U', robot: 'N' }, firstPlayer: 0 } as const;

test("steal retire la ressource à l'adversaire et la donne au joueur (borné)", () => {
  const base = createGame(CONFIG, 1);
  const ctx = { player: 0 as const, planet: 'terra' as const };
  // adversaire (joueur 1) : on fixe 2 crédits pour tester le plafonnement à son stock
  const s: GameState = {
    ...base,
    players: [
      { ...base.players[0], credits: 5 },
      { ...base.players[1], credits: 2 },
    ],
  };
  const out = applyEffect(s, { k: 'steal', resource: 'credits', amount: 3 }, ctx);
  // l'adversaire n'a que 2 : on vole 2, pas 3
  expect(out.players[1].credits).toBe(0);
  expect(out.players[0].credits).toBe(5 + 2);
});
```

- [ ] **Step 2: Lancer le test → échec**

Run: `npx jest effects -t steal`
Expected: FAIL (`steal` non géré par `applyEffect`).

- [ ] **Step 3: Étendre l'union `Effect`** — `src/engine/types.ts`

Ajouter à l'union `Effect` (après la ligne `takeLeader`) :
```ts
  | { k: 'steal'; resource: 'credits' | 'zenithium'; amount: number }
```

- [ ] **Step 4: Implémenter la branche** — `src/engine/effects.ts`

Dans le `switch (effect.k)` de `applyEffect`, ajouter avant la fermeture :
```ts
    case 'steal': {
      const thief = ctx.player;
      const victim: PlayerIndex = thief === 0 ? 1 : 0;
      const avail = state.players[victim][effect.resource];
      const taken = Math.min(effect.amount, avail);
      const players: [PlayerState, PlayerState] = [state.players[0], state.players[1]];
      players[victim] = { ...players[victim], [effect.resource]: avail - taken };
      players[thief] = { ...players[thief], [effect.resource]: players[thief][effect.resource] + taken };
      return { ...state, players };
    }
```

- [ ] **Step 5: Relancer → vert, puis suite complète**

Run: `npx jest effects -t steal` → PASS ; puis `npx jest && npm run typecheck` → PASS.

- [ ] **Step 6: Commit**

```bash
git add src/engine/types.ts src/engine/effects.ts src/engine/__tests__/effects.test.ts
git commit -m "feat(engine): atome steal (voler crédits/zénithium, borné au stock adverse)"
```

---

### Task 2: Atome `influenceEach` (1 influence sur chaque planète)

Justifié par **D4** (« 1 influence sur chaque planète — les 5 »). Applique `amount` d'influence sur les 5 planètes pour le joueur actif, en s'arrêtant si une victoire est déclenchée.

**Files:**
- Modify: `src/engine/types.ts` (union `Effect`)
- Modify: `src/engine/effects.ts` (`applyEffect`)
- Test: `src/engine/__tests__/effects.test.ts`

**Interfaces:**
- Produces: `{ k: 'influenceEach'; amount: number }`.
- Consumes: `gainInfluence(state, planet, player, amount)` et `PLANETS` de `./types`.

- [ ] **Step 1: Écrire le test** — `src/engine/__tests__/effects.test.ts`

```ts
import { PLANETS } from '../types';

test('influenceEach déplace le disque de chaque planète pour le joueur', () => {
  const base = createGame(CONFIG, 1);
  const before = PLANETS.map((p) => base.planets[p].discPos);
  const out = applyEffect(base, { k: 'influenceEach', amount: 1 }, { player: 0, planet: 'terra' });
  // joueur 0 pousse vers sa zone (dir -1) : chaque disque diminue de 1 (aucune capture ici)
  PLANETS.forEach((p, i) => expect(out.planets[p].discPos).toBe(before[i]! - 1));
});
```

- [ ] **Step 2: Lancer → échec**

Run: `npx jest effects -t influenceEach`
Expected: FAIL.

- [ ] **Step 3: Étendre l'union** — `src/engine/types.ts`

```ts
  | { k: 'influenceEach'; amount: number }
```

- [ ] **Step 4: Implémenter** — `src/engine/effects.ts`

Ajouter au `switch` (importer `PLANETS` en tête : `import { ... , PLANETS } from './types';` — vérifier qu'il n'est pas déjà importé) :
```ts
    case 'influenceEach': {
      let s = state;
      for (const p of PLANETS) {
        s = gainInfluence(s, p, ctx.player, effect.amount);
        if (s.winner !== null) break;
      }
      return s;
    }
```

- [ ] **Step 5: Relancer → vert, puis suite complète**

Run: `npx jest effects -t influenceEach` → PASS ; puis `npx jest && npm run typecheck` → PASS.

- [ ] **Step 6: Commit**

```bash
git add src/engine/types.ts src/engine/effects.ts src/engine/__tests__/effects.test.ts
git commit -m "feat(engine): atome influenceEach (1 influence sur chaque planète)"
```

---

### Task 3: Atome `influenceNeighbors` + décision `chooseSegment`

Justifié par **S2** (1 influence × 2 voisines), **U4** (1 × 3 voisines), **O4** (2 × 2 voisines). **À CONFIRMER (Q5/Q6)** : hypothèse retenue = adjacence **linéaire non circulaire** sur la rangée `mercure–venus–terra–mars–jupiter` ; le joueur choisit le **segment contigu** de `count` planètes (identifié par sa planète la plus à gauche) ; chaque planète du segment reçoit `amount` influence.

**Files:**
- Modify: `src/engine/types.ts` (union `Effect`, `PendingDecision`)
- Modify: `src/engine/effects.ts` (`resolve`, `decide`)
- Test: `src/engine/__tests__/effects.test.ts`

**Interfaces:**
- Produces: `{ k: 'influenceNeighbors'; count: number; amount: number }` ; `PendingDecision` gagne `{ kind: 'chooseSegment'; count: number; amount: number }`.
- Consumes: `resolve`/`decide` existants ; `decide(state, planet)` où `planet` = planète la plus à gauche du segment.

- [ ] **Step 1: Écrire le test** — `src/engine/__tests__/effects.test.ts`

```ts
import { resolve, decide } from '../effects';

test('influenceNeighbors met en attente un chooseSegment puis applique amount sur count planètes contiguës', () => {
  const base = createGame(CONFIG, 1);
  const s = {
    ...base,
    resolution: { queue: [{ k: 'influenceNeighbors', count: 2, amount: 1 } as const], ctx: { player: 0 as const, planet: 'terra' as const } },
  };
  const paused = resolve(s);
  expect(paused.pending).toEqual({ kind: 'chooseSegment', count: 2, amount: 1 });
  // segment commençant à 'venus' → venus + terra reçoivent chacune 1 (dir -1 pour joueur 0)
  const before = { venus: base.planets.venus.discPos, terra: base.planets.terra.discPos };
  const out = decide(paused, 'venus');
  expect(out.pending).toBeNull();
  expect(out.planets.venus.discPos).toBe(before.venus - 1);
  expect(out.planets.terra.discPos).toBe(before.terra - 1);
});

test('influenceNeighbors rejette un segment qui dépasse la rangée (pas d’enroulement)', () => {
  const base = createGame(CONFIG, 1);
  const s = {
    ...base,
    resolution: { queue: [{ k: 'influenceNeighbors', count: 2, amount: 1 } as const], ctx: { player: 0 as const, planet: 'terra' as const } },
  };
  const paused = resolve(s);
  // 'jupiter' est la dernière : un segment de 2 déborderait → erreur
  expect(() => decide(paused, 'jupiter')).toThrow();
});
```

- [ ] **Step 2: Lancer → échec**

Run: `npx jest effects -t influenceNeighbors`
Expected: FAIL.

- [ ] **Step 3: Étendre les types** — `src/engine/types.ts`

Ajouter à l'union `Effect` :
```ts
  | { k: 'influenceNeighbors'; count: number; amount: number }
```
Remplacer `PendingDecision` par une union :
```ts
export type PendingDecision =
  | { kind: 'choosePlanet'; amount: number; exclude?: Planet[] }
  | { kind: 'chooseSegment'; count: number; amount: number };
```
(Le champ `exclude` sert à la Tâche 4 ; l'ajouter dès maintenant évite un second remaniement.)

- [ ] **Step 4: Déclencher le pending dans `resolve`** — `src/engine/effects.ts`

Dans la boucle `while` de `resolve`, après le bloc `if (head.k === 'influence' && head.on === 'choice')`, ajouter :
```ts
    if (head.k === 'influenceNeighbors') {
      s = { ...s, pending: { kind: 'chooseSegment', count: head.count, amount: head.amount } };
      break;
    }
```

- [ ] **Step 5: Gérer la décision dans `decide`** — `src/engine/effects.ts`

Remplacer le corps de `decide` par une version qui branche selon `pending.kind` :
```ts
export function decide(state: GameState, planet: Planet): GameState {
  if (state.pending === null || state.resolution === null) {
    throw new Error('decide: aucune décision en attente');
  }
  const ctx = state.resolution.ctx;
  const pending = state.pending;
  let s: GameState;
  if (pending.kind === 'chooseSegment') {
    const start = PLANETS.indexOf(planet);
    if (start < 0 || start + pending.count > PLANETS.length) {
      throw new Error('decide: segment invalide (débordement de la rangée)');
    }
    s = state;
    for (let i = 0; i < pending.count; i++) {
      s = gainInfluence(s, PLANETS[start + i]!, ctx.player, pending.amount);
      if (s.winner !== null) break;
    }
  } else {
    // choosePlanet
    if (pending.exclude && pending.exclude.includes(planet)) {
      throw new Error('decide: planète exclue (doit être différente)');
    }
    s = gainInfluence(state, planet, ctx.player, pending.amount);
  }
  s = { ...s, pending: null, resolution: { queue: s.resolution!.queue.slice(1), ctx } };
  return resolve(s);
}
```

- [ ] **Step 6: Relancer → vert, puis suite complète**

Run: `npx jest effects -t influenceNeighbors` → PASS ; puis `npx jest && npm run typecheck` → PASS.

- [ ] **Step 7: Commit**

```bash
git add src/engine/types.ts src/engine/effects.ts src/engine/__tests__/effects.test.ts
git commit -m "feat(engine): atome influenceNeighbors + décision chooseSegment (à confirmer Q5/Q6)"
```

---

### Task 4: Influence « sur une planète différente » (atome `influenceDifferent`)

Justifié par **N3** (« 2 influences sur une même planète au choix **+ 1 sur une autre planète différente** »). Modélisation N3 = tableau `[{influence choice 2}, {influenceDifferent 1}]`. `influenceDifferent` met en attente un `choosePlanet` dont `exclude` = les planètes déjà choisies **dans la même résolution**. Il faut donc mémoriser les planètes choisies au fil de la résolution.

**Files:**
- Modify: `src/engine/types.ts` (union `Effect`, champ `chosen` de `ResolutionState`)
- Modify: `src/engine/effects.ts` (`resolve`, `decide`)
- Test: `src/engine/__tests__/effects.test.ts`

**Interfaces:**
- Produces: `{ k: 'influenceDifferent'; amount: number }` ; `ResolutionState` gagne `chosen?: Planet[]`.
- Consumes: `resolve`/`decide` de la Tâche 3.

- [ ] **Step 1: Écrire le test** — `src/engine/__tests__/effects.test.ts`

```ts
test('influenceDifferent exclut la planète déjà choisie dans la même résolution (N3)', () => {
  const base = createGame(CONFIG, 1);
  const s = {
    ...base,
    resolution: {
      queue: [
        { k: 'influence', on: 'choice', amount: 2 } as const,
        { k: 'influenceDifferent', amount: 1 } as const,
      ],
      ctx: { player: 0 as const, planet: 'terra' as const },
    },
  };
  const p1 = resolve(s); // 1er choix (amount 2)
  expect(p1.pending).toEqual({ kind: 'choosePlanet', amount: 2 });
  const p2 = decide(p1, 'terra'); // choisit terra ; enchaîne sur influenceDifferent
  expect(p2.pending).toEqual({ kind: 'choosePlanet', amount: 1, exclude: ['terra'] });
  // rechoisir terra est interdit
  expect(() => decide(p2, 'terra')).toThrow();
  // une autre planète est acceptée et clôt la résolution
  const out = decide(p2, 'mars');
  expect(out.pending).toBeNull();
  expect(out.resolution).toBeNull();
});
```

- [ ] **Step 2: Lancer → échec**

Run: `npx jest effects -t influenceDifferent`
Expected: FAIL.

- [ ] **Step 3: Étendre les types** — `src/engine/types.ts`

Ajouter à l'union `Effect` :
```ts
  | { k: 'influenceDifferent'; amount: number }
```
Modifier `ResolutionState` :
```ts
export type ResolutionState = { queue: Effect[]; ctx: EffectCtx; chosen?: Planet[] };
```

- [ ] **Step 4: `resolve` — déclencher le pending avec exclusion** — `src/engine/effects.ts`

Dans la boucle `while` de `resolve`, ajouter (après le bloc `influenceNeighbors`) :
```ts
    if (head.k === 'influenceDifferent') {
      const chosen = s.resolution!.chosen ?? [];
      s = { ...s, pending: { kind: 'choosePlanet', amount: head.amount, exclude: chosen } };
      break;
    }
```

- [ ] **Step 5: `decide` — mémoriser les planètes choisies** — `src/engine/effects.ts`

Dans `decide` (version de la Tâche 3), au moment de reconstruire `resolution`, propager `chosen`. Remplacer la dernière affectation de `s` par :
```ts
  const prevChosen = state.resolution.chosen ?? [];
  const justChosen: Planet[] =
    pending.kind === 'chooseSegment'
      ? PLANETS.slice(PLANETS.indexOf(planet), PLANETS.indexOf(planet) + pending.count)
      : [planet];
  s = {
    ...s,
    pending: null,
    resolution: { queue: s.resolution!.queue.slice(1), ctx, chosen: [...prevChosen, ...justChosen] },
  };
  return resolve(s);
```
(Le calcul de `start`/validation reste inchangé en amont ; seule la reconstruction de `resolution` gagne `chosen`.)

- [ ] **Step 6: Relancer → vert, puis suite complète**

Run: `npx jest effects -t influenceDifferent` → PASS ; puis `npx jest && npm run typecheck` → PASS.

- [ ] **Step 7: Commit**

```bash
git add src/engine/types.ts src/engine/effects.ts src/engine/__tests__/effects.test.ts
git commit -m "feat(engine): atome influenceDifferent (planète différente, N3 — à confirmer)"
```

---

## Hors périmètre (renvoyé à des plans ultérieurs)

- **Atomes ambigus, en attente de réponses utilisateur** (voir `docs/content/questions-regles.md`) :
  - `transfer` (S3, N1) — Q1 : direction, carte cible, colonne de destination, ré-application d'effets.
  - `exile` (D1, P2, P4) — Q2/Q3 : destination de la carte (défausse vs hors-jeu), contrainte « 2 couleurs différentes » de P4.
  - `bonusToken` (D3, O1) — Q4 : moment d'application de l'effet, composition/tirage de la réserve.
- **Combinateurs pilotés par les cartes** : `choose` / `conditional` / `trade`. Leurs formes réelles dépendent du contenu des 90 cartes, **non encore transcrit** ; les modéliser maintenant serait spéculatif (violerait « n'invente aucun effet »). À planifier après la transcription des cartes.
- **Contenu réel** (technos/cartes/jetons), **UI**, **transport réseau** : phases séparées.

## Self-Review

- **Couverture des faces confirmées** : U3/O2 → `steal` (T1) ; D4 → `influenceEach` (T2) ; S2/U4/O4 → `influenceNeighbors` (T3) ; N3 → `influenceDifferent` (T4). Faces déjà couvertes par l'existant listées dans le tableau de justification (S4, S5/U5/N5/D5/O5/P5, N2, N4/P3). Faces restantes (transfer/exile/bonusToken) explicitement hors périmètre car ambiguës.
- **Placeholders** : aucun ; code complet dans chaque étape.
- **Cohérence des types** : `PendingDecision` devient une union (`choosePlanet` avec `exclude?`, `chooseSegment`) introduite en T3 et réutilisée en T4 ; `ResolutionState.chosen?` introduit en T4 et lu par `resolve`/`decide` ; `decide(state, planet)` conserve sa signature (le `Move {t:'decide',planet}` reste inchangé, la planète servant d'entrée aux deux kinds). Les atomes ajoutés (`steal`, `influenceEach`, `influenceNeighbors`, `influenceDifferent`) sont tous dispatchés (soit dans `applyEffect`, soit interceptés dans `resolve`).
- **Note de risque** : T3/T4 reposent sur des hypothèses (Q5/Q6, N3) consignées dans `questions-regles.md` et marquées « à confirmer » dans les messages de commit — à revalider avec l'utilisateur avant la transcription du contenu réel.


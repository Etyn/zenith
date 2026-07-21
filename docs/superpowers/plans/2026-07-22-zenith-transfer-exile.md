# Déplacement de cartes : atomes `transfer` / `exile` + décision `chooseColumn` — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development pour exécuter ce plan tâche par tâche. Les étapes utilisent la syntaxe checkbox (`- [ ]`).

**Goal:** Ajouter au moteur pur deux atomes de **déplacement de cartes** confirmés par l'utilisateur — `transfer` (R1) et `exile` (R2) — ainsi que l'infrastructure de décision interactive **« choisir une colonne »** (`chooseColumn`) qui les pilote. Rien d'autre (P4/R3, jetons R4, contenu réel, UI, réseau sont **hors périmètre**).

**Architecture:** On réutilise **strictement** le modèle de décision existant (`pending` posé par `resolve`, résolu par `decide`, exécuté via le Move `{t:'decide',planet}` filtré par `legalMoves`). On étend l'union `Effect` (`src/engine/types.ts`) avec deux variantes, et l'union `PendingDecision` avec une variante `chooseColumn` — sur le modèle exact de `chooseSegment`. `resolve` intercepte `transfer`/`exile` (comme il intercepte déjà `influenceNeighbors`/`influenceDifferent`) : il vérifie l'**applicabilité** (au moins une colonne éligible non vide) puis pose un `chooseColumn`, sinon **ignore** l'atome (skip sans pending). `decide` gagne une branche `chooseColumn` qui déplace **une** carte, décrémente `remaining`, et **maintient l'atome en tête de file** tant que `remaining > 0` et qu'il reste des colonnes éligibles. Aucun nouveau type de `Move`, aucun effet rejoué, aucune influence gagnée par le déplacement.

**Tech Stack:** TypeScript strict, jest + ts-jest. Aucune dépendance runtime ajoutée.

## Global Constraints

- **Moteur pur** : aucun import `react` / `react-native` / `expo` / `expo-*` / `net` / socket dans `src/engine` ou `src/data` (garanti par `purity.test.ts`).
- **Immuabilité stricte** : aucune mutation en place de `state` ni de ses sous-objets ; toujours des copies (`{...}` / `[...]` / `.slice` / `.map` / `.filter`).
- **Déterminisme** : toute pioche/aléa passe par `state.rng` (jamais `Math.random`). Ces deux atomes ne tirent rien.
- **TDD** : chaque tâche = test qui échoue → implémentation minimale → vert → commit. **Code complet, aucun placeholder.**
- **Ne rien casser** : les **68 tests existants** doivent rester verts. Conserver **INTACTS** les flux `influence on:'choice'` → `choosePlanet`, `influenceNeighbors` → `chooseSegment`, `influenceDifferent` (exclusion). Réutiliser `gainInfluence`, `resolve`, `decide`, `finishOrPending`.
- **Effets réels, non inventés** : `transfer` conforme à **R1** et `exile` conforme à **R2** de `docs/content/questions-regles.md` (confirmés le 2026-07-21). Aucune autre sémantique.
- **Cap de victoire** : `transfer`/`exile` ne modifient pas les disques d'influence, donc ne déclenchent aucune victoire ; `resolve`/`decide` conservent néanmoins la garde `s.winner === null` déjà présente.

## File Structure

- `src/engine/types.ts` — étendre l'union `Effect` (`transfer`, `exile`) et l'union `PendingDecision` (`chooseColumn`).
- `src/engine/effects.ts` — brancher l'**interception** `transfer`/`exile` dans `resolve` (avec skip-si-inapplicable) ; brancher la **résolution** `chooseColumn` dans `decide` (déplacement d'une carte + gestion `remaining`) ; ajouter les branches garde-fou dans `applyEffect` (throw : ces atomes passent toujours par `resolve`/`decide`).
- `src/engine/moves.ts` — étendre `legalMoves` : sous un `chooseColumn`, ne proposer que les planètes dont la colonne du bon `owner` est **non vide**. `applyMove` inchangé (le Move `{t:'decide',planet}` est réutilisé tel quel).
- `src/engine/__tests__/effects.test.ts` — tests des atomes `exile` et `transfer` (résolution, `count>1`, skip).
- `src/engine/__tests__/moves.test.ts` — tests `legalMoves` sous `chooseColumn` + parcours end-to-end via `applyMove`.

## Formes retenues (source de vérité pour toutes les tâches)

| Élément | Forme exacte | Sémantique |
| --- | --- | --- |
| Atome `transfer` (R1) | `{ k: 'transfer'; count: number }` | Direction **adverse → joueur actif**. Pour chaque carte (jusqu'à `count`) : le joueur choisit une **colonne adverse non vide** ; on retire sa **dernière** carte et on l'ajoute à **sa propre** colonne de **même planète**. Aucun effet rejoué, aucune influence. |
| Atome `exile` (R2) | `{ k: 'exile'; side: Side; count: number }` | Pour chaque carte (jusqu'à `count`) : le joueur choisit une colonne **non vide** du côté `side` (`'self'`/`'opponent'`) ; on retire sa **dernière** carte vers la **défausse** (`state.discard`). |
| Décision `chooseColumn` | `{ kind: 'chooseColumn'; owner: 'self' \| 'opponent'; purpose: 'transfer' \| 'exile'; remaining: number }` | `owner` = de quelles colonnes on choisit (relatif à `ctx.player`) ; `purpose` = quoi faire de la carte ; `remaining` = nombre de cartes restant à déplacer (décrémenté à chaque `decide` ; l'atome reste en tête de file tant que `remaining > 0` **et** qu'il reste une colonne éligible). |

**`count>1`** : `remaining` est initialisé à `count` par `resolve`. Chaque `decide` déplace une carte, décrémente `remaining`, puis : si `remaining > 0` **et** qu'il reste au moins une colonne éligible → re-pose le même `chooseColumn` (queue **inchangée**, atome toujours en tête) ; sinon → retire l'atome de la file (`queue.slice(1)`) et relance `resolve`.

**Cas « aucune colonne éligible »** : évalué à deux moments. (1) À l'**interception** dans `resolve` : si aucune colonne du `owner` n'est non vide, l'atome est **ignoré** (`queue.slice(1)`, pas de `pending`) — cohérent avec la FAQ « effet inapplicable = ignoré ». (2) Après un déplacement dans `decide` : si `remaining>0` mais plus aucune colonne éligible, on **arrête** (application partielle) au lieu de bloquer sur un `pending` insoluble.

---

### Task 1: Atome `exile` (R2) + décision `chooseColumn`

Justifié par **R2** : la dernière carte d'une colonne (côté `self` ou `opponent`, au choix du joueur) part à la **défausse** `state.discard`. Cette tâche introduit toute l'infrastructure `chooseColumn` (types, interception dans `resolve`, résolution dans `decide`, gestion `count>1`, skip-si-inapplicable) ; `exile` est l'atome le plus simple (déplacement mono-joueur vers la défausse), donc idéal pour poser les fondations.

**Files:**
- Modify: `src/engine/types.ts` (union `Effect`, union `PendingDecision`)
- Modify: `src/engine/effects.ts` (`applyEffect` garde-fou, `resolve` interception, `decide` branche)
- Test: `src/engine/__tests__/effects.test.ts`

**Interfaces:**
- Produces: `{ k: 'exile'; side: Side; count: number }` ajouté à `Effect` ; `{ kind: 'chooseColumn'; owner: 'self' | 'opponent'; purpose: 'transfer' | 'exile'; remaining: number }` ajouté à `PendingDecision`.
- Consumes: `resolve`/`decide` existants ; `state.discard: string[]` ; `PlayerState.columns: Record<Planet,string[]>` ; `Side` de `./types` ; `decide(state, planet)` où `planet` = planète de la colonne choisie.

- [ ] **Step 1: Écrire les tests** — `src/engine/__tests__/effects.test.ts`

```ts
import { resolve, decide } from '../effects';
import { createGame } from '../setup';
import type { GameState } from '../types';

const CONFIG = { techSetup: { animod: 'S', humain: 'U', robot: 'N' }, firstPlayer: 0 } as const;

// Fabrique un état avec des colonnes préremplies pour le joueur donné.
function withColumns(base: GameState, index: 0 | 1, cols: Partial<Record<import('../types').Planet, string[]>>): GameState {
  const players: [GameState['players'][0], GameState['players'][1]] = [base.players[0], base.players[1]];
  players[index] = { ...players[index], columns: { ...players[index].columns, ...cols } };
  return { ...base, players };
}

test("exile pose un chooseColumn côté self puis défausse la dernière carte de la colonne choisie", () => {
  const base = createGame(CONFIG, 1);
  const seeded = withColumns(base, 0, { terra: ['c1', 'c2'] });
  const s: GameState = {
    ...seeded,
    resolution: { queue: [{ k: 'exile', side: 'self', count: 1 } as const], ctx: { player: 0 as const, planet: 'terra' as const } },
  };
  const paused = resolve(s);
  expect(paused.pending).toEqual({ kind: 'chooseColumn', owner: 'self', purpose: 'exile', remaining: 1 });
  const out = decide(paused, 'terra');
  expect(out.pending).toBeNull();
  expect(out.resolution).toBeNull();
  expect(out.players[0].columns.terra).toEqual(['c1']); // dernière carte retirée
  expect(out.discard).toContain('c2'); // partie à la défausse
});

test("exile côté opponent vise les colonnes de l'adversaire", () => {
  const base = createGame(CONFIG, 1);
  const seeded = withColumns(base, 1, { mars: ['x1'] });
  const s: GameState = {
    ...seeded,
    resolution: { queue: [{ k: 'exile', side: 'opponent', count: 1 } as const], ctx: { player: 0 as const, planet: 'mars' as const } },
  };
  const paused = resolve(s);
  expect(paused.pending).toEqual({ kind: 'chooseColumn', owner: 'opponent', purpose: 'exile', remaining: 1 });
  const out = decide(paused, 'mars');
  expect(out.players[1].columns.mars).toEqual([]);
  expect(out.discard).toContain('x1');
});

test("exile count=2 enchaîne deux décisions (remaining décrémenté, atome maintenu en tête)", () => {
  const base = createGame(CONFIG, 1);
  const seeded = withColumns(base, 0, { terra: ['a', 'b'], venus: ['v'] });
  const s: GameState = {
    ...seeded,
    resolution: { queue: [{ k: 'exile', side: 'self', count: 2 } as const], ctx: { player: 0 as const, planet: 'terra' as const } },
  };
  const p1 = resolve(s);
  expect(p1.pending).toEqual({ kind: 'chooseColumn', owner: 'self', purpose: 'exile', remaining: 2 });
  const p2 = decide(p1, 'terra'); // retire 'b'
  expect(p2.pending).toEqual({ kind: 'chooseColumn', owner: 'self', purpose: 'exile', remaining: 1 });
  expect(p2.resolution!.queue.length).toBe(1); // atome toujours en tête
  const out = decide(p2, 'venus'); // retire 'v' → terminé
  expect(out.pending).toBeNull();
  expect(out.resolution).toBeNull();
  expect(out.players[0].columns.terra).toEqual(['a']);
  expect(out.players[0].columns.venus).toEqual([]);
  expect(out.discard).toEqual(expect.arrayContaining(['b', 'v']));
});

test("exile count=2 s'arrête (application partielle) quand il ne reste plus de colonne éligible", () => {
  const base = createGame(CONFIG, 1);
  const seeded = withColumns(base, 0, { terra: ['only'] });
  const s: GameState = {
    ...seeded,
    resolution: { queue: [{ k: 'exile', side: 'self', count: 2 } as const], ctx: { player: 0 as const, planet: 'terra' as const } },
  };
  const p1 = resolve(s);
  const out = decide(p1, 'terra'); // seule carte retirée → plus rien d'éligible
  expect(out.pending).toBeNull();
  expect(out.resolution).toBeNull();
  expect(out.players[0].columns.terra).toEqual([]);
});

test("exile est ignoré (skip sans pending) quand aucune colonne du côté visé n'est éligible", () => {
  const base = createGame(CONFIG, 1); // colonnes vides au départ
  const s: GameState = {
    ...base,
    resolution: {
      queue: [
        { k: 'exile', side: 'self', count: 1 } as const,
        { k: 'credits', amount: 3, target: 'self' } as const,
      ],
      ctx: { player: 0 as const, planet: 'terra' as const },
    },
  };
  const out = resolve(s);
  expect(out.pending).toBeNull(); // aucun chooseColumn posé
  expect(out.resolution).toBeNull(); // exile skippé, credits appliqué, file vidée
  expect(out.players[0].credits).toBe(base.players[0].credits + 3);
});
```

- [ ] **Step 2: Lancer → échec**

Run: `npx jest effects -t exile`
Expected: FAIL (`exile`/`chooseColumn` non gérés).

- [ ] **Step 3: Étendre les types** — `src/engine/types.ts`

Ajouter à l'union `Effect` (après `influenceDifferent`) :
```ts
  | { k: 'transfer'; count: number }
  | { k: 'exile'; side: Side; count: number };
```
(La variante `transfer` est ajoutée dès maintenant pour éviter un second remaniement de l'union en Tâche 2 ; elle est implémentée en Tâche 2.)

Ajouter à l'union `PendingDecision` :
```ts
  | { kind: 'chooseColumn'; owner: 'self' | 'opponent'; purpose: 'transfer' | 'exile'; remaining: number };
```
(`Side` est déjà défini dans ce fichier — `export type Side = 'self' | 'opponent';`.)

- [ ] **Step 4: Garde-fou dans `applyEffect`** — `src/engine/effects.ts`

Ajouter `Side` à l'import de types :
```ts
import type { Effect, EffectCtx, GameState, Planet, PlayerIndex, PlayerState, Side } from './types';
```
Dans le `switch (effect.k)` de `applyEffect`, ajouter avant la fermeture (comme `influenceNeighbors`/`influenceDifferent`) :
```ts
    case 'transfer':
      throw new Error("applyEffect: 'transfer' passe par resolve/decide");
    case 'exile':
      throw new Error("applyEffect: 'exile' passe par resolve/decide");
```

- [ ] **Step 5: Interception dans `resolve` (avec skip-si-inapplicable)** — `src/engine/effects.ts`

Dans la boucle `while` de `resolve`, après le bloc `if (head.k === 'influenceDifferent') { ... }`, ajouter :
```ts
    if (head.k === 'transfer' || head.k === 'exile') {
      const owner: Side = head.k === 'transfer' ? 'opponent' : head.side;
      const ownerIndex: PlayerIndex = owner === 'self' ? ctx.player : ctx.player === 0 ? 1 : 0;
      const hasEligible = PLANETS.some((p) => s.players[ownerIndex].columns[p].length > 0);
      if (!hasEligible) {
        // effet inapplicable → ignoré (aucun pending), on passe à l'atome suivant
        s = { ...s, resolution: { queue: s.resolution!.queue.slice(1), ctx, chosen: s.resolution!.chosen } };
        continue;
      }
      s = { ...s, pending: { kind: 'chooseColumn', owner, purpose: head.k, remaining: head.count } };
      break;
    }
```

- [ ] **Step 6: Résolution dans `decide`** — `src/engine/effects.ts`

Dans `decide`, après le bloc `if (pending.kind === 'chooseSegment') { ... }` et **avant** le `else /* choosePlanet */`, insérer une branche `chooseColumn` qui court-circuite (elle gère elle-même la reconstruction de `resolution` et le retour) :
```ts
  if (pending.kind === 'chooseColumn') {
    const active = ctx.player;
    const ownerIndex: PlayerIndex = pending.owner === 'self' ? active : active === 0 ? 1 : 0;
    const column = state.players[ownerIndex].columns[planet];
    if (column.length === 0) {
      throw new Error('decide: colonne vide (choix invalide)');
    }
    const card = column[column.length - 1]!;
    const players: [PlayerState, PlayerState] = [state.players[0], state.players[1]];
    players[ownerIndex] = {
      ...players[ownerIndex],
      columns: { ...players[ownerIndex].columns, [planet]: column.slice(0, -1) },
    };
    let moved: GameState;
    if (pending.purpose === 'transfer') {
      // adverse → joueur actif, même planète (active !== ownerIndex par construction)
      players[active] = {
        ...players[active],
        columns: { ...players[active].columns, [planet]: [...players[active].columns[planet], card] },
      };
      moved = { ...state, players };
    } else {
      // exile → défausse
      moved = { ...state, players, discard: [...state.discard, card] };
    }
    const remaining = pending.remaining - 1;
    const stillEligible = PLANETS.some((p) => moved.players[ownerIndex].columns[p].length > 0);
    if (remaining > 0 && stillEligible) {
      // atome maintenu en tête de file ; on re-pose la décision avec remaining décrémenté
      return { ...moved, pending: { kind: 'chooseColumn', owner: pending.owner, purpose: pending.purpose, remaining } };
    }
    const done: GameState = {
      ...moved,
      pending: null,
      resolution: { queue: moved.resolution!.queue.slice(1), ctx, chosen: moved.resolution!.chosen },
    };
    return resolve(done);
  }
```
(Les branches `chooseSegment`/`choosePlanet` existantes restent **inchangées** : elles continuent d'assigner `s` puis de reconstruire `resolution` avec `chosen` en fin de fonction. Seule cette nouvelle branche `chooseColumn` fait un `return` anticipé.)

- [ ] **Step 7: Relancer → vert, puis suite complète**

Run: `npx jest effects -t exile` → PASS ; puis `npx jest && npm run typecheck` → PASS (68 tests + nouveaux).

- [ ] **Step 8: Commit**

```bash
git add src/engine/types.ts src/engine/effects.ts src/engine/__tests__/effects.test.ts
git commit -m "feat(engine): atome exile (R2) + décision chooseColumn (count>1, skip inapplicable)"
```

---

### Task 2: Atome `transfer` (R1)

Justifié par **R1** : direction **adverse → joueur actif**. Le joueur choisit une **colonne adverse non vide** ; on retire sa **dernière** carte et on la place dans **sa propre** colonne de **même planète**. Aucun effet rejoué, aucune influence gagnée par le transfert. L'infrastructure (`chooseColumn`, interception `resolve`, résolution `decide` avec `purpose:'transfer'`, `count>1`, skip) a **déjà été posée** en Tâche 1 : cette tâche ne fait qu'exercer et verrouiller le chemin `transfer` (le type et les branches existent déjà). Aucune modification de code de production n'est nécessaire si la Tâche 1 est complète — **on vérifie d'abord par des tests** ; toute correction éventuelle se fait dans `effects.ts`.

**Files:**
- Test: `src/engine/__tests__/effects.test.ts` (nouveaux tests `transfer`)
- Modify (si un test échoue) : `src/engine/effects.ts` (branche `purpose:'transfer'` de `decide` / interception `resolve`)

**Interfaces:**
- Produces: (déjà déclaré en T1) `{ k: 'transfer'; count: number }` ; réutilise `chooseColumn` avec `owner:'opponent'`, `purpose:'transfer'`.
- Consumes: `resolve`/`decide` de la Tâche 1 ; `ctx.player` = joueur actif (destinataire) ; adversaire = `ctx.player === 0 ? 1 : 0`.

- [ ] **Step 1: Écrire les tests** — `src/engine/__tests__/effects.test.ts`

```ts
test("transfer déplace la dernière carte d'une colonne adverse vers la même colonne du joueur actif", () => {
  const base = createGame(CONFIG, 1);
  // joueur 0 = actif (destinataire), joueur 1 = adversaire (source)
  let s0 = withColumns(base, 1, { terra: ['e1', 'e2'] });
  s0 = withColumns(s0, 0, { terra: ['m1'] });
  const s: GameState = {
    ...s0,
    resolution: { queue: [{ k: 'transfer', count: 1 } as const], ctx: { player: 0 as const, planet: 'terra' as const } },
  };
  const paused = resolve(s);
  expect(paused.pending).toEqual({ kind: 'chooseColumn', owner: 'opponent', purpose: 'transfer', remaining: 1 });
  const out = decide(paused, 'terra');
  expect(out.pending).toBeNull();
  expect(out.resolution).toBeNull();
  expect(out.players[1].columns.terra).toEqual(['e1']); // dernière carte adverse retirée
  expect(out.players[0].columns.terra).toEqual(['m1', 'e2']); // ajoutée à MA colonne même planète
  expect(out.discard).not.toContain('e2'); // pas de défausse : c'est un transfert
});

test("transfer count=2 depuis deux colonnes adverses différentes", () => {
  const base = createGame(CONFIG, 1);
  const s0 = withColumns(base, 1, { terra: ['t1'], mars: ['m1'] });
  const s: GameState = {
    ...s0,
    resolution: { queue: [{ k: 'transfer', count: 2 } as const], ctx: { player: 0 as const, planet: 'terra' as const } },
  };
  const p1 = resolve(s);
  const p2 = decide(p1, 'terra'); // prend t1
  expect(p2.pending).toEqual({ kind: 'chooseColumn', owner: 'opponent', purpose: 'transfer', remaining: 1 });
  const out = decide(p2, 'mars'); // prend m1
  expect(out.pending).toBeNull();
  expect(out.players[0].columns.terra).toEqual(['t1']);
  expect(out.players[0].columns.mars).toEqual(['m1']);
  expect(out.players[1].columns.terra).toEqual([]);
  expect(out.players[1].columns.mars).toEqual([]);
});

test("transfer est ignoré quand l'adversaire n'a aucune colonne non vide", () => {
  const base = createGame(CONFIG, 1); // colonnes adverses vides
  const s: GameState = {
    ...base,
    resolution: {
      queue: [
        { k: 'transfer', count: 1 } as const,
        { k: 'credits', amount: 2, target: 'self' } as const,
      ],
      ctx: { player: 0 as const, planet: 'terra' as const },
    },
  };
  const out = resolve(s);
  expect(out.pending).toBeNull();
  expect(out.resolution).toBeNull();
  expect(out.players[0].credits).toBe(base.players[0].credits + 2);
});
```

- [ ] **Step 2: Lancer → devrait PASSER si T1 complète**

Run: `npx jest effects -t transfer`
Expected: PASS. **Si FAIL**, corriger la branche `purpose:'transfer'` de `decide` ou l'interception `resolve` dans `src/engine/effects.ts` (ne pas modifier les branches `exile`/`chooseSegment`/`choosePlanet`), puis relancer jusqu'au vert.

- [ ] **Step 3: Suite complète**

Run: `npx jest && npm run typecheck` → PASS.

- [ ] **Step 4: Commit**

```bash
git add src/engine/__tests__/effects.test.ts src/engine/effects.ts
git commit -m "feat(engine): atome transfer (R1, adverse → joueur actif, même planète)"
```

---

### Task 3: `legalMoves` sous `chooseColumn` + parcours end-to-end via `applyMove`

Sous un `pending` de kind `chooseColumn`, `legalMoves` doit ne proposer QUE les Moves `{t:'decide',planet}` dont la colonne du bon `owner` est **non vide** (sinon `decide` lèverait « colonne vide »). On réutilise le Move existant `{t:'decide',planet}` — **aucun nouveau type de Move**. On ajoute aussi un test d'intégration montrant que `applyMove` enchaîne bien un `develop`/résolution → `decide` → fin de tour (rien de spécial à coder dans `applyMove` : la branche `move.t === 'decide'` existante appelle `decideEffect` puis `finishOrPending`).

**Files:**
- Modify: `src/engine/moves.ts` (`legalMoves`, branche `pending`)
- Test: `src/engine/__tests__/moves.test.ts`

**Interfaces:**
- Produces: `legalMoves(state, player)` renvoie `{t:'decide',planet}[]` filtré par colonnes non vides du `owner` sous `chooseColumn`.
- Consumes: `state.pending` (union incluant désormais `chooseColumn`) ; `state.resolution.ctx.player` (garde déjà présente) ; `PlayerState.columns`.

- [ ] **Step 1: Écrire les tests** — `src/engine/__tests__/moves.test.ts`

```ts
import { legalMoves, applyMove } from '../moves';
import { resolve } from '../effects';
import { createGame } from '../setup';
import type { GameState, Planet } from '../types';

const CONFIG = { techSetup: { animod: 'S', humain: 'U', robot: 'N' }, firstPlayer: 0 } as const;

function withColumns(base: GameState, index: 0 | 1, cols: Partial<Record<Planet, string[]>>): GameState {
  const players: [GameState['players'][0], GameState['players'][1]] = [base.players[0], base.players[1]];
  players[index] = { ...players[index], columns: { ...players[index].columns, ...cols } };
  return { ...base, players };
}

test("legalMoves sous chooseColumn(owner:self) ne propose que les colonnes non vides du joueur", () => {
  const base = createGame(CONFIG, 1);
  const seeded = withColumns(base, 0, { terra: ['a'], venus: ['b'] });
  const s: GameState = {
    ...seeded,
    resolution: { queue: [{ k: 'exile', side: 'self', count: 1 } as const], ctx: { player: 0 as const, planet: 'terra' as const } },
  };
  const paused = resolve(s);
  const moves = legalMoves(paused, 0);
  const planets = moves.map((m) => (m.t === 'decide' ? m.planet : null)).sort();
  expect(moves.every((m) => m.t === 'decide')).toBe(true);
  expect(planets).toEqual(['terra', 'venus']); // mercure/mars/jupiter vides → exclues
});

test("legalMoves sous chooseColumn(owner:opponent) cible les colonnes non vides de l'adversaire", () => {
  const base = createGame(CONFIG, 1);
  const seeded = withColumns(base, 1, { mars: ['x'] });
  const s: GameState = {
    ...seeded,
    resolution: { queue: [{ k: 'transfer', count: 1 } as const], ctx: { player: 0 as const, planet: 'mars' as const } },
  };
  const paused = resolve(s);
  const moves = legalMoves(paused, 0);
  expect(moves).toEqual([{ t: 'decide', planet: 'mars' }]);
});

test("applyMove enchaîne un decide de chooseColumn (exile) puis termine la résolution", () => {
  const base = createGame(CONFIG, 1);
  const seeded = withColumns(base, 0, { terra: ['a', 'b'] });
  const s: GameState = {
    ...seeded,
    resolution: { queue: [{ k: 'exile', side: 'self', count: 1 } as const], ctx: { player: 0 as const, planet: 'terra' as const } },
  };
  const paused = resolve(s);
  const out = applyMove(paused, { t: 'decide', planet: 'terra' });
  expect(out.pending).toBeNull();
  expect(out.resolution).toBeNull();
  expect(out.players[0].columns.terra).toEqual(['a']);
  expect(out.discard).toContain('b');
});
```

- [ ] **Step 2: Lancer → échec**

Run: `npx jest moves -t chooseColumn`
Expected: FAIL (`legalMoves` ne connaît pas encore `chooseColumn` → renvoie les 5 planètes ou une liste incorrecte).

- [ ] **Step 3: Étendre `legalMoves`** — `src/engine/moves.ts`

Dans le bloc `if (state.pending !== null) { ... }`, remplacer le calcul de `candidates` pour couvrir les trois kinds. Version complète du bloc :
```ts
  if (state.pending !== null) {
    // décision en attente : le joueur en cours de résolution choisit une planète / colonne
    if (state.resolution === null || state.resolution.ctx.player !== player) return [];
    const pending = state.pending;
    let candidates: Planet[];
    if (pending.kind === 'chooseSegment') {
      // seuls les débuts de segment valides (pas d'enroulement en fin de rangée)
      candidates = PLANETS.filter((_, i) => i + pending.count <= PLANETS.length);
    } else if (pending.kind === 'chooseColumn') {
      const ownerIndex: PlayerIndex = pending.owner === 'self' ? player : player === 0 ? 1 : 0;
      candidates = PLANETS.filter((planet) => state.players[ownerIndex].columns[planet].length > 0);
    } else {
      // choosePlanet
      const exclude = pending.exclude ?? [];
      candidates = PLANETS.filter((planet) => !exclude.includes(planet));
    }
    return candidates.map((planet) => ({ t: 'decide', planet }));
  }
```
(`PlayerIndex` est déjà importé dans `moves.ts` ; `applyMove` reste **inchangé** : sa branche `move.t === 'decide'` gère déjà `chooseColumn` via `decideEffect` + `finishOrPending`.)

- [ ] **Step 4: Relancer → vert, puis suite complète**

Run: `npx jest moves -t chooseColumn` → PASS ; puis `npx jest && npm run typecheck` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/moves.ts src/engine/__tests__/moves.test.ts
git commit -m "feat(engine): legalMoves filtre les colonnes non vides sous chooseColumn"
```

---

## Hors périmètre (renvoyé à des plans ultérieurs)

- **P4 / R3 — exil ciblé par couleur** : « exiler 2 cartes de **couleurs différentes** de son propre jeu ; pour chaque carte, +2 influence sur la planète de même couleur ; application partielle si une seule couleur disponible » (`docs/content/questions-regles.md` R3). Plus complexe : contrainte de couleurs distinctes (exclusion croisée entre décisions) **+** gain d'influence lié à chaque exil **+** perte des 2 influences de la seconde couleur si non applicable. → **plan suivant** (pourra réutiliser `chooseColumn` + un `exclude` de planètes déjà exilées, à l'image de `influenceDifferent`).
- **Jetons Bonus (R4)** : infrastructure réserve (8) / plateau (8) / défausse de jetons / recharge, et surtout l'**ORDRE** d'application (niveau 2 → jeton → niveau 1 ; capture → jeton d'abord). Impacte `develop` et `gainInfluence`. → **plan suivant**.
- **Contenu réel** (faces techno, 90 cartes, 16 jetons), **UI**, **transport réseau** : phases séparées.

## Self-Review

- **Couverture du périmètre demandé** : `exile` (R2) → T1 ; `transfer` (R1) → T2 ; décision `chooseColumn` (champs `owner`/`purpose`/`remaining`) → T1 ; réutilisation du Move `{t:'decide',planet}` (aucun nouveau Move) → T2/T3 ; `legalMoves` ne propose que les colonnes non vides du bon `owner` → T3 (test dédié) ; anti-blocage « aucune colonne éligible → skip sans pending » → T1 (test `exile` skip) et T2 (test `transfer` skip) ; application partielle quand `remaining>0` mais plus d'éligible → T1 (test count=2 partiel).
- **`count>1`** : `remaining` initialisé à `count` par `resolve`, décrémenté dans `decide`, atome maintenu en tête de file (`queue` non slicée) tant que `remaining>0` **et** colonne éligible ; sinon `queue.slice(1)` + `resolve`. Testé en T1 (exile count=2) et T2 (transfer count=2).
- **Placeholders** : aucun — code complet dans chaque étape (types, `resolve`, `decide`, `legalMoves`, tests). Le helper de test `withColumns` est fourni en entier.
- **Cohérence des types** : `PendingDecision` reste une **union discriminée cohérente** sur `kind` — `choosePlanet` | `chooseSegment` | `chooseColumn` — et les **trois** consommateurs la traitent exhaustivement : `resolve` (pose `chooseColumn` via l'interception `transfer`/`exile`), `decide` (branche `chooseColumn` en `return` anticipé, branches `chooseSegment`/`choosePlanet` intactes), `legalMoves` (trois branches `if/else if/else`). L'union `Effect` gagne `transfer` et `exile`, tous deux (a) interceptés dans `resolve` et (b) protégés par un `throw` dans `applyEffect` (jamais appliqués directement), à l'image de `influenceNeighbors`/`influenceDifferent`. `Side` (déjà exporté) est réutilisé pour `exile.side` et l'`owner` dérivé.
- **Non-régression** : les flux `influence on:'choice'` → `choosePlanet`, `influenceNeighbors` → `chooseSegment`, `influenceDifferent` (exclusion + `chosen`) ne sont **pas modifiés** ; `applyMove` inchangé ; `chosen` est propagé tel quel dans les reconstructions de `resolution` de la branche `chooseColumn`. Les 68 tests existants doivent rester verts (vérifié par `npx jest && npm run typecheck` à chaque tâche).
- **Ambiguïtés résiduelles** : aucune sur R1/R2 (confirmés). Point d'attention non bloquant, à trancher lors de l'implémentation réelle du contenu : R1 dit « colonne de destination = même planète » (retenu ici), ce qui suppose que la carte transférée conserve sa planète d'origine — cohérent avec `columns: Record<Planet,string[]>` indexé par planète ; si une carte pouvait changer de couleur en étant transférée, ce serait à reconfirmer, mais R1 ne le suggère pas.

# Exil ciblé par couleur (P4 / R3) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Étapes en checkbox.

**Goal:** Implémenter l'atome `exileForInfluence` exigé par la face techno **P4** (Robot P niv.4), confirmée par l'utilisateur (règle **R3**).

**Architecture:** Nouvel atome réutilisant l'infrastructure de décision `chooseColumn` déjà en place (`resolve`/`decide`/`legalMoves`). On étend la décision `chooseColumn` d'un `purpose:'exileInfluence'`, d'un montant `amount` et d'une liste `exclude` (couleurs déjà choisies) pour imposer la contrainte « couleurs différentes ».

**Tech Stack:** TypeScript strict, jest.

## Global Constraints

- Moteur pur (aucun import react/native/expo/net dans src/engine, src/data) ; immuabilité stricte ; déterminisme.
- TDD, code complet, aucun placeholder. Ne pas casser les 79 tests existants ni les flux `transfer`/`exile`/`chooseColumn`/influence déjà en place.
- **Effet réel (R3), non inventé :** « exiler **2 cartes de couleurs différentes** de son **propre** jeu ; pour chaque carte exilée, gagner **2 influences** sur la planète de **même couleur** que la carte. Si une seule couleur (colonne) non vide : on n'exile qu'**une** carte et on **perd** les 2 influences de la seconde couleur. »

## File Structure

- `src/engine/types.ts` — union `Effect` (+ `exileForInfluence`) ; `PendingDecision.chooseColumn` (+ `purpose:'exileInfluence'`, `amount?`, `exclude?`).
- `src/engine/effects.ts` — interception `resolve` + branche `decide` (extension de `chooseColumn`).
- `src/engine/moves.ts` — `legalMoves` : exclure les colonnes déjà choisies (`exclude`).
- Test : `src/engine/__tests__/effects.test.ts`.

---

### Task 1: Atome `exileForInfluence` (R3 / P4)

**Interfaces:**
- Produces: `{ k: 'exileForInfluence'; count: number; amount: number }` ; `chooseColumn` gagne `purpose:'exileInfluence'`, `amount?: number`, `exclude?: Planet[]`.
- Consumes: `chooseColumn` (resolve/decide/legalMoves), `gainInfluence` (`./influence`), `state.discard`.

- [ ] **Step 1: Écrire les tests** — `src/engine/__tests__/effects.test.ts`

```ts
test('exileForInfluence : exile 2 cartes de couleurs DIFFÉRENTES + 2 influence sur chaque planète', () => {
  const base = createGame(CONFIG, 1);
  const seeded = withColumns(base, 0, { terra: ['t1'], mars: ['m1'] });
  const before = { terra: seeded.planets.terra.discPos, mars: seeded.planets.mars.discPos };
  const s: GameState = {
    ...seeded,
    resolution: { queue: [{ k: 'exileForInfluence', count: 2, amount: 2 } as const], ctx: { player: 0 as const, planet: 'terra' as const } },
  };
  const p1 = resolve(s);
  expect(p1.pending).toEqual({ kind: 'chooseColumn', owner: 'self', purpose: 'exileInfluence', remaining: 2, amount: 2, exclude: [] });
  const p2 = decide(p1, 'terra'); // exile t1, +2 influence terra
  expect(p2.pending).toEqual({ kind: 'chooseColumn', owner: 'self', purpose: 'exileInfluence', remaining: 1, amount: 2, exclude: ['terra'] });
  expect(() => decide(p2, 'terra')).toThrow(); // même couleur interdite
  const out = decide(p2, 'mars'); // exile m1, +2 influence mars
  expect(out.pending).toBeNull();
  expect(out.resolution).toBeNull();
  expect(out.players[0].columns.terra).toEqual([]);
  expect(out.players[0].columns.mars).toEqual([]);
  expect(out.discard).toEqual(expect.arrayContaining(['t1', 'm1']));
  expect(out.planets.terra.discPos).toBe(before.terra - 2); // joueur 0, dir -1, amount 2
  expect(out.planets.mars.discPos).toBe(before.mars - 2);
});

test('exileForInfluence : une seule couleur non vide → application partielle (1 exil, perte de la 2e influence)', () => {
  const base = createGame(CONFIG, 1);
  const seeded = withColumns(base, 0, { terra: ['t1'] });
  const s: GameState = {
    ...seeded,
    resolution: { queue: [{ k: 'exileForInfluence', count: 2, amount: 2 } as const], ctx: { player: 0 as const, planet: 'terra' as const } },
  };
  const p1 = resolve(s);
  const out = decide(p1, 'terra'); // seule couleur → s'arrête après 1
  expect(out.pending).toBeNull();
  expect(out.resolution).toBeNull();
  expect(out.players[0].columns.terra).toEqual([]);
});

test('exileForInfluence : aucune colonne → atome ignoré (skip)', () => {
  const base = createGame(CONFIG, 1);
  const s: GameState = {
    ...base,
    resolution: {
      queue: [
        { k: 'exileForInfluence', count: 2, amount: 2 } as const,
        { k: 'credits', amount: 3, target: 'self' } as const,
      ],
      ctx: { player: 0 as const, planet: 'terra' as const },
    },
  };
  const out = resolve(s);
  expect(out.pending).toBeNull();
  expect(out.resolution).toBeNull();
  expect(out.players[0].credits).toBe(base.players[0].credits + 3);
});
```

(`withColumns` est le helper déjà défini en tête du fichier par la Tâche 1 du plan transfer/exile.)

- [ ] **Step 2: Lancer → échec**

Run: `npx jest effects -t exileForInfluence`
Expected: FAIL.

- [ ] **Step 3: Étendre les types** — `src/engine/types.ts`

Ajouter à l'union `Effect` :
```ts
  | { k: 'exileForInfluence'; count: number; amount: number }
```
Modifier le membre `chooseColumn` de `PendingDecision` :
```ts
  | { kind: 'chooseColumn'; owner: 'self' | 'opponent'; purpose: 'transfer' | 'exile' | 'exileInfluence'; remaining: number; amount?: number; exclude?: Planet[] };
```

- [ ] **Step 4: Garde-fou `applyEffect`** — `src/engine/effects.ts`

Dans le `switch (effect.k)`, ajouter :
```ts
    case 'exileForInfluence':
      throw new Error("applyEffect: 'exileForInfluence' passe par resolve/decide");
```

- [ ] **Step 5: Interception `resolve`** — `src/engine/effects.ts`

Dans la boucle `while`, après le bloc `if (head.k === 'transfer' || head.k === 'exile') { ... }`, ajouter :
```ts
    if (head.k === 'exileForInfluence') {
      const me = ctx.player;
      const hasEligible = PLANETS.some((p) => s.players[me].columns[p].length > 0);
      if (head.count <= 0 || !hasEligible) {
        s = { ...s, resolution: { queue: s.resolution!.queue.slice(1), ctx, chosen: s.resolution!.chosen } };
        continue;
      }
      s = { ...s, pending: { kind: 'chooseColumn', owner: 'self', purpose: 'exileInfluence', remaining: head.count, amount: head.amount, exclude: [] } };
      break;
    }
```

- [ ] **Step 6: Branche `decide` (extension `chooseColumn`)** — `src/engine/effects.ts`

Dans la branche `if (pending.kind === 'chooseColumn') { ... }`, gérer le nouveau `purpose`. Après le retrait de la carte (`column.slice(0,-1)` sur `players[ownerIndex]`), remplacer la construction de `moved`/`remaining`/re-pose par une version qui couvre les 3 purposes :
```ts
    let moved: GameState;
    if (pending.purpose === 'transfer') {
      players[active] = {
        ...players[active],
        columns: { ...players[active].columns, [planet]: [...players[active].columns[planet], card] },
      };
      moved = { ...state, players };
    } else {
      // exile ET exileInfluence : la carte part à la défausse
      moved = { ...state, players, discard: [...state.discard, card] };
      if (pending.purpose === 'exileInfluence') {
        moved = gainInfluence(moved, planet, active, pending.amount ?? 0);
      }
    }
    const remaining = pending.remaining - 1;
    const nextExclude = pending.purpose === 'exileInfluence' ? [...(pending.exclude ?? []), planet] : pending.exclude;
    const stillEligible = PLANETS.some(
      (p) => moved.players[ownerIndex].columns[p].length > 0 && !(nextExclude ?? []).includes(p),
    );
    if (remaining > 0 && stillEligible && moved.winner === null) {
      return {
        ...moved,
        pending: { kind: 'chooseColumn', owner: pending.owner, purpose: pending.purpose, remaining, amount: pending.amount, exclude: nextExclude },
      };
    }
    const done: GameState = {
      ...moved,
      pending: null,
      resolution: { queue: moved.resolution!.queue.slice(1), ctx, chosen: moved.resolution!.chosen },
    };
    return resolve(done);
```
(Le rejet « colonne vide » en tête de branche reste inchangé. Pour `exileInfluence`, une planète déjà dans `exclude` a une colonne qui peut être non vide mais sera écartée par `legalMoves` — et `decide` la rejette via le test ci-dessous.)

Ajouter, juste après le rejet « colonne vide », un rejet des couleurs déjà choisies :
```ts
    if (pending.purpose === 'exileInfluence' && (pending.exclude ?? []).includes(planet)) {
      throw new Error('decide: couleur déjà choisie (doit être différente)');
    }
```

- [ ] **Step 7: `legalMoves` — exclure les couleurs déjà choisies** — `src/engine/moves.ts`

Dans la branche `chooseColumn` de `legalMoves`, ajouter le filtre `exclude` (no-op pour transfer/exile qui n'ont pas d'`exclude`) :
```ts
      const exclude = pending.exclude ?? [];
      candidates = PLANETS.filter(
        (planet) => state.players[ownerIndex].columns[planet].length > 0 && !exclude.includes(planet),
      );
```
(Adapter au nom de variable réel utilisé dans la branche existante ; ne changer que l'ajout du filtre `exclude`.)

- [ ] **Step 8: Relancer → vert, puis suite complète**

Run: `npx jest effects -t exileForInfluence` → PASS ; puis `npx jest && npm run typecheck` → PASS.

- [ ] **Step 9: Commit**

```bash
git add src/engine/types.ts src/engine/effects.ts src/engine/moves.ts src/engine/__tests__/effects.test.ts
git commit -m "feat(engine): atome exileForInfluence (P4/R3 — exil 2 couleurs différentes + influence)"
```

---

## Hors périmètre

- Jetons bonus (R4) et infrastructure/ordre d'application → plan suivant.
- Contenu réel (technos/cartes/jetons), UI, réseau.

## Self-Review

- **Couverture** : P4/R3 → `exileForInfluence` (T1), avec les 3 cas (2 couleurs OK, application partielle, skip). Après cette tâche, toutes les faces techno **sauf D3/O1 (jetons bonus)** sont exprimables.
- **Placeholders** : aucun.
- **Cohérence des types** : `chooseColumn` reste un membre unique de `PendingDecision`, désormais avec `purpose` à 3 valeurs + `amount?`/`exclude?` optionnels (rétro-compatibles avec transfer/exile qui ne les fournissent pas) ; `resolve`/`decide`/`legalMoves` traitent tous le purpose `exileInfluence` ; garde-fou `applyEffect` ajouté.

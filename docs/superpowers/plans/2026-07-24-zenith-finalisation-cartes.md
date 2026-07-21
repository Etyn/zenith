# Finalisation des cartes TODO(rules) — Zenith — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre exprimables les cartes marquées `// TODO(rules)` de `src/data/cards.ts` en ajoutant le strict minimum d'atomes moteur, en assainissant la dette « payer zénithium » (montants négatifs → atome `spend` borné + gating des paliers), puis en re-transcrivant les 7 cartes résolubles.

**Architecture :** Moteur pur TypeScript, orienté données. Les effets de cartes sont des `Effect[]` interprétés par `resolve`/`decide`/`chooseBranch` (`src/engine/effects.ts`). Les décisions du joueur passent par des `PendingDecision` dont `legalMoves` (`src/engine/moves.ts`) énumère les coups légaux. On étend l'union `Effect` de façon **additive** (champs optionnels), on réutilise au maximum les `PendingDecision` existants (`chooseColumn.exclude`, `choosePlanet.exclude`/`beneficiary`), et on n'ajoute qu'un seul atome vraiment neuf : `spend`.

**Tech Stack :** TypeScript strict, Jest (`npx jest`), pas de dépendances runtime (moteur pur).

## Global Constraints

- **Moteur pur** : aucun import UI/réseau dans `src/engine/**` ni `src/data/**` (garde-fou `src/engine/__tests__/purity.test.ts` — modules interdits : `react`, `react-native`, `expo`, `net`, `react-native-tcp-socket`).
- **Immuabilité** : jamais de mutation en place ; toujours retourner un nouvel objet (`{ ...state, ... }`, copies de tableaux/records). Suivre le style existant de `effects.ts`.
- **Déterminisme** : aucune source d'aléa hors `state.rng` (via `shuffle`) ; aucune dépendance à l'heure/au hasard implicite.
- **Terminaison** : toute boucle de `resolve` doit progresser (retirer un atome de tête ou poser un `pending`).
- **TDD strict** : test qui échoue → implémentation minimale → test qui passe → commit. Code complet à chaque étape.
- **Aucun effet inventé** : les effets transcrits doivent être conformes au lexique (`docs/content/lexique-icones.md`) et à `docs/content/cartes-todo.md`. Tout choix de valeur non 100 % confirmé est signalé en commentaire dans la carte.
- **Ne pas casser la base** : `npx jest` = **158 tests passants** au départ ; le total ne doit que croître (tests ajoutés / migrés), jamais régresser.
- **Réutiliser l'existant** : n'ajouter un atome/champ que si aucun mécanisme existant ne couvre déjà le besoin.
- **Ressources d'un joueur (`credits`, `zenithium`) ne doivent jamais devenir négatives.** (C'est la cause du crash historique que le refactor `spend` supprime.)
- Départ de partie (rappel utile aux tests) : `START_CREDITS = 12`, `START_ZENITHIUM = 1` (`src/engine/setup.ts`), `CENTER = 4`.

---

## File Structure

Tous chemins absolus sous `/Users/m.rousseau-ext/perso/zenith`.

- `src/engine/types.ts` — union `Effect` et `PendingDecision`. **Modifié** : 3 extensions additives de l'union `Effect` (`creditsPerTechLevels.resource?`, `exile.color?`/`exile.exceptColor?`, `giveInfluenceOpponent.exceptColor?`) + 1 nouvel atome (`spend`). Aucune modification de `PendingDecision` (les formes existantes suffisent).
- `src/engine/effects.ts` — cœur interpréteur (`applyEffect`, `resolve`, `decide`, `chooseBranch`). **Modifié** : case `creditsPerTechLevels` (resource), case `spend`, branche `resolve` pour `exile { color }`, exclusion dans la branche `exile` générique et dans `giveInfluenceOpponent`, garde de solvabilité dans `chooseBranch`/`chooseTier`, généralisation du check `exclude` dans `decide`/`chooseColumn`, export d'un helper `canPayTier`.
- `src/engine/moves.ts` — `legalMoves`. **Modifié** : le cas `chooseTier` ne propose que les paliers payables (`canPayTier`) + `skip`.
- `src/data/cards.ts` — contenu réel. **Modifié** : migration des 6 coûts négatifs (Moussa, Stessy Power) vers `spend` (T5) ; re-transcription des 7 cartes TODO résolubles (T6). `mars-charlize-gun` et `jupiter-bajazet` NON touchées (hors périmètre).
- `src/engine/__tests__/effects-atoms.test.ts` — **Modifié** : tests des atomes T1/T2/T3/T4.
- `src/engine/__tests__/effects-combinators.test.ts` — **Modifié** : migration du test `scale` vers `spend` (T5).
- `src/engine/__tests__/moves.test.ts` — **Modifié** : test de gating des paliers (T5).
- `src/data/__tests__/cards.test.ts` — **Modifié** : garde de régression sur les 7 cartes résolues (T6).

---

## Task 1: Atome `creditsPerTechLevels` généralisé (gain en zénithium)

Généralise l'atome existant `creditsPerTechLevels` avec un champ **optionnel** `resource?: 'credits' | 'zenithium'` (défaut `'credits'`). C'est le choix le moins invasif (aucune carte n'utilise encore cet atome ; le test existant reste vert grâce au défaut). Débloque `venus-ilda-flores` (« gagner du zénithium selon le nb de technos ≥ niv.1 »).

**Files:**
- Modify: `src/engine/types.ts:53`
- Modify: `src/engine/effects.ts:120-124`
- Test: `src/engine/__tests__/effects-atoms.test.ts` (ajout en fin de fichier)

**Interfaces:**
- Consumes: rien (première tâche).
- Produces: `Effect` variant `{ k: 'creditsPerTechLevels'; tiers: number[]; resource?: 'credits' | 'zenithium' }`. Sémantique : soit `n` le nombre de peuples dont `techMarkers[pe] >= 1` ; gain `= n === 0 ? 0 : tiers[min(n, tiers.length) - 1]` crédité sur `resource` (défaut `credits`) du joueur actif.

- [ ] **Step 1: Écrire le test qui échoue**

Ajouter à la fin de `src/engine/__tests__/effects-atoms.test.ts` :

```ts
test("creditsPerTechLevels resource='zenithium' : gagne du zénithium selon le nb de technos >= 1", () => {
  const base = createGame(CONFIG, 1);
  const players: [GameState['players'][0], GameState['players'][1]] = [base.players[0], base.players[1]];
  players[0] = { ...players[0], techMarkers: { animod: 1, humain: 3, robot: 1 } }; // 3 technos >= 1
  const seeded: GameState = { ...base, players };
  const out = applyEffect(seeded, { k: 'creditsPerTechLevels', tiers: [1, 2, 3], resource: 'zenithium' }, CTX);
  expect(out.players[0].zenithium).toBe(seeded.players[0].zenithium + 3); // 3 technos -> tiers[2] = 3
  expect(out.players[0].credits).toBe(seeded.players[0].credits);         // aucun crédit gagné
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx jest effects-atoms -t "resource='zenithium'"`
Expected: FAIL — TypeScript refuse la propriété `resource` (ou l'assertion zénithium échoue).

- [ ] **Step 3: Étendre le type**

Dans `src/engine/types.ts`, remplacer la ligne 53 :

```ts
  | { k: 'creditsPerTechLevels'; tiers: number[] }
```

par :

```ts
  | { k: 'creditsPerTechLevels'; tiers: number[]; resource?: 'credits' | 'zenithium' }
```

- [ ] **Step 4: Implémenter le gain sur la ressource choisie**

Dans `src/engine/effects.ts`, remplacer le case `creditsPerTechLevels` (lignes 120-124) :

```ts
    case 'creditsPerTechLevels': {
      const n = PEOPLES.filter((pe) => state.players[ctx.player].techMarkers[pe] >= 1).length;
      const gain = n === 0 ? 0 : effect.tiers[Math.min(n, effect.tiers.length) - 1]!;
      return creditPlayer(state, ctx.player, { credits: state.players[ctx.player].credits + gain });
    }
```

par :

```ts
    case 'creditsPerTechLevels': {
      const n = PEOPLES.filter((pe) => state.players[ctx.player].techMarkers[pe] >= 1).length;
      const gain = n === 0 ? 0 : effect.tiers[Math.min(n, effect.tiers.length) - 1]!;
      const resource = effect.resource ?? 'credits';
      return creditPlayer(state, ctx.player, { [resource]: state.players[ctx.player][resource] + gain });
    }
```

- [ ] **Step 5: Lancer les tests**

Run: `npx jest effects-atoms`
Expected: PASS (le test existant `creditsPerTechLevels : 4/8/12 …` reste vert, le nouveau passe).

- [ ] **Step 6: Typecheck + suite complète**

Run: `npx tsc --noEmit && npx jest`
Expected: 0 erreur TS ; 159 tests passants (158 + 1).

- [ ] **Step 7: Commit**

```bash
git add src/engine/types.ts src/engine/effects.ts src/engine/__tests__/effects-atoms.test.ts
git commit -m "feat(engine): creditsPerTechLevels accepte une ressource (credits|zenithium)"
```

---

## Task 2: Exil filtré par couleur (`color` fixée / `exceptColor` exclue)

Étend l'atome `exile` de deux champs optionnels :
- `color?: Planet` — exiler d'une colonne de **couleur précise** (déterministe, aucun choix), variante fixée du chemin `corresponding`. Sert à `terra-l0v3cr4ft` (couleur précise → zénithium) et `terra-h3rb3rt` (couleur précise → influence sur cette couleur via `thenInfluence`).
- `exceptColor?: Planet` — exiler d'une colonne **au choix ≠ cette couleur**. Réutilise le `chooseColumn.exclude` déjà supporté par `legalMoves`/`decide`. Sert à `mercure-chaka` (≠ Mercure).

**Files:**
- Modify: `src/engine/types.ts:44`
- Modify: `src/engine/effects.ts` (nouvelle branche `resolve` + branche générique `transfer|exile` + check `exclude` dans `decide`)
- Test: `src/engine/__tests__/effects-atoms.test.ts` (ajouts)

**Interfaces:**
- Consumes: rien de T1.
- Produces: `Effect` variant étendu `{ k: 'exile'; side: Side; count: number; corresponding?: boolean; color?: Planet; exceptColor?: Planet; thenInfluence?: boolean }`. Sémantique :
  - `color` (seulement `side: 'self'`) : boucle `count` fois, exile la **dernière** carte de `columns[color]` du joueur actif (s'arrête si vide) ; si `thenInfluence`, +1 influence sur `color` par carte exilée.
  - `exceptColor` : pose `chooseColumn { owner, purpose:'exile', exclude:[exceptColor] }` ; le joueur choisit une colonne (≠ exceptColor) à chaque itération.

- [ ] **Step 1: Écrire les tests qui échouent**

Ajouter à la fin de `src/engine/__tests__/effects-atoms.test.ts` :

```ts
test("exile color : exile la couleur fixée sans choix, +1 influence sur cette couleur si thenInfluence", () => {
  const base = createGame(CONFIG, 1);
  const seeded = withColumns(base, 0, { mars: ['a', 'b'] });
  const marsBefore = seeded.planets.mars.discPos;
  const venusBefore = seeded.planets.venus.discPos;
  // ctx.planet = venus pour prouver que l'influence suit `color` (mars), pas ctx.planet
  const s: GameState = { ...seeded, resolution: { queue: [{ k: 'exile', side: 'self', count: 1, color: 'mars', thenInfluence: true }], ctx: { player: 0, planet: 'venus' } } };
  const out = resolve(s);
  expect(out.pending).toBeNull();
  expect(out.players[0].columns.mars).toEqual(['a']); // dernière carte 'b' exilée
  expect(out.discard).toContain('b');
  expect(out.planets.mars.discPos).not.toBe(marsBefore); // influence gagnée sur mars
  expect(out.planets.venus.discPos).toBe(venusBefore);   // rien sur venus
});

test("exile color : colonne vide -> no-op (pas de crash, pas d'influence)", () => {
  const base = createGame(CONFIG, 1);
  const jupBefore = base.planets.jupiter.discPos;
  const s: GameState = { ...base, resolution: { queue: [{ k: 'exile', side: 'self', count: 2, color: 'jupiter', thenInfluence: true }], ctx: { player: 0, planet: 'mars' } } };
  const out = resolve(s);
  expect(out.pending).toBeNull();
  expect(out.planets.jupiter.discPos).toBe(jupBefore);
});

test("exile exceptColor : pose chooseColumn en excluant la couleur bannie ; decide sur cette couleur est refusé", () => {
  const base = createGame(CONFIG, 1);
  const seeded = withColumns(base, 0, { mercure: ['m'], mars: ['x'], venus: ['v'] });
  const s: GameState = { ...seeded, resolution: { queue: [{ k: 'exile', side: 'self', count: 1, exceptColor: 'mercure' }], ctx: CTX } };
  const paused = resolve(s);
  expect(paused.pending).toEqual({ kind: 'chooseColumn', owner: 'self', purpose: 'exile', remaining: 1, exclude: ['mercure'] });
  expect(() => decide(paused, 'mercure')).toThrow(); // couleur exclue
  const out = decide(paused, 'mars'); // choix valide
  expect(out.players[0].columns.mars).toEqual([]);
});
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx jest effects-atoms -t "exile color" && npx jest effects-atoms -t "exceptColor"`
Expected: FAIL — TypeScript refuse `color`/`exceptColor` (ou pending/état inattendus).

- [ ] **Step 3: Étendre le type**

Dans `src/engine/types.ts`, remplacer la ligne 44 :

```ts
  | { k: 'exile'; side: Side; count: number; corresponding?: boolean; thenInfluence?: boolean }
```

par :

```ts
  | { k: 'exile'; side: Side; count: number; corresponding?: boolean; color?: Planet; exceptColor?: Planet; thenInfluence?: boolean }
```

- [ ] **Step 4: Ajouter la branche `resolve` pour `color` (déterministe)**

Dans `src/engine/effects.ts`, **juste après** la branche `exile` `corresponding` (elle se termine par un `continue;` à la ligne 244, bloc `if (head.k === 'exile' && head.side === 'self' && head.corresponding)`), insérer :

```ts
    if (head.k === 'exile' && head.side === 'self' && head.color) {
      let ns = s;
      for (let i = 0; i < head.count; i++) {
        const col = ns.players[ctx.player].columns[head.color];
        if (col.length === 0) break;
        const card = col[col.length - 1]!;
        const players: [PlayerState, PlayerState] = [ns.players[0], ns.players[1]];
        players[ctx.player] = { ...players[ctx.player], columns: { ...players[ctx.player].columns, [head.color]: col.slice(0, -1) } };
        ns = { ...ns, players, discard: [...ns.discard, card] };
        if (head.thenInfluence) ns = gainInfluence(ns, head.color, ctx.player, 1);
        if (ns.winner !== null) break;
      }
      s = { ...ns, resolution: { queue: ns.resolution!.queue.slice(1), ctx, chosen: ns.resolution!.chosen } };
      continue;
    }
```

- [ ] **Step 5: Passer l'exclusion à la branche `transfer|exile` générique**

Dans `src/engine/effects.ts`, remplacer la branche générique (lignes 246-255) :

```ts
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

par :

```ts
    if (head.k === 'transfer' || head.k === 'exile') {
      const owner: Side = head.k === 'transfer' ? 'opponent' : head.side;
      const ownerIndex: PlayerIndex = owner === 'self' ? ctx.player : ctx.player === 0 ? 1 : 0;
      const exclude = head.k === 'exile' && head.exceptColor ? [head.exceptColor] : undefined;
      const eligible = PLANETS.some((p) => s.players[ownerIndex].columns[p].length > 0 && !(exclude ?? []).includes(p));
      if (!eligible) {
        s = { ...s, resolution: { queue: s.resolution!.queue.slice(1), ctx, chosen: s.resolution!.chosen } };
        continue;
      }
      s = { ...s, pending: { kind: 'chooseColumn', owner, purpose: head.k, remaining: head.count, thenInfluence: head.thenInfluence, exclude } };
      break;
    }
```

- [ ] **Step 6: Généraliser le contrôle `exclude` dans `decide`/`chooseColumn`**

Dans `src/engine/effects.ts`, dans le bloc `pending.kind === 'chooseColumn'` de `decide`, remplacer (lignes 436-438) :

```ts
    if (pending.purpose === 'exileInfluence' && (pending.exclude ?? []).includes(planet)) {
      throw new Error('decide: couleur déjà choisie (doit être différente)');
    }
```

par :

```ts
    if ((pending.exclude ?? []).includes(planet)) {
      throw new Error('decide: couleur exclue (choix invalide)');
    }
```

- [ ] **Step 7: Lancer les tests ciblés**

Run: `npx jest effects-atoms`
Expected: PASS (les 3 nouveaux tests + tous les tests d'atomes existants, dont `exile opponentChoice + thenInfluence` qui reste vert car `exclude: undefined` est ignoré par `toEqual`).

- [ ] **Step 8: Typecheck + suite complète**

Run: `npx tsc --noEmit && npx jest`
Expected: 0 erreur TS ; 162 tests passants (159 + 3).

- [ ] **Step 9: Commit**

```bash
git add src/engine/types.ts src/engine/effects.ts src/engine/__tests__/effects-atoms.test.ts
git commit -m "feat(engine): exil filtre par couleur (color fixee / exceptColor exclue)"
```

---

## Task 3: Mécanique « exil adverse → influence sur la couleur exilée » (Lady Moore) — réutilisation, sans nouvel atome

**Constat de réutilisation (important) :** aucun atome neuf n'est nécessaire. La mécanique de `mars-lady-moore` (« exiler 3 cartes adverses → +1 influence sur la couleur de chaque carte exilée ») est **déjà** exprimée par `{ k: 'exile', side: 'opponent', count: 3, thenInfluence: true }`. En effet, dans `decide`/`chooseColumn`, `thenInfluence` accorde +1 influence au joueur actif sur la **planète de la colonne choisie** — et une colonne est indexée par sa planète, donc la carte exilée est toujours de cette couleur. C'est exactement « influence sur la couleur de la carte exilée » (cf. lexique : « Exiler adverse + disque = exiler 1 carte adverse + 1 influence correspondante »). `cartes-todo.md` §RÈGLE DE VOCABULAIRE confirme que « exiler » = plateau/colonnes (pas la main).

Cette tâche pose donc un **test de garde d'intégration** qui verrouille cette réutilisation (aucune modification moteur). La transcription de la carte elle-même est faite en T6.

**Files:**
- Test: `src/engine/__tests__/effects-atoms.test.ts` (ajout)

**Interfaces:**
- Consumes: atome `exile` (base + extensions T2), non modifié ici.
- Produces: garantie testée que `exile { side:'opponent', count:N, thenInfluence:true }` donne N décisions `chooseColumn` (owner `opponent`) et +1 influence par colonne exilée, sur la couleur de cette colonne. Consommée par la transcription de `mars-lady-moore` en T6.

- [ ] **Step 1: Écrire le test de garde qui échoue (ou passe déjà)**

Ajouter à la fin de `src/engine/__tests__/effects-atoms.test.ts` :

```ts
test("exil adverse x3 + thenInfluence : +1 influence sur la couleur de chaque carte exilee (mecanique Lady Moore)", () => {
  const base = createGame(CONFIG, 1);
  const seeded = withColumns(base, 1, { mars: ['m'], venus: ['v'], jupiter: ['j'] });
  const marsBefore = seeded.planets.mars.discPos;
  const venusBefore = seeded.planets.venus.discPos;
  const jupBefore = seeded.planets.jupiter.discPos;
  const s: GameState = { ...seeded, resolution: { queue: [{ k: 'exile', side: 'opponent', count: 3, thenInfluence: true }], ctx: { player: 0, planet: 'mars' } } };
  let cur = resolve(s);
  expect(cur.pending).toMatchObject({ kind: 'chooseColumn', owner: 'opponent', purpose: 'exile', remaining: 3, thenInfluence: true });
  cur = decide(cur, 'mars');    // exile la carte mars adverse -> +1 influence mars (joueur 0)
  cur = decide(cur, 'venus');   // -> +1 influence venus
  cur = decide(cur, 'jupiter'); // -> +1 influence jupiter
  expect(cur.pending).toBeNull();
  expect(cur.players[1].columns.mars).toEqual([]);
  expect(cur.players[1].columns.venus).toEqual([]);
  expect(cur.players[1].columns.jupiter).toEqual([]);
  expect(cur.planets.mars.discPos).not.toBe(marsBefore);
  expect(cur.planets.venus.discPos).not.toBe(venusBefore);
  expect(cur.planets.jupiter.discPos).not.toBe(jupBefore);
});
```

- [ ] **Step 2: Lancer le test**

Run: `npx jest effects-atoms -t "mecanique Lady Moore"`
Expected: PASS immédiat (réutilisation pure ; aucune implémentation à écrire). Si FAIL, c'est une régression de T2 à corriger avant de continuer.

- [ ] **Step 3: Suite complète**

Run: `npx jest`
Expected: 163 tests passants (162 + 1).

- [ ] **Step 4: Commit**

```bash
git add src/engine/__tests__/effects-atoms.test.ts
git commit -m "test(engine): garde d'integration exil adverse + influence par couleur (Lady Moore)"
```

---

## Task 4: `exceptColor` sur `giveInfluenceOpponent`

Étend `giveInfluenceOpponent` d'un champ optionnel `exceptColor?: Planet` (« donner 1 influence à l'adversaire **sauf** cette couleur »). Réutilise le `choosePlanet.exclude` déjà supporté par `resolve`/`legalMoves`/`decide` (avec `beneficiary: 'opponent'`). Débloque `mars-titus` (≠ Mars) et `terra-baron-goro` (≠ Terra).

**Files:**
- Modify: `src/engine/types.ts:58`
- Modify: `src/engine/effects.ts:206-209`
- Test: `src/engine/__tests__/effects-atoms.test.ts` (ajout)

**Interfaces:**
- Consumes: rien des tâches précédentes.
- Produces: `Effect` variant étendu `{ k: 'giveInfluenceOpponent'; amount: number; exceptColor?: Planet }`. Sémantique : pose `choosePlanet { amount, beneficiary:'opponent', exclude: exceptColor ? [exceptColor] : undefined }` ; l'influence est accordée à l'adversaire sur la planète choisie (≠ exceptColor).

- [ ] **Step 1: Écrire le test qui échoue**

Ajouter à la fin de `src/engine/__tests__/effects-atoms.test.ts` :

```ts
test("giveInfluenceOpponent exceptColor : l'adversaire gagne l'influence, couleur bannie exclue du choix", () => {
  const base = createGame(CONFIG, 1);
  const s: GameState = { ...base, resolution: { queue: [{ k: 'giveInfluenceOpponent', amount: 1, exceptColor: 'mars' }], ctx: CTX } };
  const paused = resolve(s);
  expect(paused.pending).toEqual({ kind: 'choosePlanet', amount: 1, beneficiary: 'opponent', exclude: ['mars'] });
  expect(() => decide(paused, 'mars')).toThrow(); // mars exclue
  const venusBefore = base.planets.venus.discPos;
  const out = decide(paused, 'venus');            // influence donnee a l'adversaire (joueur 1) sur venus
  expect(out.pending).toBeNull();
  expect(out.planets.venus.discPos).not.toBe(venusBefore);
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx jest effects-atoms -t "giveInfluenceOpponent exceptColor"`
Expected: FAIL — TypeScript refuse `exceptColor` (ou `pending.exclude` absent).

- [ ] **Step 3: Étendre le type**

Dans `src/engine/types.ts`, remplacer la ligne 58 :

```ts
  | { k: 'giveInfluenceOpponent'; amount: number }
```

par :

```ts
  | { k: 'giveInfluenceOpponent'; amount: number; exceptColor?: Planet }
```

- [ ] **Step 4: Passer l'exclusion dans `resolve`**

Dans `src/engine/effects.ts`, remplacer la branche (lignes 206-209) :

```ts
    if (head.k === 'giveInfluenceOpponent') {
      s = { ...s, pending: { kind: 'choosePlanet', amount: head.amount, beneficiary: 'opponent' } };
      break;
    }
```

par :

```ts
    if (head.k === 'giveInfluenceOpponent') {
      s = { ...s, pending: { kind: 'choosePlanet', amount: head.amount, beneficiary: 'opponent', exclude: head.exceptColor ? [head.exceptColor] : undefined } };
      break;
    }
```

- [ ] **Step 5: Lancer les tests**

Run: `npx jest effects-atoms`
Expected: PASS (le nouveau test + tous les existants ; `exclude: undefined` reste ignoré par `toEqual` pour les cas sans exclusion).

- [ ] **Step 6: Typecheck + suite complète**

Run: `npx tsc --noEmit && npx jest`
Expected: 0 erreur TS ; 164 tests passants (163 + 1).

- [ ] **Step 7: Commit**

```bash
git add src/engine/types.ts src/engine/effects.ts src/engine/__tests__/effects-atoms.test.ts
git commit -m "feat(engine): giveInfluenceOpponent accepte exceptColor"
```

---

## Task 5: Atome `spend` borné + gating des paliers `scale` + migration des coûts négatifs

Assainit la dette « payer N zénithium/crédits » aujourd'hui encodée en **montant négatif** (`{ k:'zenithium', amount:-N }`), non bornée (a rendu le zénithium négatif → crash historique). On introduit un atome **`spend { resource, amount }`** (montant positif, dépense **bornée à 0**) et on **gate** les paliers de `scale` : dans `legalMoves`, un palier dont le coût n'est pas payable au moment de la décision n'est **pas proposé** (`skip` reste toujours proposé). `chooseBranch` garde une défense symétrique (refuse un palier non payable). Puis on migre les 6 encodages négatifs de `cards.ts` (Moussa ×3, Stessy Power ×3) vers `spend`.

Le gating est calculé **à la décision** : `legalMoves` lit le palier via `state.resolution.queue[0]` (l'atome `scale` reste en tête de file tant que le `chooseTier` n'est pas résolu) et évalue le coût contre l'état courant.

**Files:**
- Modify: `src/engine/types.ts` (union `Effect` : nouvel atome `spend`)
- Modify: `src/engine/effects.ts` (case `spend`, export `canPayTier`, garde dans `chooseBranch`/`chooseTier`)
- Modify: `src/engine/moves.ts` (import `canPayTier` ; `legalMoves` cas `chooseTier`)
- Modify: `src/data/cards.ts:310-312` (Moussa) et `:324-326` (Stessy Power)
- Test: `src/engine/__tests__/effects-combinators.test.ts` (migration du test `scale`), `src/engine/__tests__/moves.test.ts` (gating)

**Interfaces:**
- Consumes: rien des tâches précédentes.
- Produces:
  - `Effect` variant `{ k: 'spend'; resource: 'credits' | 'zenithium'; amount: number }` (montant positif ; applique `resource = max(0, resource - amount)` sur le joueur actif).
  - `export function canPayTier(state: GameState, player: PlayerIndex, cost: Effect[]): boolean` — `true` ssi tous les atomes `spend` du coût sont couverts par les réserves de `player` (les non-`spend` sont ignorés / toujours payables).
  - Contrat `legalMoves`/`chooseTier` : ne propose que les paliers `i` tels que `canPayTier(state, player, tiers[i].cost)`, plus `{ t:'skip' }`.

- [ ] **Step 1: Écrire les tests qui échouent**

Migrer le test `scale` existant de `src/engine/__tests__/effects-combinators.test.ts` (remplacer intégralement le bloc `test("scale : choisir un palier applique cost puis reward ; renoncer n'applique rien", …)`, lignes 121-141) par :

```ts
test("scale : un palier payable applique spend puis reward ; renoncer n'applique rien", () => {
  const base = createGame(CONFIG, 1); // 12 credits, 1 zenithium au depart
  const scale = {
    k: 'scale' as const,
    tiers: [
      { cost: [{ k: 'spend' as const, resource: 'credits' as const, amount: 3 }], reward: [{ k: 'zenithium' as const, amount: 1, target: 'self' as const }] },
      { cost: [{ k: 'spend' as const, resource: 'credits' as const, amount: 7 }], reward: [{ k: 'zenithium' as const, amount: 2, target: 'self' as const }] },
    ],
  };
  const s: GameState = { ...base, resolution: { queue: [scale], ctx: CTX } };
  const paused = resolve(s);
  expect(paused.pending).toEqual({ kind: 'chooseTier', count: 2 });

  const done = chooseBranch(paused, 1); // palier 2 : depense 7 credits -> +2 zenithium
  expect(done.players[0].credits).toBe(base.players[0].credits - 7);
  expect(done.players[0].zenithium).toBe(base.players[0].zenithium + 2);

  const renounced = skipBranch(resolve({ ...base, resolution: { queue: [scale], ctx: CTX } }));
  expect(renounced.players[0].credits).toBe(base.players[0].credits);
  expect(renounced.players[0].zenithium).toBe(base.players[0].zenithium);
});

test("spend : borne a 0, ne rend jamais une reserve negative", () => {
  const base = createGame(CONFIG, 1); // 1 zenithium
  const s: GameState = { ...base, resolution: { queue: [{ k: 'spend', resource: 'zenithium', amount: 5 }], ctx: CTX } };
  const out = resolve(s);
  expect(out.players[0].zenithium).toBe(0); // 1 - 5 borne a 0
});
```

Ajouter à la fin de `src/engine/__tests__/moves.test.ts` :

```ts
test("legalMoves : seuls les paliers d'echelle payables sont proposes (skip toujours possible)", () => {
  const base = createGame(CONFIG, 1); // 1 zenithium au depart
  const scale = {
    k: 'scale' as const,
    tiers: [
      { cost: [{ k: 'spend' as const, resource: 'zenithium' as const, amount: 1 }], reward: [{ k: 'credits' as const, amount: 4, target: 'self' as const }] },
      { cost: [{ k: 'spend' as const, resource: 'zenithium' as const, amount: 5 }], reward: [{ k: 'credits' as const, amount: 20, target: 'self' as const }] },
    ],
  };
  const s: GameState = { ...base, resolution: { queue: [scale], ctx: { player: 0, planet: 'mars' } }, pending: { kind: 'chooseTier', count: 2 } };
  const moves = legalMoves(s, 0);
  expect(moves).toEqual([{ t: 'choose', index: 0 }, { t: 'skip' }]); // palier 1 payable (1 zen), palier 2 non (5 zen)
});
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx jest effects-combinators moves`
Expected: FAIL — TypeScript refuse `{ k:'spend', … }` ; le test de gating échoue (les 2 paliers sont proposés).

- [ ] **Step 3: Ajouter l'atome `spend` au type**

Dans `src/engine/types.ts`, dans l'union `Effect`, ajouter la ligne (par ex. juste après `zenithium`, ligne 37) :

```ts
  | { k: 'spend'; resource: 'credits' | 'zenithium'; amount: number }
```

- [ ] **Step 4: Implémenter `spend` (borné) et `canPayTier`**

Dans `src/engine/effects.ts`, ajouter le case dans `applyEffect` (par ex. après le case `zenithium`, ligne 55) :

```ts
    case 'spend': {
      const cur = state.players[ctx.player][effect.resource];
      const players: [PlayerState, PlayerState] = [state.players[0], state.players[1]];
      players[ctx.player] = { ...players[ctx.player], [effect.resource]: Math.max(0, cur - effect.amount) };
      return { ...state, players };
    }
```

Toujours dans `src/engine/effects.ts`, ajouter (au niveau module, par ex. juste après `evalCondition`) la fonction exportée :

```ts
export function canPayTier(state: GameState, player: PlayerIndex, cost: Effect[]): boolean {
  return cost.every((e) => (e.k === 'spend' ? state.players[player][e.resource] >= e.amount : true));
}
```

- [ ] **Step 5: Garde de solvabilité dans `chooseBranch`/`chooseTier`**

Dans `src/engine/effects.ts`, remplacer le bloc `pending.kind === 'chooseTier'` de `chooseBranch` (lignes 598-604) :

```ts
  if (pending.kind === 'chooseTier') {
    if (head.k !== 'scale') throw new Error('chooseBranch: atome de tête inattendu');
    if (index < 0 || index >= head.tiers.length) throw new Error('chooseBranch: palier hors bornes');
    const tier = head.tiers[index]!;
    const s: GameState = { ...state, pending: null, resolution: { queue: [...tier.cost, ...tier.reward, ...rest], ctx, chosen } };
    return resolve(s);
  }
```

par :

```ts
  if (pending.kind === 'chooseTier') {
    if (head.k !== 'scale') throw new Error('chooseBranch: atome de tête inattendu');
    if (index < 0 || index >= head.tiers.length) throw new Error('chooseBranch: palier hors bornes');
    const tier = head.tiers[index]!;
    if (!canPayTier(state, ctx.player, tier.cost)) throw new Error('chooseBranch: palier non payable');
    const s: GameState = { ...state, pending: null, resolution: { queue: [...tier.cost, ...tier.reward, ...rest], ctx, chosen } };
    return resolve(s);
  }
```

- [ ] **Step 6: Gating dans `legalMoves`**

Dans `src/engine/moves.ts`, ajouter `canPayTier` à l'import depuis `./effects` (ligne 1) :

```ts
import { cardOf, resolve, decide as decideEffect, chooseBranch, skipBranch, decideTech as decideTechEffect, decideCard as decideCardEffect, canPayTier } from './effects';
```

Puis remplacer le bloc `chooseTier` (lignes 142-144) :

```ts
    if (pending.kind === 'chooseTier') {
      return [...Array.from({ length: pending.count }, (_, i) => ({ t: 'choose' as const, index: i })), { t: 'skip' as const }];
    }
```

par :

```ts
    if (pending.kind === 'chooseTier') {
      const head = state.resolution.queue[0];
      const tiers = head && head.k === 'scale' ? head.tiers : [];
      const affordable = tiers
        .map((tier, i) => ({ tier, i }))
        .filter(({ tier }) => canPayTier(state, player, tier.cost))
        .map(({ i }) => ({ t: 'choose' as const, index: i }));
      return [...affordable, { t: 'skip' as const }];
    }
```

- [ ] **Step 7: Lancer les tests moteur ciblés**

Run: `npx jest effects-combinators moves effects-atoms`
Expected: PASS (test `scale` migré, `spend` borné, gating).

- [ ] **Step 8: Migrer les coûts négatifs de `cards.ts` (Moussa)**

Dans `src/data/cards.ts`, remplacer les 3 lignes de `venus-moussa` (310-312) :

```ts
        { cost: [{ k: 'zenithium', amount: -1, target: 'self' }], reward: [{ k: 'credits', amount: 4, target: 'self' }] },
        { cost: [{ k: 'zenithium', amount: -2, target: 'self' }], reward: [{ k: 'credits', amount: 8, target: 'self' }] },
        { cost: [{ k: 'zenithium', amount: -3, target: 'self' }], reward: [{ k: 'credits', amount: 12, target: 'self' }] },
```

par :

```ts
        { cost: [{ k: 'spend', resource: 'zenithium', amount: 1 }], reward: [{ k: 'credits', amount: 4, target: 'self' }] },
        { cost: [{ k: 'spend', resource: 'zenithium', amount: 2 }], reward: [{ k: 'credits', amount: 8, target: 'self' }] },
        { cost: [{ k: 'spend', resource: 'zenithium', amount: 3 }], reward: [{ k: 'credits', amount: 12, target: 'self' }] },
```

- [ ] **Step 9: Migrer les coûts négatifs de `cards.ts` (Stessy Power)**

Dans `src/data/cards.ts`, remplacer les 3 lignes de `venus-stessy-power` (324-326) :

```ts
        { cost: [{ k: 'zenithium', amount: -1, target: 'self' }], reward: [{ k: 'influenceChoiceExcept', exceptColor: 'venus', amount: 1 }] },
        { cost: [{ k: 'zenithium', amount: -2, target: 'self' }], reward: [{ k: 'influenceChoiceExcept', exceptColor: 'venus', amount: 2 }] },
        { cost: [{ k: 'zenithium', amount: -4, target: 'self' }], reward: [{ k: 'influenceChoiceExcept', exceptColor: 'venus', amount: 3 }] },
```

par :

```ts
        { cost: [{ k: 'spend', resource: 'zenithium', amount: 1 }], reward: [{ k: 'influenceChoiceExcept', exceptColor: 'venus', amount: 1 }] },
        { cost: [{ k: 'spend', resource: 'zenithium', amount: 2 }], reward: [{ k: 'influenceChoiceExcept', exceptColor: 'venus', amount: 2 }] },
        { cost: [{ k: 'spend', resource: 'zenithium', amount: 4 }], reward: [{ k: 'influenceChoiceExcept', exceptColor: 'venus', amount: 3 }] },
```

- [ ] **Step 10: Vérifier qu'il ne reste aucun coût négatif**

Run: `grep -n "amount: -" src/data/cards.ts`
Expected: aucune sortie (plus aucun encodage en montant négatif).

- [ ] **Step 11: Typecheck + suite complète**

Run: `npx tsc --noEmit && npx jest`
Expected: 0 erreur TS ; 166 tests passants (164 + spend borné + gating ; le test `scale` migré remplace l'ancien). Les tests de simulation (`sim`, `sim-properties`, `bot`) restent verts (le gating ne fait que réduire/sécuriser les coups proposés).

- [ ] **Step 12: Commit**

```bash
git add src/engine/types.ts src/engine/effects.ts src/engine/moves.ts src/data/cards.ts src/engine/__tests__/effects-combinators.test.ts src/engine/__tests__/moves.test.ts
git commit -m "refactor(engine): atome spend borne + gating des paliers scale ; migration des couts negatifs"
```

---

## Task 6: Re-transcription des 7 cartes TODO résolubles + garde de régression

Re-transcrit avec les nouveaux atomes les 7 cartes résolubles et **supprime** leurs commentaires `// TODO(rules)`. `mars-charlize-gun` et `jupiter-bajazet` NE sont PAS touchées (hors périmètre — attente utilisateur). Ajoute une garde de régression dans `cards.test.ts`.

Choix de valeurs signalés (conformes au lexique / aux feuilles, aucun effet inventé) :
- `venus-ilda-flores` : paliers zénithium `[1, 2, 3]` — lecture directe de « récompense **1×/2×/3× hexagone** » sur la feuille (`docs/content/cartes-venus.md:132`). Le facteur (nb technos ≥ niv.1) est confirmé ; le montant est cette lecture d'icône.
- `terra-l0v3cr4ft` / `terra-h3rb3rt` : les 4 couleurs = **Mercure, Vénus, Mars, Jupiter** (les 4 couleurs ≠ Terra, cf. note de la carte `l0v3cr4ft`). Pour `h3rb3rt`, la planète de bandeau est non confirmée (classée Terra) — hypothèse assumée en commentaire.

**Files:**
- Modify: `src/data/cards.ts` — `venus-ilda-flores`, `mars-lady-moore`, `mercure-chaka`, `terra-l0v3cr4ft`, `terra-h3rb3rt`, `mars-titus`, `terra-baron-goro`.
- Test: `src/data/__tests__/cards.test.ts` (ajout).

**Interfaces:**
- Consumes: T1 (`creditsPerTechLevels.resource`), T2 (`exile.color`/`exceptColor`), T3 (garantie `exile opponent + thenInfluence`), T4 (`giveInfluenceOpponent.exceptColor`).
- Produces: 7 cartes complètes ; `cards.test.ts` verrouille que chacune porte plus que sa seule influence.

- [ ] **Step 1: Écrire la garde de régression qui échoue**

Ajouter à la fin de `src/data/__tests__/cards.test.ts` :

```ts
test('cartes TODO résolues : effet complet transcrit (plus que la seule influence)', () => {
  const resolved = ['venus-ilda-flores', 'mars-lady-moore', 'mercure-chaka', 'terra-l0v3cr4ft', 'terra-h3rb3rt', 'mars-titus', 'terra-baron-goro'];
  for (const id of resolved) {
    const c = CARDS.find((x) => x.id === id)!;
    expect(c).toBeDefined();
    expect(c.effects.length).toBeGreaterThan(1);
  }
});
```

- [ ] **Step 2: Lancer la garde pour vérifier qu'elle échoue**

Run: `npx jest cards -t "cartes TODO résolues"`
Expected: FAIL — `venus-ilda-flores`, `mars-lady-moore`, `mercure-chaka` n'ont encore qu'un seul effet.

- [ ] **Step 3: Transcrire `mars-titus`**

Dans `src/data/cards.ts`, remplacer le bloc `mars-titus` (lignes 30-37, commentaire TODO inclus) :

```ts
  {
    // TODO(rules): "≠ Mars" côté adversaire non exprimable — giveInfluenceOpponent sans exclusion. Mineur.
    id: 'mars-titus', name: 'Titus', people: 'animod', planet: 'mars', cost: 1,
    effects: [
      { k: 'influence', amount: 1, on: 'mars' },
      { k: 'optional', effects: [{ k: 'giveInfluenceOpponent', amount: 1 }, { k: 'credits', amount: 10, target: 'self' }] },
    ],
  },
```

par :

```ts
  {
    id: 'mars-titus', name: 'Titus', people: 'animod', planet: 'mars', cost: 1,
    effects: [
      { k: 'influence', amount: 1, on: 'mars' },
      { k: 'optional', effects: [{ k: 'giveInfluenceOpponent', amount: 1, exceptColor: 'mars' }, { k: 'credits', amount: 10, target: 'self' }] },
    ],
  },
```

- [ ] **Step 4: Transcrire `mars-lady-moore`**

Dans `src/data/cards.ts`, remplacer le bloc `mars-lady-moore` (lignes 143-151, commentaire TODO inclus) :

```ts
  {
    // TODO(rules): "exiler 3 cartes de la MAIN adverse → +1 influence sur la couleur de chaque carte exilée"
    // non exprimable (exile opère sur les colonnes, pas la main adverse ; influence par couleur de carte inconnue).
    // Transcrit avec le seul 1er effet en attendant l'arbitrage utilisateur / un atome dédié.
    id: 'mars-lady-moore', name: 'Lady Moore', people: 'humain', planet: 'mars', cost: 10,
    effects: [
      { k: 'influence', amount: 1, on: 'mars' },
    ],
  },
```

par :

```ts
  {
    // "exiler 3 cartes adverses → +1 influence sur la couleur de chaque carte exilée" :
    // exil des COLONNES adverses (cf. cartes-todo.md, règle de vocabulaire) ; thenInfluence
    // accorde +1 influence sur la couleur de chaque colonne exilée.
    id: 'mars-lady-moore', name: 'Lady Moore', people: 'humain', planet: 'mars', cost: 10,
    effects: [
      { k: 'influence', amount: 1, on: 'mars' },
      { k: 'exile', side: 'opponent', count: 3, thenInfluence: true },
    ],
  },
```

- [ ] **Step 5: Transcrire `mercure-chaka`**

Dans `src/data/cards.ts`, remplacer le bloc `mercure-chaka` (lignes 227-232, commentaire TODO inclus) :

```ts
  { // TODO(rules): "exiler 2 cartes ≠ Mercure" — l'exclusion de couleur n'est pas supportée par l'atome exile (choix libre). Mineur.
    id: 'mercure-chaka', name: 'Chaka', people: 'animod', planet: 'mercure', cost: 1,
    effects: [
      { k: 'influence', amount: 1, on: 'mercure' },
      { k: 'optional', effects: [{ k: 'exile', side: 'self', count: 2 }, { k: 'credits', amount: 10, target: 'self' }] },
    ] },
```

par :

```ts
  {
    id: 'mercure-chaka', name: 'Chaka', people: 'animod', planet: 'mercure', cost: 1,
    effects: [
      { k: 'influence', amount: 1, on: 'mercure' },
      { k: 'optional', effects: [{ k: 'exile', side: 'self', count: 2, exceptColor: 'mercure' }, { k: 'credits', amount: 10, target: 'self' }] },
    ] },
```

- [ ] **Step 6: Transcrire `venus-ilda-flores`**

Dans `src/data/cards.ts`, remplacer le bloc `venus-ilda-flores` (lignes 353-359, commentaire TODO inclus) :

```ts
  { // TODO(rules): "gagner du ZÉNITHIUM selon le nb de technos ≥ niv.1" non exprimable :
    // creditsPerTechLevels donne des CRÉDITS, pas du zénithium ; aucun atome zenithiumPerTechLevels.
    // Montant exact de la récompense également à confirmer (feuille). Transcrit avec le seul 1er effet.
    id: 'venus-ilda-flores', name: 'Ilda Flores', people: 'humain', planet: 'venus', cost: 1,
    effects: [
      { k: 'influence', amount: 1, on: 'venus' },
    ] },
```

par :

```ts
  { // Zénithium selon le nb de technos >= niv.1 : facteur confirmé ; montant [1,2,3] = lecture "1x/2x/3x hexagone" (cartes-venus.md).
    id: 'venus-ilda-flores', name: 'Ilda Flores', people: 'humain', planet: 'venus', cost: 1,
    effects: [
      { k: 'influence', amount: 1, on: 'venus' },
      { k: 'creditsPerTechLevels', tiers: [1, 2, 3], resource: 'zenithium' },
    ] },
```

- [ ] **Step 7: Transcrire `terra-baron-goro`**

Dans `src/data/cards.ts`, remplacer le bloc `terra-baron-goro` (lignes 421-428, commentaire TODO inclus) :

```ts
  { // effet 2 FACULTATIF (give-* enveloppé), effet 3 OBLIGATOIRE.
    // TODO(rules): "≠ Terra" côté adversaire non exprimable (giveInfluenceOpponent sans exclusion). Mineur.
    id: 'terra-baron-goro', name: 'Baron Goro', people: 'humain', planet: 'terra', cost: 4,
    effects: [
      { k: 'influence', amount: 1, on: 'terra' },
      { k: 'optional', effects: [{ k: 'giveInfluenceOpponent', amount: 1 }] },
      { k: 'zenithium', amount: 3, target: 'self' },
    ] },
```

par :

```ts
  { // effet 2 FACULTATIF (give-* enveloppé), effet 3 OBLIGATOIRE.
    id: 'terra-baron-goro', name: 'Baron Goro', people: 'humain', planet: 'terra', cost: 4,
    effects: [
      { k: 'influence', amount: 1, on: 'terra' },
      { k: 'optional', effects: [{ k: 'giveInfluenceOpponent', amount: 1, exceptColor: 'terra' }] },
      { k: 'zenithium', amount: 3, target: 'self' },
    ] },
```

- [ ] **Step 8: Transcrire `terra-l0v3cr4ft`**

Dans `src/data/cards.ts`, remplacer le bloc `terra-l0v3cr4ft` (lignes 448-458, commentaire TODO inclus) :

```ts
  { // TODO(rules): "exiler 1 carte d'une couleur PRÉCISE (Mercure/Vénus/Mars/Jupiter) → 1 zén" par couleur :
    // l'atome exile ne peut pas épingler une colonne d'une couleur donnée (soit correspondant à ctx.planet, soit choix libre).
    // Encodé en 4 optionals "exile self (choix libre) → 1 zén" ; la contrainte de couleur exacte n'est pas garantie.
    id: 'terra-l0v3cr4ft', name: 'L0v3cr4ft', people: 'robot', planet: 'terra', cost: 5,
    effects: [
      { k: 'influence', amount: 1, on: 'terra' },
      { k: 'optional', effects: [{ k: 'exile', side: 'self', count: 1 }, { k: 'zenithium', amount: 1, target: 'self' }] },
      { k: 'optional', effects: [{ k: 'exile', side: 'self', count: 1 }, { k: 'zenithium', amount: 1, target: 'self' }] },
      { k: 'optional', effects: [{ k: 'exile', side: 'self', count: 1 }, { k: 'zenithium', amount: 1, target: 'self' }] },
      { k: 'optional', effects: [{ k: 'exile', side: 'self', count: 1 }, { k: 'zenithium', amount: 1, target: 'self' }] },
    ] },
```

par :

```ts
  { // "exiler 1 carte d'une couleur precise -> 1 zenithium", une fois par couleur (Mercure/Venus/Mars/Jupiter).
    id: 'terra-l0v3cr4ft', name: 'L0v3cr4ft', people: 'robot', planet: 'terra', cost: 5,
    effects: [
      { k: 'influence', amount: 1, on: 'terra' },
      { k: 'optional', effects: [{ k: 'exile', side: 'self', count: 1, color: 'mercure' }, { k: 'zenithium', amount: 1, target: 'self' }] },
      { k: 'optional', effects: [{ k: 'exile', side: 'self', count: 1, color: 'venus' }, { k: 'zenithium', amount: 1, target: 'self' }] },
      { k: 'optional', effects: [{ k: 'exile', side: 'self', count: 1, color: 'mars' }, { k: 'zenithium', amount: 1, target: 'self' }] },
      { k: 'optional', effects: [{ k: 'exile', side: 'self', count: 1, color: 'jupiter' }, { k: 'zenithium', amount: 1, target: 'self' }] },
    ] },
```

- [ ] **Step 9: Transcrire `terra-h3rb3rt`**

Dans `src/data/cards.ts`, remplacer le bloc `terra-h3rb3rt` (lignes 471-481, commentaires inclus) :

```ts
  { // Planète de bandeau NON confirmée (classée Terra par défaut).
    // TODO(rules): "exiler 1 carte d'une couleur donnée → influence sur cette même couleur" ×4 :
    // même limite d'expressivité que L0v3cr4ft (couleur exacte non épinglable). Encodé best-effort.
    id: 'terra-h3rb3rt', name: 'H3rb3rt', people: 'robot', planet: 'terra', cost: 6,
    effects: [
      { k: 'influence', amount: 1, on: 'terra' },
      { k: 'optional', effects: [{ k: 'exile', side: 'self', count: 1 }, { k: 'influence', amount: 1, on: 'choice' }] },
      { k: 'optional', effects: [{ k: 'exile', side: 'self', count: 1 }, { k: 'influence', amount: 1, on: 'choice' }] },
      { k: 'optional', effects: [{ k: 'exile', side: 'self', count: 1 }, { k: 'influence', amount: 1, on: 'choice' }] },
      { k: 'optional', effects: [{ k: 'exile', side: 'self', count: 1 }, { k: 'influence', amount: 1, on: 'choice' }] },
    ] },
```

par :

```ts
  { // Planète de bandeau NON confirmée (classée Terra par défaut). 4 couleurs = Mercure/Venus/Mars/Jupiter.
    // "exiler 1 carte d'une couleur donnee -> +1 influence sur cette meme couleur" (thenInfluence : uniquement si une carte est exilee).
    id: 'terra-h3rb3rt', name: 'H3rb3rt', people: 'robot', planet: 'terra', cost: 6,
    effects: [
      { k: 'influence', amount: 1, on: 'terra' },
      { k: 'optional', effects: [{ k: 'exile', side: 'self', count: 1, color: 'mercure', thenInfluence: true }] },
      { k: 'optional', effects: [{ k: 'exile', side: 'self', count: 1, color: 'venus', thenInfluence: true }] },
      { k: 'optional', effects: [{ k: 'exile', side: 'self', count: 1, color: 'mars', thenInfluence: true }] },
      { k: 'optional', effects: [{ k: 'exile', side: 'self', count: 1, color: 'jupiter', thenInfluence: true }] },
    ] },
```

- [ ] **Step 10: Lancer la garde de régression**

Run: `npx jest cards`
Expected: PASS (les 7 cartes ont > 1 effet ; les gardes existantes — 90 cartes, give-* enveloppés, 1er effet influence — restent vertes).

- [ ] **Step 11: Vérifier qu'il ne reste que 2 TODO(rules) (charlize-gun + bajazet)**

Run: `grep -c "TODO(rules)" src/data/cards.ts`
Expected: `2` (uniquement `mars-charlize-gun` et `jupiter-bajazet`, laissées en attente utilisateur).

- [ ] **Step 12: Typecheck + suite complète**

Run: `npx tsc --noEmit && npx jest`
Expected: 0 erreur TS ; 167 tests passants (166 + 1 garde). Les simulations restent vertes.

- [ ] **Step 13: Commit**

```bash
git add src/data/cards.ts src/data/__tests__/cards.test.ts
git commit -m "feat(data): re-transcription des 7 cartes TODO resolubles (ilda-flores, lady-moore, chaka, l0v3cr4ft, h3rb3rt, titus, baron-goro)"
```

---

## Hors périmètre

- **`mars-charlize-gun` et `jupiter-bajazet` — ATTENTE UTILISATEUR.** Ces 2 cartes conservent leur `// TODO(rules)` et leur transcription actuelle. Elles ne sont ni modifiées ni testées ici.
  - **Note importante à remonter :** `docs/content/cartes-todo.md` a récemment reçu une section « ✅ Clarifications utilisateur » (lignes 25-33) proposant une lecture résoluble avec l'existant pour ces 2 cartes (charlize-gun = mobiliser + transférer + exiler adverse ; bajazet = `creditsFromCardValue source:'exileOpponent'`). **Ce plan ne les traite pas** conformément à la consigne « laisser en attente ». Si l'utilisateur confirme ces lectures, une tâche de suivi triviale les transcrira (aucun nouvel atome requis).
- **Atome dédié « exil adverse par couleur » (lady-moore) :** non créé — la mécanique est couverte par réutilisation (`exile opponent + thenInfluence`, cf. T3).
- **Atome `resourcePerTechLevels` séparé :** non créé — on a préféré généraliser `creditsPerTechLevels` avec `resource?` (moindre churn, DRY).
- **Couplage strict « obligation → récompense » de `optional`/`corresponding`/`color` :** la récompense (ex. zénithium de `l0v3cr4ft`) peut s'appliquer même si aucune carte n'a pu être exilée (colonne vide). C'est une approximation **pré-existante** partagée avec les échelles `corresponding` ; hors périmètre de corriger le combinateur `optional`.
- **Sémantique des atomes `credits`/`zenithium` à montant négatif :** conservée telle quelle (non bornée), mais **plus aucune carte ne l'utilise** après T5. On ne durcit pas ces atomes (risque/portée) ; `spend` est désormais l'atome sanctionné pour tout coût.
- **UI / rendu / transport / réseau :** hors périmètre (moteur pur uniquement).
- **Planète de bandeau de `h3rb3rt` :** reste « Terra par défaut » (non confirmée) ; non tranchée ici.

## Self-Review

**1. Couverture du spec :**
- Nouveaux atomes/extensions demandés : `resourcePerTechLevels`/généralisation → **T1** ✓ ; exil `color`/`exceptColor` → **T2** ✓ ; exil adverse + influence par couleur (lady-moore) → **T3** (réutilisation justifiée) ✓ ; `except` sur `giveInfluenceOpponent` → **T4** ✓.
- Refactor dette « payer zénithium » (`spend` + gating + migration des montants négatifs) → **T5** ✓.
- Re-transcription des 7 cartes résolubles + MAJ `cards.test.ts` → **T6** ✓.
- `charlize-gun` / `bajazet` laissées en attente → **Hors périmètre** ✓.
- Contraintes globales (pureté, immuabilité, déterminisme, terminaison, TDD, no invented effects, 158 tests) → en-tête + steps de vérification ✓.

**2. Placeholders :** aucun « TBD/TODO/à compléter » ; chaque step de code contient le code réel (old + new). Les seuls `TODO(rules)` cités sont ceux à supprimer (T6) ou à conserver volontairement (charlize-gun/bajazet).

**3. Cohérence des types :**
- `creditsPerTechLevels.resource?: 'credits' | 'zenithium'` — défini T1, utilisé T6 (ilda-flores) ✓.
- `exile.color?: Planet`, `exile.exceptColor?: Planet` — définis T2, utilisés T6 (l0v3cr4ft/h3rb3rt : `color` ; chaka : `exceptColor`) ✓.
- `giveInfluenceOpponent.exceptColor?: Planet` — défini T4, utilisé T6 (titus/baron-goro) ✓.
- `spend { resource: 'credits'|'zenithium'; amount }` et `canPayTier(state, player, cost)` — définis T5, `canPayTier` importé dans `moves.ts` (T5) ✓.
- `PendingDecision` inchangé : `chooseColumn.exclude`, `choosePlanet.exclude`/`beneficiary`, `chooseTier` réutilisés — cohérent avec `legalMoves`/`decide` existants ✓.
- Comptes de tests cumulés : 158 → 159 (T1) → 162 (T2) → 163 (T3) → 164 (T4) → 166 (T5) → 167 (T6). Cohérent.

**4. Risques identifiés & atténuations :**
- `toEqual` sur des `pending` avec champs `undefined` (`exclude`/`thenInfluence`) : Jest ignore les propriétés `undefined`, donc les tests existants (`exile opponentChoice`) restent verts. ✓
- Migration `scale` : `START_ZENITHIUM = 1` — le test de gating (T5) est calibré dessus (palier 1 zén payable, palier 5 zén non). ✓
- Simulations aléatoires (`sim`/`bot`) : le gating ne fait que restreindre des coups qui menaient à un état illégal → strictement plus sûr. Vérifié par `npx jest` complet en fin de T5 et T6. ✓

## Execution Handoff

**Plan complet et sauvegardé dans `docs/superpowers/plans/2026-07-24-zenith-finalisation-cartes.md`. Deux options d'exécution :**

**1. Subagent-Driven (recommandé)** — un sous-agent frais par tâche, revue entre les tâches, itération rapide.

**2. Inline Execution** — exécution des tâches dans cette session via executing-plans, par lots avec checkpoints.

**Quelle approche ?**

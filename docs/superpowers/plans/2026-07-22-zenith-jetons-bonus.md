# Jetons Bonus (R4) : catalogue, réserve/défausse, déclencheurs plateau — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development pour exécuter ce plan tâche par tâche. Les étapes utilisent la syntaxe checkbox (`- [ ]`).

**Goal:** Implémenter l'infrastructure des **16 jetons bonus** confirmés (`docs/content/jetons-bonus.md`) dans le moteur pur : un **catalogue** de jetons (`src/data/tokens.ts`), l'état **réserve / défausse / emplacements plateau** (`bonusReserve`, `bonusDiscard`, `PlanetTrack.bonusToken`, `techBonus`), l'atome **`bonusToken`** (gain d'un jeton depuis la réserve, pour les futures technos O1/D3) avec **recharge** de la réserve, et les **deux déclencheurs de plateau** confirmés : capture d'une planète portant un jeton, et 1re montée au **niveau 2** d'une techno. Tous les effets de jetons se mappent sur des **atomes existants** — aucun nouvel effet de jeu n'est créé (seul l'atome technique `bonusToken` est ajouté). Le **contenu réel des technos**, les **cartes agent** (choix réserve/plateau), l'**UI** et le **réseau** sont **hors périmètre**.

**Architecture:** On réutilise **strictement** la file d'effets existante (`ResolutionState.queue` remplie par `applyMove`, drainée par `resolve`, décisions posées via `pending` et résolues par `decide`). Les jetons n'ajoutent **aucun** nouveau `Move` ni `PendingDecision` : leurs effets sont simplement **insérés dans la file** au bon endroit, puis résolus par la machinerie existante (y compris les décisions interactives `influence choice`, `chooseColumn`, etc. que leurs effets peuvent déclencher). Trois points d'insertion :

1. **Atome `bonusToken`** (gain depuis la réserve) — intercepté dans la boucle `resolve` comme les autres atomes non directement appliqués. Il tire le **premier** id de `bonusReserve` (réserve déjà mélangée au setup ⇒ tirage aléatoire **déterministe**), recharge la réserve depuis `bonusDiscard` (via `shuffle(state.rng)`) si vide, insère les `effects` du jeton **en tête du reste de la file** et défausse l'id. Comme l'interception gère elle-même le retrait de l'atome (`queue.slice(1)`), l'insertion en tête est correcte ici.
2. **Déclencheur capture-planète** — dans `gainInfluence`, à la capture d'une planète portant un `bonusToken`. Le déclenchement se produit **pendant** le traitement de l'atome courant (index 0 de la file). Comme `resolve`/`decide` feront `queue.slice(1)` **après** ce traitement pour retirer l'atome courant, on insère les effets du jeton **juste après l'atome courant (index 1)**, PAS à l'index 0 — sinon ils seraient rabotés par ce `slice(1)`. Net : le jeton se résout « d'abord », avant les effets restants, conformément à la règle confirmée.
3. **Déclencheur niveau 2** — dans la branche `develop` de `applyMove`, la file est **construite à plat** (niveau N → … → 1) *avant* tout `slice`. On **intercale** les effets du jeton **entre** les effets du niveau 2 et ceux du niveau 1 lors de la construction du tableau. Simple concaténation, aucune subtilité de `slice`.

**Tech Stack:** TypeScript strict, jest + ts-jest. Aucune dépendance runtime ajoutée.

## Global Constraints

- **Moteur pur** : aucun import `react` / `react-native` / `expo` / `expo-*` / `net` / socket dans `src/engine` ou `src/data` (garanti par `purity.test.ts`). `src/data/tokens.ts` n'importe **que** le type `Effect` de `../engine/types`.
- **Immuabilité stricte** : aucune mutation en place de `state` ni de ses sous-objets ; toujours des copies (`{...}` / `[...]` / `.slice` / `.map`).
- **Déterminisme** : tout aléa passe par `state.rng` + `shuffle` de `./rng` (jamais `Math.random`). Le seul tirage des jetons est le `shuffle` de setup + le `shuffle` de recharge dans `resolve` — tous deux thread `state.rng`.
- **TDD** : chaque tâche = test qui échoue → implémentation minimale → vert → commit. **Code complet, aucun placeholder.**
- **Ne rien casser** : les **83 tests existants** doivent rester verts. Migration `bonusActive` → `bonusToken` : adapter les **3 littéraux** de test qui le référencent (`influence.test.ts`, `moves.test.ts`, `effects.test.ts`). Conserver **INTACTS** les flux interactifs `influence on:'choice'` → `choosePlanet`, `influenceNeighbors` → `chooseSegment`, `influenceDifferent` (exclusion), `transfer`/`exile`/`exileForInfluence` → `chooseColumn`.
- **Effets réels, non inventés** : le catalogue est la **transcription confirmée** de `docs/content/jetons-bonus.md` (2026-07-22). Aucun effet supplémentaire, aucun marquage « non canonique » (le contenu est confirmé).
- **Cap de victoire** : les effets de jetons `influence*`/`mobilize thenInfluence` peuvent déclencher une victoire ; on conserve les gardes `s.winner === null` déjà présentes dans `resolve`/`decide`, et `gainInfluence` recalcule `winner` comme aujourd'hui.

## File Structure

- `src/data/tokens.ts` — **nouveau** : `TokenDef`, `TOKENS` (16 jetons), `tokenOf(id)`.
- `src/data/__tests__/tokens.test.ts` — **nouveau** : catalogue (compte, unicité, répartition), `tokenOf` (résolution + throw).
- `src/engine/types.ts` — `PlanetTrack.bonusActive` → `PlanetTrack.bonusToken: string | null` ; ajout `GameState.bonusReserve` / `bonusDiscard` / `techBonus` ; ajout `{ k: 'bonusToken' }` à l'union `Effect`.
- `src/engine/setup.ts` — `createGame` : `shuffle` des 16 ids (thread rng post-deck), placement **5 planètes + 3 technos + 8 réserve**, `bonusDiscard: []`, `techBonus` rempli.
- `src/engine/effects.ts` — `applyEffect` : `case 'bonusToken': throw` (jamais atteint) ; `resolve` : interception de l'atome `bonusToken` (recharge + tirage + insertion en tête + défausse).
- `src/engine/influence.ts` — `gainInfluence` : migration du champ + (Tâche 4) insertion des effets du jeton de planète après l'atome courant + défausse + `bonusToken=null`.
- `src/engine/moves.ts` — branche `develop` : intercalage du jeton de l'emplacement niveau 2 (niveau 2 → jeton → niveau 1) + `techBonus[people]=null` + défausse.
- `src/engine/__tests__/setup.test.ts` — placement 5/3/8, réserve = 8, déterminisme, `bonusDiscard` vide.
- `src/engine/__tests__/effects.test.ts` — atome `bonusToken` (réserve, recharge, no-op, ordre en tête) ; migration littéral `bonusActive`.
- `src/engine/__tests__/influence.test.ts` — déclencheur capture (jeton d'abord) ; migration littéral.
- `src/engine/__tests__/moves.test.ts` — déclencheur niveau 2 (1er joueur prend, intercalé ; 2e ne reprend pas) ; migration littéral.

## Formes retenues (source de vérité pour toutes les tâches)

| Élément | Forme exacte |
| --- | --- |
| `TokenDef` | `{ id: string; effects: Effect[] }` |
| `PlanetTrack` | `{ discPos: number; captured: [number, number]; bonusToken: string \| null }` |
| `GameState` (ajouts) | `bonusReserve: string[]` (ids face cachée) ; `bonusDiscard: string[]` ; `techBonus: Record<People, string \| null>` |
| Atome `bonusToken` | `{ k: 'bonusToken' }` — jamais appliqué par `applyEffect` (throw) ; **toujours** intercepté par `resolve` |
| Placement setup | 5 premiers ids → `planets[PLANETS[i]].bonusToken` ; 3 suivants → `techBonus[PEOPLES[j]]` ; 8 restants → `bonusReserve` ; `bonusDiscard: []` |

---

### Task 1: Catalogue des jetons (`src/data/tokens.ts`) + `tokenOf`

Transcription confirmée de `docs/content/jetons-bonus.md` : 16 jetons, chacun un id **unique et stable**, chaque effet mappé sur un atome **existant** de l'union `Effect`. Aucune logique moteur ici — juste des données + un accesseur strict.

**Files:**
- Create: `src/data/tokens.ts`
- Test: `src/data/__tests__/tokens.test.ts`

**Interfaces:**
- Produces: `type TokenDef = { id: string; effects: Effect[] }` ; `const TOKENS: TokenDef[]` (16 entrées) ; `function tokenOf(id: string): TokenDef` (throw si inconnu).
- Consumes: `Effect` de `../engine/types` (type-only import — préserve la pureté).

- [ ] **Step 1: Écrire les tests** — `src/data/__tests__/tokens.test.ts`

```ts
import { TOKENS, tokenOf } from '../tokens';
import type { Effect } from '../../engine/types';

// Compte les jetons dont l'unique effet correspond au prédicat.
function count(pred: (e: Effect) => boolean): number {
  return TOKENS.filter((t) => t.effects.length === 1 && pred(t.effects[0]!)).length;
}

test('le catalogue contient exactement 16 jetons', () => {
  expect(TOKENS).toHaveLength(16);
});

test('tous les ids sont uniques', () => {
  const ids = TOKENS.map((t) => t.id);
  expect(new Set(ids).size).toBe(16);
});

test('répartition confirmée des 16 jetons (docs/content/jetons-bonus.md)', () => {
  expect(count((e) => e.k === 'zenithium' && e.amount === 1 && e.target === 'self')).toBe(3);
  expect(count((e) => e.k === 'credits' && e.amount === 3 && e.target === 'self')).toBe(2);
  expect(count((e) => e.k === 'credits' && e.amount === 4 && e.target === 'self')).toBe(2);
  expect(count((e) => e.k === 'influence' && e.on === 'choice' && e.amount === 1)).toBe(4);
  expect(count((e) => e.k === 'exile' && e.side === 'opponent' && e.count === 2)).toBe(1);
  expect(count((e) => e.k === 'transfer' && e.count === 1)).toBe(1);
  expect(count((e) => e.k === 'mobilize' && e.count === 2 && e.thenInfluence === false)).toBe(1);
  expect(count((e) => e.k === 'takeLeader' && e.side === 'silver')).toBe(2);
});

test('tokenOf retourne la définition et lève si inconnu', () => {
  const first = TOKENS[0]!;
  expect(tokenOf(first.id)).toBe(first);
  expect(() => tokenOf('tok-inexistant')).toThrow();
});
```

- [ ] **Step 2: Lancer → échec**

Run: `npx jest tokens`
Expected: FAIL (`src/data/tokens.ts` n'existe pas).

- [ ] **Step 3: Créer le catalogue** — `src/data/tokens.ts`

```ts
import type { Effect } from '../engine/types';

export type TokenDef = { id: string; effects: Effect[] };

// Catalogue RÉEL confirmé (docs/content/jetons-bonus.md, 2026-07-22) — 16 jetons.
// Chaque effet se mappe sur un atome existant de l'union Effect (aucun nouvel effet de jeu).
export const TOKENS: TokenDef[] = [
  { id: 'tok-zen1-1', effects: [{ k: 'zenithium', amount: 1, target: 'self' }] },
  { id: 'tok-zen1-2', effects: [{ k: 'zenithium', amount: 1, target: 'self' }] },
  { id: 'tok-zen1-3', effects: [{ k: 'zenithium', amount: 1, target: 'self' }] },
  { id: 'tok-cred3-1', effects: [{ k: 'credits', amount: 3, target: 'self' }] },
  { id: 'tok-cred3-2', effects: [{ k: 'credits', amount: 3, target: 'self' }] },
  { id: 'tok-cred4-1', effects: [{ k: 'credits', amount: 4, target: 'self' }] },
  { id: 'tok-cred4-2', effects: [{ k: 'credits', amount: 4, target: 'self' }] },
  { id: 'tok-inf1-1', effects: [{ k: 'influence', on: 'choice', amount: 1 }] },
  { id: 'tok-inf1-2', effects: [{ k: 'influence', on: 'choice', amount: 1 }] },
  { id: 'tok-inf1-3', effects: [{ k: 'influence', on: 'choice', amount: 1 }] },
  { id: 'tok-inf1-4', effects: [{ k: 'influence', on: 'choice', amount: 1 }] },
  { id: 'tok-exile2', effects: [{ k: 'exile', side: 'opponent', count: 2 }] },
  { id: 'tok-transfer1', effects: [{ k: 'transfer', count: 1 }] },
  { id: 'tok-mobilize2', effects: [{ k: 'mobilize', count: 2, thenInfluence: false }] },
  { id: 'tok-leader-1', effects: [{ k: 'takeLeader', side: 'silver' }] },
  { id: 'tok-leader-2', effects: [{ k: 'takeLeader', side: 'silver' }] },
];

const BY_ID: Record<string, TokenDef> = Object.fromEntries(TOKENS.map((t) => [t.id, t]));

export function tokenOf(id: string): TokenDef {
  const def = BY_ID[id];
  if (!def) throw new Error(`tokenOf: jeton inconnu « ${id} »`);
  return def;
}
```

Total : 3 + 2 + 2 + 4 + 1 + 1 + 1 + 2 = **16** ✓.

- [ ] **Step 4: Relancer → vert, puis suite complète + pureté**

Run: `npx jest tokens` → PASS ; puis `npx jest purity` → PASS (tokens.ts n'importe qu'un type) ; puis `npx jest && npm run typecheck` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/tokens.ts src/data/__tests__/tokens.test.ts
git commit -m "feat(data): catalogue des 16 jetons bonus + tokenOf"
```

---

### Task 2: État (`bonusReserve` / `bonusDiscard` / `techBonus` / `PlanetTrack.bonusToken`) + placement au setup + migration `bonusActive`

On remplace le placeholder `PlanetTrack.bonusActive: boolean` par `PlanetTrack.bonusToken: string | null` (id du jeton posé), on ajoute les trois champs de `GameState`, et on place les 8 jetons de plateau + 8 en réserve de façon **déterministe** au setup. Cette tâche migre aussi `influence.ts` et les **3 littéraux de test** qui référençaient `bonusActive`. À ce stade, `gainInfluence` **retire** simplement le jeton de la planète capturée (défausse) **sans appliquer ses effets** — le déclenchement d'effet est ajouté en Tâche 4 (étape TDD intermédiaire assumée).

**Files:**
- Modify: `src/engine/types.ts`
- Modify: `src/engine/setup.ts`
- Modify: `src/engine/influence.ts`
- Test: `src/engine/__tests__/setup.test.ts`
- Modify (migration littéral) : `src/engine/__tests__/influence.test.ts`, `src/engine/__tests__/moves.test.ts`, `src/engine/__tests__/effects.test.ts`

**Interfaces:**
- Produces: `PlanetTrack.bonusToken: string | null` ; `GameState.bonusReserve: string[]` ; `GameState.bonusDiscard: string[]` ; `GameState.techBonus: Record<People, string | null>` ; `{ k: 'bonusToken' }` ajouté à `Effect` (implémenté en Tâche 3, déclaré ici pour éviter un 2e remaniement de l'union). `createGame` remplit ces champs.
- Consumes: `TOKENS` de `../data/tokens` ; `shuffle` de `./rng` ; `PLANETS`, `PEOPLES` de `./types`.

- [ ] **Step 1: Écrire les tests** — `src/engine/__tests__/setup.test.ts` (ajouter à la fin)

```ts
import { TOKENS } from '../../data/tokens';

test('setup : 8 jetons sur le plateau (5 planètes + 3 technos) et 8 en réserve', () => {
  const s = createGame(CONFIG, 42);
  const onPlanets = PLANETS.map((p) => s.planets[p].bonusToken);
  const onTech = (['animod', 'humain', 'robot'] as const).map((pe) => s.techBonus[pe]);
  expect(onPlanets.every((t) => t !== null)).toBe(true); // 5 planètes garnies
  expect(onTech.every((t) => t !== null)).toBe(true);     // 3 emplacements niveau 2 garnis
  expect(s.bonusReserve).toHaveLength(8);
  expect(s.bonusDiscard).toEqual([]);
});

test('setup : les 16 jetons sont répartis sans perte ni doublon', () => {
  const s = createGame(CONFIG, 42);
  const placed = [
    ...PLANETS.map((p) => s.planets[p].bonusToken!),
    ...(['animod', 'humain', 'robot'] as const).map((pe) => s.techBonus[pe]!),
    ...s.bonusReserve,
  ];
  expect(placed).toHaveLength(16);
  expect(new Set(placed)).toEqual(new Set(TOKENS.map((t) => t.id)));
});

test('setup : placement des jetons déterministe pour une même graine', () => {
  const a = createGame(CONFIG, 999);
  const b = createGame(CONFIG, 999);
  expect(a.bonusReserve).toEqual(b.bonusReserve);
  expect(PLANETS.map((p) => a.planets[p].bonusToken)).toEqual(PLANETS.map((p) => b.planets[p].bonusToken));
  expect(a.techBonus).toEqual(b.techBonus);
});
```

Migration des littéraux existants (mêmes fichiers) :
- `src/engine/__tests__/influence.test.ts` ligne ~21 : remplacer `expect(s.planets.mars.bonusActive).toBe(false);` par `expect(s.planets.mars.bonusToken).toBeNull();` (à la capture, le jeton de la planète est retiré).
- `src/engine/__tests__/moves.test.ts` ligne ~137 : `{ discPos: 1, captured: [2, 0], bonusActive: false }` → `{ discPos: 1, captured: [2, 0], bonusToken: null }`.
- `src/engine/__tests__/effects.test.ts` ligne ~75 : `{ discPos: 1, captured: [2, 0], bonusActive: false }` → `{ discPos: 1, captured: [2, 0], bonusToken: null }`.

- [ ] **Step 2: Lancer → échec (compilation)**

Run: `npx jest setup` puis `npm run typecheck`
Expected: FAIL (`bonusToken`/`bonusReserve`/`techBonus` inexistants ; `bonusActive` encore requis par le type).

- [ ] **Step 3: Étendre les types** — `src/engine/types.ts`

Remplacer la définition de `PlanetTrack` :
```ts
/** 9 positions : 0 = zone contrôle J0, 4 = centre, 8 = zone contrôle J1. */
export type PlanetTrack = { discPos: number; captured: [number, number]; bonusToken: string | null };
```
Ajouter `{ k: 'bonusToken' }` à l'union `Effect` (après `exileForInfluence`) :
```ts
  | { k: 'exileForInfluence'; count: number; amount: number }
  | { k: 'bonusToken' };
```
Ajouter à `GameState` (après `planets: Record<Planet, PlanetTrack>;`) :
```ts
  bonusReserve: string[];
  bonusDiscard: string[];
  techBonus: Record<People, string | null>;
```

- [ ] **Step 4: Placement au setup** — `src/engine/setup.ts`

Ajouter les imports :
```ts
import { PLANETS, PEOPLES, type GameConfig, type GameState, type People, type Planet, type PlayerIndex, type PlayerState } from './types';
import { TOKENS } from '../data/tokens';
```
Dans `createGame`, après le `shuffle` du deck, ajouter le `shuffle` des jetons (thread le rng post-deck) et le placement :
```ts
export function createGame(config: GameConfig, seed: number, deck: CardDef[] = FIXTURE_CARDS): GameState {
  const [shuffled, rngAfterDeck] = shuffle(deck.map((c) => c.id), makeRng(seed));
  const hand0 = shuffled.slice(0, START_HAND);
  const hand1 = shuffled.slice(START_HAND, START_HAND * 2);
  const rest = shuffled.slice(START_HAND * 2);

  const secondPlayer: PlayerIndex = config.firstPlayer === 0 ? 1 : 0;

  // Jetons bonus : mélange déterministe (rng post-deck → n'altère pas les mains).
  const [tokenIds, rng] = shuffle(TOKENS.map((t) => t.id), rngAfterDeck);
  const boardPlanets = tokenIds.slice(0, 5); // 5 premiers → planètes (ordre PLANETS)
  const boardTech = tokenIds.slice(5, 8);    // 3 suivants → colonnes techno (ordre PEOPLES)
  const bonusReserve = tokenIds.slice(8);    // 8 restants → réserve

  const planets = {} as Record<Planet, GameState['planets'][Planet]>;
  PLANETS.forEach((planet, i) => {
    // +1 Influence Terra pour le 2e joueur : disque décalé d'un cran vers SA zone.
    const offset = planet === 'terra' ? (secondPlayer === 0 ? -1 : +1) : 0;
    planets[planet] = { discPos: CENTER + offset, captured: [0, 0], bonusToken: boardPlanets[i]! };
  });

  const techBonus = {} as Record<People, string | null>;
  PEOPLES.forEach((people, j) => {
    techBonus[people] = boardTech[j]!;
  });

  return {
    config,
    rng,
    current: config.firstPlayer,
    players: [newPlayer(hand0), newPlayer(hand1)],
    deck: rest,
    discard: [],
    planets,
    diplomacy: { leader: null, side: 'silver' },
    resolution: null,
    pending: null,
    winner: null,
    bonusReserve,
    bonusDiscard: [],
    techBonus,
  };
}
```
(Le `shuffle` du deck reste **identique** ⇒ le test existant « même seed → mêmes mains » reste vert : les jetons sont mélangés *après*, avec le rng post-deck.)

- [ ] **Step 5: Migrer `gainInfluence`** — `src/engine/influence.ts`

Remplacer le corps de `gainInfluence` (sans encore appliquer les effets du jeton — ajouté en Tâche 4) :
```ts
export function gainInfluence(
  state: GameState,
  planet: Planet,
  player: PlayerIndex,
  amount: number,
): GameState {
  const track = state.planets[planet];
  const dir = player === 0 ? -1 : +1;
  let pos = track.discPos + dir * amount;

  const captured: [number, number] = [track.captured[0], track.captured[1]];
  let bonusToken = track.bonusToken;
  let bonusDiscard = state.bonusDiscard;

  const reachedZone = player === 0 ? pos <= ZONE[0] : pos >= ZONE[1];
  if (reachedZone) {
    captured[player] += 1;
    pos = CENTER; // nouveau disque au centre (simplifié ; remise en fin de tour affinée plus tard)
    if (bonusToken !== null) {
      // Le jeton de la planète quitte le plateau à la capture (déclenchement d'effet ajouté en Tâche 4).
      bonusDiscard = [...bonusDiscard, bonusToken];
      bonusToken = null;
    }
  } else {
    pos = Math.max(0, Math.min(8, pos));
  }

  const planets = { ...state.planets, [planet]: { discPos: pos, captured, bonusToken } };
  const next: GameState = { ...state, planets, bonusDiscard };
  const w = winnerOf(next);
  return w === null ? next : { ...next, winner: w };
}
```

- [ ] **Step 6: Relancer → vert, puis suite complète**

Run: `npx jest setup` → PASS ; puis `npx jest && npm run typecheck` → PASS.
Note : la suite complète peut révéler qu'un test de simulation/smoke capture désormais une planète porteuse de jeton (jeton silencieusement défaussé à ce stade). Les invariants (déterminisme, conservation des cartes, victoire) restent valides ; si un test assertait un total de ressources exact impacté par une capture, **isoler** en forçant `bonusToken: null` sur la planète concernée dans ce test. Ne pas modifier la logique moteur pour ça.

- [ ] **Step 7: Commit**

```bash
git add src/engine/types.ts src/engine/setup.ts src/engine/influence.ts src/engine/__tests__/setup.test.ts src/engine/__tests__/influence.test.ts src/engine/__tests__/moves.test.ts src/engine/__tests__/effects.test.ts
git commit -m "feat(engine): état jetons bonus (reserve/discard/techBonus/PlanetTrack.bonusToken) + placement setup 5+3+8"
```

---

### Task 3: Atome `bonusToken` (gain depuis la réserve) dans `resolve`

L'atome `{ k: 'bonusToken' }` modélise « gagner un jeton depuis la réserve » (futures technos O1/D3, à câbler avec le vrai contenu). Il est **intercepté** dans la boucle `resolve` — jamais appliqué par `applyEffect`. Comportement (ordre confirmé « jeton appliqué immédiatement ») :
1. Si `bonusReserve` vide **et** `bonusDiscard` non vide → recharger : `[reserve, rng] = shuffle(bonusDiscard, s.rng)`, `bonusDiscard = []`, mettre à jour `s.rng`.
2. Si la réserve est **toujours** vide → l'atome est un **no-op** : on le retire (`queue.slice(1)`) et on continue.
3. Sinon → prendre le **premier** id de `bonusReserve` (réserve pré-mélangée ⇒ tirage aléatoire déterministe), l'insérer via ses `effects` **en tête du reste de la file** (le reste = `queue.slice(1)`, l'atome `bonusToken` étant retiré dans le même pas), pousser l'id dans `bonusDiscard`, puis `continue`. Les effets du jeton se résolvent donc immédiatement, **avant** la suite de la file — y compris s'ils sont interactifs (`influence choice` → pose un `pending` géré normalement).

Point de threading rng : `resolve` devient (dans ce seul cas) une fonction qui fait avancer `state.rng`. C'est déterministe (dérivé de `s.rng`) et immuable (nouvelle `RngState` renvoyée par `shuffle`).

**Files:**
- Modify: `src/engine/effects.ts` (imports, `applyEffect` garde-fou, `resolve` interception)
- Test: `src/engine/__tests__/effects.test.ts`

**Interfaces:**
- Produces: interception de `{ k: 'bonusToken' }` dans `resolve` ; `case 'bonusToken': throw` dans `applyEffect`.
- Consumes: `shuffle` de `./rng` ; `tokenOf` de `../data/tokens` ; `state.bonusReserve` / `bonusDiscard` / `rng`.

- [ ] **Step 1: Écrire les tests** — `src/engine/__tests__/effects.test.ts` (ajouter)

```ts
import { shuffle } from '../rng';

test("bonusToken tire le 1er id de la réserve, applique ses effets et le défausse", () => {
  const base = createGame(CONFIG, 1);
  const s: GameState = {
    ...base,
    bonusReserve: ['tok-cred3-1', 'tok-zen1-1'],
    bonusDiscard: [],
    resolution: { queue: [{ k: 'bonusToken' } as const], ctx: { player: 0 as const, planet: 'terra' as const } },
  };
  const out = resolve(s);
  expect(out.players[0].credits).toBe(base.players[0].credits + 3); // effet de tok-cred3-1
  expect(out.bonusReserve).toEqual(['tok-zen1-1']);                  // 1er retiré
  expect(out.bonusDiscard).toEqual(['tok-cred3-1']);                 // passé en défausse
  expect(out.resolution).toBeNull();
});

test("bonusToken recharge la réserve depuis la défausse quand elle est vide", () => {
  const base = createGame(CONFIG, 1);
  const s: GameState = {
    ...base,
    bonusReserve: [],
    bonusDiscard: ['tok-cred4-1'],
    resolution: { queue: [{ k: 'bonusToken' } as const], ctx: { player: 0 as const, planet: 'terra' as const } },
  };
  const out = resolve(s);
  expect(out.players[0].credits).toBe(base.players[0].credits + 4); // rechargé puis appliqué
  expect(out.bonusReserve).toEqual([]);        // un seul jeton dispo, consommé
  expect(out.bonusDiscard).toEqual(['tok-cred4-1']); // re-défaussé
});

test("bonusToken est un no-op quand réserve ET défausse sont vides", () => {
  const base = createGame(CONFIG, 1);
  const s: GameState = {
    ...base,
    bonusReserve: [],
    bonusDiscard: [],
    resolution: {
      queue: [{ k: 'bonusToken' } as const, { k: 'credits', amount: 2, target: 'self' } as const],
      ctx: { player: 0 as const, planet: 'terra' as const },
    },
  };
  const out = resolve(s);
  expect(out.players[0].credits).toBe(base.players[0].credits + 2); // credits appliqué, bonusToken sauté
  expect(out.resolution).toBeNull();
});

test("bonusToken insère ses effets EN TÊTE du reste de la file (résolus avant la suite)", () => {
  const base = createGame(CONFIG, 1);
  const s: GameState = {
    ...base,
    bonusReserve: ['tok-inf1-1'], // influence au choix → pose un pending choosePlanet
    resolution: {
      queue: [{ k: 'bonusToken' } as const, { k: 'credits', amount: 5, target: 'self' } as const],
      ctx: { player: 0 as const, planet: 'terra' as const },
    },
  };
  const out = resolve(s);
  expect(out.pending).toEqual({ kind: 'choosePlanet', amount: 1 }); // le jeton se résout d'abord
  expect(out.players[0].credits).toBe(base.players[0].credits);     // credits PAS encore appliqué
  expect(out.bonusDiscard).toEqual(['tok-inf1-1']);
});
```
(Note : `createGame` garnit déjà `bonusReserve`/`bonusDiscard`, mais chaque test les **écrase** explicitement pour un tirage déterministe indépendant du placement.)

- [ ] **Step 2: Lancer → échec**

Run: `npx jest effects -t bonusToken`
Expected: FAIL (atome non intercepté ; tombe dans `applyEffect` → pas encore de case).

- [ ] **Step 3: Imports + garde-fou** — `src/engine/effects.ts`

Ajouter en tête :
```ts
import { shuffle } from './rng';
import { tokenOf } from '../data/tokens';
```
Dans le `switch (effect.k)` de `applyEffect`, ajouter :
```ts
    case 'bonusToken':
      throw new Error("applyEffect: 'bonusToken' passe par resolve (interception)");
```

- [ ] **Step 4: Interception dans `resolve`** — `src/engine/effects.ts`

Dans la boucle `while` de `resolve`, **avant** la ligne `s = applyEffect(s, head, ctx);`, ajouter :
```ts
    if (head.k === 'bonusToken') {
      let reserve = s.bonusReserve;
      let discard = s.bonusDiscard;
      let rng = s.rng;
      if (reserve.length === 0 && discard.length > 0) {
        const [refilled, nextRng] = shuffle(discard, rng);
        reserve = refilled;
        discard = [];
        rng = nextRng;
      }
      if (reserve.length === 0) {
        // aucun jeton disponible → no-op : on retire l'atome et on continue
        s = { ...s, rng, resolution: { queue: s.resolution!.queue.slice(1), ctx, chosen: s.resolution!.chosen } };
        continue;
      }
      const [takenId, ...restReserve] = reserve;
      const tokenFx = tokenOf(takenId!).effects;
      s = {
        ...s,
        rng,
        bonusReserve: restReserve,
        bonusDiscard: [...discard, takenId!],
        // l'atome bonusToken est retiré (slice(1)) ET ses effets insérés en tête du reste
        resolution: { queue: [...tokenFx, ...s.resolution!.queue.slice(1)], ctx, chosen: s.resolution!.chosen },
      };
      continue;
    }
```

- [ ] **Step 5: Relancer → vert, puis suite complète**

Run: `npx jest effects -t bonusToken` → PASS ; puis `npx jest && npm run typecheck` → PASS.

- [ ] **Step 6: Commit**

```bash
git add src/engine/effects.ts src/engine/__tests__/effects.test.ts
git commit -m "feat(engine): atome bonusToken (tirage réserve + recharge défausse + insertion en tête)"
```

---

### Task 4: Déclencheur capture-planète dans `gainInfluence`

À la capture d'une planète portant un `bonusToken`, on applique **le jeton d'abord**, puis les effets restants. Concrètement : dans `gainInfluence`, quand `reachedZone` et `state.planets[planet].bonusToken !== null` **et** `state.resolution !== null`, on insère les `effects` du jeton dans `resolution.queue` **juste après l'atome courant (index 0)**, on passe l'id en `bonusDiscard`, et on met `bonusToken = null` sur la planète.

**Pourquoi index 1 et pas 0 :** `gainInfluence` est toujours appelé *pendant* le traitement de l'atome courant (`queue[0]`), et l'appelant (`resolve` via `applyEffect`, ou `decide`) fait ensuite `queue.slice(1)` pour retirer cet atome. Si on insérait à l'index 0, ce `slice(1)` raboterait le **premier effet du jeton** au lieu de l'atome courant (et rejouerait l'atome courant). En insérant à l'index 1, après le `slice(1)` de l'appelant les effets du jeton se retrouvent **en tête** du reste ⇒ « jeton d'abord, puis effets restants ». (C'est le seul point où l'insertion diffère de l'atome `bonusToken` de la Tâche 3, qui gère lui-même son `slice`.)

Cas `resolution === null` (capture hors résolution — quasi impossible : aucune capture au setup) : on retire quand même le jeton (défausse + `bonusToken=null`) sans rien enfiler. C'est déjà le comportement posé en Tâche 2 ; cette tâche ajoute uniquement l'enfilement quand `resolution !== null`.

**Files:**
- Modify: `src/engine/influence.ts` (import `tokenOf`, enfilement dans le bloc capture)
- Test: `src/engine/__tests__/influence.test.ts`

**Interfaces:**
- Produces: `gainInfluence` insère les effets du jeton de planète à l'index 1 de `resolution.queue`, défausse l'id, met `bonusToken=null`.
- Consumes: `tokenOf` de `../data/tokens` ; `state.resolution.queue` ; `state.bonusDiscard`.

- [ ] **Step 1: Écrire les tests** — `src/engine/__tests__/influence.test.ts` (ajouter)

```ts
import { resolve, decide } from '../effects';
import type { GameState } from '../types';

test("capture d'une planète portant un jeton : le jeton se résout AVANT les effets restants", () => {
  const base = createGame(CONFIG, 1);
  // mars à un cran de la capture pour J0 ; on force le jeton de mars = influence au choix.
  const s: GameState = {
    ...base,
    planets: { ...base.planets, mars: { discPos: 4, captured: [0, 0], bonusToken: 'tok-inf1-1' } },
    resolution: {
      queue: [
        { k: 'influence', amount: 4, on: 'mars' } as const, // capture mars (4 → 0)
        { k: 'credits', amount: 5, target: 'self' } as const,
      ],
      ctx: { player: 0 as const, planet: 'mars' as const },
    },
  };
  const out = resolve(s);
  // le jeton (influence au choix) s'intercale et pose un pending AVANT credits
  expect(out.pending).toEqual({ kind: 'choosePlanet', amount: 1 });
  expect(out.players[0].credits).toBe(base.players[0].credits); // credits pas encore appliqué
  expect(out.planets.mars.bonusToken).toBeNull();               // jeton retiré de la planète
  expect(out.bonusDiscard).toContain('tok-inf1-1');             // défaussé
  expect(out.planets.mars.captured[0]).toBe(1);                 // capture effective
  // on termine : le jeton se résout (influence venus), puis credits
  const done = decide(out, 'venus');
  expect(done.players[0].credits).toBe(base.players[0].credits + 5);
  expect(done.resolution).toBeNull();
});

test("capture d'une planète avec jeton immédiat : effet appliqué puis suite", () => {
  const base = createGame(CONFIG, 1);
  const s: GameState = {
    ...base,
    planets: { ...base.planets, mars: { discPos: 4, captured: [0, 0], bonusToken: 'tok-zen1-1' } },
    resolution: {
      queue: [
        { k: 'influence', amount: 4, on: 'mars' } as const,
        { k: 'credits', amount: 5, target: 'self' } as const,
      ],
      ctx: { player: 0 as const, planet: 'mars' as const },
    },
  };
  const out = resolve(s);
  expect(out.pending).toBeNull();
  expect(out.resolution).toBeNull();
  expect(out.players[0].zenithium).toBe(base.players[0].zenithium + 1); // jeton zénithium
  expect(out.players[0].credits).toBe(base.players[0].credits + 5);     // puis credits
  expect(out.planets.mars.bonusToken).toBeNull();
  expect(out.bonusDiscard).toContain('tok-zen1-1');
});
```

- [ ] **Step 2: Lancer → échec**

Run: `npx jest influence -t "jeton"`
Expected: FAIL (le jeton est défaussé mais ses effets ne sont pas enfilés → `credits` appliqué immédiatement / zénithium non gagné).

- [ ] **Step 3: Enfiler les effets du jeton** — `src/engine/influence.ts`

Ajouter l'import :
```ts
import { tokenOf } from '../data/tokens';
```
Dans le bloc `if (reachedZone) { ... }`, remplacer la sous-branche `if (bonusToken !== null) { ... }` (posée en Tâche 2) par :
```ts
    if (bonusToken !== null) {
      // Le jeton de la planète se déclenche AVANT les effets restants.
      if (state.resolution !== null) {
        const tokenFx = tokenOf(bonusToken).effects;
        const q = state.resolution.queue;
        // Insertion APRÈS l'atome courant (index 0) : l'appelant fera queue.slice(1),
        // laissant les effets du jeton en tête du reste (« jeton d'abord »).
        resolution = { ...state.resolution, queue: [...q.slice(0, 1), ...tokenFx, ...q.slice(1)] };
      }
      bonusDiscard = [...bonusDiscard, bonusToken];
      bonusToken = null; // le jeton quitte la planète
    }
```
Déclarer `let resolution = state.resolution;` en tête de fonction (à côté de `let bonusDiscard = state.bonusDiscard;`) et l'inclure dans le `next` renvoyé :
```ts
  const planets = { ...state.planets, [planet]: { discPos: pos, captured, bonusToken } };
  const next: GameState = { ...state, planets, resolution, bonusDiscard };
```

- [ ] **Step 4: Relancer → vert, puis suite complète**

Run: `npx jest influence -t "jeton"` → PASS ; puis `npx jest && npm run typecheck` → PASS.
(Le test de migration « atteindre sa zone capture … bonusToken toBeNull » reste vert : quand la capture a lieu hors résolution — `createGame` a `resolution:null` — le jeton est simplement retiré.)

- [ ] **Step 5: Commit**

```bash
git add src/engine/influence.ts src/engine/__tests__/influence.test.ts
git commit -m "feat(engine): déclencheur capture-planète (jeton résolu avant les effets restants)"
```

---

### Task 5: Déclencheur emplacement niveau 2 dans `develop`

Le **1er des deux joueurs** à atteindre le **niveau 2** d'une techno prend le jeton posé sur cet emplacement (partagé). L'effet du jeton est **intercalé** dans la chaîne cumulée d'effets **entre** le niveau 2 et le niveau 1 (ordre confirmé : niveau 2 → jeton → niveau 1). Après prise, `techBonus[people]` passe à `null` ⇒ le 2e joueur qui atteindra le niveau 2 ne reprend rien.

La file de `develop` est construite **à plat** avant tout `slice` (`for (lvl = newLevel; lvl >= 1; lvl--) queue.push(...)`), donc il suffit de pousser les effets du jeton **immédiatement après** les effets du niveau 2. On ne déclenche que si `newLevel === 2` (la montée franchit précisément le niveau 2 ; `develop` incrémente toujours de +1) **et** `techBonus[people] !== null`.

**Files:**
- Modify: `src/engine/moves.ts` (import `tokenOf`, construction de la file dans la branche `develop`, `techBonus`/`bonusDiscard` dans l'état `started`)
- Test: `src/engine/__tests__/moves.test.ts`

**Interfaces:**
- Produces: dans `develop`, insertion des `effects` du jeton entre niveau 2 et niveau 1 ; `techBonus[people]=null` ; id poussé dans `bonusDiscard`.
- Consumes: `tokenOf` de `../data/tokens` ; `state.techBonus` ; `activeFace(...).levels[lvl-1].effects`.

- [ ] **Step 1: Écrire les tests** — `src/engine/__tests__/moves.test.ts` (ajouter)

```ts
// Fabrique un état où J0 est au niveau 1 d'un peuple, avec une carte de ce peuple en main
// et de quoi payer le niveau 2. Le peuple 'robot' a des cartes fixtures (FIX_terra_0, etc.).
function readyToDevelopRobotLvl2(base: GameState): GameState {
  const players: [GameState['players'][0], GameState['players'][1]] = [base.players[0], base.players[1]];
  players[0] = {
    ...players[0],
    hand: ['FIX_terra_0'], // people = robot (cf. fixtures)
    techMarkers: { animod: 0, humain: 0, robot: 1 },
    zenithium: 8,
  };
  return { ...base, players };
}

test("develop niveau 2 : le 1er joueur prend le jeton de l'emplacement, intercalé entre niveau 2 et 1", () => {
  const base = createGame(CONFIG, 1);
  const seeded: GameState = { ...readyToDevelopRobotLvl2(base), techBonus: { ...base.techBonus, robot: 'tok-zen1-1' } };
  const out = applyMove(seeded, { t: 'develop', cardId: 'FIX_terra_0', people: 'robot' });
  // fixtures : chaque niveau = +1 credit ; jeton robot = +1 zénithium.
  // zénithium = 8 - coût(niveau2 = 2) + 1 (jeton) = 7 ; credits = start + 2 (niveaux 2 et 1).
  expect(out.players[0].zenithium).toBe(8 - 2 + 1);
  expect(out.players[0].credits).toBe(base.players[0].credits + 2);
  expect(out.techBonus.robot).toBeNull();        // jeton pris
  expect(out.bonusDiscard).toContain('tok-zen1-1');
});

test("develop niveau 2 : si l'emplacement est déjà vide, aucun jeton n'est repris", () => {
  const base = createGame(CONFIG, 1);
  const seeded: GameState = { ...readyToDevelopRobotLvl2(base), techBonus: { ...base.techBonus, robot: null } };
  const out = applyMove(seeded, { t: 'develop', cardId: 'FIX_terra_0', people: 'robot' });
  expect(out.players[0].zenithium).toBe(8 - 2);   // pas de +1 jeton
  expect(out.players[0].credits).toBe(base.players[0].credits + 2);
  expect(out.techBonus.robot).toBeNull();
});
```
(Si `FIX_terra_0` n'était pas de peuple `robot` dans les fixtures, ajuster l'id vers une carte robot — cf. `src/data/fixtures.ts` : cartes robot = `FIX_venus_1`, `FIX_terra_0`, `FIX_jupiter_1`.)

- [ ] **Step 2: Lancer → échec**

Run: `npx jest moves -t "niveau 2"`
Expected: FAIL (le jeton n'est pas pris ; `techBonus.robot` inchangé, pas de +1 zénithium).

- [ ] **Step 3: Intercaler le jeton dans `develop`** — `src/engine/moves.ts`

Ajouter l'import :
```ts
import { tokenOf } from '../data/tokens';
```
Dans la branche `develop`, remplacer la construction de `queue` :
```ts
    // Effets cumulés : niveau atteint puis tous les inférieurs (haut → bas).
    // Jeton d'emplacement niveau 2 : intercalé entre le niveau 2 et le niveau 1 (pris par le 1er joueur).
    const queue: Effect[] = [];
    let techBonus = state.techBonus;
    let bonusDiscard = state.bonusDiscard;
    for (let lvl = newLevel; lvl >= 1; lvl--) {
      queue.push(...face.levels[lvl - 1]!.effects);
      if (lvl === 2 && newLevel === 2 && techBonus[move.people] !== null) {
        const tokenId = techBonus[move.people]!;
        queue.push(...tokenOf(tokenId).effects);
        techBonus = { ...techBonus, [move.people]: null };
        bonusDiscard = [...bonusDiscard, tokenId];
      }
    }
```
Puis, dans l'objet `started`, ajouter `techBonus` et `bonusDiscard` :
```ts
    const started: GameState = {
      ...state,
      players,
      discard: [...state.discard, move.cardId],
      techBonus,
      bonusDiscard,
      resolution: { queue, ctx: { player, planet: card.planet } },
    };
```
(Les primes de ligne restent poussées **après** la boucle, inchangées : niveau 2 → jeton → niveau 1 → primes de ligne.)

- [ ] **Step 4: Relancer → vert, puis suite complète**

Run: `npx jest moves -t "niveau 2"` → PASS ; puis `npx jest && npm run typecheck` → PASS (83 tests + nouveaux).

- [ ] **Step 5: Commit**

```bash
git add src/engine/moves.ts src/engine/__tests__/moves.test.ts
git commit -m "feat(engine): déclencheur niveau 2 techno (jeton intercalé entre niveau 2 et 1, pris par le 1er joueur)"
```

---

## Hors périmètre (renvoyé à des plans ultérieurs)

- **Cartes agent — choix réserve OU plateau** : certaines cartes pourront, en action, **piocher un jeton depuis la réserve** OU **prendre un jeton visible sur le plateau (planète/techno), au choix** (`docs/content/jetons-bonus.md`, note « phase CARTES »). Cela demandera vraisemblablement une nouvelle `PendingDecision` (choisir la **source** du jeton) et/ou un atome dédié. → **plan de la phase cartes**. L'atome `bonusToken` livré ici ne couvre que la source **réserve** (usage O1/D3).
- **Transcription du contenu techno réel** : les faces `S/D`, `O/U`, `N/P` (`src/data/tech.ts` est encore `FIXTURE_TECH_NON_CANONICAL`). C'est ce contenu qui émettra concrètement l'atome `{ k: 'bonusToken' }` aux niveaux O1/D3, et l'effet « obtenir d'abord une influence puis le jeton » pour D3 (ordre confirmé). → **plan de transcription techno** (réutilisera l'atome et les déclencheurs livrés ici).
- **Multi-capture dans un même atome** (`influenceEach` capturant deux planètes porteuses de jetons dans la même passe) : l'ordre relatif des deux jetons enfilés n'est pas spécifié par les règles confirmées ; comportement laissé tel quel (voir Self-Review). À reconfirmer si un cas de jeu l'exige.
- **UI, transport réseau, remise en fin de tour affinée des disques** : phases séparées, inchangées.

## Self-Review

- **Couverture du périmètre demandé** : catalogue 16 jetons + `tokenOf` → T1 ; état `bonusReserve`/`bonusDiscard`/`techBonus` + `PlanetTrack.bonusToken` + placement 5/3/8 + migration `bonusActive` → T2 ; atome `bonusToken` (réserve → tête → défausse, recharge, no-op) → T3 ; déclencheur capture-planète (jeton d'abord) → T4 ; déclencheur niveau 2 (1er joueur, intercalé, 2e ne reprend pas) → T5. Répartition confirmée (3/2/2/4/1/1/1/2) testée en T1.
- **Cohérence des types** : l'union `Effect` gagne `{ k: 'bonusToken' }`, ajouté au `switch` **exhaustif** de `applyEffect` (`case 'bonusToken': throw`) et intercepté dans `resolve` (jamais appliqué), à l'image de `influenceNeighbors`/`transfer`/`exile`. `PlanetTrack.bonusToken: string | null` remplace `bonusActive` **partout** : type, `setup.ts`, `influence.ts`, et les 3 littéraux de test (migration explicite en T2). `GameState.techBonus: Record<People, string | null>` et `bonusReserve`/`bonusDiscard: string[]` sont produits par `createGame` et consommés par `resolve` (T3), `gainInfluence` (T4), `develop` (T5). `TokenDef.effects: Effect[]` réutilise l'union sans marquage non canonique.
- **Threading du rng dans `resolve`** (difficulté identifiée) : l'atome `bonusToken` doit potentiellement `shuffle(bonusDiscard, s.rng)` pour recharger la réserve — `resolve` fait alors avancer `s.rng`. Traité en threadant la `RngState` renvoyée par `shuffle` dans le nouvel état (`rng`), de façon **immuable** et **déterministe** ; aucun autre chemin de `resolve` ne touche au rng. Le setup thread le rng **après** le mélange du deck (`rngAfterDeck`), garantissant que les mains restent identiques à seed égal (test existant préservé).
- **Couplage `gainInfluence` ↔ file de résolution** (difficulté identifiée) : le déclencheur de capture doit insérer les effets du jeton dans `resolution.queue` alors que `gainInfluence` est appelé **au milieu** du traitement de l'atome courant. Piège traité explicitement : insertion **à l'index 1** (après l'atome courant), car `resolve`/`decide` feront `queue.slice(1)` juste après — une insertion à l'index 0 (interprétation littérale de « en tête ») serait rabotée et **rejouerait** l'atome courant. Net sémantique conforme : « jeton d'abord, puis effets restants ». À l'inverse, l'atome `bonusToken` (T3) insère bien à l'index 0 **parce qu'il retire lui-même son atome** dans le même pas (`queue.slice(1)`). Cette asymétrie est documentée dans les deux tâches.
- **Non-régression** : les flux interactifs `influence choice` → `choosePlanet`, `influenceNeighbors` → `chooseSegment`, `influenceDifferent`, `transfer`/`exile`/`exileForInfluence` → `chooseColumn` ne sont **pas modifiés** ; `chosen` est propagé tel quel dans les reconstructions de `resolution` (T3). Les effets de jetons interactifs (ex. `influence choice`, `transfer`) réutilisent ces flux existants sans code neuf. Migration `bonusActive` couverte par 3 éditions littérales + suite complète à chaque tâche.
- **Placeholders** : aucun — code complet à chaque étape (catalogue, setup, `resolve`, `gainInfluence`, `develop`, tests avec helpers fournis).
- **Ambiguïtés résiduelles (signalées, non devinées)** :
  - **Ordre multi-capture** : si un même atome (`influenceEach`) capture deux planètes porteuses de jetons, l'insertion successive à l'index 1 **inverse** l'ordre relatif des deux jetons (le second capturé passe devant). Les règles confirmées ne spécifient pas ce cas ; laissé tel quel et signalé en Hors périmètre.
  - **`takeLeader` de jeton** : le catalogue mappe les 2 jetons « Leader » sur `{ k:'takeLeader', side:'silver' }` (prendre l'argent, ou passer or si déjà pris) — sémantique déjà implémentée par `applyEffect` (`side:'silver'` → or si `leader===me`). Conforme à la note de `jetons-bonus.md` ; pas d'ambiguïté mais dépendance à la sémantique `takeLeader` existante notée.
  - **D3 « influence puis jeton »** : l'ordre spécifique de la techno D3 (d'abord influence, puis jeton) est une propriété du **contenu techno** (ordre des atomes dans `levels[].effects`), à réaliser lors de la transcription techno (hors périmètre) ; l'infrastructure `bonusToken` livrée ici le permet sans changement.

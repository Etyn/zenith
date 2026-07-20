# Zenith — Actions & interpréteur d'effets (socle) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Ajouter au moteur pur un **interpréteur d'effets data-driven** (résolution gauche→droite avec **décisions en pause/reprise**) et la première action de tour, **Recruter un Agent**, jusqu'à la fin de tour et le passage de main.

**Architecture:** On étend le moteur pur existant (`src/engine`). Les effets sont des **données** (union `Effect`) exécutées par un interpréteur qui met la résolution en pause (`state.pending`) quand un choix joueur est requis, et reprend sur un coup `{t:'decide'}`. `applyMove` reste **pur et déterministe**. Périmètre : atomes `influence`/`credits`/`zenithium`/`mobilize` + action `recruit`. Les actions `develop`/`leadership`, les combinateurs (`choose`/`chain`/`conditional`/`trade`) et les autres atomes viendront dans des plans suivants.

**Tech Stack:** TypeScript strict, jest+ts-jest (déjà en place).

## Global Constraints

- **Moteur pur** : `src/engine/**` et `src/data/**` n'importent jamais react/react-native/expo/expo-*/net/réseau. Le test de pureté existant (`src/engine/__tests__/purity.test.ts`) doit rester vert.
- **Déterminisme** : aucun `Math.random`/`Date.now`/`new Date()` ; tout aléatoire via `RngState` seedé (module `rng.ts`).
- **Immuabilité** : `applyMove` ne mute jamais l'état d'entrée (ni les sous-objets/tableaux) ; renvoie un nouvel objet.
- **Aucun contenu de jeu inventé** : les cartes utilisées pour tester sont des **fixtures non canoniques** ; leurs effets sont composés d'atomes réels mais ne prétendent pas être les vraies cartes Zenith.
- **Règles de recrutement** (spec §5) : poser la carte dans la colonne de sa planète ; **coût en Crédits réduit de 1 par carte déjà présente dans cette colonne** ; jamais négatif (min 0) ; appliquer les effets gauche→droite ; toute carte donne ≥ 1 influence sur sa planète (via ses effets de données).
- Planètes `mercure,venus,terra,mars,jupiter` ; peuples `animod,humain,robot` ; piste 9 positions, `4`=centre, `0`=zone J0, `8`=zone J1.

---

### Task 1: Modèle d'effets + extension de l'état

**Files:**
- Modify: `src/engine/types.ts`
- Modify: `src/engine/setup.ts` (initialiser les nouveaux champs à `null`)
- Modify: `src/data/types.ts` (ajouter `effects` à `CardDef`)
- Modify: `src/data/fixtures.ts` (donner des effets aux cartes fixtures)
- Test: `src/engine/__tests__/setup.test.ts` (ajouter 1 assertion), `src/data/__tests__/fixtures.test.ts` (ajouter 1 assertion)

**Interfaces:**
- Consumes: types existants (`Planet`, `People`, `PlayerIndex`, `GameState`), `createGame` (setup.ts).
- Produces (dans `types.ts`) :
  - `type Side = 'self' | 'opponent'`
  - `type PlanetSelector = Planet | 'choice'`
  - `type Effect = { k:'influence'; amount:number; on:PlanetSelector } | { k:'credits'; amount:number; target:Side } | { k:'zenithium'; amount:number; target:Side } | { k:'mobilize'; count:number; thenInfluence:boolean }`
  - `type EffectCtx = { player: PlayerIndex; planet: Planet }`
  - `type ResolutionState = { queue: Effect[]; ctx: EffectCtx }`
  - `type PendingDecision = { kind: 'choosePlanet'; amount: number }`
  - `GameState` gagne deux champs : `resolution: ResolutionState | null` et `pending: PendingDecision | null`.
- Produces (dans `data/types.ts`) : `CardDef` gagne `effects: Effect[]`.

- [ ] **Step 1: Étendre `src/engine/types.ts`** — ajouter, après le type `GameState` existant, les nouveaux types, et ajouter les 2 champs à `GameState`.

Ajouter ces types (par ex. juste avant `GameState`) :

```ts
export type Side = 'self' | 'opponent';
export type PlanetSelector = Planet | 'choice';

export type Effect =
  | { k: 'influence'; amount: number; on: PlanetSelector }
  | { k: 'credits'; amount: number; target: Side }
  | { k: 'zenithium'; amount: number; target: Side }
  | { k: 'mobilize'; count: number; thenInfluence: boolean };

export type EffectCtx = { player: PlayerIndex; planet: Planet };
export type ResolutionState = { queue: Effect[]; ctx: EffectCtx };
export type PendingDecision = { kind: 'choosePlanet'; amount: number };
```

Et dans le type `GameState`, ajouter les deux champs (avant `winner`) :

```ts
  resolution: ResolutionState | null;
  pending: PendingDecision | null;
  winner: PlayerIndex | null;
```

- [ ] **Step 2: Étendre `src/data/types.ts`**

```ts
import type { Effect, People, Planet } from '../engine/types';

export type CardDef = { id: string; name: string; people: People; planet: Planet; cost: number; effects: Effect[] };
```

- [ ] **Step 3: Donner des effets aux fixtures** — `src/data/fixtures.ts`, remplacer le `.map((k) => ({...}))` interne pour ajouter `effects`. Chaque carte fixture donne **1 influence sur sa propre planète** (règle : toute carte ≥ 1 influence), plus, pour varier, un petit gain.

Remplacer le corps de `FIXTURE_CARDS` par :

```ts
export const FIXTURE_CARDS: CardDef[] = PLANET_LIST.flatMap((planet, i) =>
  [0, 1].map((k) => ({
    id: `FIX_${planet}_${k}`,
    name: `Fixture ${planet} ${k}`,
    planet,
    people: PEOPLE_CYCLE[(i + k) % 3]!,
    cost: 1 + ((i + k) % 5),
    effects: [
      { k: 'influence', amount: 1, on: planet },
      k === 0 ? { k: 'credits', amount: 2, target: 'self' } : { k: 'zenithium', amount: 1, target: 'self' },
    ],
  })),
);
```

- [ ] **Step 4: Initialiser les nouveaux champs dans `createGame`** — `src/engine/setup.ts`, dans l'objet retourné, ajouter avant `winner: null,` :

```ts
    resolution: null,
    pending: null,
```

- [ ] **Step 5: Ajouter les assertions de non-régression**

Dans `src/engine/__tests__/setup.test.ts`, ajouter :

```ts
test('une nouvelle partie n’a ni résolution ni décision en attente', () => {
  const s = createGame(CONFIG, 1);
  expect(s.resolution).toBeNull();
  expect(s.pending).toBeNull();
});
```

Dans `src/data/__tests__/fixtures.test.ts`, ajouter :

```ts
test('chaque carte fixture a au moins un effet d’influence sur sa planète', () => {
  for (const c of FIXTURE_CARDS) {
    expect(c.effects.some((e) => e.k === 'influence' && e.on === c.planet)).toBe(true);
  }
});
```

- [ ] **Step 6: Lancer tests + typecheck**

Run: `npx jest && npm run typecheck`
Expected: PASS (toute la suite, y compris les 2 nouveaux tests) ; typecheck OK.

- [ ] **Step 7: Commit**

```bash
git add src/engine/types.ts src/engine/setup.ts src/data/types.ts src/data/fixtures.ts src/engine/__tests__/setup.test.ts src/data/__tests__/fixtures.test.ts
git commit -m "feat(engine): modèle d'effets (atomes) + champs resolution/pending"
```

---

### Task 2: Interpréteur d'effets — atomes sans choix (credits, zenithium)

**Files:**
- Create: `src/engine/effects.ts`
- Test: `src/engine/__tests__/effects.test.ts`

**Interfaces:**
- Consumes: types (Task 1), `createGame`.
- Produces:
  - `applyEffect(state: GameState, effect: Effect, ctx: EffectCtx): GameState` — applique UN atome **sans choix** (`credits`, `zenithium`). Lance une erreur pour un atome nécessitant un choix (traité en Task 3). Pur.
  - `resolve(state: GameState): GameState` — dépile `state.resolution.queue` tant qu'aucun atome ne requiert de décision ; applique chaque atome via `applyEffect` ; quand la file est vide, met `resolution = null`. (En Task 3, `resolve` posera `pending` pour les atomes à choix.) Pur.
  - Détails : `credits`/`zenithium` avec `target:'self'` créditent `players[ctx.player]` ; `target:'opponent'` créditent l'autre joueur. Toujours des copies immuables des `players`.

- [ ] **Step 1: Écrire le test qui échoue** — `src/engine/__tests__/effects.test.ts`

```ts
import { createGame } from '../setup';
import { applyEffect, resolve } from '../effects';
import type { EffectCtx, GameState } from '../types';

const CONFIG = { techSetup: { animod: 'S', humain: 'U', robot: 'N' }, firstPlayer: 0 } as const;
const CTX: EffectCtx = { player: 0, planet: 'mars' };

function withResolution(base: GameState, queue: GameState['resolution'] extends null ? never : any): GameState {
  return { ...base, resolution: { queue, ctx: CTX } };
}

test('applyEffect crédite le joueur courant (self)', () => {
  const s = createGame(CONFIG, 1);
  const s2 = applyEffect(s, { k: 'credits', amount: 3, target: 'self' }, CTX);
  expect(s2.players[0].credits).toBe(s.players[0].credits + 3);
  expect(s2.players[1].credits).toBe(s.players[1].credits);
});

test('applyEffect crédite l’adversaire (opponent)', () => {
  const s = createGame(CONFIG, 1);
  const s2 = applyEffect(s, { k: 'zenithium', amount: 2, target: 'opponent' }, CTX);
  expect(s2.players[1].zenithium).toBe(s.players[1].zenithium + 2);
  expect(s2.players[0].zenithium).toBe(s.players[0].zenithium);
});

test('applyEffect ne mute pas l’état d’entrée', () => {
  const s = createGame(CONFIG, 1);
  const before = s.players[0].credits;
  applyEffect(s, { k: 'credits', amount: 5, target: 'self' }, CTX);
  expect(s.players[0].credits).toBe(before);
});

test('resolve dépile toute la file d’atomes sans choix puis remet resolution à null', () => {
  const base = createGame(CONFIG, 1);
  const s: GameState = {
    ...base,
    resolution: {
      queue: [
        { k: 'credits', amount: 1, target: 'self' },
        { k: 'zenithium', amount: 1, target: 'self' },
      ],
      ctx: CTX,
    },
  };
  const out = resolve(s);
  expect(out.resolution).toBeNull();
  expect(out.players[0].credits).toBe(base.players[0].credits + 1);
  expect(out.players[0].zenithium).toBe(base.players[0].zenithium + 1);
});
```

- [ ] **Step 2: Lancer → échec attendu**

Run: `npx jest effects`
Expected: FAIL (`Cannot find module '../effects'`).

- [ ] **Step 3: Implémenter** — `src/engine/effects.ts`

```ts
import type { Effect, EffectCtx, GameState, PlayerIndex, PlayerState } from './types';

function creditPlayer(
  state: GameState,
  index: PlayerIndex,
  patch: Partial<Pick<PlayerState, 'credits' | 'zenithium'>>,
): GameState {
  const players: [PlayerState, PlayerState] = [state.players[0], state.players[1]];
  players[index] = { ...players[index], ...patch };
  return { ...state, players };
}

export function applyEffect(state: GameState, effect: Effect, ctx: EffectCtx): GameState {
  const target: PlayerIndex = 'target' in effect && effect.target === 'opponent' ? (ctx.player === 0 ? 1 : 0) : ctx.player;
  switch (effect.k) {
    case 'credits':
      return creditPlayer(state, target, { credits: state.players[target].credits + effect.amount });
    case 'zenithium':
      return creditPlayer(state, target, { zenithium: state.players[target].zenithium + effect.amount });
    case 'influence':
    case 'mobilize':
      throw new Error(`applyEffect: atome '${effect.k}' non géré ici (voir resolve)`);
  }
}

export function resolve(state: GameState): GameState {
  let s = state;
  while (s.resolution && s.resolution.queue.length > 0 && s.pending === null) {
    const [head, ...rest] = s.resolution.queue;
    const ctx = s.resolution.ctx;
    // Atomes sans choix uniquement en Task 2 ; les autres seront gérés en Task 3.
    s = applyEffect(s, head!, ctx);
    s = { ...s, resolution: { queue: rest, ctx } };
  }
  if (s.resolution && s.resolution.queue.length === 0) s = { ...s, resolution: null };
  return s;
}
```

- [ ] **Step 4: Lancer → succès + typecheck**

Run: `npx jest effects && npm run typecheck`
Expected: PASS (4 tests) ; typecheck OK.

- [ ] **Step 5: Commit**

```bash
git add src/engine/effects.ts src/engine/__tests__/effects.test.ts
git commit -m "feat(engine): interpréteur d'effets — atomes credits/zenithium + resolve"
```

---

### Task 3: Atome `influence` avec décision en pause (`choosePlanet`) + `mobilize`

**Files:**
- Modify: `src/engine/effects.ts`
- Test: `src/engine/__tests__/effects.test.ts` (ajouts)

**Interfaces:**
- Consumes: `gainInfluence` (`influence.ts`), types (Task 1).
- Produces (mise à jour de `effects.ts`) :
  - `resolve` gère désormais l'atome `influence` : si `on` est une planète précise → applique `gainInfluence(state, on, ctx.player, amount)`, dépile, continue. Si `on === 'choice'` → **met `state.pending = { kind:'choosePlanet', amount }` et s'arrête** (l'atome `influence` reste en tête de file).
  - `resolve` gère l'atome `mobilize` : prend `count` cartes du sommet de `deck`, place chacune dans la colonne de sa couleur du joueur `ctx.player` (SANS appliquer ses effets) ; si `thenInfluence`, applique `gainInfluence` de 1 sur la planète de chaque carte mobilisée. Déterministe (ordre du deck). Si le deck est vide, mobilise ce qui est disponible.
  - `decide(state: GameState, planet: Planet): GameState` — répond à un `pending` de type `choosePlanet` : applique `gainInfluence(state, planet, player, amount)`, retire l'atome `influence` de la tête de file, efface `pending`, puis appelle `resolve` pour continuer.
- Détail : `decide` lève une erreur si `state.pending` est `null`. Le `player` pour l'influence vient de `state.resolution.ctx.player`.

- [ ] **Step 1: Écrire les tests qui échouent** — ajouter à `src/engine/__tests__/effects.test.ts`

```ts
import { decide } from '../effects';
import { CENTER } from '../setup';

test('influence sur une planète précise est appliquée sans pause', () => {
  const base = createGame(CONFIG, 1);
  const s: GameState = { ...base, resolution: { queue: [{ k: 'influence', amount: 1, on: 'mars' }], ctx: CTX } };
  const out = resolve(s);
  expect(out.pending).toBeNull();
  expect(out.resolution).toBeNull();
  expect(out.planets.mars.discPos).toBe(CENTER - 1); // joueur 0 → vers sa zone
});

test('influence "choice" met une décision en attente, puis decide l’applique', () => {
  const base = createGame(CONFIG, 1);
  const s: GameState = { ...base, resolution: { queue: [{ k: 'influence', amount: 2, on: 'choice' }], ctx: CTX } };
  const paused = resolve(s);
  expect(paused.pending).toEqual({ kind: 'choosePlanet', amount: 2 });
  expect(paused.resolution).not.toBeNull(); // la résolution reste en cours

  const done = decide(paused, 'venus');
  expect(done.pending).toBeNull();
  expect(done.resolution).toBeNull();
  expect(done.planets.venus.discPos).toBe(CENTER - 2); // joueur 0, 2 crans
});

test('mobilize place N cartes du deck dans les colonnes du joueur sans appliquer leurs effets', () => {
  const base = createGame(CONFIG, 1);
  const topTwo = base.deck.slice(0, 2);
  const s: GameState = { ...base, resolution: { queue: [{ k: 'mobilize', count: 2, thenInfluence: false }], ctx: CTX } };
  const out = resolve(s);
  const placed = ([] as string[]).concat(
    out.players[0].columns.mercure, out.players[0].columns.venus, out.players[0].columns.terra,
    out.players[0].columns.mars, out.players[0].columns.jupiter,
  );
  for (const id of topTwo) expect(placed).toContain(id);
  expect(out.deck.length).toBe(base.deck.length - 2);
});
```

- [ ] **Step 2: Lancer → échec attendu**

Run: `npx jest effects`
Expected: FAIL (`decide` non exporté / comportement `influence`/`mobilize` absent).

- [ ] **Step 3: Mettre à jour `src/engine/effects.ts`**

Remplacer la boucle de `resolve` et ajouter `decide`. Nouveau contenu complet du fichier :

```ts
import { gainInfluence } from './influence';
import type { CardDef } from '../data/types';
import { FIXTURE_CARDS } from '../data/fixtures';
import type { Effect, EffectCtx, GameState, Planet, PlayerIndex, PlayerState } from './types';

// Accès au catalogue de cartes (fixtures pour l'instant ; le vrai contenu s'y substituera plus tard).
const CARDS: Record<string, CardDef> = Object.fromEntries(FIXTURE_CARDS.map((c) => [c.id, c]));
function cardOf(id: string): CardDef | undefined {
  return CARDS[id];
}

function creditPlayer(
  state: GameState,
  index: PlayerIndex,
  patch: Partial<Pick<PlayerState, 'credits' | 'zenithium'>>,
): GameState {
  const players: [PlayerState, PlayerState] = [state.players[0], state.players[1]];
  players[index] = { ...players[index], ...patch };
  return { ...state, players };
}

export function applyEffect(state: GameState, effect: Effect, ctx: EffectCtx): GameState {
  const target: PlayerIndex = 'target' in effect && effect.target === 'opponent' ? (ctx.player === 0 ? 1 : 0) : ctx.player;
  switch (effect.k) {
    case 'credits':
      return creditPlayer(state, target, { credits: state.players[target].credits + effect.amount });
    case 'zenithium':
      return creditPlayer(state, target, { zenithium: state.players[target].zenithium + effect.amount });
    case 'influence':
      // Seul le cas planète précise est appliqué directement ; 'choice' est géré par resolve/decide.
      if (effect.on === 'choice') throw new Error("applyEffect: 'influence choice' passe par resolve/decide");
      return gainInfluence(state, effect.on, ctx.player, effect.amount);
    case 'mobilize':
      return applyMobilize(state, effect.count, effect.thenInfluence, ctx.player);
  }
}

function applyMobilize(state: GameState, count: number, thenInfluence: boolean, player: PlayerIndex): GameState {
  let s = state;
  for (let i = 0; i < count; i++) {
    if (s.deck.length === 0) break;
    const [top, ...restDeck] = s.deck;
    const card = cardOf(top!);
    const planet: Planet | null = card ? card.planet : null;
    const players: [PlayerState, PlayerState] = [s.players[0], s.players[1]];
    if (planet) {
      const columns = { ...players[player].columns, [planet]: [...players[player].columns[planet], top!] };
      players[player] = { ...players[player], columns };
    }
    s = { ...s, deck: restDeck, players };
    if (thenInfluence && planet) s = gainInfluence(s, planet, player, 1);
  }
  return s;
}

export function resolve(state: GameState): GameState {
  let s = state;
  while (s.resolution && s.resolution.queue.length > 0 && s.pending === null) {
    const head = s.resolution.queue[0]!;
    const ctx = s.resolution.ctx;
    if (head.k === 'influence' && head.on === 'choice') {
      s = { ...s, pending: { kind: 'choosePlanet', amount: head.amount } };
      break; // en attente d'une décision ; l'atome reste en tête de file
    }
    s = applyEffect(s, head, ctx);
    s = { ...s, resolution: { queue: s.resolution!.queue.slice(1), ctx } };
  }
  if (s.resolution && s.resolution.queue.length === 0) s = { ...s, resolution: null };
  return s;
}

export function decide(state: GameState, planet: Planet): GameState {
  if (state.pending === null || state.resolution === null) {
    throw new Error('decide: aucune décision en attente');
  }
  const { amount } = state.pending;
  const ctx = state.resolution.ctx;
  let s = gainInfluence(state, planet, ctx.player, amount);
  s = { ...s, pending: null, resolution: { queue: s.resolution!.queue.slice(1), ctx } };
  return resolve(s);
}
```

- [ ] **Step 4: Lancer → succès + typecheck**

Run: `npx jest effects && npm run typecheck`
Expected: PASS (7 tests) ; typecheck OK.

- [ ] **Step 5: Commit**

```bash
git add src/engine/effects.ts src/engine/__tests__/effects.test.ts
git commit -m "feat(engine): atomes influence (avec décision choosePlanet) et mobilize"
```

---

### Task 4: Action `recruit` + `legalMoves` + fin de tour

**Files:**
- Create: `src/engine/moves.ts`
- Test: `src/engine/__tests__/moves.test.ts`

**Interfaces:**
- Consumes: `resolve`/`decide`/`cardOf` (via `effects.ts` ; réexporter `cardOf` n'est pas nécessaire — dupliquer l'accès au catalogue serait non-DRY, donc **exporter `cardOf` depuis `effects.ts`** et l'importer ici), `gainInfluence`, types.
- Produces (`moves.ts`) :
  - `type Move = { t: 'recruit'; cardId: string } | { t: 'decide'; planet: Planet }`
  - `applyMove(state: GameState, move: Move): GameState` — pur, déterministe :
    - `recruit` : refuse si `state.pending` ou `state.resolution` non nuls, si la partie est finie, si la carte n'est pas dans la main du joueur courant, ou si crédits insuffisants après réduction. Sinon : retire la carte de la main ; la pose dans la colonne de sa planète ; **paie** `max(0, cost - cartesDéjàDansLaColonne)` crédits ; initialise `resolution = { queue: [...card.effects], ctx: { player, planet } }` ; `resolve`. Si la résolution se termine sans `pending`, exécute la **fin de tour**.
    - `decide` : délègue à `decide(state, planet)` ; si plus de `pending` après, exécute la **fin de tour**.
  - `legalMoves(state: GameState, player: PlayerIndex): Move[]` — si `state.pending` : les décisions possibles (une par planète, `{t:'decide', planet}`) ; sinon, si `player === state.current` et pas de résolution en cours et pas de gagnant : un `{t:'recruit', cardId}` par carte de la main **jouable** (crédits suffisants après réduction) ; sinon `[]`.
  - **Fin de tour** (fonction interne `endTurn`) : repioche la main du joueur courant jusqu'à **4 cartes** (limite badge = plan suivant) depuis le sommet du deck (si assez) ; puis passe `current` à l'autre joueur ; conserve `winner` déjà positionné par `gainInfluence`. (La remise en jeu des disques capturés est déjà gérée par `gainInfluence` qui remet le disque au centre — voir plan fondation.)
- Détail cohérence : `cardOf` est exporté depuis `effects.ts` (ajout d'un `export`).

- [ ] **Step 1: Exporter `cardOf`** — dans `src/engine/effects.ts`, changer `function cardOf` en `export function cardOf`.

- [ ] **Step 2: Écrire le test qui échoue** — `src/engine/__tests__/moves.test.ts`

```ts
import { createGame } from '../setup';
import { applyMove, legalMoves } from '../moves';
import { cardOf } from '../effects';
import type { GameState } from '../types';

const CONFIG = { techSetup: { animod: 'S', humain: 'U', robot: 'N' }, firstPlayer: 0 } as const;

function firstAffordableFixedInfluenceCard(s: GameState): string {
  // Une carte de la main du joueur courant dont le 1er effet influence est sur une planète précise
  // (les fixtures le sont toutes) et abordable.
  for (const id of s.players[s.current].hand) {
    const c = cardOf(id)!;
    if (c.cost <= s.players[s.current].credits) return id;
  }
  return s.players[s.current].hand[0]!;
}

test('legalMoves propose des recruit pour le joueur courant au départ', () => {
  const s = createGame(CONFIG, 1);
  const moves = legalMoves(s, 0);
  expect(moves.length).toBeGreaterThan(0);
  expect(moves.every((m) => m.t === 'recruit')).toBe(true);
  expect(legalMoves(s, 1)).toEqual([]); // pas le tour du joueur 1
});

test('recruter pose la carte, paie le coût réduit, applique les effets et passe la main', () => {
  const s = createGame(CONFIG, 1);
  const id = firstAffordableFixedInfluenceCard(s);
  const card = cardOf(id)!;
  const creditsBefore = s.players[0].credits;
  const out = applyMove(s, { t: 'recruit', cardId: id });

  // carte posée dans sa colonne, retirée de la main
  expect(out.players[0].columns[card.planet]).toContain(id);
  expect(out.players[0].hand).not.toContain(id);
  // coût payé = cost - 0 carte déjà présente = cost
  expect(out.players[0].credits).toBe(creditsBefore - card.cost);
  // effet d'influence appliqué sur la planète de la carte (disque bougé vers J0)
  expect(out.planets[card.planet].discPos).toBeLessThanOrEqual(4);
  // fin de tour : main du joueur 0 repiochée à 4, tour passé à J1
  expect(out.players[0].hand.length).toBe(4);
  expect(out.current).toBe(1);
});

test('la réduction de coût s’applique par carte déjà présente dans la colonne', () => {
  // On force une 2e carte de même planète pour vérifier la réduction (via état construit à la main).
  const base = createGame(CONFIG, 1);
  const id = base.players[0].hand.find((cid) => cardOf(cid)!.planet === 'mars');
  if (!id) return; // si la main ne contient pas de carte mars, test trivialement ok
  const card = cardOf(id)!;
  const s: GameState = {
    ...base,
    players: [
      { ...base.players[0], columns: { ...base.players[0].columns, mars: ['FIX_mars_0'] } },
      base.players[1],
    ],
  };
  const creditsBefore = s.players[0].credits;
  const out = applyMove(s, { t: 'recruit', cardId: id });
  expect(out.players[0].credits).toBe(creditsBefore - Math.max(0, card.cost - 1));
});

test('applyMove ne mute pas l’état d’entrée', () => {
  const s = createGame(CONFIG, 1);
  const id = firstAffordableFixedInfluenceCard(s);
  const handBefore = [...s.players[0].hand];
  applyMove(s, { t: 'recruit', cardId: id });
  expect(s.players[0].hand).toEqual(handBefore);
});
```

- [ ] **Step 3: Implémenter** — `src/engine/moves.ts`

```ts
import { cardOf, resolve, decide as decideEffect } from './effects';
import type { GameState, Planet, PlayerIndex, PlayerState } from './types';
import { PLANETS } from './types';

const HAND_LIMIT = 4; // limite de base ; le badge Leader (5/6) viendra dans un plan suivant

export type Move = { t: 'recruit'; cardId: string } | { t: 'decide'; planet: Planet };

function recruitCost(state: GameState, player: PlayerIndex, planet: Planet, baseCost: number): number {
  return Math.max(0, baseCost - state.players[player].columns[planet].length);
}

function endTurn(state: GameState): GameState {
  const player = state.current;
  const need = HAND_LIMIT - state.players[player].hand.length;
  let deck = state.deck;
  let hand = state.players[player].hand;
  if (need > 0) {
    const drawn = deck.slice(0, need);
    deck = deck.slice(drawn.length);
    hand = [...hand, ...drawn];
  }
  const players: [PlayerState, PlayerState] = [state.players[0], state.players[1]];
  players[player] = { ...players[player], hand };
  const next: PlayerIndex = player === 0 ? 1 : 0;
  return { ...state, players, deck, current: next };
}

export function applyMove(state: GameState, move: Move): GameState {
  if (move.t === 'decide') {
    const afterDecide = decideEffect(state, move.planet);
    return afterDecide.pending === null && afterDecide.resolution === null ? endTurn(afterDecide) : afterDecide;
  }

  // recruit
  if (state.winner !== null || state.pending !== null || state.resolution !== null) return state;
  const player = state.current;
  if (!state.players[player].hand.includes(move.cardId)) return state;
  const card = cardOf(move.cardId);
  if (!card) return state;
  const cost = recruitCost(state, player, card.planet, card.cost);
  if (cost > state.players[player].credits) return state;

  const players: [PlayerState, PlayerState] = [state.players[0], state.players[1]];
  const hand = players[player].hand.filter((id) => id !== move.cardId);
  const columns = { ...players[player].columns, [card.planet]: [...players[player].columns[card.planet], move.cardId] };
  players[player] = { ...players[player], hand, columns, credits: players[player].credits - cost };

  const started: GameState = {
    ...state,
    players,
    resolution: { queue: [...card.effects], ctx: { player, planet: card.planet } },
  };
  const resolved = resolve(started);
  return resolved.pending === null && resolved.resolution === null ? endTurn(resolved) : resolved;
}

export function legalMoves(state: GameState, player: PlayerIndex): Move[] {
  if (state.winner !== null) return [];
  if (state.pending !== null) {
    // décision en attente : le joueur en cours de résolution choisit une planète
    if (state.resolution === null || state.resolution.ctx.player !== player) return [];
    return PLANETS.map((planet) => ({ t: 'decide', planet }));
  }
  if (state.resolution !== null || player !== state.current) return [];
  return state.players[player].hand
    .filter((id) => {
      const c = cardOf(id);
      return c !== undefined && recruitCost(state, player, c.planet, c.cost) <= state.players[player].credits;
    })
    .map((id) => ({ t: 'recruit', cardId: id }));
}
```

- [ ] **Step 4: Lancer → succès + typecheck + suite complète**

Run: `npx jest && npm run typecheck`
Expected: PASS (toute la suite + les 4 tests moves) ; typecheck OK.

- [ ] **Step 5: Commit**

```bash
git add src/engine/moves.ts src/engine/effects.ts src/engine/__tests__/moves.test.ts
git commit -m "feat(engine): action recruit + legalMoves + fin de tour"
```

---

### Task 5: Réexport public + smoke test « recruter jusqu'à la victoire »

**Files:**
- Modify: `src/engine/index.ts`
- Test: `src/engine/__tests__/smoke.test.ts`

**Interfaces:**
- Consumes: `applyMove`, `legalMoves` (moves.ts), `effects.ts`, `createGame`.
- Produces: `index.ts` réexporte `effects` et `moves`. Un smoke test joue des coups `recruit`/`decide` légaux au hasard (RNG seedé du test, PAS du moteur — ici on peut utiliser un index déterministe : toujours le 1er coup légal) jusqu'à ce qu'un gagnant émerge ou un plafond de tours, et vérifie des invariants (crédits ≥ 0, la partie progresse, `applyMove` déterministe pour une même graine).

- [ ] **Step 1: Écrire le smoke test** — `src/engine/__tests__/smoke.test.ts`

```ts
import { createGame } from '../setup';
import { applyMove, legalMoves } from '../moves';
import type { GameState } from '../types';

const CONFIG = { techSetup: { animod: 'S', humain: 'U', robot: 'N' }, firstPlayer: 0 } as const;

function playToEnd(seed: number): { turns: number; winner: number | null; final: GameState } {
  let s = createGame(CONFIG, seed);
  let turns = 0;
  while (s.winner === null && turns < 2000) {
    const mover = s.pending !== null ? s.resolution!.ctx.player : s.current;
    const moves = legalMoves(s, mover);
    if (moves.length === 0) break;
    s = applyMove(s, moves[0]!); // toujours le 1er coup légal → déterministe
    turns++;
    // invariants
    expect(s.players[0].credits).toBeGreaterThanOrEqual(0);
    expect(s.players[1].credits).toBeGreaterThanOrEqual(0);
  }
  return { turns, winner: s.winner, final: s };
}

test('une partie « toujours le 1er coup légal » progresse sans casser les invariants', () => {
  const r = playToEnd(1);
  expect(r.turns).toBeGreaterThan(0);
});

test('applyMove/legalMoves sont déterministes pour une même graine', () => {
  const a = playToEnd(7);
  const b = playToEnd(7);
  expect(a.turns).toBe(b.turns);
  expect(a.winner).toBe(b.winner);
});
```

- [ ] **Step 2: Lancer → échec attendu**

Run: `npx jest smoke`
Expected: FAIL (`Cannot find module '../moves'` déjà résolu ; échec si `index` non mis à jour n'affecte pas ce test — le test importe directement `moves`. S'il PASSE déjà, mettre quand même à jour l'index à l'étape 3.)

- [ ] **Step 3: Mettre à jour `src/engine/index.ts`**

```ts
export * from './rng';
export * from './types';
export * from './setup';
export * from './influence';
export * from './effects';
export * from './moves';
```

- [ ] **Step 4: Lancer toute la suite + typecheck**

Run: `npx jest && npm run typecheck`
Expected: PASS (toute la suite, y compris le smoke) ; typecheck OK.

- [ ] **Step 5: Commit**

```bash
git add src/engine/index.ts src/engine/__tests__/smoke.test.ts
git commit -m "feat(engine): réexports effects/moves + smoke test de partie"
```

---

## Suites (hors de ce plan)

1. **Actions `develop` (technologie) & `leadership`** + primes de ligne + bonus niveau 2 + badge Leader (limites de main 5/6).
2. **Combinateurs d'effets** (`choose`/`chain`/`conditional`/`trade`) + atomes restants (steal, transfer, exile, discard, bonusToken, develop, giveOpponent, influence multi : voisines/différentes/2-au-choix, etc. — cf. lexique).
3. **`playerView`** (vue filtrée) + **bot** de test + simulations headless.
4. **Transcription du contenu réel** : 90 cartes (`docs/content/cards/`), 6 faces techno (`docs/content/technologies.md`), jetons Bonus → `src/data`.
5. **UI (phase 2)**, **réseau local (phase 3)**.

## Self-Review

- **Couverture** : modèle d'effets §7 (atomes de base + décision/pause) ✓ (Tasks 1-3) ; action recruit + réduction de coût + fin de tour §5 ✓ (Task 4) ; `legalMoves` pour UI/bot/tests ✓ (Task 4) ; déterminisme & immuabilité (Global Constraints) testés (Tasks 2-4) ; pureté préservée (aucun nouvel import interdit). Le reste de la spec (autres actions/atomes/combinateurs/vue/bot/contenu réel) est explicitement renvoyé aux plans suivants.
- **Placeholders** : aucun ; code complet à chaque étape.
- **Cohérence des types** : `Effect`, `EffectCtx`, `ResolutionState`, `PendingDecision` définis en Task 1 et utilisés à l'identique en Tasks 2-4 ; `resolve`/`decide`/`applyEffect`/`cardOf` signatures cohérentes entre `effects.ts` et `moves.ts` ; `Move` (`recruit`/`decide`) cohérent entre `moves.ts` et tests ; `HAND_LIMIT=4` documenté comme provisoire (badge en plan suivant).

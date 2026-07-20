# Zenith — Moteur (fondation) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Poser le socle testé du moteur pur Zenith : projet TS+jest, RNG seedé, modèle d'état, mise en place d'une partie, pistes d'influence (déplacement/capture) et détection de victoire.

**Architecture:** Bibliothèque TypeScript **pure** (aucun import React/Expo/réseau) dans `src/engine/`, testée avec jest+ts-jest. État immuable ; fonctions pures et déterministes. Ce plan s'arrête à un noyau testable ; les actions de tour, l'interpréteur d'effets, le bot et l'UI feront l'objet de plans suivants.

**Tech Stack:** TypeScript (strict), jest, ts-jest. Node ≥ 18. Pas d'Expo à ce stade (le moteur est agnostique ; Expo arrivera au plan UI).

## Global Constraints

- **Moteur pur** : `src/engine/**` et `src/data/**` n'importent **jamais** de React/React Native/Expo/réseau. Verbatim spec §2.
- **Aucun contenu de jeu inventé** : les données de contenu sont des **fixtures explicitement non canoniques** tant que l'utilisateur n'a pas transcrit le vrai contenu. Verbatim spec §3.
- **Déterminisme** : tout aléatoire passe par `RngState` seedé ; aucune fonction du moteur n'appelle `Math.random`, `Date.now`, `new Date()`. Spec §9.
- **Planètes** : `mercure, venus, terra, mars, jupiter`. **Peuples** : `animod, humain, robot`. Spec §5.
- **Piste d'influence** : 9 positions, `4` = centre, `0` = zone de contrôle du joueur 0, `8` = zone du joueur 1. Spec §5/§6.
- **Victoire** : absolue = 3 disques d'une même planète ; démocratique = 4 planètes différentes ; populaire = 5 disques au total. Spec §5.
- Style : DRY, YAGNI, KISS ; commits fréquents et atomiques (messages à l'impératif).

---

### Task 1: Initialiser le projet TypeScript + jest

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `jest.config.js`
- Create: `src/engine/.gitkeep`

**Interfaces:**
- Consumes: rien.
- Produces: commandes `npm test` (jest) et `npm run typecheck` (tsc) fonctionnelles ; dossier `src/engine/` prêt.

- [ ] **Step 1: Créer `package.json`**

```json
{
  "name": "zenith",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "test": "jest",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "@types/jest": "^29.5.12",
    "@types/node": "^20.11.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.2",
    "typescript": "^5.4.0"
  }
}
```

- [ ] **Step 2: Créer `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "moduleResolution": "node",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "types": ["jest", "node"]
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Créer `jest.config.js`**

```js
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
};
```

- [ ] **Step 4: Créer `src/engine/.gitkeep`** (fichier vide) puis installer

Run: `npm install`
Expected: installation sans erreur, `node_modules/` créé (déjà gitignoré).

- [ ] **Step 5: Vérifier que jest tourne (aucun test = échec attendu toléré)**

Run: `npx jest --passWithNoTests`
Expected: PASS (`No tests found, exiting with code 0`).

- [ ] **Step 6: Commit**

```bash
git add package.json tsconfig.json jest.config.js src/engine/.gitkeep
git commit -m "chore: init TypeScript + jest (moteur pur)"
```

---

### Task 2: RNG seedé (déterministe)

**Files:**
- Create: `src/engine/rng.ts`
- Test: `src/engine/__tests__/rng.test.ts`

**Interfaces:**
- Consumes: rien.
- Produces:
  - `type RngState = { seed: number; counter: number }`
  - `makeRng(seed: number): RngState`
  - `nextFloat(state: RngState): [number, RngState]` → flottant dans `[0,1)` + nouvel état
  - `nextInt(state: RngState, maxExclusive: number): [number, RngState]`
  - `shuffle<T>(items: readonly T[], state: RngState): [T[], RngState]` (Fisher-Yates, ne mute pas l'entrée)

- [ ] **Step 1: Écrire le test qui échoue** — `src/engine/__tests__/rng.test.ts`

```ts
import { makeRng, nextFloat, nextInt, shuffle } from '../rng';

test('nextFloat est déterministe pour un même seed', () => {
  const a = nextFloat(makeRng(42));
  const b = nextFloat(makeRng(42));
  expect(a[0]).toBe(b[0]);
  expect(a[0]).toBeGreaterThanOrEqual(0);
  expect(a[0]).toBeLessThan(1);
});

test('des seeds différents donnent des suites différentes', () => {
  expect(nextFloat(makeRng(1))[0]).not.toBe(nextFloat(makeRng(2))[0]);
});

test('nextInt reste dans [0, max)', () => {
  let s = makeRng(7);
  for (let i = 0; i < 50; i++) {
    const [v, ns] = nextInt(s, 5);
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThan(5);
    s = ns;
  }
});

test('shuffle est une permutation déterministe et ne mute pas l’entrée', () => {
  const input = [1, 2, 3, 4, 5];
  const [out1] = shuffle(input, makeRng(3));
  const [out2] = shuffle(input, makeRng(3));
  expect(out1).toEqual(out2);
  expect([...out1].sort()).toEqual([1, 2, 3, 4, 5]);
  expect(input).toEqual([1, 2, 3, 4, 5]); // non muté
});
```

- [ ] **Step 2: Lancer le test → échec attendu**

Run: `npx jest rng`
Expected: FAIL (`Cannot find module '../rng'`).

- [ ] **Step 3: Implémenter** — `src/engine/rng.ts`

```ts
export type RngState = { seed: number; counter: number };

export function makeRng(seed: number): RngState {
  return { seed: seed >>> 0, counter: 0 };
}

// mulberry32 : générateur déterministe sur (seed + counter).
function mulberry32(a: number): number {
  let t = (a += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function nextFloat(state: RngState): [number, RngState] {
  const value = mulberry32((state.seed + state.counter) >>> 0);
  return [value, { seed: state.seed, counter: state.counter + 1 }];
}

export function nextInt(state: RngState, maxExclusive: number): [number, RngState] {
  const [f, next] = nextFloat(state);
  return [Math.floor(f * maxExclusive), next];
}

export function shuffle<T>(items: readonly T[], state: RngState): [T[], RngState] {
  const arr = [...items];
  let s = state;
  for (let i = arr.length - 1; i > 0; i--) {
    const [j, ns] = nextInt(s, i + 1);
    s = ns;
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return [arr, s];
}
```

- [ ] **Step 4: Lancer le test → succès**

Run: `npx jest rng`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/engine/rng.ts src/engine/__tests__/rng.test.ts
git commit -m "feat(engine): RNG seedé déterministe (mulberry32 + shuffle)"
```

---

### Task 3: Types du domaine + données de contenu (fixtures non canoniques)

**Files:**
- Create: `src/engine/types.ts`
- Create: `src/data/types.ts`
- Create: `src/data/fixtures.ts`
- Test: `src/data/__tests__/fixtures.test.ts`

**Interfaces:**
- Consumes: `RngState` (Task 2).
- Produces (dans `src/engine/types.ts`) :
  - `type Planet = 'mercure'|'venus'|'terra'|'mars'|'jupiter'` + `const PLANETS: Planet[]`
  - `type People = 'animod'|'humain'|'robot'` + `const PEOPLES: People[]`
  - `type PlayerIndex = 0 | 1`
  - `type PlanetTrack = { discPos: number; captured: [number, number]; bonusActive: boolean }`
  - `type PlayerState = { hand: string[]; columns: Record<Planet, string[]>; credits: number; zenithium: number; techMarkers: Record<People, number>; lineBonusClaimed: { 1: boolean; 2: boolean; 3: boolean } }`
  - `type TechSetup = { animod: 'S'|'D'; humain: 'O'|'U'; robot: 'N'|'P' }`
  - `type GameConfig = { techSetup: TechSetup; firstPlayer: PlayerIndex }`
  - `type GameState = { config: GameConfig; rng: RngState; current: PlayerIndex; players: [PlayerState, PlayerState]; deck: string[]; discard: string[]; planets: Record<Planet, PlanetTrack>; diplomacy: { leader: PlayerIndex | null; side: 'silver'|'gold' }; winner: PlayerIndex | null }`
- Produces (dans `src/data/types.ts`) : `type CardDef = { id: string; name: string; people: People; planet: Planet; cost: number }` (les effets seront ajoutés au plan « effets »).
- Produces (dans `src/data/fixtures.ts`) : `FIXTURE_CARDS: CardDef[]` (≥ 10 cartes, ≥ 1 par planète), constante `FIXTURE_NON_CANONICAL = true`.

- [ ] **Step 1: Écrire le test qui échoue** — `src/data/__tests__/fixtures.test.ts`

```ts
import { PLANETS } from '../../engine/types';
import { FIXTURE_CARDS, FIXTURE_NON_CANONICAL } from '../fixtures';

test('les fixtures sont marquées non canoniques', () => {
  expect(FIXTURE_NON_CANONICAL).toBe(true);
});

test('au moins une carte fixture par planète', () => {
  for (const planet of PLANETS) {
    expect(FIXTURE_CARDS.some((c) => c.planet === planet)).toBe(true);
  }
});

test('les coûts des cartes sont dans [1, 10]', () => {
  for (const c of FIXTURE_CARDS) {
    expect(c.cost).toBeGreaterThanOrEqual(1);
    expect(c.cost).toBeLessThanOrEqual(10);
  }
});
```

- [ ] **Step 2: Lancer → échec attendu**

Run: `npx jest fixtures`
Expected: FAIL (`Cannot find module '../../engine/types'`).

- [ ] **Step 3: Implémenter `src/engine/types.ts`**

```ts
import type { RngState } from './rng';

export type Planet = 'mercure' | 'venus' | 'terra' | 'mars' | 'jupiter';
export const PLANETS: Planet[] = ['mercure', 'venus', 'terra', 'mars', 'jupiter'];

export type People = 'animod' | 'humain' | 'robot';
export const PEOPLES: People[] = ['animod', 'humain', 'robot'];

export type PlayerIndex = 0 | 1;

/** 9 positions : 0 = zone contrôle J0, 4 = centre, 8 = zone contrôle J1. */
export type PlanetTrack = { discPos: number; captured: [number, number]; bonusActive: boolean };

export type PlayerState = {
  hand: string[];
  columns: Record<Planet, string[]>;
  credits: number;
  zenithium: number;
  techMarkers: Record<People, number>;
  lineBonusClaimed: { 1: boolean; 2: boolean; 3: boolean };
};

export type TechSetup = { animod: 'S' | 'D'; humain: 'O' | 'U'; robot: 'N' | 'P' };
export type GameConfig = { techSetup: TechSetup; firstPlayer: PlayerIndex };

export type GameState = {
  config: GameConfig;
  rng: RngState;
  current: PlayerIndex;
  players: [PlayerState, PlayerState];
  deck: string[];
  discard: string[];
  planets: Record<Planet, PlanetTrack>;
  diplomacy: { leader: PlayerIndex | null; side: 'silver' | 'gold' };
  winner: PlayerIndex | null;
};
```

- [ ] **Step 4: Implémenter `src/data/types.ts`**

```ts
import type { People, Planet } from '../engine/types';

// Les effets seront ajoutés dans le plan « effets ». Ici, le strict nécessaire à la fondation.
export type CardDef = { id: string; name: string; people: People; planet: Planet; cost: number };
```

- [ ] **Step 5: Implémenter `src/data/fixtures.ts`** (contenu FACTICE, non canonique)

```ts
import type { People, Planet } from '../engine/types';
import type { CardDef } from './types';

/** ⚠️ Données FACTICES pour tester le moteur. NE PAS confondre avec le vrai contenu Zenith. */
export const FIXTURE_NON_CANONICAL = true;

const PEOPLE_CYCLE: People[] = ['animod', 'humain', 'robot'];
const PLANET_LIST: Planet[] = ['mercure', 'venus', 'terra', 'mars', 'jupiter'];

// 2 cartes par planète (10 cartes), coûts variés. Aucun effet pour l'instant.
export const FIXTURE_CARDS: CardDef[] = PLANET_LIST.flatMap((planet, i) =>
  [0, 1].map((k) => ({
    id: `FIX_${planet}_${k}`,
    name: `Fixture ${planet} ${k}`,
    planet,
    people: PEOPLE_CYCLE[(i + k) % 3]!,
    cost: 1 + ((i + k) % 5), // 1..5
  })),
);
```

- [ ] **Step 6: Lancer → succès + typecheck**

Run: `npx jest fixtures && npm run typecheck`
Expected: PASS (3 tests) ; typecheck sans erreur.

- [ ] **Step 7: Commit**

```bash
git add src/engine/types.ts src/data/types.ts src/data/fixtures.ts src/data/__tests__/fixtures.test.ts
git commit -m "feat(engine): types du domaine + fixtures de contenu non canoniques"
```

---

### Task 4: Mise en place d'une partie (`createGame`)

**Files:**
- Create: `src/engine/setup.ts`
- Test: `src/engine/__tests__/setup.test.ts`

**Interfaces:**
- Consumes: `RngState`+`shuffle`+`makeRng` (Task 2), types (Task 3), `FIXTURE_CARDS` (Task 3).
- Produces:
  - `createGame(config: GameConfig, seed: number, deck?: CardDef[]): GameState`
  - Constantes exportées : `START_CREDITS = 12`, `START_ZENITHIUM = 1`, `START_HAND = 4`, `CENTER = 4`.
  - Règles de mise en place (spec §5) : chaque joueur 12 Crédits, 1 Zénithium, 4 cartes ; deck mélangé (RNG) ; disques au centre (`discPos=4`, `captured=[0,0]`, `bonusActive=true`) ; `current = config.firstPlayer` ; **le 2e joueur** (celui qui n'est pas `firstPlayer`) reçoit **+1 Influence Terra** (le disque Terra part donc décalé d'un cran vers SA zone) ; `techMarkers` à 0, `lineBonusClaimed` à false ; `diplomacy = { leader: null, side: 'silver' }` ; `winner = null`.

- [ ] **Step 1: Écrire le test qui échoue** — `src/engine/__tests__/setup.test.ts`

```ts
import { createGame, START_CREDITS, START_ZENITHIUM, START_HAND, CENTER } from '../setup';
import { PLANETS, type GameConfig } from '../types';

const CONFIG: GameConfig = {
  techSetup: { animod: 'S', humain: 'U', robot: 'N' },
  firstPlayer: 0,
};

test('chaque joueur démarre avec 12 crédits, 1 zénithium, 4 cartes', () => {
  const s = createGame(CONFIG, 123);
  for (const p of s.players) {
    expect(p.credits).toBe(START_CREDITS);
    expect(p.zenithium).toBe(START_ZENITHIUM);
    expect(p.hand.length).toBe(START_HAND);
  }
});

test('le premier joueur est celui de la config', () => {
  expect(createGame(CONFIG, 1).current).toBe(0);
  expect(createGame({ ...CONFIG, firstPlayer: 1 }, 1).current).toBe(1);
});

test('les disques partent au centre, sauf Terra décalée vers le 2e joueur', () => {
  const s = createGame(CONFIG, 1); // firstPlayer=0 → 2e joueur = 1 (zone = position 8)
  for (const planet of PLANETS) {
    if (planet === 'terra') continue;
    expect(s.planets[planet].discPos).toBe(CENTER);
  }
  expect(s.planets.terra.discPos).toBe(CENTER + 1); // décalé d'un cran vers le joueur 1
});

test('mélange déterministe : même seed → mêmes mains', () => {
  const a = createGame(CONFIG, 999);
  const b = createGame(CONFIG, 999);
  expect(a.players[0].hand).toEqual(b.players[0].hand);
  expect(a.deck).toEqual(b.deck);
});

test('aucune carte perdue : main0 + main1 + deck = tout le paquet', () => {
  const s = createGame(CONFIG, 5);
  const total = s.players[0].hand.length + s.players[1].hand.length + s.deck.length;
  expect(total).toBe(10); // FIXTURE_CARDS
});
```

- [ ] **Step 2: Lancer → échec attendu**

Run: `npx jest setup`
Expected: FAIL (`Cannot find module '../setup'`).

- [ ] **Step 3: Implémenter** — `src/engine/setup.ts`

```ts
import { makeRng, shuffle } from './rng';
import {
  PLANETS,
  type GameConfig,
  type GameState,
  type Planet,
  type PlayerIndex,
  type PlayerState,
} from './types';
import { FIXTURE_CARDS } from '../data/fixtures';
import type { CardDef } from '../data/types';

export const START_CREDITS = 12;
export const START_ZENITHIUM = 1;
export const START_HAND = 4;
export const CENTER = 4;

function emptyColumns(): Record<Planet, string[]> {
  return { mercure: [], venus: [], terra: [], mars: [], jupiter: [] };
}

function newPlayer(hand: string[]): PlayerState {
  return {
    hand,
    columns: emptyColumns(),
    credits: START_CREDITS,
    zenithium: START_ZENITHIUM,
    techMarkers: { animod: 0, humain: 0, robot: 0 },
    lineBonusClaimed: { 1: false, 2: false, 3: false },
  };
}

export function createGame(config: GameConfig, seed: number, deck: CardDef[] = FIXTURE_CARDS): GameState {
  const [shuffled, rng] = shuffle(deck.map((c) => c.id), makeRng(seed));
  const hand0 = shuffled.slice(0, START_HAND);
  const hand1 = shuffled.slice(START_HAND, START_HAND * 2);
  const rest = shuffled.slice(START_HAND * 2);

  const secondPlayer: PlayerIndex = config.firstPlayer === 0 ? 1 : 0;

  const planets = {} as Record<Planet, GameState['planets'][Planet]>;
  for (const planet of PLANETS) {
    // +1 Influence Terra pour le 2e joueur : disque décalé d'un cran vers SA zone.
    const offset = planet === 'terra' ? (secondPlayer === 0 ? -1 : +1) : 0;
    planets[planet] = { discPos: CENTER + offset, captured: [0, 0], bonusActive: true };
  }

  return {
    config,
    rng,
    current: config.firstPlayer,
    players: [newPlayer(hand0), newPlayer(hand1)],
    deck: rest,
    discard: [],
    planets,
    diplomacy: { leader: null, side: 'silver' },
    winner: null,
  };
}
```

- [ ] **Step 4: Lancer → succès + typecheck**

Run: `npx jest setup && npm run typecheck`
Expected: PASS (5 tests) ; typecheck OK.

- [ ] **Step 5: Commit**

```bash
git add src/engine/setup.ts src/engine/__tests__/setup.test.ts
git commit -m "feat(engine): mise en place d'une partie (createGame)"
```

---

### Task 5: Pistes d'influence — déplacement, capture, victoire

**Files:**
- Create: `src/engine/influence.ts`
- Test: `src/engine/__tests__/influence.test.ts`

**Interfaces:**
- Consumes: types (Task 3), `CENTER` (Task 4).
- Produces:
  - `gainInfluence(state: GameState, planet: Planet, player: PlayerIndex, amount: number): GameState`
    - Déplace le disque de `amount` crans vers la zone de `player` (joueur 0 → `discPos` diminue ; joueur 1 → augmente).
    - Si le disque **atteint ou dépasse** la zone du joueur (`0` pour J0, `8` pour J1) : **capture** → `captured[player] += 1`, le disque **retourne au centre** (`discPos = CENTER`), et si c'était la **1re** capture de cette planète (par n'importe qui) on passe `bonusActive` à `false` (l'application de l'effet du jeton sera ajoutée au plan « effets »). L'excédent d'un même `amount` est perdu (une seule capture par appel). Recalcule ensuite la victoire.
  - `checkVictory(state: GameState, player: PlayerIndex): boolean`
    - absolue : une planète avec `captured[player] >= 3` ; démocratique : ≥ 4 planètes avec `captured[player] >= 1` ; populaire : somme `captured[player]` sur les 5 planètes ≥ 5.
  - `winnerOf(state: GameState): PlayerIndex | null`
- Détail : ne mute jamais `state` (retourne un nouvel objet). Positions bornées à `[0, 8]`.

- [ ] **Step 1: Écrire le test qui échoue** — `src/engine/__tests__/influence.test.ts`

```ts
import { createGame } from '../setup';
import { gainInfluence, checkVictory, winnerOf } from '../influence';
import { CENTER } from '../setup';
import type { GameConfig } from '../types';

const CONFIG: GameConfig = { techSetup: { animod: 'S', humain: 'U', robot: 'N' }, firstPlayer: 0 };

test('gagner 1 influence déplace le disque vers la zone du joueur', () => {
  const s = createGame(CONFIG, 1);
  const s2 = gainInfluence(s, 'mars', 0, 1); // joueur 0 → discPos diminue
  expect(s2.planets.mars.discPos).toBe(CENTER - 1);
  const s3 = gainInfluence(s, 'mars', 1, 1); // joueur 1 → discPos augmente
  expect(s3.planets.mars.discPos).toBe(CENTER + 1);
});

test('atteindre sa zone capture le disque et le renvoie au centre', () => {
  let s = createGame(CONFIG, 1);
  s = gainInfluence(s, 'mars', 0, 4); // de 4 à 0 → capture
  expect(s.planets.mars.captured[0]).toBe(1);
  expect(s.planets.mars.discPos).toBe(CENTER);
  expect(s.planets.mars.bonusActive).toBe(false); // 1re capture
});

test('ne mute pas l’état d’entrée', () => {
  const s = createGame(CONFIG, 1);
  gainInfluence(s, 'mars', 0, 1);
  expect(s.planets.mars.discPos).toBe(CENTER);
});

test('victoire absolue : 3 disques d’une même planète', () => {
  let s = createGame(CONFIG, 1);
  for (let i = 0; i < 3; i++) s = gainInfluence(s, 'mars', 0, 4);
  expect(checkVictory(s, 0)).toBe(true);
  expect(winnerOf(s)).toBe(0);
});

test('victoire populaire : 5 disques au total', () => {
  let s = createGame(CONFIG, 1);
  const planets = ['mercure', 'venus', 'mars', 'jupiter'] as const;
  // 2 sur mercure + 1 sur chacune des 3 autres = 5, sans atteindre 3 sur une seule
  s = gainInfluence(s, 'mercure', 1, 4);
  s = gainInfluence(s, 'mercure', 1, 4);
  for (const p of ['venus', 'mars', 'jupiter'] as const) s = gainInfluence(s, p, 1, 4);
  expect(checkVictory(s, 1)).toBe(true);
});

test('pas de fausse victoire au départ', () => {
  const s = createGame(CONFIG, 1);
  expect(winnerOf(s)).toBeNull();
});
```

- [ ] **Step 2: Lancer → échec attendu**

Run: `npx jest influence`
Expected: FAIL (`Cannot find module '../influence'`).

- [ ] **Step 3: Implémenter** — `src/engine/influence.ts`

```ts
import { PLANETS, type GameState, type Planet, type PlayerIndex } from './types';

const CENTER = 4;
const ZONE = { 0: 0, 1: 8 } as const; // position de la zone de contrôle de chaque joueur

export function gainInfluence(
  state: GameState,
  planet: Planet,
  player: PlayerIndex,
  amount: number,
): GameState {
  const track = state.planets[planet];
  const dir = player === 0 ? -1 : +1;
  let pos = track.discPos + dir * amount;

  let captured: [number, number] = [track.captured[0], track.captured[1]];
  let bonusActive = track.bonusActive;

  const reachedZone = player === 0 ? pos <= ZONE[0] : pos >= ZONE[1];
  if (reachedZone) {
    captured = [captured[0], captured[1]];
    captured[player] += 1;
    pos = CENTER; // nouveau disque au centre (simplifié ; remise en fin de tour affinée plus tard)
    if (captured[0] + captured[1] === 1) bonusActive = false; // 1re capture de la planète
  } else {
    pos = Math.max(0, Math.min(8, pos));
  }

  const planets = { ...state.planets, [planet]: { discPos: pos, captured, bonusActive } };
  const next: GameState = { ...state, planets };
  const w = winnerOf(next);
  return w === null ? next : { ...next, winner: w };
}

export function checkVictory(state: GameState, player: PlayerIndex): boolean {
  const counts = PLANETS.map((p) => state.planets[p].captured[player]);
  const absolute = counts.some((c) => c >= 3);
  const democratic = counts.filter((c) => c >= 1).length >= 4;
  const popular = counts.reduce((a, b) => a + b, 0) >= 5;
  return absolute || democratic || popular;
}

export function winnerOf(state: GameState): PlayerIndex | null {
  if (checkVictory(state, 0)) return 0;
  if (checkVictory(state, 1)) return 1;
  return null;
}
```

- [ ] **Step 4: Lancer → succès + typecheck**

Run: `npx jest influence && npm run typecheck`
Expected: PASS (6 tests) ; typecheck OK.

- [ ] **Step 5: Commit**

```bash
git add src/engine/influence.ts src/engine/__tests__/influence.test.ts
git commit -m "feat(engine): pistes d'influence (déplacement, capture, victoire)"
```

---

### Task 6: Barrière de pureté + point d'entrée du moteur

**Files:**
- Create: `src/engine/index.ts`
- Test: `src/engine/__tests__/purity.test.ts`

**Interfaces:**
- Consumes: tous les modules du moteur.
- Produces: `src/engine/index.ts` ré-exporte l'API publique (`rng`, `types`, `setup`, `influence`). Un test garantit que le moteur n'importe rien de React/Expo/réseau (barrière de la spec §2).

- [ ] **Step 1: Écrire le test qui échoue** — `src/engine/__tests__/purity.test.ts`

```ts
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const FORBIDDEN = ['react', 'react-native', 'expo', 'net', 'react-native-tcp-socket'];

function tsFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return tsFiles(full);
    return full.endsWith('.ts') && !full.includes('__tests__') ? [full] : [];
  });
}

test('le moteur n’importe aucun module UI/réseau', () => {
  const root = join(__dirname, '..');
  for (const file of tsFiles(root)) {
    const src = readFileSync(file, 'utf8');
    for (const mod of FORBIDDEN) {
      expect(src).not.toMatch(new RegExp(`from ['"]${mod}(/|['"])`));
    }
  }
});
```

- [ ] **Step 2: Lancer → échec attendu**

Run: `npx jest purity`
Expected: FAIL (`Cannot find module '../index'` n'est pas requis ici, mais le test échoue si `src/engine/index.ts` manque à l'import ; sinon il PASSE déjà — dans ce cas, créer quand même l'index puis re-vérifier). Attendu : le fichier `index.ts` n'existe pas encore.

- [ ] **Step 3: Implémenter** — `src/engine/index.ts`

```ts
export * from './rng';
export * from './types';
export * from './setup';
export * from './influence';
```

- [ ] **Step 4: Lancer toute la suite + typecheck**

Run: `npx jest && npm run typecheck`
Expected: PASS (tous les tests des tâches 2→6) ; typecheck OK.

- [ ] **Step 5: Commit**

```bash
git add src/engine/index.ts src/engine/__tests__/purity.test.ts
git commit -m "feat(engine): index public + test de pureté (aucun import UI/réseau)"
```

---

## Suites (plans à venir, hors de ce plan)

1. **Actions & interpréteur d'effets** : `moves.ts` (recruit/develop/leadership, `applyMove`, `legalMoves`), `effects.ts` (atomes + combinateurs, `pending`/reprise), techno (coût N, primes de ligne, bonus niveau 2), diplomatie/badge, fin de tour, `playerView`.
2. **Bot + simulations headless** : `bot/pickMove`, parties bot-vs-bot, invariants.
3. **UI (phase 2)** : scaffolding Expo, écrans, rendu depuis `playerView`.
4. **Transport local 2 tels (phase 3)**.
5. **Intégration du contenu réel** au fur et à mesure de la transcription (technos via `docs/content/technologies.md`, puis cartes/jetons).

## Self-Review

- **Couverture spec (fondation)** : RNG déterministe §9 ✓ (Task 2) ; types/état §6 ✓ (Task 3) ; mise en place §5 ✓ (Task 4) ; pistes d'influence + victoire §5 ✓ (Task 5) ; barrière de pureté §2 ✓ (Task 6) ; contenu = fixtures non canoniques §3 ✓ (Task 3). Le reste de la spec (actions, effets, bot, UI, réseau) est explicitement renvoyé aux plans suivants.
- **Placeholders** : aucun « TBD/TODO » ; chaque étape contient le code réel.
- **Cohérence des types** : `CENTER=4`, positions `[0,8]`, `PlanetTrack{discPos,captured,bonusActive}`, `gainInfluence`/`checkVictory`/`winnerOf` cohérents entre `influence.ts` et ses tests ; `createGame` produit exactement la forme `GameState` de `types.ts`.

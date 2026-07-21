# Zenith — UI Mobile (Phase 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Livrer une app Expo lançable où l'on joue une partie solo complète contre le bot (du début à la victoire/blocage), toute la logique venant du moteur pur existant.

**Architecture:** Le moteur pur (`src/engine` + `src/data`) reste une librairie locale intacte. Une **couche « partie » sans React** (`src/game/session.ts`) enveloppe `createGame`/`applyMove`/`legalMoves`/`playerView`/`pickMove` et fait jouer le bot pour le joueur 1 ; elle est testée en pur Node. Un hook React mince (`useGame`) l'expose à des composants qui **rendent uniquement `playerView`** (jamais l'état brut) et déclenchent les coups via des feuilles/toasts custom (jamais `Alert.alert`).

**Tech Stack:** Expo ~57, expo-router ~57, React 19.2, React Native 0.86, NativeWind ^4 (+ Tailwind 3.4), TypeScript 5.4 strict. Tests moteur/couche via **ts-jest** (inchangé) ; l'UI validée par **`npm run typecheck`**.

## Global Constraints

- **L'UI ne réimplémente aucune règle.** Toute transition d'état = `applyMove(state, move)` du moteur ; les coups légaux viennent de `legalMoves(state, player)`. Aucun effet de carte/jeton/techno inventé.
- **Rendu depuis `playerView(state, 0)` uniquement.** Jamais d'accès à la main adverse, à la pioche, à `rng` ni à `resolution.queue` brute côté composants. La description des décisions (paliers, options) est calculée dans la couche `src/game` (qui détient l'état brut, légitime car ce sont les décisions du joueur humain lui-même), et transmise aux composants sous forme de libellés.
- **Aucun `Alert.alert` natif.** Décisions et fins de partie via composants custom (`Sheet`, `Toast`).
- **TypeScript strict + `noUncheckedIndexedAccess`** (conservés du moteur). Chaque tâche doit passer `npm run typecheck`.
- **Ne pas casser les tests moteur existants** (~180) ni leur configuration : `jest` reste en **ts-jest / CommonJS / Node**, isolé de la config Expo via `tsconfig.jest.json`.
- **Scaffold conventionnel** (aligné sur le projet Padelario de l'utilisateur) : le moins de config exotique possible. `typedRoutes` volontairement **désactivé** (les types de routes générés exigeraient un `expo start` que l'environnement ne peut pas lancer).
- **Le joueur humain est le joueur `0`, le bot est le joueur `1`.** Le bot ne joue **que** quand c'est à lui (`activePlayer(state) === 1`).
- Commits fréquents ; un livrable qui typecheck (et teste, pour la couche) par tâche.

---

## File Structure

```
zenith/
├── app.json                      [NEW]  config Expo (name/slug/scheme, plugin expo-router)
├── babel.config.js               [NEW]  babel-preset-expo + nativewind
├── metro.config.js               [NEW]  withNativeWind(input: ./src/global.css)
├── tailwind.config.js            [NEW]  preset nativewind, content ./src/**
├── nativewind-env.d.ts           [NEW]  types nativewind + declare module '*.css'
├── expo-env.d.ts                 [NEW]  reference expo/types (statique, pour typecheck)
├── tsconfig.json                 [MODIFY] extends expo/tsconfig.base (cible typecheck : engine + app)
├── tsconfig.jest.json            [NEW]  copie de l'ancien tsconfig (CommonJS/Node) pour ts-jest
├── jest.config.js                [MODIFY] ts-jest pointé sur tsconfig.jest.json
├── package.json                  [MODIFY] deps Expo/RN/NativeWind + main: expo-router/entry
└── src/
    ├── global.css                [NEW]  @tailwind base/components/utilities
    ├── engine/…                  (INCHANGÉ — librairie pure)
    ├── data/…                    (INCHANGÉ — librairie pure)
    ├── game/                     [NEW]  couche « partie » (sans React, testable)
    │   ├── config.ts             DEFAULT_CONFIG (GameConfig par défaut)
    │   ├── labels.ts             libellés FR des Move / prompts de décision
    │   ├── session.ts            init/humanMove/stepBot/replay/snapshot (pur)
    │   ├── useGame.ts            hook React mince (état + boucle bot temporisée)
    │   └── __tests__/session.test.ts
    ├── components/
    │   ├── ui/                   primitives custom (pas d'Alert natif)
    │   │   ├── Sheet.tsx         feuille modale bas d'écran (réutilisée)
    │   │   ├── Toast.tsx         provider + hook de toast custom
    │   │   └── ActionButton.tsx  bouton d'action réutilisable
    │   └── game/
    │       ├── ResourcesPanel.tsx   crédits/zénithium/techno/leader/pioche
    │       ├── PlanetsPanel.tsx     influence/captures/jeton par planète
    │       ├── HandPanel.tsx        main du joueur (cartes jouables)
    │       ├── CardActionSheet.tsx  actions d'une carte (recruit/develop/leadership)
    │       ├── DecisionSheet.tsx    zone de décision (toutes les PendingDecision)
    │       └── GameOverSheet.tsx    résultat + rejouer
    └── app/                      [NEW]  routes expo-router (src/app auto-détecté)
        ├── _layout.tsx           providers + Stack
        ├── index.tsx             accueil → « Nouvelle partie solo »
        └── game.tsx              écran de jeu (assemble les panneaux + useGame)
```

**Règle d'imports (importante pour la cohabitation ts-jest / Metro) :**
- La couche `src/game/*` (compilée par **ts-jest** avec `tsconfig.jest.json`, qui n'a **pas** d'alias de chemins) importe le moteur en **relatif** : `../engine`, `../data`.
- Les composants et `src/app/*` (compilés par tsc/Metro seulement) peuvent utiliser l'alias `@/*` **ou** le relatif ; ce plan utilise le relatif partout pour rester uniforme et sans surprise.

---

## Task 1: Scaffold Expo + NativeWind + expo-router (cohabitation moteur)

**Files:**
- Create: `app.json`, `babel.config.js`, `metro.config.js`, `tailwind.config.js`, `nativewind-env.d.ts`, `expo-env.d.ts`, `tsconfig.jest.json`, `src/global.css`, `src/app/_layout.tsx`, `src/app/index.tsx`, `src/app/game.tsx`, `src/components/ui/Toast.tsx`
- Modify: `package.json`, `tsconfig.json`, `jest.config.js`

**Interfaces:**
- Consumes: rien (première tâche).
- Produces: une app Expo lançable, un split de config `tsconfig.json` (typecheck app+moteur) / `tsconfig.jest.json` (tests moteur), et `ToastProvider`/`useToast` réutilisés plus tard.

- [ ] **Step 1: Créer `tsconfig.jest.json` (copie fidèle de l'ancien tsconfig moteur)**

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
  "include": ["src/engine", "src/data", "src/game"]
}
```

- [ ] **Step 2: Remplacer `tsconfig.json` par la config Expo (cible du typecheck)**

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src", "expo-env.d.ts", "nativewind-env.d.ts"],
  "exclude": ["node_modules", "**/*.test.ts", "**/__tests__/**"]
}
```

- [ ] **Step 3: Pointer `jest.config.js` sur `tsconfig.jest.json`**

```js
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.jest.json' }],
  },
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
};
```

- [ ] **Step 4: Mettre à jour `package.json` (deps Expo + entrée expo-router)**

```json
{
  "name": "zenith",
  "version": "0.0.0",
  "private": true,
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "test": "jest",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "expo": "^57",
    "expo-constants": "~57.0.3",
    "expo-linking": "~57.0.2",
    "expo-router": "~57.0.4",
    "expo-status-bar": "~57.0.0",
    "nativewind": "^4.2.6",
    "react": "19.2.3",
    "react-dom": "19.2.3",
    "react-native": "0.86.0",
    "react-native-gesture-handler": "~2.32.0",
    "react-native-safe-area-context": "~5.7.0",
    "react-native-screens": "4.25.2",
    "react-native-web": "~0.21.0",
    "tailwindcss": "3.4.17"
  },
  "devDependencies": {
    "@types/jest": "^29.5.12",
    "@types/node": "^20.11.0",
    "@types/react": "~19.2.2",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.2",
    "typescript": "^5.4.0"
  }
}
```

- [ ] **Step 5: Créer `app.json` (sans typedRoutes ni EAS/updates)**

```json
{
  "expo": {
    "name": "Zenith",
    "slug": "zenith",
    "version": "1.0.0",
    "orientation": "portrait",
    "scheme": "zenith",
    "userInterfaceStyle": "automatic",
    "plugins": ["expo-router"],
    "ios": { "supportsTablet": true, "bundleIdentifier": "com.zenith.app" },
    "android": { "package": "com.zenith.app" }
  }
}
```

- [ ] **Step 6: Créer `babel.config.js` et `metro.config.js`**

`babel.config.js` :

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
  };
};
```

`metro.config.js` :

```js
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: './src/global.css' });
```

- [ ] **Step 7: Créer `tailwind.config.js`, `src/global.css`, `nativewind-env.d.ts`, `expo-env.d.ts`**

`tailwind.config.js` :

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'media',
  theme: { extend: {} },
  plugins: [],
};
```

`src/global.css` :

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

`nativewind-env.d.ts` :

```ts
/// <reference types="nativewind/types" />

declare module '*.css';
```

`expo-env.d.ts` :

```ts
/// <reference types="expo/types" />
```

- [ ] **Step 8: Créer le `ToastProvider` custom (pas d'Alert natif)** — `src/components/ui/Toast.tsx`

```tsx
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';

type ToastContext = { show: (message: string) => void };

const Ctx = createContext<ToastContext>({ show: () => {} });

export function useToast(): ToastContext {
  return useContext(Ctx);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);

  const show = useCallback((m: string) => {
    setMessage(m);
    setTimeout(() => setMessage(null), 2000);
  }, []);

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      {message !== null ? (
        <View pointerEvents="none" className="absolute bottom-10 left-0 right-0 items-center">
          <Text className="bg-slate-800 text-white px-4 py-2 rounded-full overflow-hidden">{message}</Text>
        </View>
      ) : null}
    </Ctx.Provider>
  );
}
```

- [ ] **Step 9: Créer le layout racine** — `src/app/_layout.tsx`

```tsx
import '../global.css';

import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastProvider } from '../components/ui/Toast';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ToastProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </ToastProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
```

- [ ] **Step 10: Créer l'accueil** — `src/app/index.tsx`

```tsx
import { Link } from 'expo-router';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Home() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View className="flex-1 bg-slate-950 items-center justify-center gap-6 px-6">
        <Text className="text-white text-3xl font-bold">Zenith</Text>
        <Text className="text-slate-400 text-center">Duel spatial — prototype mobile</Text>
        <Link href="/game" className="bg-indigo-600 text-white px-6 py-3 rounded-xl overflow-hidden">
          Nouvelle partie solo
        </Link>
      </View>
    </SafeAreaView>
  );
}
```

- [ ] **Step 11: Créer l'écran de jeu « hello » (placeholder)** — `src/app/game.tsx`

```tsx
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function GameScreen() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View className="flex-1 bg-slate-950 items-center justify-center">
        <Text className="text-white text-xl">Écran de jeu (à venir)</Text>
      </View>
    </SafeAreaView>
  );
}
```

- [ ] **Step 12: Installer les dépendances**

Run: `npm install`
Expected: installation OK (Expo, RN, NativeWind, types React). Réseau requis.

- [ ] **Step 13: Vérifier que les tests moteur passent toujours**

Run: `npm test`
Expected: PASS, ~180 tests verts (config ts-jest isolée via `tsconfig.jest.json`).

- [ ] **Step 14: Vérifier le typecheck app + moteur**

Run: `npm run typecheck`
Expected: PASS (aucune erreur). Couvre `src/app`, `src/components`, `src/engine`, `src/data`.

- [ ] **Step 15: Commit**

```bash
git add -A
git commit -m "feat(ui): scaffold Expo + expo-router + nativewind cohabitant avec le moteur"
```

---

## Task 2: Couche « partie » sans React (`session` + `labels`) + tests

**Files:**
- Create: `src/game/config.ts`, `src/game/labels.ts`, `src/game/session.ts`, `src/game/__tests__/session.test.ts`

**Interfaces:**
- Consumes (du moteur, via `../engine`) : `createGame(config, seed)`, `applyMove(state, move)`, `legalMoves(state, player)`, `playerView(state, viewer)`, `activePlayer(state)`, `pickMove(state, player, rng)`, `makeRng(seed)`, `cardOf(id)`, types `GameConfig`, `GameState`, `Move`, `PlayerIndex`, `PlayerView`, `RngState`, `Planet`, `People`, `PLANETS`.
- Produces (pour le hook et les composants) :
  - `HUMAN: 0`, `BOT: 1` (`PlayerIndex`).
  - `DEFAULT_CONFIG: GameConfig`.
  - `type LabeledMove = { move: Move; label: string }`.
  - `type Phase = 'human' | 'bot' | 'over'`, `type Outcome = 'playing' | 'winner' | 'stuck'`.
  - `type SessionState` (opaque : `{ config; gameSeed; botRng; game }`).
  - `type SessionSnapshot = { view: PlayerView; phase: Phase; outcome: Outcome; winner: PlayerIndex | null; actions: { recruit: LabeledMove[]; develop: LabeledMove[]; leadership: LabeledMove[] }; decision: { prompt: string; options: LabeledMove[] } | null }`.
  - `initSession(config, gameSeed, botSeed): SessionState`.
  - `humanMove(s, move): SessionState`.
  - `stepBot(s): SessionState` (renvoie le **même objet** si le bot n'a rien à jouer).
  - `replay(s): SessionState` (1er joueur inversé).
  - `snapshot(s): SessionSnapshot`.
  - `describeMove(state, move): string`, `decisionPrompt(state): string`.

- [ ] **Step 1: Créer `src/game/config.ts`**

```ts
import type { GameConfig } from '../engine';

/** Config solo par défaut : l'humain (joueur 0) commence, faces techno fixées. */
export const DEFAULT_CONFIG: GameConfig = {
  firstPlayer: 0,
  techSetup: { animod: 'S', humain: 'O', robot: 'N' },
};
```

- [ ] **Step 2: Créer `src/game/labels.ts` (libellés FR, lisent l'état brut)**

```ts
import { cardOf, type GameState, type Move, type People, type Planet } from '../engine';

const PLANET_FR: Record<Planet, string> = {
  mercure: 'Mercure',
  venus: 'Vénus',
  terra: 'Terra',
  mars: 'Mars',
  jupiter: 'Jupiter',
};

const PEOPLE_FR: Record<People, string> = {
  animod: 'Animods',
  humain: 'Humains',
  robot: 'Robots',
};

function cardName(id: string): string {
  return cardOf(id)?.name ?? id;
}

export function decisionPrompt(state: GameState): string {
  const p = state.pending;
  if (p === null) return '';
  switch (p.kind) {
    case 'choosePlanet':
      return `Choisis une planète (${p.amount >= 0 ? '+' : ''}${p.amount} influence)`;
    case 'moveDiscToCenter':
      return 'Ramène un disque vers le centre';
    case 'chooseSegment':
      return `Choisis un segment de ${p.count} planètes contiguës`;
    case 'chooseColumn':
      return `Choisis une colonne ${p.owner === 'self' ? 'de ton camp' : 'adverse'}`;
    case 'confirmOptional':
      return 'Activer cet effet optionnel ?';
    case 'chooseOption':
      return 'Choisis une option';
    case 'chooseTier':
      return 'Choisis un palier (ou passe)';
    case 'chooseTech':
      return 'Choisis une technologie à développer';
    case 'chooseHandCard':
      return 'Choisis une carte à défausser';
    case 'chooseBoardToken':
      return 'Choisis un jeton du plateau';
  }
}

function describeChoose(state: GameState, index: number): string {
  const p = state.pending;
  if (p?.kind === 'confirmOptional') return 'Oui, activer';
  if (p?.kind === 'chooseBoardToken') {
    const slot = p.slots[index];
    if (slot === undefined) return `Option ${index + 1}`;
    return slot.kind === 'planet'
      ? `Jeton ${PLANET_FR[slot.planet]}`
      : `Jeton techno ${PEOPLE_FR[slot.people]}`;
  }
  if (p?.kind === 'chooseTier') return `Palier ${index + 1}`;
  return `Option ${index + 1}`;
}

export function describeMove(state: GameState, move: Move): string {
  switch (move.t) {
    case 'recruit': {
      const c = cardOf(move.cardId);
      return c ? `Recruter « ${c.name} » — ${PLANET_FR[c.planet]}` : 'Recruter';
    }
    case 'develop':
      return `Développer ${PEOPLE_FR[move.people]} — « ${cardName(move.cardId)} »`;
    case 'leadership': {
      const c = cardOf(move.cardId);
      return c ? `Leadership ${PEOPLE_FR[c.people]} — « ${c.name} »` : 'Leadership';
    }
    case 'decide':
      return PLANET_FR[move.planet];
    case 'choose':
      return describeChoose(state, move.index);
    case 'skip':
      return state.pending?.kind === 'confirmOptional' ? 'Non merci' : 'Passer';
    case 'decideTech':
      return PEOPLE_FR[move.people];
    case 'decideCard':
      return `Défausser « ${cardName(move.cardId)} »`;
  }
}
```

- [ ] **Step 3: Créer `src/game/session.ts`**

```ts
import {
  activePlayer,
  applyMove,
  createGame,
  legalMoves,
  makeRng,
  pickMove,
  playerView,
  type GameConfig,
  type GameState,
  type Move,
  type PlayerIndex,
  type PlayerView,
  type RngState,
} from '../engine';
import { describeMove, decisionPrompt } from './labels';

export const HUMAN: PlayerIndex = 0;
export const BOT: PlayerIndex = 1;

export type Phase = 'human' | 'bot' | 'over';
export type Outcome = 'playing' | 'winner' | 'stuck';
export type LabeledMove = { move: Move; label: string };

export type SessionState = {
  config: GameConfig;
  gameSeed: number;
  botRng: RngState;
  game: GameState;
};

export type SessionSnapshot = {
  view: PlayerView;
  phase: Phase;
  outcome: Outcome;
  winner: PlayerIndex | null;
  actions: { recruit: LabeledMove[]; develop: LabeledMove[]; leadership: LabeledMove[] };
  decision: { prompt: string; options: LabeledMove[] } | null;
};

export function initSession(config: GameConfig, gameSeed: number, botSeed: number): SessionState {
  return { config, gameSeed, botRng: makeRng(botSeed), game: createGame(config, gameSeed) };
}

export function isBotActive(s: SessionState): boolean {
  return s.game.winner === null && activePlayer(s.game) === BOT;
}

/** Applique un coup du joueur humain. N'avance PAS le bot (voir `stepBot`). */
export function humanMove(s: SessionState, move: Move): SessionState {
  if (s.game.winner !== null) return s;
  if (activePlayer(s.game) !== HUMAN) return s;
  return { ...s, game: applyMove(s.game, move) };
}

/** Joue UN coup du bot s'il est actif. Renvoie le même objet si le bot est bloqué. */
export function stepBot(s: SessionState): SessionState {
  if (!isBotActive(s)) return s;
  const [move, nextRng] = pickMove(s.game, BOT, s.botRng);
  if (move === null) return s;
  return { ...s, botRng: nextRng, game: applyMove(s.game, move) };
}

/** Rejoue : 1er joueur inversé (règle), graines dérivées de façon déterministe. */
export function replay(s: SessionState): SessionState {
  const nextFirst: PlayerIndex = s.config.firstPlayer === 0 ? 1 : 0;
  const config: GameConfig = { ...s.config, firstPlayer: nextFirst };
  return initSession(config, s.gameSeed + 1, s.botRng.seed + 1);
}

function phaseOf(game: GameState): Phase {
  if (game.winner !== null) return 'over';
  return activePlayer(game) === BOT ? 'bot' : 'human';
}

function outcomeOf(game: GameState): Outcome {
  if (game.winner !== null) return 'winner';
  const p = activePlayer(game);
  if (p !== null && legalMoves(game, p).length === 0) return 'stuck';
  return 'playing';
}

export function snapshot(s: SessionState): SessionSnapshot {
  const game = s.game;
  const view = playerView(game, HUMAN);
  const phase = phaseOf(game);
  const outcome = outcomeOf(game);

  const recruit: LabeledMove[] = [];
  const develop: LabeledMove[] = [];
  const leadership: LabeledMove[] = [];
  let decision: SessionSnapshot['decision'] = null;

  if (phase === 'human') {
    const moves = legalMoves(game, HUMAN);
    if (game.pending !== null) {
      decision = {
        prompt: decisionPrompt(game),
        options: moves.map((move) => ({ move, label: describeMove(game, move) })),
      };
    } else {
      for (const move of moves) {
        const lm: LabeledMove = { move, label: describeMove(game, move) };
        if (move.t === 'recruit') recruit.push(lm);
        else if (move.t === 'develop') develop.push(lm);
        else if (move.t === 'leadership') leadership.push(lm);
      }
    }
  }

  return {
    view,
    phase,
    outcome,
    winner: game.winner,
    actions: { recruit, develop, leadership },
    decision,
  };
}
```

- [ ] **Step 4: Écrire les tests d'abord** — `src/game/__tests__/session.test.ts`

```ts
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
```

- [ ] **Step 5: Lancer les tests de la couche**

Run: `npx jest src/game`
Expected: PASS (7 tests). Ils tournent en Node pur (aucun import React/RN).

- [ ] **Step 6: Vérifier que les tests moteur restent verts**

Run: `npm test`
Expected: PASS (~180 tests moteur + 7 tests couche).

- [ ] **Step 7: Vérifier le typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(game): couche partie pure (session + labels) avec bot auto pour J2 + tests"
```

---

## Task 3: Hook `useGame` + panneaux read-only (rendu depuis `playerView`)

**Files:**
- Create: `src/game/useGame.ts`, `src/components/game/ResourcesPanel.tsx`, `src/components/game/PlanetsPanel.tsx`, `src/components/game/HandPanel.tsx`
- Modify: `src/app/game.tsx`

**Interfaces:**
- Consumes : `initSession`, `snapshot`, `stepBot`, `humanMove`, `replay`, `SessionSnapshot`, `SessionState`, `HUMAN` (Task 2) ; `DEFAULT_CONFIG` (Task 2) ; `PlayerView`, `PLANETS`, `cardOf` (moteur).
- Produces :
  - `type UseGame = { snap: SessionSnapshot; botThinking: boolean; play: (move: Move) => void; replay: () => void }`.
  - `useGame(config, gameSeed, botSeed): UseGame`.
  - `ResourcesPanel({ view })`, `PlanetsPanel({ view })`, `HandPanel({ view })` (read-only ; `HandPanel` gagnera des props interactives en Task 4).

- [ ] **Step 1: Créer le hook `useGame`** — `src/game/useGame.ts`

```tsx
import { useCallback, useEffect, useState } from 'react';

import type { GameConfig, Move } from '../engine';
import {
  humanMove,
  initSession,
  replay,
  snapshot,
  stepBot,
  type SessionSnapshot,
  type SessionState,
} from './session';

const BOT_DELAY_MS = 600;

export type UseGame = {
  snap: SessionSnapshot;
  botThinking: boolean;
  play: (move: Move) => void;
  replay: () => void;
};

export function useGame(config: GameConfig, gameSeed: number, botSeed: number): UseGame {
  const [state, setState] = useState<SessionState>(() => initSession(config, gameSeed, botSeed));
  const snap = snapshot(state);
  const botThinking = snap.phase === 'bot' && snap.outcome === 'playing';

  // Boucle bot : un coup à la fois, temporisé, tant que c'est au bot et que ça joue.
  useEffect(() => {
    if (!(snap.phase === 'bot' && snap.outcome === 'playing')) return;
    const id = setTimeout(() => setState((cur) => stepBot(cur)), BOT_DELAY_MS);
    return () => clearTimeout(id);
  }, [state, snap.phase, snap.outcome]);

  const play = useCallback((move: Move) => setState((cur) => humanMove(cur, move)), []);
  const replayGame = useCallback(() => setState((cur) => replay(cur)), []);

  return { snap, botThinking, play, replay: replayGame };
}
```

- [ ] **Step 2: Créer `ResourcesPanel`** — `src/components/game/ResourcesPanel.tsx`

```tsx
import { Text, View } from 'react-native';

import type { PlayerView } from '../../engine';

export function ResourcesPanel({ view }: { view: PlayerView }) {
  const me = view.players[view.viewer];
  const opp = view.players[view.viewer === 0 ? 1 : 0];
  const leader =
    view.diplomacy.leader === null
      ? '—'
      : view.diplomacy.leader === view.viewer
        ? `Toi (${view.diplomacy.side})`
        : `Adversaire (${view.diplomacy.side})`;

  return (
    <View className="flex-row justify-between bg-slate-800 rounded-2xl p-3">
      <View>
        <Text className="text-amber-300 font-bold">Crédits : {me.credits}</Text>
        <Text className="text-cyan-300 font-bold">Zénithium : {me.zenithium}</Text>
        <Text className="text-slate-400 text-xs mt-1">
          Techno A{me.techMarkers.animod} · H{me.techMarkers.humain} · R{me.techMarkers.robot}
        </Text>
      </View>
      <View className="items-end">
        <Text className="text-slate-300 text-xs">Leader : {leader}</Text>
        <Text className="text-slate-400 text-xs">Pioche : {view.deckCount}</Text>
        <Text className="text-slate-400 text-xs">Main adverse : {opp.handCount ?? 0}</Text>
      </View>
    </View>
  );
}
```

- [ ] **Step 3: Créer `PlanetsPanel`** — `src/components/game/PlanetsPanel.tsx`

```tsx
import { Text, View } from 'react-native';

import { PLANETS, type Planet, type PlayerView } from '../../engine';

const PLANET_FR: Record<Planet, string> = {
  mercure: 'Mercure',
  venus: 'Vénus',
  terra: 'Terra',
  mars: 'Mars',
  jupiter: 'Jupiter',
};

const CENTER = 4;

export function PlanetsPanel({ view }: { view: PlayerView }) {
  return (
    <View className="gap-1">
      <Text className="text-slate-300 font-semibold mb-1">Planètes</Text>
      {PLANETS.map((planet) => {
        const track = view.planets[planet];
        // discPos : 0 = zone du joueur 0 (toi), 8 = zone du joueur 1 (adversaire), 4 = centre.
        const lead = track.discPos === CENTER ? 'neutre' : track.discPos < CENTER ? 'toi' : 'adversaire';
        return (
          <View
            key={planet}
            className="flex-row justify-between items-center bg-slate-800/60 rounded-xl px-3 py-2"
          >
            <Text className="text-white font-medium w-24">{PLANET_FR[planet]}</Text>
            <Text className="text-indigo-300 text-xs">Influence : {lead}</Text>
            <Text className="text-slate-400 text-xs">
              Captures {track.captured[0]}–{track.captured[1]}
            </Text>
            <Text className="text-slate-500 text-xs">{track.bonusToken ? '◈' : '—'}</Text>
          </View>
        );
      })}
    </View>
  );
}
```

- [ ] **Step 4: Créer `HandPanel` (read-only)** — `src/components/game/HandPanel.tsx`

```tsx
import { Text, View } from 'react-native';

import { cardOf, type People, type Planet, type PlayerView } from '../../engine';

const PLANET_FR: Record<Planet, string> = {
  mercure: 'Mercure',
  venus: 'Vénus',
  terra: 'Terra',
  mars: 'Mars',
  jupiter: 'Jupiter',
};

const PEOPLE_FR: Record<People, string> = {
  animod: 'Animods',
  humain: 'Humains',
  robot: 'Robots',
};

export function HandPanel({ view }: { view: PlayerView }) {
  const me = view.players[view.viewer];
  const hand = me.hand ?? [];

  return (
    <View className="gap-1">
      <Text className="text-slate-300 font-semibold mb-1">Ta main ({hand.length})</Text>
      {hand.map((id) => {
        const card = cardOf(id);
        return (
          <View key={id} className="bg-slate-800 rounded-xl px-3 py-2">
            <Text className="text-white font-medium">{card?.name ?? id}</Text>
            <Text className="text-slate-400 text-xs">
              {card ? `${PEOPLE_FR[card.people]} · ${PLANET_FR[card.planet]} · coût ${card.cost}` : ''}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
```

- [ ] **Step 5: Câbler l'écran de jeu sur `useGame`** — remplacer `src/app/game.tsx`

```tsx
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DEFAULT_CONFIG } from '../game/config';
import { useGame } from '../game/useGame';
import { HandPanel } from '../components/game/HandPanel';
import { PlanetsPanel } from '../components/game/PlanetsPanel';
import { ResourcesPanel } from '../components/game/ResourcesPanel';

export default function GameScreen() {
  const [seed] = useState(() => Date.now() % 100000);
  const { snap, botThinking } = useGame(DEFAULT_CONFIG, seed, seed + 7);

  const banner =
    snap.phase === 'over'
      ? 'Partie terminée'
      : botThinking
        ? 'Le bot réfléchit…'
        : snap.decision !== null
          ? 'À toi de décider'
          : snap.phase === 'human'
            ? 'À toi de jouer'
            : "Tour de l'adversaire";

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View className="flex-1 bg-slate-950">
        <ScrollView className="flex-1 px-3">
          <View className="gap-3 py-3">
            <Text className="text-white text-xl font-bold">Zenith</Text>
            <Text className="text-indigo-300">{banner}</Text>
            <ResourcesPanel view={snap.view} />
            <PlanetsPanel view={snap.view} />
            <HandPanel view={snap.view} />
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
```

- [ ] **Step 6: Vérifier le typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 7: Vérifier que rien n'est cassé côté tests**

Run: `npm test`
Expected: PASS (moteur + couche).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(ui): hook useGame + panneaux read-only rendus depuis playerView"
```

---

## Task 4: Actions principales (recruit / develop / leadership) via feuille custom

**Files:**
- Create: `src/components/ui/Sheet.tsx`, `src/components/ui/ActionButton.tsx`, `src/components/game/CardActionSheet.tsx`
- Modify: `src/components/game/HandPanel.tsx`, `src/app/game.tsx`

**Interfaces:**
- Consumes : `LabeledMove` (Task 2) ; `Move`, `cardOf` (moteur) ; `useGame().play` (Task 3).
- Produces :
  - `Sheet({ visible, onClose?, children })` — feuille modale bas d'écran réutilisable (aucun `Alert` natif).
  - `ActionButton({ label, onPress, tone?, disabled? })`.
  - `CardActionSheet({ title, options, onChoose, onClose })`.
  - `HandPanel` gagne `onSelectCard?: (id: string) => void` et `disabled?: boolean`.

- [ ] **Step 1: Créer la feuille modale `Sheet`** — `src/components/ui/Sheet.tsx`

```tsx
import type { ReactNode } from 'react';
import { Modal, Pressable, View } from 'react-native';

export function Sheet({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose?: () => void;
  children: ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/50 justify-end" onPress={onClose}>
        {/* Pressable interne : absorbe le tap pour ne pas fermer en cliquant le contenu. */}
        <Pressable className="bg-slate-900 rounded-t-3xl p-5 pb-8" onPress={() => undefined}>
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
```

- [ ] **Step 2: Créer `ActionButton`** — `src/components/ui/ActionButton.tsx`

```tsx
import { Pressable, Text } from 'react-native';

export function ActionButton({
  label,
  onPress,
  tone = 'default',
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  tone?: 'default' | 'primary';
  disabled?: boolean;
}) {
  const bg = tone === 'primary' ? 'bg-indigo-600' : 'bg-slate-700';
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      className={`${bg} ${disabled ? 'opacity-40' : ''} rounded-xl px-4 py-3 my-1`}
    >
      <Text className="text-white text-center font-medium">{label}</Text>
    </Pressable>
  );
}
```

- [ ] **Step 3: Créer `CardActionSheet`** — `src/components/game/CardActionSheet.tsx`

```tsx
import { ScrollView, Text, View } from 'react-native';

import type { Move } from '../../engine';
import type { LabeledMove } from '../../game/session';
import { ActionButton } from '../ui/ActionButton';
import { Sheet } from '../ui/Sheet';

export function CardActionSheet({
  title,
  options,
  onChoose,
  onClose,
}: {
  title: string | null;
  options: LabeledMove[];
  onChoose: (move: Move) => void;
  onClose: () => void;
}) {
  return (
    <Sheet visible={title !== null} onClose={onClose}>
      {title !== null ? (
        <View>
          <Text className="text-white text-lg font-bold mb-3">{title}</Text>
          <ScrollView className="max-h-96">
            {options.length === 0 ? (
              <Text className="text-slate-400">Aucune action possible avec cette carte.</Text>
            ) : null}
            {options.map((opt, i) => (
              <ActionButton
                key={`${opt.move.t}-${i}`}
                label={opt.label}
                onPress={() => {
                  onChoose(opt.move);
                  onClose();
                }}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}
    </Sheet>
  );
}
```

- [ ] **Step 4: Rendre `HandPanel` interactif** — remplacer `src/components/game/HandPanel.tsx`

```tsx
import { Pressable, Text, View } from 'react-native';

import { cardOf, type People, type Planet, type PlayerView } from '../../engine';

const PLANET_FR: Record<Planet, string> = {
  mercure: 'Mercure',
  venus: 'Vénus',
  terra: 'Terra',
  mars: 'Mars',
  jupiter: 'Jupiter',
};

const PEOPLE_FR: Record<People, string> = {
  animod: 'Animods',
  humain: 'Humains',
  robot: 'Robots',
};

export function HandPanel({
  view,
  onSelectCard,
  disabled = false,
}: {
  view: PlayerView;
  onSelectCard?: (id: string) => void;
  disabled?: boolean;
}) {
  const me = view.players[view.viewer];
  const hand = me.hand ?? [];

  return (
    <View className="gap-1">
      <Text className="text-slate-300 font-semibold mb-1">Ta main ({hand.length})</Text>
      {hand.map((id) => {
        const card = cardOf(id);
        return (
          <Pressable
            key={id}
            disabled={disabled || onSelectCard === undefined}
            onPress={() => onSelectCard?.(id)}
            className={`bg-slate-800 rounded-xl px-3 py-2 ${disabled ? 'opacity-50' : ''}`}
          >
            <Text className="text-white font-medium">{card?.name ?? id}</Text>
            <Text className="text-slate-400 text-xs">
              {card ? `${PEOPLE_FR[card.people]} · ${PLANET_FR[card.planet]} · coût ${card.cost}` : ''}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
```

- [ ] **Step 5: Câbler la sélection de carte dans l'écran** — remplacer `src/app/game.tsx`

```tsx
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { cardOf, type Move } from '../engine';
import { DEFAULT_CONFIG } from '../game/config';
import type { LabeledMove, SessionSnapshot } from '../game/session';
import { useGame } from '../game/useGame';
import { CardActionSheet } from '../components/game/CardActionSheet';
import { HandPanel } from '../components/game/HandPanel';
import { PlanetsPanel } from '../components/game/PlanetsPanel';
import { ResourcesPanel } from '../components/game/ResourcesPanel';

function actionsForCard(snap: SessionSnapshot, cardId: string): LabeledMove[] {
  const all = [...snap.actions.recruit, ...snap.actions.develop, ...snap.actions.leadership];
  return all.filter((lm) => 'cardId' in lm.move && lm.move.cardId === cardId);
}

export default function GameScreen() {
  const [seed] = useState(() => Date.now() % 100000);
  const { snap, botThinking, play } = useGame(DEFAULT_CONFIG, seed, seed + 7);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);

  const canAct = snap.phase === 'human' && snap.decision === null;
  const options = selectedCard === null ? [] : actionsForCard(snap, selectedCard);

  const banner =
    snap.phase === 'over'
      ? 'Partie terminée'
      : botThinking
        ? 'Le bot réfléchit…'
        : snap.decision !== null
          ? 'À toi de décider'
          : snap.phase === 'human'
            ? 'À toi de jouer'
            : "Tour de l'adversaire";

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View className="flex-1 bg-slate-950">
        <ScrollView className="flex-1 px-3">
          <View className="gap-3 py-3">
            <Text className="text-white text-xl font-bold">Zenith</Text>
            <Text className="text-indigo-300">{banner}</Text>
            <ResourcesPanel view={snap.view} />
            <PlanetsPanel view={snap.view} />
            <HandPanel
              view={snap.view}
              disabled={!canAct}
              onSelectCard={canAct ? setSelectedCard : undefined}
            />
          </View>
        </ScrollView>

        <CardActionSheet
          title={selectedCard === null ? null : (cardOf(selectedCard)?.name ?? selectedCard)}
          options={options}
          onChoose={(m: Move) => play(m)}
          onClose={() => setSelectedCard(null)}
        />
      </View>
    </SafeAreaView>
  );
}
```

- [ ] **Step 6: Vérifier le typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(ui): actions recruit/develop/leadership via feuille de carte custom"
```

---

## Task 5: Zone de décision interactive (toutes les `PendingDecision`)

**Files:**
- Create: `src/components/game/DecisionSheet.tsx`
- Modify: `src/app/game.tsx`

**Interfaces:**
- Consumes : `LabeledMove` (Task 2) ; `Move` (moteur) ; `Sheet`, `ActionButton` (Task 4) ; `snap.decision` (Task 2, déjà rempli pour toutes les `pending` : `choosePlanet`, `moveDiscToCenter`, `chooseSegment`, `chooseColumn`, `confirmOptional`, `chooseOption`, `chooseTier`, `chooseTech`, `chooseHandCard`, `chooseBoardToken`).
- Produces : `DecisionSheet({ decision, onChoose })`.

> La zone de décision est **entièrement pilotée par `legalMoves`** : `snap.decision.options` contient déjà exactement les `Move` légaux (`decide`/`choose`/`skip`/`decideTech`/`decideCard`) avec leur libellé. Aucune règle n'est ré-implémentée dans le composant.

- [ ] **Step 1: Créer `DecisionSheet`** — `src/components/game/DecisionSheet.tsx`

```tsx
import { ScrollView, Text, View } from 'react-native';

import type { Move } from '../../engine';
import type { LabeledMove } from '../../game/session';
import { ActionButton } from '../ui/ActionButton';
import { Sheet } from '../ui/Sheet';

export function DecisionSheet({
  decision,
  onChoose,
}: {
  decision: { prompt: string; options: LabeledMove[] } | null;
  onChoose: (move: Move) => void;
}) {
  return (
    <Sheet visible={decision !== null}>
      {decision !== null ? (
        <View>
          <Text className="text-white text-lg font-bold mb-3">{decision.prompt}</Text>
          <ScrollView className="max-h-96">
            {decision.options.map((opt, i) => (
              <ActionButton
                key={`${opt.move.t}-${i}`}
                label={opt.label}
                tone="primary"
                onPress={() => onChoose(opt.move)}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}
    </Sheet>
  );
}
```

> Pas de `onClose` : une décision en attente est **obligatoire** (le joueur doit choisir une option ou « Passer » quand `skip` est un coup légal), on ne ferme donc pas la feuille par tap extérieur.

- [ ] **Step 2: Monter `DecisionSheet` dans l'écran** — modifier `src/app/game.tsx`

Ajouter l'import en tête de fichier :

```tsx
import { DecisionSheet } from '../components/game/DecisionSheet';
```

Puis, juste **après** `<CardActionSheet … />` (avant la fermeture `</View>` du conteneur `flex-1 bg-slate-950`), insérer :

```tsx
        <DecisionSheet decision={snap.decision} onChoose={(m: Move) => play(m)} />
```

- [ ] **Step 3: Vérifier le typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(ui): zone de décision interactive custom pour toutes les PendingDecision"
```

---

## Task 6: Fin de partie + rejouer

**Files:**
- Create: `src/components/game/GameOverSheet.tsx`
- Modify: `src/app/game.tsx`

**Interfaces:**
- Consumes : `Outcome` (Task 2), `PlayerIndex` (moteur) ; `Sheet`, `ActionButton` (Task 4) ; `useGame().replay` (Task 3) ; `snap.outcome`/`snap.winner`/`snap.view.viewer` (Task 2).
- Produces : `GameOverSheet({ outcome, winner, viewer, onReplay })`.

- [ ] **Step 1: Créer `GameOverSheet`** — `src/components/game/GameOverSheet.tsx`

```tsx
import { Text, View } from 'react-native';

import type { PlayerIndex } from '../../engine';
import type { Outcome } from '../../game/session';
import { ActionButton } from '../ui/ActionButton';
import { Sheet } from '../ui/Sheet';

export function GameOverSheet({
  outcome,
  winner,
  viewer,
  onReplay,
}: {
  outcome: Outcome;
  winner: PlayerIndex | null;
  viewer: PlayerIndex;
  onReplay: () => void;
}) {
  const visible = outcome === 'winner' || outcome === 'stuck';
  const title =
    outcome === 'stuck' ? 'Partie bloquée' : winner === viewer ? 'Victoire !' : 'Défaite';
  const subtitle =
    outcome === 'stuck'
      ? 'Plus aucun coup possible.'
      : winner === viewer
        ? 'Tu remportes la partie.'
        : 'Le bot remporte la partie.';

  return (
    <Sheet visible={visible}>
      <View className="items-center">
        <Text className="text-white text-2xl font-bold mb-2">{title}</Text>
        <Text className="text-slate-400 mb-4">{subtitle}</Text>
        <View className="w-full">
          <ActionButton label="Rejouer" tone="primary" onPress={onReplay} />
        </View>
      </View>
    </Sheet>
  );
}
```

- [ ] **Step 2: Monter `GameOverSheet` + réinitialiser la sélection au replay** — modifier `src/app/game.tsx`

Ajouter l'import en tête de fichier :

```tsx
import { GameOverSheet } from '../components/game/GameOverSheet';
```

Récupérer `replay` depuis `useGame` (modifier la déstructuration) :

```tsx
  const { snap, botThinking, play, replay } = useGame(DEFAULT_CONFIG, seed, seed + 7);
```

Puis, juste **après** `<DecisionSheet … />`, insérer :

```tsx
        <GameOverSheet
          outcome={snap.outcome}
          winner={snap.winner}
          viewer={snap.view.viewer}
          onReplay={() => {
            setSelectedCard(null);
            replay();
          }}
        />
```

- [ ] **Step 3: Vérifier le typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Vérifier l'ensemble des tests**

Run: `npm test`
Expected: PASS (moteur + couche).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(ui): écran de fin de partie + rejouer (1er joueur inversé)"
```

---

## Hors périmètre (plans ultérieurs)

- Transport 2-téléphones / multijoueur en réseau (phase 3).
- Polish visuel avancé, animations, transitions de plateau, sons.
- Internationalisation (les libellés sont en dur en français).
- Persistance de la partie (reprise après fermeture), sauvegardes, historique.
- Configuration par l'utilisateur des faces techno (`TechSetup`) et du premier joueur avant la partie (valeurs par défaut fixées dans `DEFAULT_CONFIG` pour cette tranche).
- Tests de composants React Native / rendu (`react-test-renderer`, `@testing-library/react-native`) : non ajoutés ici pour ne pas introduire de second runner `jest-expo` et garder les 180 tests moteur intacts ; l'UI est validée par `npm run typecheck`. À réévaluer en phase 3.
- Publication store / EAS / OTA updates.

---

## Self-Review

**1. Couverture du périmètre**
- Scaffold Expo cohabitant avec le moteur → **T1** (split `tsconfig.json` / `tsconfig.jest.json`, jest ts-jest inchangé, page « hello » qui typecheck).
- Couche `useGame` (état + `applyMove` + bot auto J2 + sélecteurs `playerView`/`legalMoves`) + tests sans RN → **T2** (couche pure `session.ts` testée en Node) et **T3** (hook React mince avec temporisation bot).
- Affichage read-only (planètes / main / ressources) depuis `playerView` → **T3**.
- Actions recruit/develop/leadership mappées depuis `legalMoves`→`applyMove` → **T4**.
- Zone de décision interactive pour **toutes** les `PendingDecision` → **T5** (les 10 `kind` sont couverts par `decisionPrompt`/`describeMove` en T2 et rendus génériquement).
- Fin de partie + rejouer (1er joueur inversé) → **T6** (+ `replay` en T2).

**2. L'app reste-t-elle lançable / typecheck ?**
- Scaffold conventionnel calqué sur Padelario (mêmes versions, même `babel`/`metro`/`nativewind`), aucune config exotique ; `typedRoutes` désactivé pour que `npm run typecheck` passe **sans** avoir lancé `expo start`.
- Chaque tâche se termine par `npm run typecheck` (et `npm test` là où c'est pertinent). L'entrée `expo-router/entry`, `app.json`, `src/app/_layout.tsx` et deux routes (`index`, `game`) rendent l'app lançable par l'utilisateur via `expo start`.

**3. Rendu depuis `playerView` uniquement**
- Les composants ne reçoivent que `snap.view` (`PlayerView`) et des `LabeledMove` déjà calculés. Aucun composant n'importe `GameState` ni ne lit `resolution`/`deck`/`rng`. Le test « la vue ne divulgue jamais la main adverse » (T2) verrouille l'invariant. La description des paliers/options est faite dans `src/game` (état brut, décision du joueur humain lui-même) — pas une fuite d'info adverse.

**4. Pas d'`Alert` natif**
- Toutes les interactions passent par `Sheet` (Modal custom) : `CardActionSheet` (T4), `DecisionSheet` (T5), `GameOverSheet` (T6), plus `Toast` custom (T1). Aucun `Alert.alert` dans le plan.

**5. Non-régression moteur**
- `tsconfig.jest.json` reproduit à l'identique l'ancien `tsconfig.json` du moteur (CommonJS/Node/`noUncheckedIndexedAccess`) ; `jest.config.js` pointe ts-jest dessus ; `roots` inchangé. Les tests moteur tournent exactement comme avant. Étapes `npm test` en T1/T2/T3/T6 le vérifient.

**6. Cohérence des types**
- `SessionSnapshot`/`LabeledMove`/`Phase`/`Outcome` définis en T2 et consommés tels quels en T3–T6. `useGame` (T3) renvoie `{ snap, botThinking, play, replay }`, tous utilisés par `game.tsx`. `HandPanel` évolue de read-only (T3) à interactif (`onSelectCard`/`disabled`, T4) — la version T4 remplace intégralement le fichier. Imports de la couche `src/game` en **relatif** (`../engine`) pour rester compatibles ts-jest.


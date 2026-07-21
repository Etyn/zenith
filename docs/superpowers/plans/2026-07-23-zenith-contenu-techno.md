# Contenu Technologie réel (30 faces) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer les fixtures techno placeholder (`FIXTURE_TECH`, `credits 1` partout) par le contenu RÉEL confirmé des 30 faces (6 colonnes × 5 niveaux) et adapter les tests qui en dépendent.

**Architecture:** Le catalogue technologie vit dans `src/data/tech.ts` sous forme de données pures (`TechCatalog`). On ajoute d'abord le vrai catalogue `TECH` (transcription littérale de la spec figée) sans changer le défaut (Tâche 1), puis on bascule le défaut de `activeFace(...)` sur `TECH`, on supprime les fixtures, et on adapte les tests `develop` cassés (Tâche 2). Les effets utilisent exclusivement des atomes déjà présents dans l'union `Effect` (`src/engine/types.ts`) — aucun nouvel atome, aucun effet inventé.

**Tech Stack:** TypeScript pur (moteur `src/engine`, données `src/data`), Jest + ts-jest. Scripts : `npm test` (jest), `npm run typecheck` (`tsc --noEmit`).

## Global Constraints

- **Moteur pur** : aucun import `react` / `react-native` / `expo` / `net` dans `src/engine` ni `src/data` (garde-fou : `src/engine/__tests__/purity.test.ts`).
- **Immuabilité** : `applyMove` / `resolve` / `decide` ne mutent jamais l'état d'entrée (assertions de pureté dans `sim.test.ts`).
- **Déterminisme** : mêmes graines → même partie ; toute décision interactive passe par `applyMove {t:'decide',planet}`.
- **TDD** : test qui échoue d'abord, puis implémentation minimale, puis run, puis commit. Code complet à chaque étape (jamais de placeholder).
- **Contenu RÉEL, transcription LITTÉRALE** du catalogue figé (`docs/content/technologies.md` → « ✅ CATALOGUE CONFIRMÉ → ATOMES »). **Ne rien réinterpréter, aucun effet inventé.**
- **Coût pour atteindre le niveau N = N Zénithium** (1/2/3/4/5), identique partout → `levels[n-1].zenithium === n`.
- **Les atomes existent déjà** dans l'union `Effect` : `credits`, `zenithium`, `steal`, `influence` (`on:'choice'`), `influenceNeighbors`, `influenceEach`, `influenceDifferent`, `transfer`, `exile`, `exileForInfluence`, `mobilize`, `takeLeader`, `bonusToken`. **Ne pas en créer.**
- **Ne pas casser les suites non concernées** : `sim`, `sim-properties`, `purity`, `setup`, `effects`, `influence`, `bot`, `smoke`, `fixtures`, `tokens` doivent rester vertes ; `npm run typecheck` doit passer.
- **NE PAS committer/pusher hors des étapes « Commit » décrites** (le donneur d'ordre gère l'intégration).

---

## File Structure

- **Modify** `src/data/tech.ts` — ajoute la constante `TECH: TechCatalog` (Tâche 1) ; bascule le défaut de `activeFace` sur `TECH`, supprime `FIXTURE_TECH`, `fixtureFace`, `FIXTURE_TECH_NON_CANONICAL` (Tâche 2). Les types `TechLevel`/`TechFace`/`TechCatalog` restent inchangés.
- **Create** `src/data/__tests__/tech.test.ts` — vérifie la transcription : faces clés (S4, N3, D3, P2, P4), tous les L5 = influence choice 2, coûts 1..5 sur toutes les faces, présence des 6 faces (Tâche 1).
- **Modify** `src/engine/__tests__/moves.test.ts` — adapte les tests `develop` dont le résultat dépendait du contenu fixture (Tâche 2) : `develop : défausse...`, `develop niveau 2 : ...prend le jeton`, `develop niveau 2 : ...emplacement vide`, et met à jour les commentaires de `prime de ligne niveau 1` et `develop vers niveau 3+`.

**Fichiers volontairement NON touchés** (vérifié par lecture) : `src/engine/moves.ts` (appelle déjà `activeFace(...)` sur le catalogue par défaut — la bascule suffit), `src/engine/effects.ts`, `src/engine/sim.ts`, `src/engine/bot.ts` (le bot pilote les `pending` via `legalMoves`), `src/data/tokens.ts`, `src/data/fixtures.ts`, et les tests `sim*`, `purity`, `setup`, `effects`, `influence`, `bot`, `smoke`.

---

## Task 1: Ajouter le catalogue réel `TECH` (sans changer le défaut)

**Files:**
- Modify: `src/data/tech.ts` (ajout de la constante `TECH` après `FIXTURE_TECH`, sans rien supprimer)
- Test: `src/data/__tests__/tech.test.ts` (create)

**Interfaces:**
- Consumes (déjà présents dans `src/data/tech.ts` / `src/engine/types.ts`) :
  - `type TechLevel = { zenithium: number; effects: Effect[] }`
  - `type TechFace = { levels: TechLevel[] }`
  - `type TechCatalog = { animod: { S: TechFace; D: TechFace }; humain: { O: TechFace; U: TechFace }; robot: { N: TechFace; P: TechFace } }`
  - `function activeFace(people: People, setup: TechSetup, catalog?: TechCatalog): TechFace`
  - Union `Effect` (cf. `src/engine/types.ts`).
- Produces (nouveau) :
  - `export const TECH: TechCatalog` — le catalogue RÉEL confirmé des 6 faces (S, U, N, D, O, P), 5 niveaux chacune, coût `zenithium = n` au niveau `n`.

- [ ] **Step 1: Écrire le test qui échoue** — `src/data/__tests__/tech.test.ts`

```ts
import { TECH, activeFace } from '../tech';
import type { TechFace } from '../tech';
import type { Effect } from '../../engine/types';

// Helper : effets d'un niveau (1-indexé) d'une face.
function fx(face: TechFace, level: number): Effect[] {
  return face.levels[level - 1]!.effects;
}

test('coûts : chaque face a 5 niveaux de coût 1..5', () => {
  const faces: TechFace[] = [TECH.animod.S, TECH.animod.D, TECH.humain.O, TECH.humain.U, TECH.robot.N, TECH.robot.P];
  for (const face of faces) {
    expect(face.levels.map((l) => l.zenithium)).toEqual([1, 2, 3, 4, 5]);
  }
});

test('les 6 faces sont présentes et distinctes des slots de config', () => {
  expect(TECH.animod.S).toBeDefined();
  expect(TECH.animod.D).toBeDefined();
  expect(TECH.humain.O).toBeDefined();
  expect(TECH.humain.U).toBeDefined();
  expect(TECH.robot.N).toBeDefined();
  expect(TECH.robot.P).toBeDefined();
  // activeFace lit bien la face de la config
  const setup = { animod: 'S', humain: 'U', robot: 'N' } as const;
  expect(activeFace('animod', setup, TECH)).toBe(TECH.animod.S);
  expect(activeFace('humain', setup, TECH)).toBe(TECH.humain.U);
  expect(activeFace('robot', setup, TECH)).toBe(TECH.robot.N);
});

test('tous les niveaux 5 = 1 influence au choix de valeur 2 (planète grise, double flèche)', () => {
  const faces: TechFace[] = [TECH.animod.S, TECH.animod.D, TECH.humain.O, TECH.humain.U, TECH.robot.N, TECH.robot.P];
  for (const face of faces) {
    expect(fx(face, 5)).toEqual([{ k: 'influence', on: 'choice', amount: 2 }]);
  }
});

test('S — Animod : contenu littéral confirmé', () => {
  expect(fx(TECH.animod.S, 1)).toEqual([{ k: 'credits', amount: 2, target: 'self' }]);
  expect(fx(TECH.animod.S, 2)).toEqual([{ k: 'influenceNeighbors', count: 2, amount: 1 }]);
  expect(fx(TECH.animod.S, 3)).toEqual([{ k: 'transfer', count: 3 }]);
  expect(fx(TECH.animod.S, 4)).toEqual([{ k: 'mobilize', count: 3, thenInfluence: true }]);
});

test('U — Humain : contenu littéral confirmé', () => {
  expect(fx(TECH.humain.U, 1)).toEqual([{ k: 'influence', on: 'choice', amount: 1 }]);
  expect(fx(TECH.humain.U, 2)).toEqual([{ k: 'mobilize', count: 2, thenInfluence: false }]);
  expect(fx(TECH.humain.U, 3)).toEqual([{ k: 'steal', resource: 'credits', amount: 3 }]);
  expect(fx(TECH.humain.U, 4)).toEqual([{ k: 'influenceNeighbors', count: 3, amount: 1 }]);
});

test('N — Robot : contenu littéral confirmé (N3 = influence choice 2 + influenceDifferent 1)', () => {
  expect(fx(TECH.robot.N, 1)).toEqual([{ k: 'transfer', count: 1 }]);
  expect(fx(TECH.robot.N, 2)).toEqual([{ k: 'takeLeader', side: 'silver' }]);
  expect(fx(TECH.robot.N, 3)).toEqual([
    { k: 'influence', on: 'choice', amount: 2 },
    { k: 'influenceDifferent', amount: 1 },
  ]);
  expect(fx(TECH.robot.N, 4)).toEqual([{ k: 'credits', amount: 20, target: 'self' }]);
});

test('D — Animod : contenu littéral confirmé (D3 = influence choice 1 PUIS bonusToken)', () => {
  expect(fx(TECH.animod.D, 1)).toEqual([{ k: 'exile', side: 'opponent', count: 1 }]);
  expect(fx(TECH.animod.D, 2)).toEqual([{ k: 'credits', amount: 5, target: 'self' }]);
  expect(fx(TECH.animod.D, 3)).toEqual([{ k: 'influence', on: 'choice', amount: 1 }, { k: 'bonusToken' }]);
  expect(fx(TECH.animod.D, 4)).toEqual([{ k: 'influenceEach', amount: 1 }]);
});

test('O — Humain : contenu littéral confirmé', () => {
  expect(fx(TECH.humain.O, 1)).toEqual([{ k: 'bonusToken' }]);
  expect(fx(TECH.humain.O, 2)).toEqual([{ k: 'steal', resource: 'zenithium', amount: 1 }]);
  expect(fx(TECH.humain.O, 3)).toEqual([{ k: 'mobilize', count: 3, thenInfluence: false }]);
  expect(fx(TECH.humain.O, 4)).toEqual([{ k: 'influenceNeighbors', count: 2, amount: 2 }]);
});

test('P — Robot : contenu littéral confirmé (P2 ordre mobilize→transfer→exile ; P4 exileForInfluence 2/2)', () => {
  expect(fx(TECH.robot.P, 1)).toEqual([{ k: 'mobilize', count: 1, thenInfluence: false }]);
  expect(fx(TECH.robot.P, 2)).toEqual([
    { k: 'mobilize', count: 1, thenInfluence: false },
    { k: 'transfer', count: 1 },
    { k: 'exile', side: 'opponent', count: 1 },
  ]);
  expect(fx(TECH.robot.P, 3)).toEqual([{ k: 'credits', amount: 10, target: 'self' }]);
  expect(fx(TECH.robot.P, 4)).toEqual([{ k: 'exileForInfluence', count: 2, amount: 2 }]);
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx jest src/data/__tests__/tech.test.ts`
Expected: FAIL — `TECH` n'existe pas encore dans `../tech` (erreur d'import / `TECH is not defined`).

- [ ] **Step 3: Implémenter — ajouter la constante `TECH`**

Ajouter dans `src/data/tech.ts`, **après** la définition de `FIXTURE_TECH` (ligne ~32) et **avant** `export function activeFace(...)`. Ne rien supprimer à cette étape.

```ts
/**
 * Catalogue RÉEL confirmé des 30 faces Technologie (docs/content/technologies.md →
 * « ✅ CATALOGUE CONFIRMÉ → ATOMES », 2026-07-22). Transcription LITTÉRALE, aucun effet inventé.
 * Coût pour atteindre le niveau N = N Zénithium. Effets cumulés N→…→1 (géré par le moteur).
 * Le jeton d'emplacement niveau 2 est géré par l'infra (`techBonus`), hors effets de face.
 */
export const TECH: TechCatalog = {
  animod: {
    // S — Animod (config S.U.N.)
    S: {
      levels: [
        { zenithium: 1, effects: [{ k: 'credits', amount: 2, target: 'self' }] },
        { zenithium: 2, effects: [{ k: 'influenceNeighbors', count: 2, amount: 1 }] },
        { zenithium: 3, effects: [{ k: 'transfer', count: 3 }] },
        { zenithium: 4, effects: [{ k: 'mobilize', count: 3, thenInfluence: true }] },
        { zenithium: 5, effects: [{ k: 'influence', on: 'choice', amount: 2 }] },
      ],
    },
    // D — Animod (config D.O.P.)
    D: {
      levels: [
        { zenithium: 1, effects: [{ k: 'exile', side: 'opponent', count: 1 }] },
        { zenithium: 2, effects: [{ k: 'credits', amount: 5, target: 'self' }] },
        // L3 : influence PUIS jeton bonus (ordre significatif).
        { zenithium: 3, effects: [{ k: 'influence', on: 'choice', amount: 1 }, { k: 'bonusToken' }] },
        { zenithium: 4, effects: [{ k: 'influenceEach', amount: 1 }] },
        { zenithium: 5, effects: [{ k: 'influence', on: 'choice', amount: 2 }] },
      ],
    },
  },
  humain: {
    // O — Humain (config D.O.P.)
    O: {
      levels: [
        { zenithium: 1, effects: [{ k: 'bonusToken' }] },
        { zenithium: 2, effects: [{ k: 'steal', resource: 'zenithium', amount: 1 }] },
        { zenithium: 3, effects: [{ k: 'mobilize', count: 3, thenInfluence: false }] },
        { zenithium: 4, effects: [{ k: 'influenceNeighbors', count: 2, amount: 2 }] },
        { zenithium: 5, effects: [{ k: 'influence', on: 'choice', amount: 2 }] },
      ],
    },
    // U — Humain (config S.U.N.)
    U: {
      levels: [
        { zenithium: 1, effects: [{ k: 'influence', on: 'choice', amount: 1 }] },
        { zenithium: 2, effects: [{ k: 'mobilize', count: 2, thenInfluence: false }] },
        { zenithium: 3, effects: [{ k: 'steal', resource: 'credits', amount: 3 }] },
        { zenithium: 4, effects: [{ k: 'influenceNeighbors', count: 3, amount: 1 }] },
        { zenithium: 5, effects: [{ k: 'influence', on: 'choice', amount: 2 }] },
      ],
    },
  },
  robot: {
    // N — Robot (config S.U.N.)
    N: {
      levels: [
        { zenithium: 1, effects: [{ k: 'transfer', count: 1 }] },
        { zenithium: 2, effects: [{ k: 'takeLeader', side: 'silver' }] },
        // L3 : 2 influences sur une même planète au choix + 1 sur une planète différente.
        { zenithium: 3, effects: [{ k: 'influence', on: 'choice', amount: 2 }, { k: 'influenceDifferent', amount: 1 }] },
        { zenithium: 4, effects: [{ k: 'credits', amount: 20, target: 'self' }] },
        { zenithium: 5, effects: [{ k: 'influence', on: 'choice', amount: 2 }] },
      ],
    },
    // P — Robot (config D.O.P.)
    P: {
      levels: [
        { zenithium: 1, effects: [{ k: 'mobilize', count: 1, thenInfluence: false }] },
        // L2 : dans cet ordre — mobiliser 1, transférer 1, exiler 1 chez l'adversaire.
        {
          zenithium: 2,
          effects: [
            { k: 'mobilize', count: 1, thenInfluence: false },
            { k: 'transfer', count: 1 },
            { k: 'exile', side: 'opponent', count: 1 },
          ],
        },
        { zenithium: 3, effects: [{ k: 'credits', amount: 10, target: 'self' }] },
        // L4 : exiler 2 cartes de couleurs différentes chez soi, +2 influence par couleur exilée.
        { zenithium: 4, effects: [{ k: 'exileForInfluence', count: 2, amount: 2 }] },
        { zenithium: 5, effects: [{ k: 'influence', on: 'choice', amount: 2 }] },
      ],
    },
  },
};
```

- [ ] **Step 4: Lancer le test pour vérifier qu'il passe**

Run: `npx jest src/data/__tests__/tech.test.ts`
Expected: PASS (8 tests verts).

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: aucune erreur (le catalogue respecte l'union `Effect` et `TechCatalog`).

- [ ] **Step 6: Commit**

```bash
git add src/data/tech.ts src/data/__tests__/tech.test.ts
git commit -m "feat(tech): ajoute le catalogue reel TECH (30 faces, transcription litterale)"
```

---

## Task 2: Basculer le défaut sur `TECH`, supprimer les fixtures, adapter les tests `develop`

**Contexte mécanique (à connaître avant d'éditer).** `src/engine/moves.ts` (`develop`) appelle `activeFace(move.people, state.config.techSetup)` **sans passer de catalogue** → il utilise le catalogue par DÉFAUT. Basculer ce défaut sur `TECH` suffit à faire jouer tout le moteur (et le self-play) sur le vrai contenu ; **aucune modification de `moves.ts` n'est nécessaire.**

Le fixture actuel (`credits 1` partout) était choisi pour que `develop` **termine toujours sans `pending`**. Avec le contenu réel, développer crée souvent une décision `pending` (influence choix, transfer/exile/mobilize/bonusToken). Trois tests de `moves.test.ts` asseyaient leurs assertions sur les effets fixture (`credits 1`/`credits +1 par niveau`) et cassent ; deux autres restent verts mais leur commentaire devient faux. Stratégie retenue, test par test (voir chaque étape) :

- **`develop : défausse la carte…`** — on épingle une carte **animod** (`FIX_mercure_0`). Face S niveau 1 = `[credits 2]`, **non interactif** → la résolution se termine, le tour se clôt. Scénario déterministe qui isole la mécanique (défausse, coût, marqueur, fin de tour) sans dépendre d'un effet interactif. La carte du départ n'est plus `hand[0]` (dont le peuple variait avec la donne).
- **`develop niveau 2 : …prend le jeton`** — face N (robot) : L2 = `[takeLeader silver]`, L1 = `[transfer 1]`. `transfer` cible l'adversaire **sans colonne au départ → ignoré (skip sans pending)** (cf. `effects.ts` `hasEligibleColumn`). On remplace l'assertion `credits` (spécifique au fixture) par la preuve réelle de l'intercalage du jeton : `zénithium = 8 − 2 + 1`, plus `diplomacy.leader === 0` (L2 appliqué) et fin de tour. Déterministe.
- **`develop niveau 2 : …emplacement vide`** — même face N, sans jeton : `zénithium = 8 − 2`, pas de jeton en défausse. On retire l'assertion `credits` fixture.
- **`prime de ligne niveau 1`** — reste **vert** (l'`influence 'choice'` de la prime crée toujours le `pending`, `transfer` L1 étant ignoré) : **commentaire seul** mis à jour.
- **`develop vers niveau 3+`** — reste **vert** : le coût est déduit avant la résolution ; le jeton n'est pas déclenché (`newLevel === 3`). L3 pose désormais un `pending` (influence choice 2) qui n'affecte pas les champs assertés (`zenithium`, `techBonus`, `bonusDiscard`) : **commentaire seul** mis à jour.

On **ne pilote aucune décision** ici : tous les scénarios adaptés sont choisis pour se résoudre sans `pending` (effets non interactifs, ou `transfer` ignoré adversaire vide), ce qui isole la mécanique testée sans tautologie. Le pilotage d'une décision interactive (`applyMove {t:'decide'}`) est déjà couvert par les tests existants `applyMove enchaîne un decide de chooseColumn (exile)…` (inchangés).

**Files:**
- Modify: `src/data/tech.ts` (défaut `activeFace` → `TECH` ; suppression de `FIXTURE_TECH`, `fixtureFace`, `FIXTURE_TECH_NON_CANONICAL`)
- Modify: `src/engine/__tests__/moves.test.ts` (3 tests adaptés + 2 commentaires)

**Interfaces:**
- Consumes : `export const TECH: TechCatalog` (Tâche 1) ; `activeFace(people, setup, catalog?)` ; `cardOf(id)` de `../effects` ; mapping fixtures (`FIX_mercure_0` = animod, `FIX_terra_0` = robot, `FIX_venus_1` = robot — cf. `src/data/fixtures.ts`).
- Produces : `activeFace(people, setup)` renvoie désormais une face de `TECH` par défaut. `FIXTURE_TECH` / `fixtureFace` / `FIXTURE_TECH_NON_CANONICAL` **n'existent plus**.

- [ ] **Step 1: Adapter les tests `develop` cassés (écrire les nouvelles assertions)** — `src/engine/__tests__/moves.test.ts`

Remplacer le test `develop : défausse la carte, paie le coût du niveau, avance le marqueur` (actuellement ~L144-157) par :

```ts
test('develop : défausse la carte, paie le coût du niveau, avance le marqueur', () => {
  const base = createGame(CONFIG, 1);
  // On épingle une carte animod (FIX_mercure_0) : face S niveau 1 = [credits 2], effet NON
  // interactif → la résolution se termine sans pending, le tour se clôt (scénario déterministe).
  const id = 'FIX_mercure_0';
  const people = cardOf(id)!.people; // animod
  expect(people).toBe('animod'); // garde-fou si les fixtures changent
  const s: GameState = {
    ...base,
    players: [{ ...base.players[0], hand: [id], zenithium: 5 }, base.players[1]],
  };
  const zBefore = s.players[0].zenithium;
  const cost = activeFace(people, s.config.techSetup).levels[0]!.zenithium; // niveau 1 = 1
  const out = applyMove(s, { t: 'develop', cardId: id, people });
  expect(out.players[0].techMarkers[people]).toBe(1);
  expect(out.players[0].zenithium).toBe(zBefore - cost);
  expect(out.discard).toContain(id);
  expect(out.players[0].hand).not.toContain(id);
  expect(out.current).toBe(1); // fin de tour (S1 = credits, pas de décision)
});
```

Remplacer le test `develop niveau 2 : le 1er joueur prend le jeton de l'emplacement, intercalé entre niveau 2 et 1` (actuellement ~L330-340) par :

```ts
test("develop niveau 2 : le 1er joueur prend le jeton de l'emplacement, intercalé entre niveau 2 et 1", () => {
  const base = createGame(CONFIG, 1);
  const seeded: GameState = { ...readyToDevelopRobotLvl2(base), techBonus: { ...base.techBonus, robot: 'tok-zen1-1' } };
  const out = applyMove(seeded, { t: 'develop', cardId: 'FIX_terra_0', people: 'robot' });
  // Contenu réel face N (robot) : L2 = [takeLeader silver], L1 = [transfer 1].
  // Cumul L2→L1 avec le jeton d'emplacement (tok-zen1-1 = +1 zénithium) intercalé APRÈS L2.
  // transfer 1 (L1) cible l'adversaire, colonnes vides au départ → ignoré (aucun pending).
  // zénithium = 8 - coût(niv.2 = 2) + 1 (jeton) = 7 ; le +1 prouve l'intercalage du jeton.
  expect(out.players[0].zenithium).toBe(8 - 2 + 1);
  expect(out.diplomacy.leader).toBe(0); // L2 = takeLeader (silver) appliqué → cumul niveau 2 confirmé
  expect(out.techBonus.robot).toBeNull(); // jeton pris
  expect(out.bonusDiscard).toContain('tok-zen1-1');
  expect(out.current).toBe(1); // aucun effet interactif → fin de tour
});
```

Remplacer le test `develop niveau 2 : si l'emplacement est déjà vide, aucun jeton n'est repris` (actuellement ~L342-349) par :

```ts
test("develop niveau 2 : si l'emplacement est déjà vide, aucun jeton n'est repris", () => {
  const base = createGame(CONFIG, 1);
  const seeded: GameState = { ...readyToDevelopRobotLvl2(base), techBonus: { ...base.techBonus, robot: null } };
  const out = applyMove(seeded, { t: 'develop', cardId: 'FIX_terra_0', people: 'robot' });
  // Face N réelle : L2 = takeLeader, L1 = transfer (ignoré, adversaire vide). Pas de jeton d'emplacement.
  expect(out.players[0].zenithium).toBe(8 - 2); // pas de +1 jeton
  expect(out.techBonus.robot).toBeNull();
  expect(out.bonusDiscard).not.toContain('tok-zen1-1');
});
```

Mettre à jour **le commentaire** interne du test `prime de ligne niveau 1 : ...` (les deux lignes de commentaire après `applyMove(...)`, actuellement ~L180-181) par :

```ts
  // Contenu réel : develop robot niv.1 → effet L1 = [transfer 1] (ignoré : adversaire sans colonne),
  // PUIS prime de ligne niv.1 = influence 'choice' (les 3 marqueurs atteignent 1) → décision en attente.
```

Mettre à jour **le commentaire** interne du test `develop vers niveau 3+ : ...` (le commentaire après `applyMove(...)`, actuellement ~L362) par :

```ts
  // Contenu réel : L3 (robot) pose un pending (influence choice 2) — sans effet sur les champs
  // assertés ci-dessous. Coût déduit avant résolution ; jeton d'emplacement non déclenché (newLevel=3).
```

- [ ] **Step 2: Lancer `moves.test.ts` — les 3 tests adaptés échouent encore (le défaut est toujours `FIXTURE_TECH`)**

Run: `npx jest src/engine/__tests__/moves.test.ts`
Expected: FAIL sur les 3 tests adaptés (ex. `develop niveau 2 : …prend le jeton` attend `diplomacy.leader === 0` mais le fixture `credits 1` ne pose pas `takeLeader`). Les 2 tests dont seul le commentaire change restent verts. Cela confirme que les nouvelles assertions décrivent bien le contenu RÉEL, pas encore actif.

- [ ] **Step 3: Basculer le défaut et supprimer les fixtures** — `src/data/tech.ts`

Supprimer le bloc suivant (lignes ~11-32) :

```ts
/** ⚠️ Faces FIXTURES non canoniques (effets placeholder). Le vrai contenu techno viendra plus tard. */
export const FIXTURE_TECH_NON_CANONICAL = true;

function fixtureFace(): TechFace {
  return {
    levels: [1, 2, 3, 4, 5].map((n) => ({
      zenithium: n,
      // Placeholder déterministe (non canonique) : un effet 'influence on:choice' bloquerait la
      // résolution sur une décision (pending) sans call explicite à decide(), ce qui empêcherait
      // develop de terminer le tour dans le même applyMove. On choisit donc un effet simple qui se
      // résout immédiatement ; le vrai contenu techno (et son interaction avec les décisions) viendra
      // avec les vrais atomes.
      effects: [{ k: 'credits', amount: 1, target: 'self' }] as Effect[],
    })),
  };
}

export const FIXTURE_TECH: TechCatalog = {
  animod: { S: fixtureFace(), D: fixtureFace() },
  humain: { O: fixtureFace(), U: fixtureFace() },
  robot: { N: fixtureFace(), P: fixtureFace() },
};
```

Modifier la signature de `activeFace` pour que le défaut soit `TECH` :

```ts
export function activeFace(people: People, setup: TechSetup, catalog: TechCatalog = TECH): TechFace {
  const faceKey = setup[people];
  return (catalog[people] as Record<string, TechFace>)[faceKey]!;
}
```

Après suppression, l'import en tête de fichier `import type { Effect, People, TechSetup } from '../engine/types';` n'utilise plus `Effect` directement dans `tech.ts` (il n'est plus qu'implicite via `TechLevel`). Le retirer pour éviter un import inutilisé :

```ts
import type { People, TechSetup } from '../engine/types';
```

> Le fichier final `src/data/tech.ts` contient donc, dans l'ordre : les imports, les types `TechLevel`/`TechFace`/`TechCatalog`, la constante `TECH` (Tâche 1), puis `activeFace(... catalog = TECH)`.

- [ ] **Step 4: Lancer `moves.test.ts` pour vérifier qu'il passe**

Run: `npx jest src/engine/__tests__/moves.test.ts`
Expected: PASS (tous les tests, y compris les 3 adaptés et les 2 à commentaire mis à jour).

- [ ] **Step 5: Lancer la suite complète (vérifier les suites non concernées)**

Run: `npm test`
Expected: PASS pour toutes les suites. En particulier :
- `sim`, `sim-properties` : self-play tourne désormais sur le vrai contenu ; les assertions portent sur la terminaison (`moves ≤ cap`), la cohérence de l'issue (`winner`/`stuck`/`maxSteps`) et le déterminisme — aucune n'assume un effet fixture précis (le bot pilote les `pending` via `legalMoves`). Elles restent vertes. (Le commentaire « 50/50 stuck » de `sim-properties.test.ts` est indicatif et hors assertion ; le laisser tel quel — aucune assertion ne dépend de la ventilation.)
- `purity` : `tech.ts` n'introduit aucun import UI/réseau.
- `setup`, `effects`, `influence`, `bot`, `smoke`, `fixtures`, `tokens` : inchangées.

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck`
Expected: aucune erreur (plus de références à `FIXTURE_TECH` / `fixtureFace` / `FIXTURE_TECH_NON_CANONICAL` ; `Effect` retiré des imports de `tech.ts`).

- [ ] **Step 7: Commit**

```bash
git add src/data/tech.ts src/engine/__tests__/moves.test.ts
git commit -m "feat(tech): bascule activeFace sur TECH reel et adapte les tests develop"
```

---

## Hors périmètre

Ces éléments sont **explicitement exclus** de ce plan (phases suivantes) :

- **Transcription des 90 cartes** réelles : `src/data/fixtures.ts` (`FIXTURE_CARDS`, `FIXTURE_NON_CANONICAL`) et `src/engine/effects.ts` (`cardOf`/`CARDS`) restent sur les fixtures. Non touchés ici.
- **Les 16 jetons-effets déclenchés via cartes** : `src/data/tokens.ts` (`TOKENS`) est déjà sur du contenu réel confirmé et n'est pas modifié ; le câblage jeton↔carte relève d'une phase ultérieure.
- **UI / rendu** (`src/app`, `src/ui`, tout code react/native/expo) : hors moteur, hors de ce plan.
- **Réseau / multijoueur** : aucun.
- **Nouveaux atomes d'effet** : aucun — tous les atomes du catalogue existent déjà dans l'union `Effect`. Ne rien ajouter à `src/engine/types.ts` ni à `src/engine/effects.ts`.
- **Configuration D.O.P. en jeu réel** : les faces D/O/P sont transcrites dans `TECH` (obligatoire, `TechCatalog` les exige) mais les tests/`CONFIG` du dépôt utilisent la config S.U.N. ; aucun test de partie D.O.P. n'est ajouté ici.

---

## Self-Review

**1. Couverture des 30 faces (spec → `TECH`).** Les 6 faces × 5 niveaux de la section « ✅ CATALOGUE CONFIRMÉ → ATOMES » sont transcrites littéralement dans la constante `TECH` (Tâche 1, Step 3) :
- **S** : credits 2 · influenceNeighbors 2/1 · transfer 3 · mobilize 3 thenInfluence:true · influence choice 2. ✓
- **U** : influence choice 1 · mobilize 2 · steal credits 3 · influenceNeighbors 3/1 · influence choice 2. ✓
- **N** : transfer 1 · takeLeader silver · [influence choice 2, influenceDifferent 1] · credits 20 · influence choice 2. ✓
- **D** : exile opponent 1 · credits 5 · [influence choice 1, bonusToken] · influenceEach 1 · influence choice 2. ✓
- **O** : bonusToken · steal zenithium 1 · mobilize 3 · influenceNeighbors 2/2 · influence choice 2. ✓
- **P** : mobilize 1 · [mobilize 1, transfer 1, exile opponent 1] · credits 10 · exileForInfluence 2/2 · influence choice 2. ✓
- Coûts 1..5 sur les 6 faces + tous les L5 = influence choice 2 : vérifiés par les 3 premiers tests de `tech.test.ts`. ✓ (30/30 faces couvertes.)

**2. Tests adaptés (recensement complet).** Seul `src/engine/__tests__/moves.test.ts` dépend du contenu techno (les autres suites n'utilisent `techSetup` que comme config, ou testent l'infra `techBonus`) :
- `develop : défausse la carte…` → **adapté** : carte animod épinglée (`FIX_mercure_0`, S1=credits 2 non interactif) pour isoler la mécanique, fin de tour déterministe.
- `develop niveau 2 : …prend le jeton` → **adapté** : assertion `credits` fixture remplacée par `zénithium 8−2+1` + `diplomacy.leader===0` (N2=takeLeader) + fin de tour ; L1=transfer ignoré (adversaire vide).
- `develop niveau 2 : …emplacement vide` → **adapté** : assertion `credits` fixture retirée ; `zénithium 8−2`, pas de jeton.
- `prime de ligne niveau 1` → **vert, commentaire mis à jour** : le pending vient de la prime (influence choice), L1=transfer ignoré.
- `develop vers niveau 3+` → **vert, commentaire mis à jour** : L3 pose un pending sans affecter les champs assertés ; jeton non déclenché.
- `develop illégal si zénithium insuffisant` → **inchangé** (no-op avant résolution, aucune assertion sur les effets).
- `sim`/`sim-properties`/`purity` → **inchangés**, vérifiés verts au Step 5 (aucune assertion n'assume un effet fixture ; le bot pilote les `pending`).

**3. Cohérence des types.** Tous les objets d'effet de `TECH` sont des membres valides de l'union `Effect` (`src/engine/types.ts`) : `credits`/`zenithium` ont `target`, `influence` a `on`, `steal` a `resource`, `mobilize` a `thenInfluence`, `takeLeader` a `side`, `exile` a `side`, `exileForInfluence`/`influenceNeighbors` ont `count`+`amount`. `TECH: TechCatalog` respecte `{ animod:{S,D}, humain:{O,U}, robot:{N,P} }`. Noms cohérents entre tâches : `TECH`, `activeFace`, `TechFace`, `fx()`. Le typecheck (Task 1 Step 5, Task 2 Step 6) verrouille cette cohérence.

**Incohérences spec ↔ atomes détectées.** Aucune : chacun des 14 types d'effet utilisés par le catalogue confirmé correspond exactement à un membre existant de l'union `Effect`, et le moteur (`effects.ts`) sait déjà résoudre chacun (y compris les cas interactifs via `resolve`/`decide`). Aucun effet inventé, aucune ambiguïté restante dans la section confirmée de la spec.

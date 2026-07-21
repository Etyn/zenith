# Transcription des 90 cartes agent Zenith — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transcrire le contenu réel des 90 cartes agent Zenith (5 planètes × 18) en données `CardDef[]` dans `src/data/cards.ts`, brancher le moteur dessus, et faire tourner le self-play sur le vrai deck.

**Architecture:** Le moteur pur (`src/engine`) consomme un catalogue `CardDef[]` via `cardOf()`. On construit un nouveau module de données `src/data/cards.ts` (une entrée `CardDef` par carte, effets encodés avec le vocabulaire `Effect` **déjà existant**), on le remplit couleur par couleur (pilote Mars d'abord pour verrouiller l'encodage des combinateurs), puis on bascule `cardOf` et le deck de `createGame` du fixture non-canonique vers ce catalogue. Les tests unitaires du moteur continuent d'utiliser les ids `FIX_*` (résolus grâce à un catalogue fusionné) pour ne pas réécrire des scénarios déterministes.

**Tech Stack:** TypeScript 5.4 (pur, sans I/O), Jest 29 + ts-jest. `npm test` (jest), `npm run typecheck` (tsc --noEmit).

## Global Constraints

- **Moteur pur** : aucune I/O, aucun `Date.now`, aucun `Math.random` — toute aléa passe par `src/engine/rng.ts`.
- **Immuabilité** : ne jamais muter l'état ; retourner de nouveaux objets (respecter `purity.test.ts`).
- **Déterminisme** : même graine → même partie.
- **TDD** : test qui échoue → implémentation minimale → test vert → commit. Un commit par tâche minimum.
- **Contenu réel, transcription fidèle** : la source par carte est la feuille de couleur (`docs/content/cartes-<couleur>.md`) + le lexique (`docs/content/lexique-icones.md`). **Aucun effet inventé.**
- **Vocabulaire figé** : n'ajouter AUCUN nouvel atome/combinateur `Effect`. Tout doit se mapper sur l'union `Effect` de `src/engine/types.ts` (lignes 33–64). Si une carte comporte un effet non couvert, la marquer `// TODO(rules): …` et la **lister dans le rapport de tâche** (ne pas deviner).
- **1er effet TOUJOURS** `{ k: 'influence', amount: 1, on: <planète de la carte> }`.
- **RÈGLE CRITIQUE « give-* toujours enveloppé »** : les atomes qui donnent à l'adversaire — `giveOpponent`, `giveLeaderBadge`, `giveInfluenceOpponent` — sont **non-skippables** ; ils DOIVENT être placés **à l'intérieur** d'un `optional` (ou d'un palier `scale`), **jamais nus** dans `effects`, sinon ils poseraient une décision sans possibilité de renoncer.
- **Coûts** dans [1, 10] ; **ids** uniques sur les 90.
- Ne pas casser les suites de tests non concernées.

## Convention d'id

`<planète>-<slug-du-nom>` où `slug` = nom en minuscules, translittéré ASCII (`Ø`→`o`, accents retirés), espaces → `-`, tout caractère hors `[a-z0-9-]` supprimé, points supprimés. Les chiffres « leet » sont conservés.
Exemples : `mars-caesar`, `mars-w4tson`, `mars-robinson` (RØBINSØN), `mars-charlize-gun`, `mercure-h4milton` (H4MILTØN), `jupiter-pkdick` (P.K.DICK), `jupiter-thompson` (THØMPSØN), `venus-as1mov` (AS1MØV). Unique sur les 90 (planète en préfixe ⇒ pas de collision inter-couleurs ; les noms sont uniques intra-couleur).

## Table de correspondance lexique → `Effect` (référence pour toutes les tâches de transcription)

| Icône / lecture feuille | Encodage `Effect` |
|---|---|
| 1er effet (disque couleur carte) | `{ k:'influence', amount:1, on:<planète> }` |
| +N influence sur planète précise X | `{ k:'influence', amount:N, on:X }` |
| +1 influence au choix (disque gris) | `{ k:'influence', amount:1, on:'choice' }` |
| +2 influence même planète au choix (double flèche) | `{ k:'influence', amount:2, on:'choice' }` |
| +1 influence planète ≠ précédentes (≠) | `{ k:'influenceDifferent', amount:1 }` |
| +1 influence au choix SAUF couleur carte / bandeau (disque barré) | `{ k:'influenceChoiceExcept', exceptColor:X, amount:1 }` |
| +1 influence sur chacune des 5 (rangée de 5) | `{ k:'influenceEach', amount:1 }` |
| déplacer un disque au choix vers le centre | `{ k:'moveDiscToCenter' }` |
| DONNER à l'adv 1 influence (↑rouge + disque) | `{ k:'giveInfluenceOpponent', amount:1 }` **(dans `optional`)** |
| X crédits (soi) / X zénithium (soi) | `{ k:'credits', amount:X, target:'self' }` / `{ k:'zenithium', amount:X, target:'self' }` |
| l'adversaire gagne X crédits/zén (silhouette, SANS flèche) | `{ k:'credits'|'zenithium', amount:X, target:'opponent' }` |
| voler X crédits (↓) | `{ k:'steal', resource:'credits', amount:X }` |
| 2 × [couleurs] SA zone / zone adverse | `{ k:'creditsPerCardColors', zone:'self'|'opponent', per:2 }` |
| récompense selon technos niv.1 (4/8/12) | `{ k:'creditsPerTechLevels', tiers:[4,8,12] }` |
| transférer / voler N cartes (colonne adverse au choix) | `{ k:'transfer', count:N, from:'choice' }` |
| exiler N cartes de SA colonne correspondante | `{ k:'exile', side:'self', count:N, corresponding:true }` |
| exiler N cartes adverses (au choix) | `{ k:'exile', side:'opponent', count:N }` |
| exil-échelle couleur → zén (2/4/7 → 2/4/7) | `{ k:'scale', tiers:[{cost:[exile self corr 2], reward:[zén 2]}, …4, …7] }` |
| exil-échelle couleur → influence (2/4/7 → 1/2/3) | `scale` avec reward `{ k:'influence', amount:M, on:<couleur> }` |
| payer X zénithium → gain (échelle) | palier `scale` : cost `{ k:'zenithium', amount:-X, target:'self' }` (voir note ci-dessous) |
| développer techno du peuple de la carte, -1 zén | `{ k:'developDiscounted', which:'cardPeople', discount:1 }` |
| développer techno au choix, -2 zén | `{ k:'developDiscounted', which:'choice', discount:2 }` |
| développer la techno la plus basse, 0 zén | `{ k:'developLowest' }` |
| prendre le badge Leader (argent/bicolore) / or | `{ k:'takeLeader', side:'silver' }` / `{ k:'takeLeader', side:'gold' }` |
| DONNER le badge Leader à l'adv (↑rouge + badge) | `{ k:'giveLeaderBadge' }` **(dans `optional`)** |
| jeton bonus (étoile) / jeton bonus visible (étoile+œil) | `{ k:'bonusToken' }` / `{ k:'takeBoardBonusToken' }` |
| mobiliser N (+ ) | `{ k:'mobilize', count:N, thenInfluence:false }` |
| défausser toute sa main (poing) | `{ k:'discardHandAll' }` |
| défausser 1 carte main → influence sa couleur (Ice June) | `{ k:'discardHand', count:1, thenInfluence:true }` |
| transférer/défausser 1 carte → crédits = sa valeur | `{ k:'creditsFromCardValue', source:'transfer'|'discardHand' }` |
| CONDITION badge Leader → E | `{ k:'conditional', cond:{c:'hasLeaderBadge'}, effects:[E] }` |
| CONDITION ≥ N crédits → E | `{ k:'conditional', cond:{c:'creditsAtLeast', amount:N}, effects:[E] }` |
| « / » choix exclusif A ou B | `{ k:'choice', options:[[A],[B]] }` |
| chevron ⟋ coût→récompense FACULTATIF | `{ k:'optional', effects:[<coût>, <récompense>] }` |

**Note « payer X zénithium »** (Moussa, Stessy Power) : le vocabulaire n'a pas d'atome « dépenser » ; on modélise le coût par un gain négatif `{ k:'zenithium', amount:-X, target:'self' }` à l'intérieur du palier `scale`. Le moteur ne vérifie pas la solvabilité d'un palier choisi (peut rendre le zénithium négatif) — comportement pré-existant, acceptable pour le self-play (pas de crash). À signaler dans le rapport de T3.

---

## File Structure

- **Create** `src/data/cards.ts` — le catalogue réel. 5 tableaux `const <COULEUR>_CARDS: CardDef[]` + `export const CARDS: CardDef[] = [...MARS_CARDS, ...MERCURE_CARDS, ...VENUS_CARDS, ...TERRA_CARDS, ...JUPITER_CARDS]`. Une entrée par carte. Responsabilité unique : les données de contenu.
- **Create** `src/data/__tests__/cards.test.ts` — invariants du catalogue (comptes par couleur, total, ids uniques, 1er effet = influence sur la planète, coûts ∈ [1,10]). Grandit au fil des tâches.
- **Modify** `src/engine/effects.ts:12-16` — `cardOf` : catalogue = fusion `{ ...fixtures, ...réels }` (résout ids réels ET `FIX_*`). Deck de jeu = les 90 réelles (via `setup.ts`).
- **Modify** `src/engine/setup.ts:12,36` — importer `CARDS` ; changer le deck par défaut de `createGame` de `FIXTURE_CARDS` → `CARDS`.
- **Modify** `src/engine/__tests__/setup.test.ts:40-44` — « aucune carte perdue » : total 10 → 90.
- **Modify** `src/engine/__tests__/sim-properties.test.ts` — le self-play tourne sur le vrai deck ; mettre à jour la note fixture et la ventilation des issues.
- **Keep** `src/data/fixtures.ts` (`FIXTURE_CARDS`, `FIXTURE_NON_CANONICAL`) — toujours exporté ; consommé par la fusion `cardOf` et par `moves.test.ts` / `effects-atoms.test.ts` (ids `FIX_*`).

---

## Task 1: Scaffold `cards.ts` + PILOTE Mars (18 cartes) + invariants

Ce pilote **verrouille l'encodage des combinateurs** (`optional`, `choice`, `scale`, `conditional`) et la règle give-* enveloppé, sur la seule couleur 100% décodée ✓. On **ne branche pas encore** `cardOf`/`setup` (fait en T6).

L'implémenteur relira `docs/content/cartes-mars.md` + `docs/content/lexique-icones.md` avant de coder. Le code Mars complet est fourni ci-dessous (source de vérité de l'encodage).

**Files:**
- Create: `src/data/cards.ts`
- Test: `src/data/__tests__/cards.test.ts`

**Interfaces:**
- Consumes: `CardDef` (`src/data/types.ts`) = `{ id:string; name:string; people:People; planet:Planet; cost:number; effects:Effect[] }` ; `Effect` (`src/engine/types.ts:33-64`).
- Produces: `export const MARS_CARDS: CardDef[]` ; `export const CARDS: CardDef[]` (contiendra Mars seul après T1, complété T2–T5).

- [ ] **Step 1: Écrire le test d'invariants qui échoue**

```typescript
// src/data/__tests__/cards.test.ts
import { PLANETS, type Effect } from '../../engine/types';
import { CARDS, MARS_CARDS } from '../cards';

test('Mars : 18 cartes', () => {
  expect(MARS_CARDS).toHaveLength(18);
  expect(MARS_CARDS.every((c) => c.planet === 'mars')).toBe(true);
});

test('ids uniques sur le catalogue', () => {
  const ids = CARDS.map((c) => c.id);
  expect(new Set(ids).size).toBe(ids.length);
});

test('1er effet = influence 1 sur la planète de la carte', () => {
  for (const c of CARDS) {
    const first = c.effects[0]!;
    expect(first.k).toBe('influence');
    expect(first).toMatchObject({ k: 'influence', amount: 1, on: c.planet });
  }
});

test('coûts dans [1, 10] et planètes connues', () => {
  for (const c of CARDS) {
    expect(c.cost).toBeGreaterThanOrEqual(1);
    expect(c.cost).toBeLessThanOrEqual(10);
    expect(PLANETS).toContain(c.planet);
  }
});

// Garde-fou « give-* toujours enveloppé » : aucun atome give-* nu à la racine de effects[].
test('les atomes give-* ne sont jamais nus dans effects[]', () => {
  const GIVE = new Set(['giveOpponent', 'giveLeaderBadge', 'giveInfluenceOpponent']);
  for (const c of CARDS) {
    for (const e of c.effects as Effect[]) {
      expect(GIVE.has(e.k)).toBe(false);
    }
  }
});
```

- [ ] **Step 2: Lancer le test, vérifier l'échec**

Run: `npx jest src/data/__tests__/cards.test.ts`
Expected: FAIL — `Cannot find module '../cards'`.

- [ ] **Step 3: Créer `src/data/cards.ts` avec les 18 cartes Mars**

```typescript
// src/data/cards.ts
import type { CardDef } from './types';

// Contenu réel — source : docs/content/cartes-mars.md + docs/content/lexique-icones.md.
// 1er effet toujours { influence, 1, planète }. give-* (giveOpponent/giveLeaderBadge/
// giveInfluenceOpponent) toujours enveloppés dans un optional (non-skippables sinon).
export const MARS_CARDS: CardDef[] = [
  {
    id: 'mars-bishop', name: 'Bishop', people: 'robot', planet: 'mars', cost: 4,
    effects: [
      { k: 'influence', amount: 1, on: 'mars' },
      { k: 'conditional', cond: { c: 'hasLeaderBadge' }, effects: [{ k: 'influence', amount: 1, on: 'mars' }] },
    ],
  },
  {
    // "voler 1 carte" = prendre une carte de la colonne adverse au choix → transfer(choice).
    id: 'mars-caligula', name: 'Caligula', people: 'animod', planet: 'mars', cost: 5,
    effects: [
      { k: 'influence', amount: 1, on: 'mars' },
      { k: 'transfer', count: 1, from: 'choice' },
      { k: 'influence', amount: 1, on: 'choice' },
    ],
  },
  {
    id: 'mars-ramses', name: 'Ramses', people: 'animod', planet: 'mars', cost: 3,
    effects: [
      { k: 'influence', amount: 1, on: 'mars' },
      { k: 'choice', options: [[{ k: 'transfer', count: 2, from: 'choice' }], [{ k: 'credits', amount: 8, target: 'self' }]] },
    ],
  },
  {
    // TODO(rules): "≠ Mars" côté adversaire non exprimable — giveInfluenceOpponent sans exclusion. Mineur.
    id: 'mars-titus', name: 'Titus', people: 'animod', planet: 'mars', cost: 1,
    effects: [
      { k: 'influence', amount: 1, on: 'mars' },
      { k: 'optional', effects: [{ k: 'giveInfluenceOpponent', amount: 1 }, { k: 'credits', amount: 10, target: 'self' }] },
    ],
  },
  {
    id: 'mars-w4tson', name: 'W4tson', people: 'robot', planet: 'mars', cost: 1,
    effects: [
      { k: 'influence', amount: 1, on: 'mars' },
      { k: 'mobilize', count: 1, thenInfluence: false },
      { k: 'credits', amount: 5, target: 'self' },
    ],
  },
  {
    id: 'mars-caesar', name: 'Caesar', people: 'animod', planet: 'mars', cost: 2,
    effects: [
      { k: 'influence', amount: 1, on: 'mars' },
      { k: 'choice', options: [[{ k: 'zenithium', amount: 1, target: 'self' }], [{ k: 'credits', amount: 7, target: 'self' }]] },
    ],
  },
  {
    id: 'mars-v4nc3', name: 'V4nc3', people: 'robot', planet: 'mars', cost: 2,
    effects: [
      { k: 'influence', amount: 1, on: 'mars' },
      { k: 'choice', options: [[{ k: 'transfer', count: 1, from: 'choice' }], [{ k: 'zenithium', amount: 1, target: 'self' }]] },
    ],
  },
  {
    // TODO(rules): la silhouette "mobiliser vers la colonne ADVERSE" n'est pas exprimable
    // (mobilize place toujours dans SA colonne). Encodé en mobilize normal + transfer(choice) pour "voler 1 carte".
    id: 'mars-charlize-gun', name: 'Charlize Gun', people: 'humain', planet: 'mars', cost: 4,
    effects: [
      { k: 'influence', amount: 1, on: 'mars' },
      { k: 'mobilize', count: 1, thenInfluence: false },
      { k: 'transfer', count: 1, from: 'choice' },
    ],
  },
  {
    id: 'mars-domitian', name: 'Domitian', people: 'animod', planet: 'mars', cost: 9,
    effects: [
      { k: 'influence', amount: 1, on: 'mars' },
      { k: 'mobilize', count: 3, thenInfluence: false },
    ],
  },
  {
    id: 'mars-robinson', name: 'Røbinsøn', people: 'robot', planet: 'mars', cost: 2,
    effects: [
      { k: 'influence', amount: 1, on: 'mars' },
      { k: 'scale', tiers: [
        { cost: [{ k: 'exile', side: 'self', count: 2, corresponding: true }], reward: [{ k: 'zenithium', amount: 2, target: 'self' }] },
        { cost: [{ k: 'exile', side: 'self', count: 4, corresponding: true }], reward: [{ k: 'zenithium', amount: 4, target: 'self' }] },
        { cost: [{ k: 'exile', side: 'self', count: 7, corresponding: true }], reward: [{ k: 'zenithium', amount: 7, target: 'self' }] },
      ] },
    ],
  },
  {
    id: 'mars-septimius', name: 'Septimius', people: 'animod', planet: 'mars', cost: 3,
    effects: [
      { k: 'influence', amount: 1, on: 'mars' },
      { k: 'scale', tiers: [
        { cost: [{ k: 'exile', side: 'self', count: 2, corresponding: true }], reward: [{ k: 'influence', amount: 1, on: 'mars' }] },
        { cost: [{ k: 'exile', side: 'self', count: 4, corresponding: true }], reward: [{ k: 'influence', amount: 2, on: 'mars' }] },
        { cost: [{ k: 'exile', side: 'self', count: 7, corresponding: true }], reward: [{ k: 'influence', amount: 3, on: 'mars' }] },
      ] },
    ],
  },
  {
    id: 'mars-little-bob', name: 'Little Bob', people: 'humain', planet: 'mars', cost: 3,
    effects: [
      { k: 'influence', amount: 1, on: 'mars' },
      { k: 'influenceChoiceExcept', exceptColor: 'mars', amount: 1 },
    ],
  },
  {
    id: 'mars-don-dune', name: 'Don Dune', people: 'humain', planet: 'mars', cost: 6,
    effects: [
      { k: 'influence', amount: 1, on: 'mars' },
      { k: 'influence', amount: 1, on: 'venus' },
      { k: 'takeLeader', side: 'silver' },
    ],
  },
  {
    id: 'mars-jack-curry', name: 'Jack Curry', people: 'humain', planet: 'mars', cost: 1,
    effects: [
      { k: 'influence', amount: 1, on: 'mars' },
      { k: 'credits', amount: 4, target: 'self' },
      { k: 'optional', effects: [{ k: 'giveOpponent', resource: 'zenithium', amount: 1 }, { k: 'influence', amount: 1, on: 'mercure' }] },
    ],
  },
  {
    id: 'mars-4nd3rs0n', name: '4nd3rs0n', people: 'robot', planet: 'mars', cost: 6,
    effects: [
      { k: 'influence', amount: 1, on: 'mars' },
      { k: 'influence', amount: 1, on: 'choice' },
    ],
  },
  {
    id: 'mars-mc4ffr3y', name: 'Mc4ffr3y', people: 'robot', planet: 'mars', cost: 4,
    effects: [
      { k: 'influence', amount: 1, on: 'mars' },
      { k: 'zenithium', amount: 2, target: 'self' },
    ],
  },
  {
    id: 'mars-handy-luke', name: 'Handy Luke', people: 'humain', planet: 'mars', cost: 4,
    effects: [
      { k: 'influence', amount: 1, on: 'mars' },
      { k: 'takeBoardBonusToken' },
    ],
  },
  {
    // TODO(rules): "exiler 3 cartes de la MAIN adverse → +1 influence sur la couleur de chaque carte exilée"
    // non exprimable (exile opère sur les colonnes, pas la main adverse ; influence par couleur de carte inconnue).
    // Transcrit avec le seul 1er effet en attendant l'arbitrage utilisateur / un atome dédié.
    id: 'mars-lady-moore', name: 'Lady Moore', people: 'humain', planet: 'mars', cost: 10,
    effects: [
      { k: 'influence', amount: 1, on: 'mars' },
    ],
  },
];

export const CARDS: CardDef[] = [...MARS_CARDS];
```

- [ ] **Step 4: Lancer le test, vérifier le succès**

Run: `npx jest src/data/__tests__/cards.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Vérifier le typecheck (structures `Effect` valides)**

Run: `npm run typecheck`
Expected: aucune erreur (toute forme `Effect` invalide échouerait ici).

- [ ] **Step 6: Commit**

```bash
git add src/data/cards.ts src/data/__tests__/cards.test.ts
git commit -m "feat(data): pilote Mars (18 cartes) du catalogue réel + invariants"
```

**Rapport de tâche attendu** : signaler les TODO(rules) trouvés — `mars-charlize-gun` (mobiliser côté adverse), `mars-lady-moore` (exil main adverse + influence couleur), `mars-titus` (exclusion ≠Mars côté adversaire, mineur).

---

## Task 2: Transcription Mercure (18 cartes)

L'implémenteur relit `docs/content/cartes-mercure.md` + le lexique + la table de correspondance ci-dessus, puis ajoute `MERCURE_CARDS` à `cards.ts`. Le code complet est fourni (issu du décodage de la feuille).

**Files:**
- Modify: `src/data/cards.ts`
- Modify: `src/data/__tests__/cards.test.ts`

**Interfaces:**
- Consumes: `MARS_CARDS`, `CARDS` (Task 1).
- Produces: `export const MERCURE_CARDS: CardDef[]` (18) ; `CARDS` étendu.

- [ ] **Step 1: Ajouter le test de comptage Mercure (échoue)**

```typescript
// src/data/__tests__/cards.test.ts — ajouter :
import { MERCURE_CARDS } from '../cards';

test('Mercure : 18 cartes', () => {
  expect(MERCURE_CARDS).toHaveLength(18);
  expect(MERCURE_CARDS.every((c) => c.planet === 'mercure')).toBe(true);
});
```

- [ ] **Step 2: Lancer, vérifier l'échec**

Run: `npx jest src/data/__tests__/cards.test.ts -t Mercure`
Expected: FAIL — `MERCURE_CARDS` non exporté (undefined).

- [ ] **Step 3: Ajouter `MERCURE_CARDS` et l'inclure dans `CARDS`**

```typescript
// src/data/cards.ts — ajouter avant la définition finale de CARDS :
export const MERCURE_CARDS: CardDef[] = [
  { id: 'mercure-guy-gambler', name: 'Guy Gambler', people: 'humain', planet: 'mercure', cost: 3,
    effects: [
      { k: 'influence', amount: 1, on: 'mercure' },
      { k: 'credits', amount: 5, target: 'self' },
      { k: 'conditional', cond: { c: 'hasLeaderBadge' }, effects: [{ k: 'bonusToken' }] },
    ] },
  { id: 'mercure-nero', name: 'Nero', people: 'animod', planet: 'mercure', cost: 7,
    effects: [
      { k: 'influence', amount: 1, on: 'mercure' },
      { k: 'zenithium', amount: 3, target: 'self' },
    ] },
  { id: 'mercure-orwell', name: 'Orwell', people: 'robot', planet: 'mercure', cost: 1,
    effects: [
      { k: 'influence', amount: 1, on: 'mercure' },
      { k: 'bonusToken' },
      { k: 'optional', effects: [{ k: 'giveLeaderBadge' }, { k: 'credits', amount: 7, target: 'self' }] },
    ] },
  { id: 'mercure-huxley', name: 'Huxley', people: 'robot', planet: 'mercure', cost: 5,
    effects: [
      { k: 'influence', amount: 1, on: 'mercure' },
      { k: 'influence', amount: 1, on: 'choice' },
      { k: 'conditional', cond: { c: 'hasLeaderBadge' }, effects: [{ k: 'credits', amount: 3, target: 'self' }] },
    ] },
  { id: 'mercure-master-din', name: 'Master Din', people: 'humain', planet: 'mercure', cost: 6,
    effects: [
      { k: 'influence', amount: 1, on: 'mercure' },
      { k: 'influence', amount: 1, on: 'mars' },
      { k: 'takeLeader', side: 'silver' },
    ] },
  { id: 'mercure-atlas', name: 'Atlas', people: 'animod', planet: 'mercure', cost: 3,
    effects: [
      { k: 'influence', amount: 1, on: 'mercure' },
      { k: 'exile', side: 'opponent', count: 1 },
      { k: 'takeLeader', side: 'silver' },
    ] },
  { id: 'mercure-w3lls', name: 'W3lls', people: 'robot', planet: 'mercure', cost: 4,
    effects: [
      { k: 'influence', amount: 1, on: 'mercure' },
      { k: 'conditional', cond: { c: 'hasLeaderBadge' }, effects: [{ k: 'influence', amount: 1, on: 'mercure' }] },
    ] },
  { id: 'mercure-khan', name: 'Khan', people: 'animod', planet: 'mercure', cost: 9,
    effects: [
      { k: 'influence', amount: 1, on: 'mercure' },
      { k: 'influence', amount: 1, on: 'choice' },
      { k: 'optional', effects: [{ k: 'giveLeaderBadge' }, { k: 'influenceDifferent', amount: 1 }] },
    ] },
  { id: 'mercure-wul', name: 'Wul', people: 'robot', planet: 'mercure', cost: 2,
    effects: [
      { k: 'influence', amount: 1, on: 'mercure' },
      { k: 'scale', tiers: [
        { cost: [{ k: 'exile', side: 'self', count: 2, corresponding: true }], reward: [{ k: 'zenithium', amount: 2, target: 'self' }] },
        { cost: [{ k: 'exile', side: 'self', count: 4, corresponding: true }], reward: [{ k: 'zenithium', amount: 4, target: 'self' }] },
        { cost: [{ k: 'exile', side: 'self', count: 7, corresponding: true }], reward: [{ k: 'zenithium', amount: 7, target: 'self' }] },
      ] },
    ] },
  { id: 'mercure-secret-kali', name: 'Secret Kali', people: 'humain', planet: 'mercure', cost: 2,
    effects: [
      { k: 'influence', amount: 1, on: 'mercure' },
      { k: 'optional', effects: [{ k: 'giveOpponent', resource: 'credits', amount: 3 }, { k: 'influenceChoiceExcept', exceptColor: 'mercure', amount: 1 }] },
    ] },
  { id: 'mercure-h4milton', name: 'H4miltøn', people: 'robot', planet: 'mercure', cost: 2,
    effects: [
      { k: 'influence', amount: 1, on: 'mercure' },
      { k: 'mobilize', count: 2, thenInfluence: false },
      { k: 'optional', effects: [{ k: 'giveLeaderBadge' }, { k: 'mobilize', count: 3, thenInfluence: false }] },
    ] },
  { id: 'mercure-double-joe', name: 'Double Joe', people: 'humain', planet: 'mercure', cost: 5,
    effects: [
      { k: 'influence', amount: 1, on: 'mercure' },
      { k: 'zenithium', amount: 2, target: 'self' },
      { k: 'optional', effects: [{ k: 'giveLeaderBadge' }, { k: 'zenithium', amount: 2, target: 'self' }] },
    ] },
  { // TODO(rules): "exiler 2 cartes ≠ Mercure" — l'exclusion de couleur n'est pas supportée par l'atome exile (choix libre). Mineur.
    id: 'mercure-chaka', name: 'Chaka', people: 'animod', planet: 'mercure', cost: 1,
    effects: [
      { k: 'influence', amount: 1, on: 'mercure' },
      { k: 'optional', effects: [{ k: 'exile', side: 'self', count: 2 }, { k: 'credits', amount: 10, target: 'self' }] },
    ] },
  { id: 'mercure-magellan', name: 'Magellan', people: 'animod', planet: 'mercure', cost: 10,
    effects: [
      { k: 'influence', amount: 1, on: 'mercure' },
      { k: 'influence', amount: 1, on: 'choice' },
      { k: 'influenceDifferent', amount: 1 },
      { k: 'influenceEach', amount: 1 },
    ] },
  { id: 'mercure-lula-smart', name: 'Lula Smart', people: 'humain', planet: 'mercure', cost: 1,
    effects: [
      { k: 'influence', amount: 1, on: 'mercure' },
      { k: 'credits', amount: 4, target: 'self' },
      { k: 'optional', effects: [{ k: 'giveOpponent', resource: 'zenithium', amount: 1 }, { k: 'influence', amount: 1, on: 'terra' }] },
    ] },
  { id: 'mercure-amytis', name: 'Amytis', people: 'animod', planet: 'mercure', cost: 3,
    effects: [
      { k: 'influence', amount: 1, on: 'mercure' },
      { k: 'scale', tiers: [
        { cost: [{ k: 'exile', side: 'self', count: 2, corresponding: true }], reward: [{ k: 'influence', amount: 1, on: 'mercure' }] },
        { cost: [{ k: 'exile', side: 'self', count: 4, corresponding: true }], reward: [{ k: 'influence', amount: 2, on: 'mercure' }] },
        { cost: [{ k: 'exile', side: 'self', count: 7, corresponding: true }], reward: [{ k: 'influence', amount: 3, on: 'mercure' }] },
      ] },
    ] },
  { id: 'mercure-cl4rke', name: 'Cl4rke', people: 'robot', planet: 'mercure', cost: 9,
    effects: [
      { k: 'influence', amount: 1, on: 'mercure' },
      { k: 'influence', amount: 1, on: 'choice' },
      { k: 'optional', effects: [{ k: 'giveOpponent', resource: 'zenithium', amount: 1 }, { k: 'influenceDifferent', amount: 1 }] },
    ] },
  { id: 'mercure-punk-mari', name: 'Punk Mari', people: 'humain', planet: 'mercure', cost: 7,
    effects: [
      { k: 'influence', amount: 1, on: 'mercure' },
      { k: 'discardHandAll' },
      { k: 'influence', amount: 1, on: 'choice' },
    ] },
];
```

Puis mettre à jour la ligne finale :

```typescript
export const CARDS: CardDef[] = [...MARS_CARDS, ...MERCURE_CARDS];
```

- [ ] **Step 4: Lancer les tests du catalogue**

Run: `npx jest src/data/__tests__/cards.test.ts`
Expected: PASS (invariants + Mars 18 + Mercure 18 ; ids uniques ; give-* enveloppés).

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: aucune erreur.

- [ ] **Step 6: Commit**

```bash
git add src/data/cards.ts src/data/__tests__/cards.test.ts
git commit -m "feat(data): transcription Mercure (18 cartes)"
```

**Rapport de tâche attendu** : TODO(rules) mineur `mercure-chaka` (exclusion ≠Mercure sur exile). Les 5 cartes historiquement ❓ concernées ici : `mercure-punk-mari` = transcriptible ✓ (discardHandAll + influence choix).

---

## Task 3: Transcription Vénus (18 cartes)

L'implémenteur relit `docs/content/cartes-venus.md` + le lexique + la table de correspondance, puis ajoute `VENUS_CARDS`.

**Files:**
- Modify: `src/data/cards.ts`
- Modify: `src/data/__tests__/cards.test.ts`

**Interfaces:**
- Consumes: `MARS_CARDS`, `MERCURE_CARDS`, `CARDS`.
- Produces: `export const VENUS_CARDS: CardDef[]` (18) ; `CARDS` étendu.

- [ ] **Step 1: Test de comptage Vénus (échoue)**

```typescript
// src/data/__tests__/cards.test.ts — ajouter :
import { VENUS_CARDS } from '../cards';

test('Vénus : 18 cartes', () => {
  expect(VENUS_CARDS).toHaveLength(18);
  expect(VENUS_CARDS.every((c) => c.planet === 'venus')).toBe(true);
});
```

- [ ] **Step 2: Lancer, vérifier l'échec**

Run: `npx jest src/data/__tests__/cards.test.ts -t Vénus`
Expected: FAIL — `VENUS_CARDS` undefined.

- [ ] **Step 3: Ajouter `VENUS_CARDS` et l'inclure dans `CARDS`**

```typescript
// src/data/cards.ts — ajouter :
export const VENUS_CARDS: CardDef[] = [
  { id: 'venus-hiroshi-sun', name: 'Hiroshi Sun', people: 'humain', planet: 'venus', cost: 1,
    effects: [
      { k: 'influence', amount: 1, on: 'venus' },
      { k: 'credits', amount: 4, target: 'self' },
      { k: 'optional', effects: [{ k: 'giveOpponent', resource: 'zenithium', amount: 1 }, { k: 'influence', amount: 1, on: 'mars' }] },
    ] },
  { id: 'venus-geronimo', name: 'Geronimo', people: 'animod', planet: 'venus', cost: 2,
    effects: [
      { k: 'influence', amount: 1, on: 'venus' },
      { k: 'creditsPerCardColors', zone: 'self', per: 2 },
    ] },
  { id: 'venus-luc4s', name: 'Luc4s', people: 'robot', planet: 'venus', cost: 2,
    effects: [
      { k: 'influence', amount: 1, on: 'venus' },
      { k: 'scale', tiers: [
        { cost: [{ k: 'exile', side: 'self', count: 2, corresponding: true }], reward: [{ k: 'zenithium', amount: 2, target: 'self' }] },
        { cost: [{ k: 'exile', side: 'self', count: 4, corresponding: true }], reward: [{ k: 'zenithium', amount: 4, target: 'self' }] },
        { cost: [{ k: 'exile', side: 'self', count: 7, corresponding: true }], reward: [{ k: 'zenithium', amount: 7, target: 'self' }] },
      ] },
    ] },
  { id: 'venus-as1mov', name: 'As1møv', people: 'robot', planet: 'venus', cost: 10,
    effects: [
      { k: 'influence', amount: 1, on: 'venus' },
      { k: 'optional', effects: [{ k: 'developDiscounted', which: 'choice', discount: 2 }] },
    ] },
  { id: 'venus-c1x1n', name: 'C1x1n', people: 'robot', planet: 'venus', cost: 4,
    effects: [
      { k: 'influence', amount: 1, on: 'venus' },
      { k: 'conditional', cond: { c: 'hasLeaderBadge' }, effects: [{ k: 'influence', amount: 1, on: 'venus' }] },
    ] },
  { id: 'venus-felis', name: 'Felis', people: 'animod', planet: 'venus', cost: 3,
    effects: [
      { k: 'influence', amount: 1, on: 'venus' },
      { k: 'zenithium', amount: 3, target: 'self' },
      { k: 'zenithium', amount: 1, target: 'opponent' },
    ] },
  { id: 'venus-moussa', name: 'Moussa', people: 'animod', planet: 'venus', cost: 2,
    effects: [
      { k: 'influence', amount: 1, on: 'venus' },
      { k: 'scale', tiers: [
        { cost: [{ k: 'zenithium', amount: -1, target: 'self' }], reward: [{ k: 'credits', amount: 4, target: 'self' }] },
        { cost: [{ k: 'zenithium', amount: -2, target: 'self' }], reward: [{ k: 'credits', amount: 8, target: 'self' }] },
        { cost: [{ k: 'zenithium', amount: -3, target: 'self' }], reward: [{ k: 'credits', amount: 12, target: 'self' }] },
      ] },
    ] },
  { id: 'venus-v4n-vogt', name: 'V4n Vøgt', people: 'robot', planet: 'venus', cost: 6,
    effects: [
      { k: 'influence', amount: 1, on: 'venus' },
      { k: 'zenithium', amount: 2, target: 'opponent' },
    ] },
  { id: 'venus-stessy-power', name: 'Stessy Power', people: 'humain', planet: 'venus', cost: 3,
    effects: [
      { k: 'influence', amount: 1, on: 'venus' },
      { k: 'scale', tiers: [
        { cost: [{ k: 'zenithium', amount: -1, target: 'self' }], reward: [{ k: 'influenceChoiceExcept', exceptColor: 'venus', amount: 1 }] },
        { cost: [{ k: 'zenithium', amount: -2, target: 'self' }], reward: [{ k: 'influenceChoiceExcept', exceptColor: 'venus', amount: 2 }] },
        { cost: [{ k: 'zenithium', amount: -4, target: 'self' }], reward: [{ k: 'influenceChoiceExcept', exceptColor: 'venus', amount: 3 }] },
      ] },
    ] },
  { id: 'venus-br4dbury', name: 'Br4dbury', people: 'robot', planet: 'venus', cost: 6,
    effects: [
      { k: 'influence', amount: 1, on: 'venus' },
      { k: 'optional', effects: [{ k: 'developDiscounted', which: 'cardPeople', discount: 1 }] },
    ] },
  { id: 'venus-doc-wissen', name: 'Doc Wissen', people: 'humain', planet: 'venus', cost: 6,
    effects: [
      { k: 'influence', amount: 1, on: 'venus' },
      { k: 'optional', effects: [{ k: 'developDiscounted', which: 'cardPeople', discount: 1 }] },
    ] },
  { id: 'venus-cresus', name: 'Cresus', people: 'animod', planet: 'venus', cost: 1,
    effects: [
      { k: 'influence', amount: 1, on: 'venus' },
      { k: 'credits', amount: 6, target: 'self' },
    ] },
  { id: 'venus-pachacuti', name: 'Pachacuti', people: 'animod', planet: 'venus', cost: 3,
    effects: [
      { k: 'influence', amount: 1, on: 'venus' },
      { k: 'scale', tiers: [
        { cost: [{ k: 'exile', side: 'self', count: 2, corresponding: true }], reward: [{ k: 'influence', amount: 1, on: 'venus' }] },
        { cost: [{ k: 'exile', side: 'self', count: 4, corresponding: true }], reward: [{ k: 'influence', amount: 2, on: 'venus' }] },
        { cost: [{ k: 'exile', side: 'self', count: 7, corresponding: true }], reward: [{ k: 'influence', amount: 3, on: 'venus' }] },
      ] },
    ] },
  { // TODO(rules): "gagner du ZÉNITHIUM selon le nb de technos ≥ niv.1" non exprimable :
    // creditsPerTechLevels donne des CRÉDITS, pas du zénithium ; aucun atome zenithiumPerTechLevels.
    // Montant exact de la récompense également à confirmer (feuille). Transcrit avec le seul 1er effet.
    id: 'venus-ilda-flores', name: 'Ilda Flores', people: 'humain', planet: 'venus', cost: 1,
    effects: [
      { k: 'influence', amount: 1, on: 'venus' },
    ] },
  { id: 'venus-professor-zed', name: 'Professor Zed', people: 'humain', planet: 'venus', cost: 9,
    effects: [
      { k: 'influence', amount: 1, on: 'venus' },
      { k: 'zenithium', amount: 4, target: 'self' },
    ] },
  { id: 'venus-king-harold', name: 'King Harold', people: 'humain', planet: 'venus', cost: 6,
    effects: [
      { k: 'influence', amount: 1, on: 'venus' },
      { k: 'influence', amount: 1, on: 'terra' },
      { k: 'takeLeader', side: 'silver' },
    ] },
  { id: 'venus-bujold', name: 'Bujøld', people: 'robot', planet: 'venus', cost: 7,
    effects: [
      { k: 'influence', amount: 1, on: 'venus' },
      { k: 'optional', effects: [{ k: 'developLowest' }] },
    ] },
  { id: 'venus-archimedes', name: 'Archimedes', people: 'animod', planet: 'venus', cost: 6,
    effects: [
      { k: 'influence', amount: 1, on: 'venus' },
      { k: 'optional', effects: [{ k: 'developDiscounted', which: 'cardPeople', discount: 1 }] },
    ] },
];
```

Puis :

```typescript
export const CARDS: CardDef[] = [...MARS_CARDS, ...MERCURE_CARDS, ...VENUS_CARDS];
```

- [ ] **Step 4: Lancer les tests du catalogue**

Run: `npx jest src/data/__tests__/cards.test.ts`
Expected: PASS (Mars/Mercure/Vénus = 18 chacun).

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: aucune erreur.

- [ ] **Step 6: Commit**

```bash
git add src/data/cards.ts src/data/__tests__/cards.test.ts
git commit -m "feat(data): transcription Vénus (18 cartes)"
```

**Rapport de tâche attendu** : TODO(rules) bloquant `venus-ilda-flores` (récompense en zénithium selon technos niv.1 — atome manquant `zenithiumPerTechLevels`). Rappel note « payer X zénithium » (Moussa, Stessy Power) : coût = gain négatif, non borné par la solvabilité (comportement moteur pré-existant).

---

## Task 4: Transcription Terra (18 cartes)

L'implémenteur relit `docs/content/cartes-terra.md` + le lexique + la table de correspondance. **Attention** : 3 cartes (`terra-h3rb3rt`, `terra-sir-sam`, `terra-helena-kerr`) ont une planète de bandeau **non confirmée** (classées Terra par défaut, cf. note en tête de feuille) — on conserve `planet:'terra'` et on le mentionne au rapport (arbitrage utilisateur = hors périmètre).

**Files:**
- Modify: `src/data/cards.ts`
- Modify: `src/data/__tests__/cards.test.ts`

**Interfaces:**
- Consumes: catalogue des tâches 1–3.
- Produces: `export const TERRA_CARDS: CardDef[]` (18) ; `CARDS` étendu.

- [ ] **Step 1: Test de comptage Terra (échoue)**

```typescript
// src/data/__tests__/cards.test.ts — ajouter :
import { TERRA_CARDS } from '../cards';

test('Terra : 18 cartes', () => {
  expect(TERRA_CARDS).toHaveLength(18);
  expect(TERRA_CARDS.every((c) => c.planet === 'terra')).toBe(true);
});
```

- [ ] **Step 2: Lancer, vérifier l'échec**

Run: `npx jest src/data/__tests__/cards.test.ts -t Terra`
Expected: FAIL — `TERRA_CARDS` undefined.

- [ ] **Step 3: Ajouter `TERRA_CARDS` et l'inclure dans `CARDS`**

```typescript
// src/data/cards.ts — ajouter :
export const TERRA_CARDS: CardDef[] = [
  { id: 'terra-charlemagne', name: 'Charlemagne', people: 'animod', planet: 'terra', cost: 8,
    effects: [
      { k: 'influence', amount: 1, on: 'terra' },
      { k: 'influence', amount: 1, on: 'choice' },
      { k: 'influenceDifferent', amount: 1 },
      { k: 'influenceDifferent', amount: 1 },
    ] },
  { id: 'terra-v3rn3', name: 'V3rn3', people: 'robot', planet: 'terra', cost: 2,
    effects: [
      { k: 'influence', amount: 1, on: 'terra' },
      { k: 'scale', tiers: [
        { cost: [{ k: 'exile', side: 'self', count: 2, corresponding: true }], reward: [{ k: 'zenithium', amount: 2, target: 'self' }] },
        { cost: [{ k: 'exile', side: 'self', count: 4, corresponding: true }], reward: [{ k: 'zenithium', amount: 4, target: 'self' }] },
        { cost: [{ k: 'exile', side: 'self', count: 7, corresponding: true }], reward: [{ k: 'zenithium', amount: 7, target: 'self' }] },
      ] },
    ] },
  { id: 'terra-gilgamesh', name: 'Gilgamesh', people: 'animod', planet: 'terra', cost: 9,
    effects: [
      { k: 'influence', amount: 1, on: 'terra' },
      { k: 'influence', amount: 1, on: 'choice' },
      { k: 'influence', amount: 1, on: 'choice' },
    ] },
  { id: 'terra-brussolo', name: 'Brussoløc', people: 'robot', planet: 'terra', cost: 1,
    effects: [
      { k: 'influence', amount: 1, on: 'terra' },
      { k: 'zenithium', amount: 1, target: 'self' },
    ] },
  { id: 'terra-ice-june', name: 'Ice June', people: 'humain', planet: 'terra', cost: 4,
    effects: [
      { k: 'influence', amount: 1, on: 'terra' },
      { k: 'discardHand', count: 1, thenInfluence: true },
    ] },
  { id: 'terra-m4th3son', name: 'M4th3søn', people: 'robot', planet: 'terra', cost: 4,
    effects: [
      { k: 'influence', amount: 1, on: 'terra' },
      { k: 'conditional', cond: { c: 'hasLeaderBadge' }, effects: [{ k: 'influence', amount: 1, on: 'terra' }] },
    ] },
  { // effet 2 FACULTATIF (give-* enveloppé), effet 3 OBLIGATOIRE.
    // TODO(rules): "≠ Terra" côté adversaire non exprimable (giveInfluenceOpponent sans exclusion). Mineur.
    id: 'terra-baron-goro', name: 'Baron Goro', people: 'humain', planet: 'terra', cost: 4,
    effects: [
      { k: 'influence', amount: 1, on: 'terra' },
      { k: 'optional', effects: [{ k: 'giveInfluenceOpponent', amount: 1 }] },
      { k: 'zenithium', amount: 3, target: 'self' },
    ] },
  { id: 'terra-elisabeth', name: 'Elisabeth', people: 'animod', planet: 'terra', cost: 2,
    effects: [
      { k: 'influence', amount: 1, on: 'terra' },
      { k: 'exile', side: 'self', count: 1, corresponding: true },
      { k: 'zenithium', amount: 1, target: 'self' },
    ] },
  { id: 'terra-augustus', name: 'Augustus', people: 'animod', planet: 'terra', cost: 10,
    effects: [
      { k: 'influence', amount: 1, on: 'terra' },
      { k: 'influence', amount: 1, on: 'choice' },
      { k: 'influence', amount: 1, on: 'choice' },
      { k: 'influence', amount: 1, on: 'choice' },
    ] },
  { id: 'terra-sneaky-jules', name: 'Sneaky Jules', people: 'humain', planet: 'terra', cost: 1,
    effects: [
      { k: 'influence', amount: 1, on: 'terra' },
      { k: 'credits', amount: 4, target: 'self' },
      { k: 'optional', effects: [{ k: 'giveOpponent', resource: 'zenithium', amount: 1 }, { k: 'influence', amount: 2, on: 'choice' }] },
    ] },
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
  { id: 'terra-zenon', name: 'Zenon', people: 'animod', planet: 'terra', cost: 1,
    effects: [
      { k: 'influence', amount: 1, on: 'terra' },
      { k: 'credits', amount: 8, target: 'self' },
      { k: 'credits', amount: 2, target: 'opponent' },
    ] },
  { id: 'terra-lord-creep', name: 'Lord Creep', people: 'humain', planet: 'terra', cost: 5,
    effects: [
      { k: 'influence', amount: 1, on: 'terra' },
      { k: 'influence', amount: 1, on: 'choice' },
      { k: 'takeLeader', side: 'silver' },
    ] },
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
  { // Planète de bandeau NON confirmée (classée Terra par défaut).
    id: 'terra-sir-sam', name: 'Sir Sam', people: 'humain', planet: 'terra', cost: 7,
    effects: [
      { k: 'influence', amount: 1, on: 'terra' },
      { k: 'moveDiscToCenter' },
    ] },
  { // Planète de bandeau NON confirmée (classée Terra par défaut). exceptColor = couleur du bandeau (terra par défaut).
    id: 'terra-helena-kerr', name: 'Helena Kerr', people: 'humain', planet: 'terra', cost: 6,
    effects: [
      { k: 'influence', amount: 1, on: 'terra' },
      { k: 'influenceChoiceExcept', exceptColor: 'terra', amount: 1 },
    ] },
  { id: 'terra-f4rm3r', name: 'F4rm3r', people: 'robot', planet: 'terra', cost: 6,
    effects: [
      { k: 'influence', amount: 1, on: 'terra' },
      { k: 'influence', amount: 1, on: 'choice' },
      { k: 'influenceDifferent', amount: 1 },
    ] },
  { id: 'terra-tiberius', name: 'Tiberius', people: 'animod', planet: 'terra', cost: 3,
    effects: [
      { k: 'influence', amount: 1, on: 'terra' },
      { k: 'scale', tiers: [
        { cost: [{ k: 'exile', side: 'self', count: 2, corresponding: true }], reward: [{ k: 'influence', amount: 1, on: 'terra' }] },
        { cost: [{ k: 'exile', side: 'self', count: 4, corresponding: true }], reward: [{ k: 'influence', amount: 2, on: 'terra' }] },
        { cost: [{ k: 'exile', side: 'self', count: 7, corresponding: true }], reward: [{ k: 'influence', amount: 3, on: 'terra' }] },
      ] },
    ] },
];
```

Puis :

```typescript
export const CARDS: CardDef[] = [...MARS_CARDS, ...MERCURE_CARDS, ...VENUS_CARDS, ...TERRA_CARDS];
```

- [ ] **Step 4: Lancer les tests du catalogue**

Run: `npx jest src/data/__tests__/cards.test.ts`
Expected: PASS (4 couleurs = 18 chacune).

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: aucune erreur.

- [ ] **Step 6: Commit**

```bash
git add src/data/cards.ts src/data/__tests__/cards.test.ts
git commit -m "feat(data): transcription Terra (18 cartes)"
```

**Rapport de tâche attendu** : TODO(rules) `terra-l0v3cr4ft` et `terra-h3rb3rt` (exil d'une couleur précise non épinglable) ; TODO mineur `terra-baron-goro` (≠Terra côté adversaire) ; caveat données : `terra-h3rb3rt`/`terra-sir-sam`/`terra-helena-kerr` = planète de bandeau non confirmée. Les 5 cartes historiquement ❓ concernées ici : `terra-ice-june` ✓, `terra-sir-sam` ✓ (moveDiscToCenter), `terra-h3rb3rt` = TODO (expressivité exil).

---

## Task 5: Transcription Jupiter (18 cartes)

L'implémenteur relit `docs/content/cartes-jupiter.md` + le lexique + la table. **Attention** : 9 cartes ont une couleur de bandeau marquée ❓ (à confirmer visuellement Jupiter vs Terra/Mercure) et 5 cartes ont été reclassées Terra→Jupiter — on conserve `planet:'jupiter'` conformément à la feuille et on le mentionne au rapport (arbitrage utilisateur = hors périmètre).

**Files:**
- Modify: `src/data/cards.ts`
- Modify: `src/data/__tests__/cards.test.ts`

**Interfaces:**
- Consumes: catalogue des tâches 1–4.
- Produces: `export const JUPITER_CARDS: CardDef[]` (18) ; `CARDS` complet = 90 cartes.

- [ ] **Step 1: Test de comptage Jupiter + total 90 (échoue)**

```typescript
// src/data/__tests__/cards.test.ts — ajouter :
import { JUPITER_CARDS } from '../cards';

test('Jupiter : 18 cartes', () => {
  expect(JUPITER_CARDS).toHaveLength(18);
  expect(JUPITER_CARDS.every((c) => c.planet === 'jupiter')).toBe(true);
});

test('catalogue complet : 90 cartes', () => {
  expect(CARDS).toHaveLength(90);
});
```

- [ ] **Step 2: Lancer, vérifier l'échec**

Run: `npx jest src/data/__tests__/cards.test.ts -t Jupiter`
Expected: FAIL — `JUPITER_CARDS` undefined.

- [ ] **Step 3: Ajouter `JUPITER_CARDS` et finaliser `CARDS`**

```typescript
// src/data/cards.ts — ajouter :
export const JUPITER_CARDS: CardDef[] = [
  { id: 'jupiter-ch4mb3rs', name: 'Ch4mb3rs', people: 'robot', planet: 'jupiter', cost: 8,
    effects: [
      { k: 'influence', amount: 1, on: 'jupiter' },
      { k: 'zenithium', amount: 3, target: 'self' },
      { k: 'conditional', cond: { c: 'hasLeaderBadge' }, effects: [{ k: 'zenithium', amount: 1, target: 'self' }] },
    ] },
  { id: 'jupiter-arnulf', name: 'Arnulf', people: 'animod', planet: 'jupiter', cost: 3,
    effects: [
      { k: 'influence', amount: 1, on: 'jupiter' },
      { k: 'scale', tiers: [
        { cost: [{ k: 'exile', side: 'self', count: 2, corresponding: true }], reward: [{ k: 'influence', amount: 1, on: 'jupiter' }] },
        { cost: [{ k: 'exile', side: 'self', count: 4, corresponding: true }], reward: [{ k: 'influence', amount: 2, on: 'jupiter' }] },
        { cost: [{ k: 'exile', side: 'self', count: 7, corresponding: true }], reward: [{ k: 'influence', amount: 3, on: 'jupiter' }] },
      ] },
    ] },
  { id: 'jupiter-gibson', name: 'Gibsøn', people: 'robot', planet: 'jupiter', cost: 4,
    effects: [
      { k: 'influence', amount: 1, on: 'jupiter' },
      { k: 'transfer', count: 2, from: 'choice' },
      { k: 'optional', effects: [{ k: 'giveLeaderBadge' }, { k: 'transfer', count: 2, from: 'choice' }] },
    ] },
  { id: 'jupiter-annie', name: 'Annie', people: 'animod', planet: 'jupiter', cost: 1,
    effects: [
      { k: 'influence', amount: 1, on: 'jupiter' },
      { k: 'credits', amount: 5, target: 'self' },
      { k: 'optional', effects: [{ k: 'giveLeaderBadge' }, { k: 'credits', amount: 7, target: 'self' }] },
    ] },
  { id: 'jupiter-captain-andreev', name: 'Captain Andreev', people: 'humain', planet: 'jupiter', cost: 4,
    effects: [
      { k: 'influence', amount: 1, on: 'jupiter' },
      { k: 'optional', effects: [{ k: 'creditsFromCardValue', source: 'transfer' }] },
    ] },
  { id: 'jupiter-m4rt1n', name: 'M4rt1n', people: 'robot', planet: 'jupiter', cost: 4,
    effects: [
      { k: 'influence', amount: 1, on: 'jupiter' },
      { k: 'conditional', cond: { c: 'hasLeaderBadge' }, effects: [{ k: 'influence', amount: 1, on: 'jupiter' }] },
    ] },
  { id: 'jupiter-lisa-charity', name: 'Lisa Charity', people: 'humain', planet: 'jupiter', cost: 2,
    effects: [
      { k: 'influence', amount: 1, on: 'jupiter' },
      { k: 'zenithium', amount: 2, target: 'self' },
      { k: 'credits', amount: 3, target: 'opponent' },
    ] },
  { id: 'jupiter-agent-ezra', name: 'Agent Ezra', people: 'humain', planet: 'jupiter', cost: 1,
    effects: [
      { k: 'influence', amount: 1, on: 'jupiter' },
      { k: 'credits', amount: 4, target: 'self' },
      { k: 'optional', effects: [{ k: 'giveOpponent', resource: 'zenithium', amount: 1 }, { k: 'influence', amount: 1, on: 'venus' }] },
    ] },
  { id: 'jupiter-queen-suzanne', name: 'Queen Suzanne', people: 'humain', planet: 'jupiter', cost: 10,
    effects: [
      { k: 'influence', amount: 1, on: 'jupiter' },
      { k: 'influence', amount: 2, on: 'choice' },
      { k: 'zenithium', amount: 2, target: 'self' },
      { k: 'takeLeader', side: 'gold' },
    ] },
  { id: 'jupiter-milady-jones', name: 'Milady Jones', people: 'humain', planet: 'jupiter', cost: 6,
    effects: [
      { k: 'influence', amount: 1, on: 'jupiter' },
      { k: 'influence', amount: 1, on: 'terra' },
      { k: 'takeLeader', side: 'silver' },
    ] },
  { id: 'jupiter-b4rj4v3l', name: 'B4rj4v3l', people: 'robot', planet: 'jupiter', cost: 2,
    effects: [
      { k: 'influence', amount: 1, on: 'jupiter' },
      { k: 'scale', tiers: [
        { cost: [{ k: 'exile', side: 'self', count: 2, corresponding: true }], reward: [{ k: 'zenithium', amount: 2, target: 'self' }] },
        { cost: [{ k: 'exile', side: 'self', count: 4, corresponding: true }], reward: [{ k: 'zenithium', amount: 4, target: 'self' }] },
        { cost: [{ k: 'exile', side: 'self', count: 7, corresponding: true }], reward: [{ k: 'zenithium', amount: 7, target: 'self' }] },
      ] },
    ] },
  { id: 'jupiter-ivan', name: 'Ivan', people: 'animod', planet: 'jupiter', cost: 1,
    effects: [
      { k: 'influence', amount: 1, on: 'jupiter' },
      { k: 'creditsPerCardColors', zone: 'opponent', per: 2 },
    ] },
  { // TODO(rules): "exiler X cartes de la MAIN adverse → gagner X crédits" non exprimable
    // (pas d'exil de la main adverse ; X = nombre choisi, crédits = X et non la valeur des cartes). Transcrit avec le seul 1er effet.
    id: 'jupiter-bajazet', name: 'Bajazet', people: 'animod', planet: 'jupiter', cost: 3,
    effects: [
      { k: 'influence', amount: 1, on: 'jupiter' },
    ] },
  { id: 'jupiter-geta', name: 'Geta', people: 'animod', planet: 'jupiter', cost: 3,
    effects: [
      { k: 'influence', amount: 1, on: 'jupiter' },
      { k: 'choice', options: [[{ k: 'takeLeader', side: 'gold' }], [{ k: 'credits', amount: 8, target: 'self' }]] },
    ] },
  { id: 'jupiter-donald-smooth', name: 'Donald Smooth', people: 'humain', planet: 'jupiter', cost: 2,
    effects: [
      { k: 'influence', amount: 1, on: 'jupiter' },
      { k: 'optional', effects: [{ k: 'creditsFromCardValue', source: 'discardHand' }] },
    ] },
  { id: 'jupiter-suleiman', name: 'Suleiman', people: 'animod', planet: 'jupiter', cost: 1,
    effects: [
      { k: 'influence', amount: 1, on: 'jupiter' },
      { k: 'scale', tiers: [
        { cost: [{ k: 'exile', side: 'self', count: 3, corresponding: true }], reward: [{ k: 'influenceChoiceExcept', exceptColor: 'jupiter', amount: 1 }] },
        { cost: [{ k: 'exile', side: 'self', count: 7, corresponding: true }], reward: [{ k: 'influenceChoiceExcept', exceptColor: 'jupiter', amount: 2 }] },
        { cost: [{ k: 'exile', side: 'self', count: 12, corresponding: true }], reward: [{ k: 'influenceChoiceExcept', exceptColor: 'jupiter', amount: 3 }] },
      ] },
    ] },
  { id: 'jupiter-pkdick', name: 'P.K.Dick', people: 'robot', planet: 'jupiter', cost: 5,
    effects: [
      { k: 'influence', amount: 1, on: 'jupiter' },
      { k: 'influence', amount: 1, on: 'choice' },
      { k: 'conditional', cond: { c: 'hasLeaderBadge' }, effects: [{ k: 'zenithium', amount: 1, target: 'self' }] },
    ] },
  { id: 'jupiter-thompson', name: 'Thømpsøn', people: 'robot', planet: 'jupiter', cost: 8,
    effects: [
      { k: 'influence', amount: 1, on: 'jupiter' },
      { k: 'influence', amount: 2, on: 'choice' },
      { k: 'conditional', cond: { c: 'creditsAtLeast', amount: 6 }, effects: [{ k: 'influenceDifferent', amount: 1 }] },
    ] },
];

export const CARDS: CardDef[] = [
  ...MARS_CARDS, ...MERCURE_CARDS, ...VENUS_CARDS, ...TERRA_CARDS, ...JUPITER_CARDS,
];
```

- [ ] **Step 4: Lancer les tests du catalogue**

Run: `npx jest src/data/__tests__/cards.test.ts`
Expected: PASS — 90 cartes, 18 par couleur, ids uniques, 1er effet influence, give-* enveloppés.

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: aucune erreur.

- [ ] **Step 6: Commit**

```bash
git add src/data/cards.ts src/data/__tests__/cards.test.ts
git commit -m "feat(data): transcription Jupiter (18 cartes) — catalogue 90 complet"
```

**Rapport de tâche attendu** : TODO(rules) bloquant `jupiter-bajazet` (exil main adverse → crédits). Caveats données : 9 cartes ❓ couleur de bandeau + 5 reclassées Terra→Jupiter (planète conservée telle quelle par la feuille). Vérifier qu'aucune carte des 90 n'exige `influenceOpponentSide` (« influence sur une planète du côté de l'adversaire », NON implémenté) — attendu : aucune ne l'utilise (les seules interactions adverses sont des `give*`, déjà couverts).

---

## Task 6: Intégration — brancher `cardOf` + deck de `setup` sur les 90 cartes réelles

**Stratégie retenue** : catalogue `cardOf` = **fusion** `{ ...FIXTURE_CARDS, ...CARDS }` (les ids réels ET les ids `FIX_*` résolvent — évite de réécrire les scénarios déterministes de `moves.test.ts` / `effects-atoms.test.ts`). Deck par défaut de `createGame` = **les 90 cartes réelles** (`CARDS`). `FIXTURE_CARDS` / `FIXTURE_NON_CANONICAL` restent exportés et testés comme doublures. Aucune tautologie : `fixtures.test.ts` continue de tester les fixtures pour elles-mêmes ; les tests moteur gardent leurs assertions de comportement.

**Files:**
- Modify: `src/engine/effects.ts:1-16`
- Modify: `src/engine/setup.ts:12,36`
- Modify: `src/engine/__tests__/setup.test.ts:40-44`
- Test: `src/engine/__tests__/effects.test.ts` (ajout d'un test de résolution de catalogue)

**Interfaces:**
- Consumes: `CARDS` (`src/data/cards.ts`, Task 5) ; `FIXTURE_CARDS` (`src/data/fixtures.ts`).
- Produces: `cardOf(id)` résout tout id réel + `FIX_*` ; `createGame(config, seed)` distribue le deck réel (90 cartes).

- [ ] **Step 1: Écrire le test de résolution de catalogue (échoue)**

```typescript
// src/engine/__tests__/effects.test.ts — ajouter :
import { cardOf } from '../effects';

test('cardOf résout les ids réels ET les ids fixture', () => {
  expect(cardOf('mars-caesar')?.planet).toBe('mars');
  expect(cardOf('jupiter-queen-suzanne')?.people).toBe('humain');
  expect(cardOf('FIX_mars_0')?.planet).toBe('mars'); // fixtures toujours résolues
  expect(cardOf('id-inexistant')).toBeUndefined();
});
```

- [ ] **Step 2: Lancer, vérifier l'échec**

Run: `npx jest src/engine/__tests__/effects.test.ts -t "cardOf résout"`
Expected: FAIL — `cardOf('mars-caesar')` renvoie `undefined` (catalogue = fixtures seules).

- [ ] **Step 3: Fusionner le catalogue dans `effects.ts`**

Remplacer les lignes 1–16 de `src/engine/effects.ts` (imports + `CARDS`/`cardOf`) par :

```typescript
import { gainInfluence } from './influence';
import type { CardDef } from '../data/types';
import { FIXTURE_CARDS } from '../data/fixtures';
import { CARDS as REAL_CARDS } from '../data/cards';
import { PLANETS, PEOPLES } from './types';
import type { BoardTokenSlot, Condition, Effect, EffectCtx, GameState, People, Planet, PlayerIndex, PlayerState, Side } from './types';
import { shuffle } from './rng';
import { tokenOf } from '../data/tokens';
import { CENTER } from './setup';
import { developTech } from './develop';
import { activeFace } from '../data/tech';

// Catalogue = fusion des fixtures (doublures de test) et du contenu réel : les ids réels ET
// les ids FIX_* résolvent. Les ids sont disjoints par convention, aucune collision attendue.
const CATALOG: Record<string, CardDef> = Object.fromEntries(
  [...FIXTURE_CARDS, ...REAL_CARDS].map((c) => [c.id, c]),
);
export function cardOf(id: string): CardDef | undefined {
  return CATALOG[id];
}
```

- [ ] **Step 4: Basculer le deck par défaut de `createGame`**

Dans `src/engine/setup.ts`, remplacer l'import ligne 12 :

```typescript
import { CARDS } from '../data/cards';
```

et la signature ligne 36 :

```typescript
export function createGame(config: GameConfig, seed: number, deck: CardDef[] = CARDS): GameState {
```

(`FIXTURE_CARDS` n'est plus importé par `setup.ts`.)

- [ ] **Step 5: Adapter `setup.test.ts` (comptage du paquet)**

Remplacer le test « aucune carte perdue » :

```typescript
test('aucune carte perdue : main0 + main1 + deck = tout le paquet', () => {
  const s = createGame(CONFIG, 5);
  const total = s.players[0].hand.length + s.players[1].hand.length + s.deck.length;
  expect(total).toBe(90); // catalogue réel CARDS (5 x 18)
});
```

- [ ] **Step 6: Lancer la suite complète**

Run: `npm test`
Expected: PASS. La bascule du deck par défaut n'impacte que `setup.test.ts` (adapté) ; `moves.test.ts` et `effects-atoms.test.ts` injectent leurs ids `FIX_*` manuellement (résolus par la fusion) ou piochent défensivement par `.find(...)`. Si une assertion dépendante du deck fixture casse de façon inattendue, la corriger a minima **sans neutraliser** l'assertion de comportement (documenter le changement dans le rapport). En dernier recours seulement, restaurer `createGame(..., deck = FIXTURE_CARDS)` par défaut et faire passer `CARDS` explicitement depuis `sim.selfPlay` (Task 7).

- [ ] **Step 7: Typecheck**

Run: `npm run typecheck`
Expected: aucune erreur.

- [ ] **Step 8: Commit**

```bash
git add src/engine/effects.ts src/engine/setup.ts src/engine/__tests__/setup.test.ts src/engine/__tests__/effects.test.ts
git commit -m "feat(engine): brancher cardOf + deck de setup sur les 90 cartes réelles (fixtures conservées comme doublures)"
```

**Rapport de tâche attendu** : liste des tests adaptés (attendu : uniquement `setup.test.ts`) ; confirmer qu'aucune assertion de comportement n'a été neutralisée.

---

## Task 7: Self-play sur le vrai deck

Le self-play (`sim.selfPlay`) appelle `createGame(config, gameSeed)` : depuis T6, il tourne donc sur les 90 cartes. On met à jour `sim-properties.test.ts` : les parties doivent enfin **progresser au-delà du blocage `stuck`** observé avec le fixture (10 cartes), et on documente la ventilation des issues. Objectif : aucun crash sur les effets interactifs pilotés par le bot (choice/scale/optional/decide/decideTech/decideCard).

**Files:**
- Modify: `src/engine/__tests__/sim-properties.test.ts`

**Interfaces:**
- Consumes: `selfPlay(config, gameSeed, botSeed, maxSteps): SelfPlayResult` (`src/engine/sim.ts`) ; `winnerOf` (`src/engine/influence.ts`).
- Produces: (aucune API nouvelle — tests seulement).

- [ ] **Step 1: Réécrire les tests de propriétés pour le deck réel**

Remplacer intégralement le contenu de `src/engine/__tests__/sim-properties.test.ts` par :

```typescript
import { selfPlay, type SelfPlayResult } from '../sim';
import { winnerOf } from '../influence';

const CONFIG = { techSetup: { animod: 'S', humain: 'U', robot: 'N' }, firstPlayer: 0 } as const;
const SEEDS = Array.from({ length: 50 }, (_, i) => i + 1);

test('aucune partie ne lève d’exception et toutes terminent dans le plafond', () => {
  for (const seed of SEEDS) {
    const res = selfPlay(CONFIG, seed, seed * 7 + 1, 1000);
    expect(res.moves).toBeLessThanOrEqual(1000);
    if (res.outcome === 'winner') {
      expect(res.winner).not.toBeNull();
      expect(winnerOf(res.state)).toBe(res.winner);
    } else {
      expect(res.winner).toBeNull();
    }
  }
});

// Avec le VRAI deck (90 cartes), les parties progressent : les mains se rechargent et
// les captures de planètes finissent par produire des vainqueurs — contrairement au deck
// fixture (10 cartes) qui bloquait en `stuck` après ~8-10 coups. On vérifie ici que le
// self-play traverse les effets interactifs sans crash ET qu'au moins une graine mène à
// une victoire (le blocage systématique `stuck` du fixture est levé).
test('sur le vrai deck, au moins une graine mène à une victoire (blocage stuck levé)', () => {
  const outcomes: Record<SelfPlayResult['outcome'], number> = { winner: 0, stuck: 0, maxSteps: 0 };
  for (const seed of SEEDS) {
    const res = selfPlay(CONFIG, seed, seed * 3 + 2, 1000);
    expect(['winner', 'stuck', 'maxSteps']).toContain(res.outcome);
    outcomes[res.outcome]++;
  }
  expect(outcomes.winner + outcomes.stuck + outcomes.maxSteps).toBe(SEEDS.length);
  expect(outcomes.winner).toBeGreaterThan(0); // au moins une victoire sur 50 graines
});
```

- [ ] **Step 2: Lancer les tests de propriétés**

Run: `npx jest src/engine/__tests__/sim-properties.test.ts`
Expected: PASS. Si `outcomes.winner` vaut 0 (aucune victoire), NE PAS affaiblir l'assertion : investiguer via la sous-compétence `superpowers:systematic-debugging` (le bot boucle-t-il ? un effet interactif est-il ignoré ?) et documenter. La ventilation réelle (winner/stuck/maxSteps + médiane/max de coups) est à consigner dans le rapport.

- [ ] **Step 3: Vérifier l'absence de crash sur un balayage large (diagnostic)**

Run: `npx jest src/engine/__tests__/sim-properties.test.ts --verbose`
Expected: les deux tests verts ; aucune exception non capturée dans la sortie.

- [ ] **Step 4: Suite complète + typecheck**

Run: `npm test && npm run typecheck`
Expected: tout vert.

- [ ] **Step 5: Commit**

```bash
git add src/engine/__tests__/sim-properties.test.ts
git commit -m "test(engine): self-play sur le vrai deck (90 cartes) — blocage stuck du fixture levé"
```

**Rapport de tâche attendu** : ventilation observée des 50 parties (winner / stuck / maxSteps), médiane et max de coups, et confirmation qu'aucun effet interactif ne fait planter le bot.

---

## Hors périmètre

- **UI / rendu** : aucune interface ; le livrable est le moteur + les données.
- **Transport / réseau / persistance** : rien.
- **Validation fine par l'utilisateur** : la colonne « Réel » des feuilles, la confirmation visuelle des couleurs de bandeau (9 cartes Jupiter ❓, 3 cartes Terra ❓), la reclassification Terra↔Jupiter, et l'arbitrage des TODO(rules) sont du ressort de l'utilisateur/contrôleur — le plan les **signale**, ne les tranche pas.
- **Ajout d'atomes/combinateurs `Effect`** : explicitement interdit ici. Les effets non couverts (`zenithiumPerTechLevels`, exil de la main adverse, exil d'une couleur précise, exclusion `≠` côté adversaire, mobilize→colonne adverse) sont laissés en TODO(rules) pour une itération ultérieure décidée par l'utilisateur.
- **Bot / heuristique de jeu** : on réutilise le bot aléatoire-légal existant ; pas d'IA de jeu.

## Récapitulatif des TODO(rules) à remonter (effets non couverts par le vocabulaire actuel)

| Carte | Manque | Gravité |
|---|---|---|
| `mars-charlize-gun` | mobiliser vers la colonne ADVERSE | moyenne |
| `mars-lady-moore` | exiler 3 cartes de la MAIN adverse + influence par couleur | bloquante (carte réduite au 1er effet) |
| `mars-titus`, `terra-baron-goro` | exclusion `≠ planète` sur `giveInfluenceOpponent` | mineure |
| `mercure-chaka` | exclusion `≠ Mercure` sur `exile` | mineure |
| `venus-ilda-flores` | récompense en zénithium selon technos ≥ niv.1 (`zenithiumPerTechLevels`) | bloquante (carte réduite au 1er effet) |
| `terra-l0v3cr4ft`, `terra-h3rb3rt` | exiler une carte d'une couleur PRÉCISE (non ctx) | moyenne (encodé best-effort en choix libre) |
| `jupiter-bajazet` | exiler X cartes de la MAIN adverse → X crédits | bloquante (carte réduite au 1er effet) |

Note : `influenceOpponentSide` (lexique « influence sur une planète du côté de l'adversaire », NON implémenté) n'est requis par **aucune** des 90 cartes — à confirmer en T5.

---

## Self-Review

**1. Couverture du spec (objet du brief) :**
- Transcrire les 90 cartes en `src/data/cards.ts` → T1–T5 (18 × 5 = 90). ✓
- Remplacer les fixtures / brancher `cardOf` + deck de setup → T6. ✓ (fixtures conservées comme doublures, stratégie de fusion documentée)
- Self-play sur le vrai deck → T7. ✓
- Règle 1er effet = influence planète → contrainte globale + test T1. ✓
- OBLIG = atomes nus ; FACUL = `optional`/`conditional`/`choice`/`scale` → table de correspondance + exemples dans chaque couleur. ✓
- Règle give-* toujours enveloppé → contrainte globale + test garde-fou T1 (`give-* jamais nus`). ✓
- Effets non couverts → TODO(rules) + remontée au rapport → récap dédié + rappels par tâche. ✓
- 5 cartes ❓ historiques (Ice June, H3RB3RT, Sir Sam, Ilda Flores, Punk Mari) → statut vérifié : Ice June ✓, Sir Sam ✓, Punk Mari ✓, H3RB3RT/Ilda Flores = TODO signalés. ✓
- Churn des ids `FIX_` (setup, moves, sim-properties, effects-atoms, setup, fixtures) → traité par la fusion `cardOf` (résout `FIX_*`) ; seule `setup.test.ts` change son comptage, `sim-properties.test.ts` est réécrit. ✓

**2. Scan des placeholders :** aucun « TBD/à compléter » côté plan ; les 90 cartes ont un encodage `Effect` complet et concret. Les `// TODO(rules)` sont des marqueurs de contenu **volontaires** (effets non exprimables), pas des trous du plan.

**3. Cohérence des types :** `CardDef`, `Effect`, `Planet`, `People` conformes à `src/data/types.ts` et `src/engine/types.ts`. Les combinateurs utilisés (`optional.effects`, `choice.options: Effect[][]`, `scale.tiers: {cost,reward}[]`, `conditional.cond`) correspondent exactement à l'union `Effect`. `cardOf` renommé `CATALOG` en interne pour éviter la collision avec l'export `CARDS`. Signature `createGame(config, seed, deck=CARDS)` inchangée en arité (rétro-compatible).

## Execution Handoff

**Plan complet et sauvegardé dans `docs/superpowers/plans/2026-07-24-zenith-transcription-cartes.md`. Deux options d'exécution :**

**1. Subagent-Driven (recommandé)** — un subagent frais par tâche, revue entre les tâches, itération rapide.

**2. Inline Execution** — exécution des tâches dans cette session via executing-plans, par lots avec points de contrôle.

**Quelle approche ?**

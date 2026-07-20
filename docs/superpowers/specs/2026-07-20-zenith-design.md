# Zenith — Design (application mobile jouable)

> Adaptation numérique **fidèle** du jeu de société **Zenith** (PlayPunk), pour usage personnel.
> Ce document fige l'architecture validée en brainstorming. Il précède le plan d'implémentation.

## 1. Objectif & périmètre

Reproduire Zenith en application mobile **jouable à 2 joueurs**, jouable **hors ligne**, sur **2 téléphones côte à côte** (mode cible). Pas de publication pour l'instant (usage perso ; l'autorisation de l'éditeur serait demandée avant toute diffusion).

**Non-objectifs :** IA forte/stratégique (un simple bot de test suffit) ; mode en ligne à distance ; mode 4 joueurs (2v2) — repoussés/hors périmètre V1.

### Phasage (dérisque le réseau, valide tôt)
1. **Moteur pur** (TypeScript, testé) — toute la logique de Zenith, sans UI ni réseau.
2. **UI Expo + bot de test** sur **un seul appareil** — jeu complet jouable et testable, **sans réseau** (compatible Expo Go).
3. **Liaison locale 2 téléphones** — couche de transport (dev build EAS). Mode cible.

## 2. Principe directeur

**Le moteur ne connaît ni React, ni Expo, ni le réseau.** C'est du TypeScript pur, déterministe, testable en isolation. Tout le reste (UI, bot, transport) dépend du moteur, jamais l'inverse (inversion de dépendances). Respect des guidelines `~/perso/CODING-GUIDELINES.md` (KISS, YAGNI, DRY, SOLID).

## 3. Politique de contenu (règle absolue)

**Aucun effet, coût, icône ou règle n'est inventé.** Le *moteur et les atomes d'effet* sont du code (définis par le lexique officiel, photos dans `docs/lexique-*.jpg`). Le *contenu réel* (90 cartes Agent, configs du plateau Technologie, 16 jetons Bonus, effets de Diplomatie) est **fourni par l'utilisateur** (transcription depuis la boîte). En cas de doute sur une icône/description/action → **demander à l'utilisateur**. Les tests moteur utilisent des **fixtures synthétiques explicitement non canoniques**, jamais présentées comme le vrai jeu.

Sources de référence : `docs/ZE_Rules_FR.pdf` (livret officiel), `docs/lexique-1.jpg` + `docs/lexique-2.jpg` (« Description des effets », p.1 et p.2).

## 4. Organisation du projet (app Expo unique, moteur pur isolé)

```
zenith/
├── src/
│   ├── engine/        TS PUR (aucun import RN/Expo)
│   │   ├── state.ts       modèle d'état (GameState…)
│   │   ├── setup.ts       createGame(config, seed) → état initial
│   │   ├── moves.ts       types de coups, applyMove, legalMoves
│   │   ├── effects.ts     interpréteur d'effets (atomes + combinateurs)
│   │   ├── influence.ts   pistes d'influence (déplacement, capture, victoire)
│   │   ├── rng.ts         aléatoire seedé (déterministe)
│   │   ├── view.ts        playerView(state, joueur) → état filtré
│   │   └── __tests__/
│   ├── data/          DONNéES de contenu (fournies par l'utilisateur)
│   │   ├── types.ts       CardDef, TechConfig, BonusTokenDef, DiplomacyDef
│   │   └── seed/          contenu réel au fil de l'eau (+ fixtures de test étiquetées)
│   ├── bot/           bot de test (choisit un coup légal)
│   ├── app/           écrans Expo (expo-router)
│   ├── ui/            composants d'affichage
│   └── net/           transport local 2 tels (phase 3)
├── docs/              livret PDF, lexique, spec
```

**Stack :** Expo / React Native / TypeScript, `jest`, `expo-router`. Rendu en Views/Flexbox au départ (SVG/Skia plus tard si besoin). Aucune dépendance native avant la phase 3.

## 5. Règles du jeu (résumé implémentable)

- **2 joueurs.** Influence sur **5 planètes** : Mercure, Vénus, Terra, Mars, Jupiter. **3 peuples** : Animod, Humain, Robot.
- **Victoire (fin immédiate)** : **absolue** = 3 disques d'influence d'une **même** planète ; **démocratique** = 4 disques de planètes **différentes** ; **populaire** = 5 disques au total.
- **Piste d'influence** (1 par planète) = 9 emplacements : 1 central, 3 de chaque côté, 2 zones de contrôle (1 par joueur). Un disque part du centre ; gagner 1 influence de sa couleur le déplace d'un cran vers **sa** zone de contrôle. Ramené dans sa zone → le joueur **capture** ce disque (= 1 influence acquise sur cette planète). Excédent au-delà de la zone = perdu. Au **1er** disque capturé d'une planète, le joueur applique le **jeton Bonus** de cette planète puis le défausse. Fin de tour : un nouveau disque est remis au centre pour chaque disque capturé ; les jetons Bonus ne sont **pas** remplacés.
- **Mise en place (2 j.)** : disque de chaque couleur au centre ; plateau Techno assemblé (config **S.U.N.** en 1re partie) ; 6 marqueurs Techno (3 noirs / 3 blancs) sur départs ; 1 jeton Bonus (aléatoire, face visible) sur chacun des 3 emplacements Techno et 5 emplacements Planètes ; badge Leader sur le plateau Diplomatie ; réserve (disques, Crédits, Zénithium, Bonus face cachée). Chaque joueur : **12 Crédits + 1 Zénithium**, **4 cartes** (main initiale, avec option de mulligan total/partiel avant de commencer). Le **2e joueur** reçoit **1 Influence Terra**. Main gardée secrète.
- **Tour de jeu** : jouer **1 carte** pour **UNE** action, puis **fin de tour** (repioche + remise en jeu des disques).
  - **A. Recruter un Agent** : poser la carte dans la colonne de sa planète (empilée, on ne voit que la bande du haut) ; payer le **coût en Crédits réduit de 1 par carte déjà présente dans cette colonne** (peut être gratuit ; jamais de gain si réduction > coût) ; appliquer les **effets de gauche à droite** (toute carte donne ≥ 1 influence sur sa planète).
  - **B. Développer une Technologie** : **défausser** une carte pour développer la techno du **peuple** de la carte (Animod/Humain/Robot) ; payer en **Zénithium** le coût du **niveau suivant** (1→5, sans saut) ; avancer le marqueur ; appliquer l'effet du niveau atteint **et de tous les niveaux inférieurs** de cette colonne. **Bonus de niveau 2** : le 1er des 2 joueurs à atteindre le niveau 2 d'une techno gagne le jeton Bonus associé. **Primes de ligne** : avoir développé les 3 technos au niveau 1 / 2 / 3 → +1 / +2 / +3 influence sur une planète au choix (chacune une seule fois, appliquée après les effets de colonne).
  - **C. Prendre le Leadership** : **défausser** une carte pour l'effet du **peuple** associé — **Robot** : badge Leader + 1 Zénithium ; **Humain** : badge Leader + 3 Crédits ; **Animod** : badge Leader + mobiliser 2 cartes.
- **Badge Leader** : fixe la taille de main (5 côté Argent, 6 côté Or) à respecter en fin de tour ; intervient dans certains effets de cartes. Gagner le badge : si on ne l'a pas → le prendre à l'adversaire, côté Argent ; si déjà Argent → retourner côté Or ; si déjà Or → rien. Certaines cartes le donnent directement côté Or.
- **Fin de tour** : (1) **repiocher** jusqu'à la limite : 4 (sans badge) / 5 (Argent) / 6 (Or). Si des effets ont donné plus de cartes que la limite, on ne pioche ni ne défausse (on garde). (2) **remettre en jeu** les disques d'influence capturés (nouveau disque au centre).
- **FAQ intégrée** (livret p.11) : pioche/réserve épuisée → remélanger la défausse ; jetons Bonus sur plateaux non remplacés ; Recruter applique bien les effets de la carte ; capturer un disque ne défausse pas les cartes de la colonne ; si un effet ne peut pas s'appliquer, on l'ignore ; on peut, via ses propres cartes, faire capturer un disque à l'adversaire (qui applique alors le jeton Bonus) ; prendre ce qu'on peut d'une ressource insuffisante.

## 6. Modèle d'état & moteur

```ts
type Planet = 'mercure'|'venus'|'terra'|'mars'|'jupiter';
type People = 'animod'|'humain'|'robot';
type PlayerIndex = 0 | 1;
type Side = 'self' | 'opponent';

type GameState = {
  config: GameConfig;                 // id de config techno, options
  rng: RngState;                      // { seed, counter } → déterministe
  current: PlayerIndex;
  players: [PlayerState, PlayerState];
  deck: CardId[]; discard: CardId[];
  planets: Record<Planet, PlanetTrack>;
  tech: TechBoardState;
  diplomacy: { leader: PlayerIndex | null; side: 'silver' | 'gold' };
  bonusReserve: BonusTokenId[];       // face cachée
  bonusOnBoards: BonusPlacement[];    // jetons visibles (Planètes/Techno)
  resolution: ResolutionState | null; // file d'effets en cours (reprise après décision)
  pending: PendingDecision | null;    // décision attendue au milieu d'un effet
  winner: PlayerIndex | null;
};

type PlanetTrack = { discPos: number; captured: [number, number]; bonus: BonusTokenId | null };
// discPos : 0..8 ; 4 = centre ; <4 vers la zone du joueur 0, >4 vers celle du joueur 1
//           0 = zone contrôle J0 (capture), 8 = zone contrôle J1 (capture).

type PlayerState = {
  hand: CardId[];
  columns: Record<Planet, CardId[]>;   // piles de cartes Agent posées
  credits: number; zenithium: number;
  techMarkers: Record<People, number>;      // niveau atteint 0..5 par piste
  lineBonusClaimed: { 1: boolean; 2: boolean; 3: boolean };
};

type Move =
  | { t: 'recruit'; cardId: CardId }
  | { t: 'develop'; cardId: CardId; column: People }
  | { t: 'leadership'; cardId: CardId }
  | { t: 'decide'; choice: Decision };   // réponse à `pending`

applyMove(state: GameState, move: Move): GameState   // PUR & déterministe
legalMoves(state: GameState, player: PlayerIndex): Move[]  // actions OU décisions selon `pending`
```

**Réducteur interactif.** `applyMove` joue l'action puis résout les effets **de gauche à droite** via l'interpréteur (§7). Dès qu'un effet réclame un choix, la résolution se **met en pause** : `resolution` conserve la file d'effets restants + le contexte, et `pending` décrit la décision attendue. Un coup `{t:'decide'}` **reprend** la résolution. Quand la file est vide → **fin de tour automatique** (repioche, remise des disques, test de victoire) → main à l'autre joueur. `legalMoves` renvoie les actions légales (hors `pending`) ou les décisions légales (sous `pending`) — utilisé par l'UI, le bot et les tests.

## 7. Système d'effets (data-driven)

Un effet est **de la donnée**, pas du code : une composition d'atomes. Une carte = `effects: Effect[]` (séquence gauche→droite). Mapping direct du lexique officiel (`docs/lexique-*.jpg`).

```ts
type PlanetSelector = Planet | 'choice' | { exclude: Planet } | 'neighbors'
                    | 'twoChosen' | 'opponentSide';
type Element = 'credits' | 'zenithium' | 'card' | 'leaderBadge';

type Effect =
  // — atomes —
  | { k: 'influence'; amount: number; on: PlanetSelector; target?: Side } // défaut self
  | { k: 'credits'; amount: number; target: Side }
  | { k: 'zenithium'; amount: number; target: Side }
  | { k: 'steal'; resource: 'credits'|'zenithium'|'card'; amount: number }   // depuis l'adversaire
  | { k: 'mobilize'; thenInfluence?: boolean }
  | { k: 'transfer'; from: 'sameColor'|'choice'; thenInfluence?: boolean }
  | { k: 'exile'; who: 'own'|'opponent'; gain?: 'cost'|'influence' }
  | { k: 'discardHand'; count: number|'all'; thenInfluence?: boolean }
  | { k: 'discardColumn'; count: 2|4|7; gain: 'zenithium'|'influence' }
  | { k: 'takeLeader'; side: 'silver'|'gold' }
  | { k: 'bonusToken'; source: 'reserve'|'visibleChoice' }
  | { k: 'moveDiscToCenter' }
  | { k: 'develop'; which: 'indicated'|'choice'|'lowest'; reduction: number|'free' }
  | { k: 'creditsPerCardColors'; scope: Side }
  | { k: 'creditsPerTechLevels' }
  // — combinateurs —
  | { k: 'choose'; options: Effect[] }                     //  /  (OU au choix)
  | { k: 'chain'; require: Effect; reward: Effect }        //  ▷  (gauche obligatoire → droite ; le tout renonçable)
  | { k: 'conditional'; ifOwns: Possession; then: Effect } // [!] (gain si possession)
  | { k: 'trade'; give: Element; gain: Effect };           //  ↑  (donner un élément pour recevoir)
```

**Interpréteur** (`effects.ts`) : parcourt la séquence en mutant une copie immuable de l'état ; quand un atome/combinateur nécessite une entrée (couleur au choix, cible d'Exiler/Transférer, branche du OU, oui/non d'un `▷`, choix d'un jeton visible…), il pose `pending` et suspend via `resolution`. Reprise au coup `{t:'decide'}`. **Extensibilité (OCP)** : nouvelle carte = nouvelles données ; effet inédit hors lexique = **on demande à l'utilisateur**, puis éventuellement **un** nouvel atome.

> Atomes dérivés du lexique p.1/p.2. Toute variante non couverte par le lexique sera clarifiée avec l'utilisateur avant implémentation (pas d'invention).

## 8. Données de contenu

```ts
type CardDef = { id: CardId; name: string; people: People; planet: Planet; cost: number; effects: Effect[] };
type TechConfig = Record<'col1'|'col2'|'col3', { people: People; levels: { zenithium: number; effects: Effect[] }[] }>;
type BonusTokenDef = { id: BonusTokenId; effects: Effect[] };
type DiplomacyDef = Record<People, Effect[]>;  // action « Prendre le Leadership »
```

Contenu **vérifié** disponible aujourd'hui : effets de Diplomatie (Robot +1 Zénithium ; Humain +3 Crédits ; Animod mobiliser 2), carte **Nero** (Mercure, coût 7 → +1 influence Mercure, +3 Zénithium). Tout le reste (89 autres cartes, configs Techno dont S.U.N., jetons Bonus) = **à fournir par l'utilisateur**. En attendant, fixtures de test **étiquetées non canoniques** pour exercer le moteur.

## 9. Déterminisme & vues joueur

- **RNG seedé** (`rng.ts`, ex. mulberry32) : mélange du deck, placement aléatoire des jetons Bonus, tout est reproductible depuis `{seed, counter}`.
- **`playerView(state, joueur)`** : état **filtré** pour un joueur — main adverse masquée (nombre seulement), pioche & réserve cachées, `pending` visible seulement s'il concerne ce joueur. L'UI et le client ne consomment que la vue ; l'hôte garde l'état complet autoritatif.

## 10. Bot de test

`bot/pickMove(view, player)` s'appuie sur `legalMoves`. **RandomBot** (coup légal uniforme) d'abord → jeu jouable sur 1 seul appareil + **parties bot-vs-bot en headless** pour valider règles/invariants. Heuristique légère possible plus tard. **Pas d'IA forte.**

## 11. Transport local 2 téléphones (phase 3)

**Hôte autoritatif / client.** L'hôte détient l'état complet, applique les coups, renvoie à chacun sa **vue filtrée**. Le client envoie ses coups, reçoit les vues. Transport : **sockets TCP sur Wi-Fi partagé** (`react-native-tcp-socket`) + code de connexion ou découverte mDNS ; **Bluetooth (BLE)** en alternative. Nécessite un **dev build** (module natif → hors Expo Go ; build une fois via EAS, dev JS instantané ensuite). État persisté en local sur l'hôte (reprise après fermeture). **Différé jusqu'à un jeu jouable stable.**

## 12. UI

Expo + `expo-router`. Écrans : **Accueil** (Nouvelle partie vs Bot / [phase 3] Héberger / Rejoindre) ; **Partie** (5 pistes d'influence avec position des disques, plateau Techno + marqueurs, ma main, infos adversaire, jetons/ressources, invites de décision : choix de planète, de cible, branche du OU). Rendu depuis `playerView`, dispatch de `Move`. Views/Flexbox d'abord ; SVG/Skia envisageable plus tard.

## 13. Tests

- **Unitaires moteur** (`jest`) : chaque atome d'effet ; scénarios du livret (recrutement + réduction de coût, développement techno + primes de ligne, capture de disque + jeton Bonus, badge Leader, conditions de victoire) ; combinateurs (`choose`/`chain`/`conditional`/`trade`) et reprise après `pending`.
- **Sims headless bot-vs-bot** : invariants (disques d'influence conservés, ressources ≥ 0, la partie se termine, `applyMove` déterministe pour un même seed).
- Fixtures de contenu **non canoniques** clairement étiquetées.

## 14. Questions ouvertes / à fournir par l'utilisateur

1. **Contenu complet** (bloquant pour une version fidèle) : 90 cartes Agent, configs Techno (dont S.U.N.) avec coûts/effets par niveau, 16 jetons Bonus. → transcription utilisateur.
2. **Détermination du 1er joueur** : le livret la lie aux « aides de jeu » tirées au hasard ; on modélisera un choix aléatoire (le 2e joueur recevant +1 Influence Terra). À confirmer si une autre règle est souhaitée.
3. **Toute icône/variante d'effet hors lexique p.1/p.2** : demandée à l'utilisateur avant implémentation (règle : aucune invention).
4. **Config Techno de départ** : S.U.N. imposée en 1re partie ; configs aléatoires ensuite (données à fournir).
```

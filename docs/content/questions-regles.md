# Questions de règles (Zenith) — RÉSOLUES

> Journal des points de règle rencontrés pendant le dev. **Toutes confirmées par l'utilisateur
> le 2026-07-21** (« je connais bien le jeu »). Ces réponses font désormais autorité pour
> l'implémentation du contenu réel. **Aucune règle inventée** : ce fichier est la source de vérité.

---

## R0 — Développer une technologie : ré-application cumulative — ✅ CONFIRMÉ
En montant au niveau N d'une techno, on applique l'effet du niveau N **puis** on re-applique ceux des
niveaux inférieurs (N, N-1, …, 1), à **chaque** montée (le niveau 1 est rejoué quand on atteint le 2, etc.).
→ Déjà implémenté ainsi (Plan 3). Rien à changer.

## R1 — `transfer` (S3, N1, P2) — ✅ CONFIRMÉ
Direction **adverse → joueur actif**. Le joueur choisit une colonne adverse non vide ; on déplace sa
**dernière** carte vers **sa propre** colonne (de la couleur/planète au choix). **S3 = transférer 3 cartes**
(couleur au choix). Aucun effet de carte n'est rejoué, aucune influence gagnée par le transfert lui-même.

## R2 — `exile` : destination — ✅ CONFIRMÉ
La carte exilée va à la **défausse** (récupérable au remélange). Pas hors-jeu définitif.

## R3 — P4 (Robot P niv.4) : exil ciblé par couleur — ✅ CONFIRMÉ (corrige l'hypothèse initiale)
« Exiler **2 cartes de couleurs différentes** de son **propre** jeu ; pour chaque carte exilée, gagner
**2 influences** sur la planète de **même couleur** que la carte. »
- La contrainte « 2 couleurs différentes » **est** imposée par le moteur.
- Si une seule colonne (couleur) est non vide : on ne peut exiler qu'**une** carte → on gagne les 2 influences
  de cette couleur seulement, et **on perd** les 2 influences de la seconde couleur (non compensées).

## R4 — Jetons Bonus — ✅ CONFIRMÉ (détail important : ORDRE)
Règles complètes :
- **Composition/mise en place** : 16 jetons au total. En début de partie, **8 sont posés sur le plateau**
  (tirés au hasard depuis la réserve, un par emplacement planète) et **8 restent en réserve**.
- **Défausse de jetons** : quand un jeton est utilisé (qu'il vienne du plateau ou de la réserve), il part
  dans une **défausse de jetons**. Si la réserve est vide et qu'un joueur doit en gagner un, on **recharge
  la réserve depuis la défausse de jetons** (même principe que le remélange du deck de cartes).
- **Application immédiate + ORDRE (montée techno niveau 2)** : quand un joueur atteint le **niveau 2** d'une
  techno et gagne le jeton bonus de cet emplacement, l'ordre d'application est **strict** :
  1. effet du **niveau 2**, puis 2. effet du **jeton bonus**, puis 3. effet du **niveau 1**.
  (Le jeton s'intercale entre le niveau 2 et le niveau 1 dans la ré-application cumulative.)
- **Application immédiate + ORDRE (capture de planète)** : quand un joueur **capture une planète** portant
  un jeton bonus, il applique **d'abord le jeton bonus**, puis continue avec les éventuels effets restants.
- **D3 (Animod D niv.3) et O1 (Humain O niv.1)** « gagner un jeton bonus » : le jeton gagné est **appliqué
  immédiatement** à la position de ce niveau dans la chaîne cumulative. Précisions confirmées 2026-07-22 :
  activer O3 → appliquer O3, puis O2, puis **O1 (= le jeton)** ; pour D3, **d'abord l'influence, puis le jeton**.
- Les effets des **16 jetons** sont désormais **transcrits et confirmés** — voir `docs/content/jetons-bonus.md`
  (CATALOGUE CONFIRMÉ). Tous se mappent sur des atomes existants (zenithium/credits/influence/exile/transfer/
  mobilize/takeLeader) : aucun nouvel atome nécessaire. Reste **1 point ouvert** : le placement exact des 8
  jetons de départ (hypothèse 5 planètes + 3 emplacements techno niveau 2).

## R5 — Influence « voisines » : montant (O4) — ✅ CONFIRMÉ
Double flèche blanche sur 2 voisines = **2 influences sur CHACUNE** des voisines (S2 = 1 chacune,
U4 = 1 chacune, O4 = 2 chacune). → `influenceNeighbors {count, amount}` déjà implémenté ainsi. Rien à changer.

## R6 — Influence « voisines » : définition — ✅ CONFIRMÉ
Adjacence **linéaire sans enroulement** sur la rangée Mercure–Vénus–Terra–Mars–Jupiter (Mercure et Jupiter
ne sont pas voisines) ; le joueur choisit un **segment contigu** de N planètes. → Déjà implémenté ainsi
(`chooseSegment`). Rien à changer.

---

## Conséquences pour l'implémentation à venir

- **Aucune reprise** du code déjà livré (R0/R5/R6 conformes ; R1/R2/R3/R4 concernaient des atomes différés).
- **Atomes à implémenter** (plan « effets avancés » — reste à faire) : `transfer` (R1), `exile` (R2) avec la
  variante ciblée par couleur + contrainte « couleurs différentes » et application partielle (R3),
  `bonusToken` (R4) avec l'**infrastructure de jetons** (réserve 8 + plateau 8, défausse, recharge) et
  surtout l'**ORDRE** d'application (niveau 2 → jeton → niveau 1 ; capture → jeton d'abord). Ceci impacte la
  logique `develop` (intercalage du jeton) et la logique de capture de planète (`gainInfluence`).
- **Puis** transcription du contenu réel : 6 faces techno (worksheet `technologies.md`), 90 cartes (scans
  locaux), 16 jetons bonus.

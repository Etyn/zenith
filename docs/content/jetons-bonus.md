# Contenu — Jetons Bonus (à valider / corriger par l'utilisateur)

> Feuille de transcription des **16 jetons bonus** (photo `docs/content/bonus.jpg`).
> J'ai pré-rempli mon décodage avec un niveau de confiance. **Corrige la colonne « Réel »**
> quand mon décodage est faux ou incertain. Règle : **je n'implémente aucun effet incertain sans ta confirmation.**
> Légende confiance : ✓ = plutôt sûr · ❓ = à confirmer · ❓❓ = vraiment pas sûr.

## Ce qui est déjà confirmé (règle R4)

- **16 jetons** au total : **8 posés sur le plateau** en début de partie (tirés au hasard de la réserve),
  **8 en réserve**. Jeton utilisé (plateau ou réserve) → **défausse de jetons**. Réserve vide + gain →
  recharger la réserve depuis la défausse.
- **Application immédiate + ORDRE** : montée techno niveau 2 → effet niveau 2, **puis jeton**, puis niveau 1.
  Capture d'une planète portant un jeton → **jeton d'abord**, puis effets restants. D3/O1 « gagner un jeton »
  → jeton appliqué immédiatement (petite precision, en cas d'activation de O3 par exemple, on applique d'abord O3, puis O2, puis O1 donc l'application du jeton, meme chose pour D3. Pour la techo D3 c'est d'ailleurs d'abord obtenir une influence puis le jeton.

## ❓ À confirmer : placement des 8 jetons de départ

Mon hypothèse : **1 jeton sur chacune des 5 planètes** + **1 jeton sur chacun des 3 emplacements
« niveau 2 » des technos** = 8. **Est-ce exact ?** (Sinon, où sont posés les 8 ?)

## Décodage des jetons (photo, 5 groupes visuels = 16 jetons)

| Groupe | Nombre | Mon décodage (photo) | Réel (corrige si besoin) |
| --- | --- | --- | --- |
| 1 | ×3 | ❓ Hexagone **jaune** avec un **« 1 »** → gagner **1 zénithium** ? (ou 1 crédit ?) | 1 zenith |
| 2 | ×4 | ❓❓ Forme de **carte** avec chiffres **3 / 1 / 1 / 3** (2 jetons « 1 », 2 jetons « 3 ») → gagner des crédits ? du zénithium ? piocher/recruter des cartes ? | Attention tu as mal du voir. C'est un icon pour gagner des credits. Y'a 2 jetons pour 3 credits et 2 jetons pour 4 credits |
| 3 | ×4 | ✓ **Flèche gauche + planète grise** → **1 influence sur une planète au choix** _(montant 1 ; flèche simple)_ | La fleche est vers le bas, mais oui c'est ien gagner 1 influence sur une planete au choix |
| 4A | ×1 | ❓ Cartes fragmentées + symbole **« ≫O »** → **transférer** des cartes ? **mobiliser** ? | Carte fragmentee = exiler. Avec le l'icone personne en blanc qui designe chez l'adversaire. C'est bien 2 cartes a exile |
| 4B | ×1 | ❓ Carré gris avec **flèche gauche** → 1 influence ? déplacer un disque ? autre ? | C'est une fleche vers le bas dans une carte, c'est donc transferer une carte |
| 4C | ×1 | ❓ **Deux « + »** empilés (dans des carrés gris) → **mobiliser 2** (le « + » = mobiliser) ? | Mobiliser 2 artes |
| 5 | ×2 | ❓❓ **Bonhomme blanc** (main + visage) en jaune → effet « chez l'adversaire » ? lequel exactement ? | La photo devait pas etre bonne, il s'agit de 2 jetons qui disent "Recuperer le jeton de leader argent / transformer le jeton en or (si on l'a deja) |

## ✅ CATALOGUE CONFIRMÉ (2026-07-22) — les 16 jetons

Tous les effets se mappent sur des **atomes existants** (aucun nouvel effet à créer) :

| Type | Nb | Effet réel | Atome |
| --- | --- | --- | --- |
| A | ×3 | +1 zénithium | `{ k:'zenithium', amount:1, target:'self' }` |
| B | ×2 | +3 crédits | `{ k:'credits', amount:3, target:'self' }` |
| C | ×2 | +4 crédits | `{ k:'credits', amount:4, target:'self' }` |
| D | ×4 | +1 influence au choix | `{ k:'influence', on:'choice', amount:1 }` |
| E | ×1 | exiler 2 cartes chez l'adversaire | `{ k:'exile', side:'opponent', count:2 }` |
| F | ×1 | transférer 1 carte | `{ k:'transfer', count:1 }` |
| G | ×1 | mobiliser 2 cartes | `{ k:'mobilize', count:2, thenInfluence:false }` |
| H | ×2 | prendre le badge Leader (argent, ou passer or si déjà pris) | `{ k:'takeLeader', side:'silver' }` |

Total : 3+2+2+4+1+1+1+2 = **16** ✓.

### Ordre d'application (confirmé)
- Cumul techno : niveau N → N-1 → … → 1. Le jeton lié à un niveau s'applique **à la position de ce niveau
  dans la chaîne**. Ex. activer O3 → O3, puis O2, puis **O1 (= application du jeton)**. Idem D3 : **d'abord
  l'influence, puis le jeton**.
- Jeton d'**emplacement niveau 2** (posé sur le plateau techno, pris par le 1er à atteindre le niveau 2) :
  à la montée niveau 2 → effet niveau 2, **puis ce jeton**, puis niveau 1.
- Jeton de **planète** : à la capture d'une planète qui en porte un → **jeton d'abord**, puis effets restants.
- Un jeton **utilisé** (plateau ou réserve) → **défausse de jetons** (pas de conservation). Réserve vide +
  gain → recharger depuis la défausse.

## ✅ Placement confirmé (2026-07-22)
**1 jeton sur chacune des 5 planètes + 1 sur chacun des 3 emplacements « niveau 2 » des technos = 8 sur le
plateau**, les 8 autres en réserve (tirage aléatoire à la mise en place).

**Déclencheurs de jetons du plateau** (confirmés) :
- **planète capturée** → appliquer d'abord le jeton posé sur cette planète (s'il y en a un) ;
- **1er joueur (des deux) à atteindre le niveau 2** d'une techno → il prend le jeton de cet emplacement
  (intercalé : niveau 2 → jeton → niveau 1) ;
- plus les jetons **gagnés depuis la réserve** (effets O1/D3).

## 📌 Note pour la phase CARTES (futur, à ne pas oublier)
Certaines **cartes agent** pourront, comme action, **piocher un jeton bonus depuis la réserve** OU **prendre
un jeton bonus visible sur le plateau, au choix**. → prévoir un atome/décision supportant ce choix
(réserve vs plateau) lors de la transcription des cartes.

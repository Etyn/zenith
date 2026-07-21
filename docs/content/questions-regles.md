# Questions de règles à revoir (Zenith)

> Journal des points de règle incertains rencontrés pendant le dev.
> À trancher avec l'utilisateur une fois le gros du travail terminé. **Aucune règle inventée** :
> tant qu'un point ici n'est pas confirmé, le code utilise une hypothèse documentée et testée,
> à corriger si l'hypothèse est fausse.

(rien pour l'instant)

## Développer une technologie — ré-application cumulative
En montant au niveau N d'une techno, le code applique l'effet du niveau N **puis** re-applique
ceux des niveaux inférieurs (N, N-1, …, 1), d'après l'exemple du livret p8 (« il gagne l'effet du
niveau 2 … puis applique l'effet du niveau 1 »). **À confirmer** : est-ce bien une ré-application
à CHAQUE montée (donc le niveau 1 est rejoué quand on atteint le 2, etc.) ? Impact fort sur l'équilibrage.

---

## Effets avancés (plan 2026-07-21-zenith-effets-avances) — points à trancher

Ces questions concernent des atomes dont la modélisation technique reste ambiguë. Tant qu'elles ne
sont pas tranchées, l'atome est implémenté avec l'hypothèse minimale ci-dessous (clairement signalée
« à confirmer » dans le plan) et devra être corrigé si l'hypothèse est fausse.

### Q1 — `transfer` : source, cible, choix, effets (S3, N1, P2)
« Transférer N cartes ». N1 (Robot niv.1) est confirmé « transférer 1 carte d'une colonne adverse au
choix ». Restent ambigus : la carte transférée va vers quelle colonne (ma colonne de la même planète ?),
qui la choisit, et le transfert ré-applique-t-il les effets de la carte / donne-t-il de l'influence ?
S3 (Animod niv.3, « transférer 3 cartes ») a-t-il la même direction (adverse → moi) que N1 ?
**Hypothèse minimale retenue** : pour chaque carte, le joueur choisit une colonne adverse non vide ;
on déplace sa **dernière** carte vers la colonne de **même planète** du joueur actif ; **aucun** effet
n'est ré-appliqué et aucune influence n'est gagnée. Confirmer direction + cible + effets.

### Q2 — `exile` : destination de la carte exilée (D1, P2, P4)
« Exiler » (carte fendue) : la carte exilée part-elle à la **défausse** (récupérable au remélange) ou
**hors de la partie** définitivement ? **Hypothèse minimale retenue** : vers la défausse (`discard`).
Confirmer.

### Q3 — `exile` + influence P4 (Robot P niv.4)
« Exiler une carte de chez soi et gagner 2 influences sur la planète de la couleur associée, et ceci
sur 2 planètes de couleur différentes. » **Hypothèse minimale retenue** : deux atomes `exile` en
séquence, chacun `who:'own'`, `gain:'influence'`, `gainAmount:2` sur la planète de la carte exilée ;
la contrainte « 2 couleurs différentes » n'est **pas** imposée par le moteur (le joueur peut, pour
l'instant, choisir 2 fois la même colonne). Confirmer si la contrainte doit être forcée et ce qui se
passe si elle est impossible à satisfaire (une seule colonne non vide).

### Q4 — `bonusToken` : que fait « gagner un jeton Bonus (réserve) » (D3, O1)
Un jeton pris **face cachée** dans la réserve : le joueur applique-t-il son effet **immédiatement**,
le **garde-t-il** pour plus tard, ou reste-t-il simplement acquis ? Quelle est la composition/l'ordre
de la réserve (tirage RNG) ? **Hypothèse minimale retenue** : le jeton (son id) passe de `bonusReserve`
à la liste `bonusTokens` du joueur ; **aucun effet n'est appliqué** (les effets des 16 jetons sont du
contenu non encore transcrit). Réserve vide dans les fixtures → l'atome est un no-op (FAQ « effet
inapplicable = ignoré »). Confirmer le moment d'application de l'effet et la composition de la réserve.

### Q5 — `influenceNeighbors` O4 : montant par planète (Humain O niv.4)
« Double flèche blanche = 2 influences sur 2 planètes voisines. » Chaque planète voisine reçoit-elle
**2** influences (double flèche = montant 2, cohérent avec le S5 « planète grise double flèche = 2 »)
ou s'agit-il de **1** influence sur chacune des 2 voisines (comme S2) pour un total de 2 ?
**Hypothèse minimale retenue** : **2 influences sur CHACUNE** des 2 voisines (S2 = 1 chacune, U4 = 1
chacune, O4 = 2 chacune). Confirmer.

### Q6 — `influenceNeighbors` : définition de « voisines »
« Planètes voisines » = adjacence sur la rangée fixe Mercure–Vénus–Terra–Mars–Jupiter, **sans
enroulement** (Mercure et Jupiter ne sont pas voisines) ? Le joueur choisit-il librement quel segment
contigu de N planètes ? **Hypothèse minimale retenue** : adjacence linéaire non circulaire ; le joueur
choisit un segment contigu de N planètes. Confirmer.

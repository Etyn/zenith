# Cartes à finaliser (TODO) — effets partiels/approximés

> Les 90 cartes sont transcrites et le jeu tourne. Ces **9 cartes** ont un effet non encore exprimable
> par le vocabulaire actuel (marqué `// TODO(rules)` dans `src/data/cards.ts`) : elles fonctionnent avec
> leur **1er effet** (influence sur leur planète) et, quand c'est possible, une approximation ; il reste à
> ajouter quelques atomes et/ou à confirmer 2 sémantiques avec l'utilisateur.

## A. Nécessitent un petit atome moteur (puis re-transcription)
1. **venus-ilda-flores** — « gagner du **zénithium** selon le nb de technos ≥ niv.1 » → atome `resourcePerTechLevels` (variante zénithium de `creditsPerTechLevels`).
2. **mars-lady-moore** — « exiler **3 cartes adverses** → +1 influence sur la **couleur de chaque carte exilée** » → atome exil-adverse-avec-influence-par-couleur (×3).
3. **terra-h3rb3rt** — « pour **4 couleurs**, choix optionnel : exiler 1 carte de cette couleur → +1 influence sur cette couleur » → exil **filtré par couleur** + influence même couleur.
4. **terra-l0v3cr4ft** — « exiler 1 carte d'une **couleur précise** → 1 zénithium » (par couleur) → exil filtré par couleur.
5. **mercure-chaka** — « exiler 2 cartes **≠ Mercure** » → exil avec **exclusion de couleur** (mineur : actuellement exil libre).

## B. Mineur (approximation acceptable en l'état)
6. **mars-titus**, **terra-baron-goro** — « donner 1 influence à l'adversaire **sauf** couleur de la carte » : implémenté sans l'exclusion (`giveInfluenceOpponent` sans `except`). Ajout d'un `except` possible.

## C. Nécessitent ta confirmation (sémantique incertaine)
7. **mars-charlize-gun** — la silhouette « mobiliser vers la **colonne ADVERSE** » : mobiliser met normalement la carte dans MA colonne ; ici elle irait chez l'adversaire ? Confirme le sens exact.
8. **jupiter-bajazet** — « exiler **X cartes de la MAIN adverse** → gagner X crédits » : cibler la **main cachée** de l'adversaire est inhabituel — est-ce bien la main, et X est-il choisi par moi ? Confirme.

## D. Refactor moteur lié (dette technique identifiée)
9. Les coûts « **payer N zénithium** » des échelles sont encodés en **montant négatif** (`{k:'zenithium', amount:-N}`) — **non borné** : peut rendre le zénithium négatif (a causé un crash `developLowest`, neutralisé par une garde). → introduire un atome **`spend {resource, amount}` borné** + **gating** des paliers d'échelle non payables, puis remplacer les encodages négatifs.

## ✅ Clarifications utilisateur (charlize-gun, bajazet) — résolubles avec l'EXISTANT
- **mars-charlize-gun** (`scan 23.02_5`) : 3 actions après l'influence Mars = **mobiliser 1** + **transférer 1** + **exiler 1 agent adverse** → `[influence(mars,1), {k:'mobilize',count:1,thenInfluence:false}, {k:'transfer',count:1,from:'choice'}, {k:'exile',side:'opponent',count:1}]`. (Ancienne lecture « mobiliser vers l'adversaire » = FAUSSE.)
- **jupiter-bajazet** (`scan 23.02_40`) : **exiler 1 carte adverse (plateau) → gagner sa valeur en crédits** → `[influence(jupiter,1), {k:'creditsFromCardValue', source:'exileOpponent'}]`. (Ancienne lecture « main adverse » = FAUSSE.)

## 📌 RÈGLE DE VOCABULAIRE (confirmée) — à appliquer partout
- **« Exiler »** = retirer une carte du **PLATEAU** (une colonne), **toujours la plus récente** de la colonne ; **jamais** de la main.
- **« Défausser »** = retirer une carte de la **MAIN**.
→ Donc `mars-lady-moore` exile des cartes des **colonnes** adverses (pas la main).

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

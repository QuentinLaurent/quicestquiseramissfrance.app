# Réglages PocketBase

L'app fonctionne sans rien changer côté serveur. Les réglages ci-dessous servent à
lancer une nouvelle édition et à faire respecter les règles du jeu par le serveur
(et plus seulement par l'interface).

> Les règles API de ce fichier n'ont pas pu être testées contre un vrai PocketBase.
> À coller dans l'admin puis à vérifier avec la check-list en bas de page, avant le jour J.

## 1. Lancer une nouvelle édition

1. Collections `miss` et `vote` : ajouter un champ texte `edition` (non obligatoire).
   Les enregistrements existants restent vides : l'app les range dans l'édition 2025.
2. Créer les nouvelles miss avec `edition = 2027` et `field` vide.
3. Collection `gestion` : créer l'enregistrement `key = EDITION`, `value = 2027`,
   puis remettre `PHASE` à `1`.

L'ancienne édition reste consultable dans « Le classement » (bouton « Miss France 2025 »).

## 2. Pendant l'émission

- Passer `PHASE` à 2, 3, 4 puis 5 dans `gestion` : l'app suit en direct.
- Saisir les résultats dans le champ `field` des miss, avec exactement ces valeurs :
  `Top 15`, `Top 5`, `2ème Dauphine`, `1ère Dauphine`, `Miss France`.
- Saisir les qualifiées **avant** d'ouvrir la phase suivante : la phase 3 ne propose que
  les miss du Top 15 et la phase 4 celles du Top 5. Tant que rien n'est saisi, toute la
  liste reste proposée.

## 3. Règles API de la collection `vote`

Syntaxe PocketBase 0.23 et plus. Sur une version 0.22 ou antérieure, remplacer
`@request.body` par `@request.data`.

**List/Search et View** — chacun voit ses votes, ceux des autres seulement une fois la
phase clôturée, et tout le palmarès des éditions passées :

```
votant = @request.query.votant
|| (@collection.gestion:p.key = "PHASE" && @collection.gestion:p.value > phase)
|| (@collection.gestion:e.key = "EDITION" && @collection.gestion:e.value != edition)
```

**Create** — uniquement pour la phase et l'édition en cours :

```
@request.body.voteNumber >= 1 && @request.body.voteNumber <= 5
&& @collection.gestion:p.key = "PHASE" && @collection.gestion:p.value = @request.body.phase
&& @collection.gestion:e.key = "EDITION" && @collection.gestion:e.value = @request.body.edition
```

**Update** — on ne peut changer que la miss, et seulement tant que la phase est ouverte :

```
@request.body.phase:isset = false && @request.body.votant:isset = false
&& @request.body.edition:isset = false && @request.body.voteNumber:isset = false
&& @collection.gestion:p.key = "PHASE" && @collection.gestion:p.value = phase
&& @collection.gestion:e.key = "EDITION" && @collection.gestion:e.value = edition
```

**Delete** — laisser verrouillé (admin uniquement).

Index uniques à ajouter sur `vote` (une case = un vote, une miss = une seule fois par
phase). Ils ne s'appliquent qu'aux votes des nouvelles éditions :

```sql
CREATE UNIQUE INDEX idx_vote_case ON vote (edition, votant, phase, voteNumber) WHERE edition != '';
CREATE UNIQUE INDEX idx_vote_miss ON vote (edition, votant, phase, miss) WHERE edition != '';
```

## 4. Autres collections

`gestion`, `miss` et `votant` : List/Search et View publics (règle vide), Create, Update
et Delete verrouillés (admin uniquement).

## 5. Check-list de vérification

Avec une édition de test et `PHASE = 1` :

- [ ] voter depuis l'app fonctionne, modifier un vote aussi ;
- [ ] `/api/collections/vote/records` ouvert dans le navigateur ne montre aucun vote de la phase en cours ;
- [ ] après passage à `PHASE = 2`, les votes de la phase 1 apparaissent à cette adresse et le classement se remplit ;
- [ ] le classement « Miss France 2025 » est toujours complet ;
- [ ] un vote envoyé pour une phase fermée est refusé (message rouge dans l'app).

## Limite connue

Il n'y a pas de connexion : l'app retient simplement qui vous êtes sur l'appareil. Les
règles ci-dessus empêchent de voir les votes des autres par accident et de voter hors
phase, mais quelqu'un qui connaît l'API peut encore se faire passer pour un autre joueur.
Pour fermer cette porte il faudra un vrai login (code personnel par joueur).

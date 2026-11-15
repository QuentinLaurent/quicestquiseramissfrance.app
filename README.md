# Qui c'est qui sera Miss France ?

Jeu de pronostics entre amis pour l'élection de Miss France. Site statique
(React + Vite + Tailwind), données dans Supabase.

L'app est installable sur téléphone (PWA) : « Ajouter à l'écran d'accueil » depuis le
navigateur. Elle se met à jour toute seule à chaque publication ; les photos restent
visibles hors connexion, les votes et le classement demandent le réseau.

## Développement

```
npm install
npm run dev
```

L'adresse et la clé publique Supabase sont dans `src/lib/supabase.ts`
(surchargeables avec `VITE_SUPABASE_URL` et `VITE_SUPABASE_KEY`).

## Base de données

Le projet Supabase est partagé avec une autre application : tout ce qui concerne
Miss France est préfixé `mf_`. Le schéma complet est dans `supabase/migrations`.

| Table | Contenu |
| --- | --- |
| `mf_game` | Une seule ligne : `edition` en cours et `phase` (1 à 4 = votes ouverts, 5 = terminé) |
| `mf_players` | Les joueurs (`name`) et leur mot de passe chiffré (`code_hash`) |
| `mf_sessions` | Les sessions ouvertes (le navigateur garde un jeton, jamais le mot de passe) |
| `mf_secrets` | Le code d'invitation à donner aux joueurs |
| `mf_misses` | Les candidates par `edition`, et leur `result` pendant l'émission |
| `mf_votes` | Les votes. Illisibles directement : l'app passe par des fonctions |

Le navigateur ne peut que lire `mf_game`, `mf_misses` et le nom des joueurs. Voter,
S'inscrire, se connecter, voter, relire ses votes et calculer le classement passent
par des fonctions (`mf_register`, `mf_sign_in`, `mf_vote`, `mf_my_votes`, `mf_ranking`…)
qui vérifient le code d'invitation, la session du joueur, la phase en cours et
l'unicité des choix.

## Administrer une édition

Tout se fait depuis le lien « Admin » du site, avec un compte Supabase Auth du projet
inscrit dans la table `mf_admins` (à ajouter à la main dans le tableau de bord Supabase).
Le Table Editor de Supabase reste utilisable en secours.

**Avant l'émission**

1. Définir le code d'invitation dans la page Admin et le donner aux joueurs, qui
   s'inscrivent eux-mêmes (pseudo, mot de passe, code d'invitation).
2. Storage, bucket `miss-photos` : déposer les photos.
3. `mf_misses` : une ligne par candidate avec `edition`, `region`, `name`, `age`,
   `work` et `photo` (nom du fichier dans le bucket, ou URL complète). Laisser `result` vide.
4. `mf_game` : vérifier `edition` et mettre `phase` à 1.

**Pendant l'émission**

1. Annonce des 15 : mettre `result = Top 15` sur les qualifiées, **puis** `phase = 3`
   (passer par `phase = 2` avant l'annonce pour ouvrir la 2ème phase de vote).
2. Annonce des 5 : `result = Top 5` sur les qualifiées, puis `phase = 4`.
3. Résultat final : `Miss France`, `1ère Dauphine`, `2ème Dauphine`, puis `phase = 5`.

L'app suit ces changements en direct. Les points d'une phase n'apparaissent au
classement qu'une fois la phase suivante ouverte.

**Dépannage**

- Mot de passe oublié : « Effacer le mot de passe » dans la page Admin ; le joueur se
  réinscrit avec le même pseudo et garde ses votes.
- Édition suivante : changer `edition` dans `mf_game`, remettre `phase` à 1 et saisir
  les nouvelles candidates. L'ancien classement reste consultable dans l'app.

## Déploiement

À chaque push sur `master`, la GitHub Action `.github/workflows/deploy.yml` compile
le site et publie le résultat sur la branche `gh-pages` (elle peut aussi être lancée
à la main depuis l'onglet Actions).

Le site est servi par GitHub Pages depuis cette branche : Settings > Pages > Deploy
from a branch > `gh-pages`, dossier `/ (root)`. Le domaine `quicestquiseramissfrance.fr`
est déclaré dans `public/CNAME`, recopié à chaque publication.
